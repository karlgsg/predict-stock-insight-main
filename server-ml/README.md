# ML Service (FastAPI)

This service hosts model inference behind a simple HTTP API.

## Endpoints

- `GET /health`
- `POST /predict` with body `{ "ticker": "AAPL" }`

Response shape:

```json
{
  "ticker": "AAPL",
  "asof_date": "2026-02-10",
  "current_price": 182.31,
  "pred_price_h": 186.72,
  "delta_pred": 4.41,
  "expected_return": 0.0242,
  "threshold_pct": 1.1,
  "vol_pct": 1.1,
  "action": "BUY",
  "confidence": 0.73
}
```

## Local Run

Use Python 3.11 on macOS for TensorFlow compatibility.

```bash
cd server-ml
brew install python@3.11
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8002 --reload
```

## Model Bundles

- Put per-ticker bundle files in `server-ml/bundles/` (or set `BUNDLE_DIR` env var):
  - `{TICKER}_tcn_final.keras`
  - `{TICKER}_feature_scaler.pkl`
  - `{TICKER}_target_scaler.pkl`
  - `{TICKER}_meta.json`
- Example: `server-ml/bundles/GLD_tcn_final.keras`

If bundles are missing, `/predict` returns `503` with the missing file list.

### Auto-sync from Google Drive

Use `rclone` for private Drive folders and repeatable updates:

```bash
brew install rclone
rclone config
```

Create a Google Drive remote (example name: `gdrive`) during `rclone config`, then run:

```bash
cd server-ml
cp .env.example .env
./scripts/sync_bundles_from_drive.sh
```

The script uses:

- `DRIVE_REMOTE` (default: `gdrive`)
- `DRIVE_BUNDLE_PATH` (default: `stock_bundles_delta`)

Set those values in `server-ml/.env` if your Drive path differs.

## Auth

- Optional bearer auth is controlled by `ML_API_KEY`.
- If `ML_API_KEY` is set, callers must send `Authorization: Bearer <ML_API_KEY>`.

## Integrating your real model

- Replace `run_model_inference()` in `app.py` with your TensorFlow/scaler pipeline.
- Current implementation already loads TensorFlow + scalers and uses your bundle naming pattern.
