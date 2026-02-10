import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Literal, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from tensorflow import keras
from tensorflow.keras import layers

load_dotenv()


app = FastAPI(title="Predict Stock Insight ML Service", version="0.2.0")

ML_API_KEY = os.getenv("ML_API_KEY", "")
BUNDLE_DIR = Path(os.getenv("BUNDLE_DIR", "./bundles"))
MIN_TH_PCT = float(os.getenv("MIN_TH_PCT", "0.8"))
MAX_TH_PCT = float(os.getenv("MAX_TH_PCT", "2.0"))
VOL_WINDOW = int(os.getenv("VOL_WINDOW", "14"))
MODEL_CACHE: Dict[str, Tuple[Any, Any, Any, Dict[str, Any]]] = {}

FEATURE_COLS_DEFAULT = [
    "Price",
    "Open",
    "High",
    "Low",
    "Volume",
    "Chg%",
    "ret_1d",
    "ma_5",
    "ma_10",
    "ma_20",
    "ma_60",
    "vol_10",
    "vol_20",
    "rsi_14",
]


@keras.utils.register_keras_serializable()
class LastTimeStep(layers.Layer):
    def call(self, x):
        return x[:, -1, :]


class PredictRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)


class PredictResponse(BaseModel):
    ticker: str
    asof_date: str
    current_price: float
    pred_price_h: float
    delta_pred: float
    expected_return: float
    threshold_pct: float
    vol_pct: float
    action: Literal["BUY", "SELL", "HOLD"]
    confidence: Optional[float] = None


def check_auth(authorization: Optional[str]) -> None:
    if not ML_API_KEY:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if token != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API token")


def fetch_history_daily(ticker: str, start: str = "2010-01-01") -> pd.DataFrame:
    df = yf.download(ticker, period="max", auto_adjust=False, progress=False)
    if df is None or df.empty:
        df = yf.download(ticker, start=start, auto_adjust=False, progress=False)
    if df is None or df.empty:
        raise ValueError(f"No data returned for ticker {ticker}.")

    df = df.reset_index()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]

    df = df.rename(columns={"Close": "Price"})
    keep = ["Date", "Open", "High", "Low", "Price", "Volume"]
    df = df[keep].copy()
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce").dt.tz_localize(None)
    df = df.sort_values("Date").reset_index(drop=True)
    df["Chg%"] = df["Price"].pct_change() * 100.0
    df = df.dropna().reset_index(drop=True)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    price = out["Price"].astype(float)

    out["ret_1d"] = price.pct_change()
    out["ma_5"] = price.rolling(window=5).mean()
    out["ma_10"] = price.rolling(window=10).mean()
    out["ma_20"] = price.rolling(window=20).mean()
    out["ma_60"] = price.rolling(window=60).mean()
    out["vol_10"] = out["ret_1d"].rolling(window=10).std()
    out["vol_20"] = out["ret_1d"].rolling(window=20).std()

    d = price.diff()
    gain = d.clip(lower=0)
    loss = -d.clip(upper=0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    rs = avg_gain / (avg_loss + 1e-8)
    out["rsi_14"] = 100 - (100 / (1 + rs))

    out = out.dropna().reset_index(drop=True)
    return out


def load_bundle(ticker: str):
    tk = ticker.upper()
    if tk in MODEL_CACHE:
        return MODEL_CACHE[tk]

    model_path = BUNDLE_DIR / f"{tk}_tcn_final.keras"
    fs_path = BUNDLE_DIR / f"{tk}_feature_scaler.pkl"
    ts_path = BUNDLE_DIR / f"{tk}_target_scaler.pkl"
    meta_path = BUNDLE_DIR / f"{tk}_meta.json"

    missing = [str(p) for p in [model_path, fs_path, ts_path, meta_path] if not p.exists()]
    if missing:
        raise FileNotFoundError(f"Missing bundle files for {tk}: {missing}")

    model = keras.models.load_model(model_path, custom_objects={"LastTimeStep": LastTimeStep})
    feature_scaler = joblib.load(fs_path)
    target_scaler = joblib.load(ts_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    MODEL_CACHE[tk] = (model, feature_scaler, target_scaler, meta)
    return MODEL_CACHE[tk]


def model_forward_delta(model, x_input: np.ndarray) -> np.ndarray:
    if hasattr(model, "input_names") and isinstance(model.input_names, (list, tuple)) and len(model.input_names) == 1:
        in_name = model.input_names[0]
        y = model({in_name: x_input}, training=False)
    else:
        y = model([x_input], training=False)
    return y.numpy()


def compute_threshold_pct(df_feat: pd.DataFrame) -> Tuple[float, float]:
    vol_pct = float(df_feat["ret_1d"].rolling(VOL_WINDOW).std().iloc[-1] * 100.0)
    threshold_pct = max(MIN_TH_PCT, min(MAX_TH_PCT, vol_pct))
    return threshold_pct / 100.0, vol_pct


def score_confidence(expected_return: float, threshold_pct: float) -> float:
    ratio = abs(expected_return) / max(threshold_pct, 1e-6)
    confidence = 0.55 + min(ratio, 2.0) * 0.2
    return round(float(min(0.95, max(0.55, confidence))), 4)


def run_model_inference(ticker: str) -> PredictResponse:
    model, feature_scaler, target_scaler, meta = load_bundle(ticker)
    lookback = int(meta.get("lookback", 30))
    feature_cols = meta.get("feature_cols", FEATURE_COLS_DEFAULT)

    df_raw = fetch_history_daily(ticker)
    df_feat = engineer_features(df_raw)
    if len(df_feat) < lookback:
        raise ValueError(f"Not enough data for {ticker}. Need at least {lookback} rows.")

    x_window = df_feat[feature_cols].tail(lookback).values.astype(np.float32)
    x_window_s = feature_scaler.transform(x_window)
    x_input = x_window_s.reshape(1, lookback, len(feature_cols))

    delta_pred_s = model_forward_delta(model, x_input).reshape(-1, 1)
    delta_pred = float(target_scaler.inverse_transform(delta_pred_s)[0, 0])

    current_price = float(df_feat["Price"].iloc[-1])
    asof_date = str(pd.to_datetime(df_feat["Date"].iloc[-1]).date())
    pred_price_h = current_price + delta_pred
    expected_return = (pred_price_h - current_price) / current_price

    th_pct, vol_pct = compute_threshold_pct(df_feat)
    if expected_return >= th_pct:
        action = "BUY"
    elif expected_return <= -th_pct:
        action = "SELL"
    else:
        action = "HOLD"

    return PredictResponse(
        ticker=ticker.upper(),
        asof_date=asof_date,
        current_price=round(current_price, 4),
        pred_price_h=round(pred_price_h, 4),
        delta_pred=round(delta_pred, 4),
        expected_return=round(float(expected_return), 6),
        threshold_pct=round(th_pct * 100.0, 4),
        vol_pct=round(vol_pct, 4),
        action=action,
        confidence=score_confidence(expected_return, th_pct),
    )


@app.get("/health")
def health():
    return {
        "ok": True,
        "bundle_dir": str(BUNDLE_DIR.resolve()),
        "bundle_dir_exists": BUNDLE_DIR.exists(),
        "time": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, authorization: Optional[str] = Header(default=None)):
    check_auth(authorization)
    ticker = payload.ticker.strip().upper()
    try:
        return run_model_inference(ticker)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}") from e
