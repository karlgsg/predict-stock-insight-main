import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m"; // e.g., "15m"
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "7", 10);
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "";
const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY || process.env.COLAB_API_KEY || "";
const COLAB_SIGNAL_URL = process.env.COLAB_SIGNAL_URL || "";
const COLAB_API_KEY = process.env.COLAB_API_KEY || "";
const COLAB_TIMEOUT_MS = parseInt(process.env.COLAB_TIMEOUT_MS || "12000", 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const symbolsPath = path.resolve(__dirname, "../data/symbols.json");

const prisma = new PrismaClient();

function loadSymbols() {
  try {
    const data = fs.readFileSync(symbolsPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.warn("Symbols file not found or invalid, falling back to empty list.", err?.message);
    return [];
  }
}

let symbols = loadSymbols();

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePrediction(actionRaw, expectedReturn) {
  const action = String(actionRaw || "").toUpperCase();
  if (action === "BUY") return "bullish";
  if (action === "SELL") return "bearish";
  if (action === "HOLD") return "neutral";

  if (expectedReturn > 0) return "bullish";
  if (expectedReturn < 0) return "bearish";
  return "neutral";
}

function buildConfidencePercent(expectedReturn) {
  const magnitude = Math.abs(expectedReturn || 0);
  const confidence = Math.round(Math.max(55, Math.min(95, 55 + magnitude * 250)));
  return confidence;
}

function normalizeConfidencePercent(rawConfidence, expectedReturn) {
  const parsed = Number(rawConfidence);
  if (Number.isFinite(parsed)) {
    const asPercent = parsed <= 1 ? parsed * 100 : parsed;
    return Math.round(Math.max(0, Math.min(100, asPercent)));
  }
  return buildConfidencePercent(expectedReturn);
}

async function postSignalRequest(url, ticker) {
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COLAB_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ML_SERVICE_API_KEY ? { Authorization: `Bearer ${ML_SERVICE_API_KEY}` } : {}),
      },
      body: JSON.stringify({ ticker }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Upstream endpoint failed (${response.status}): ${body || "No response body"}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function mapColabSignalToPrediction(symbol, symbolName, payload) {
  const currentPrice = toFiniteNumber(
    payload?.current_price ?? payload?.price ?? payload?.close
  );
  const predictedPrice = toFiniteNumber(
    payload?.pred_price_h ?? payload?.predicted_price ?? payload?.forecast_price,
    currentPrice
  );
  const expectedReturn = toFiniteNumber(
    payload?.expected_return ??
      payload?.exp_ret ??
      (currentPrice ? (predictedPrice - currentPrice) / currentPrice : 0),
    0
  );

  const change = predictedPrice - currentPrice;
  const changePercent = expectedReturn * 100;
  const prediction = normalizePrediction(payload?.action, expectedReturn);
  const confidence = normalizeConfidencePercent(payload?.confidence, expectedReturn);
  const hasModelConfidence = Number.isFinite(Number(payload?.confidence));

  return {
    symbol,
    name: symbolName || payload?.name || `${symbol} Company`,
    price: Number(currentPrice.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    prediction,
    confidence,
    confidenceSource: hasModelConfidence ? "model" : "derived",
    asOfDate: payload?.asof_date ?? null,
  };
}

async function fetchPredictionSignal(ticker) {
  if (ML_SERVICE_URL) {
    return await postSignalRequest(ML_SERVICE_URL, ticker);
  }
  if (COLAB_SIGNAL_URL) {
    return await postSignalRequest(COLAB_SIGNAL_URL, ticker);
  }
  return null;
}

// In-memory user store: email -> { id, name, email, passwordHash }
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

async function createRefreshToken(userId) {
  const token = nanoid(32);
  const tokenHash = await bcrypt.hash(token, 10);
  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_TOKEN_TTL_DAYS);
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: expires,
    },
  });
  return token;
}

async function rotateRefreshToken(oldToken, userId) {
  const tokenHash = await bcrypt.hash(oldToken, 10);
  await prisma.refreshToken.updateMany({
    where: { userId, tokenHash },
    data: { revoked: true },
  });
  return createRefreshToken(userId);
}

async function verifyRefreshToken(token) {
  const tokens = await prisma.refreshToken.findMany({
    where: {
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const t of tokens) {
    const match = await bcrypt.compare(token, t.tokenHash);
    if (match) {
      return t;
    }
  }
  return null;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  const lowerEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (existing) {
    return res.status(409).json({ error: "User already exists." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: lowerEmail, passwordHash },
  });
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  return res.json({ token: accessToken, refreshToken, user: { name: user.name, email: user.email } });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  return res.json({ token: accessToken, refreshToken, user: { name: user.name, email: user.email } });
});

app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }
  const stored = await verifyRefreshToken(refreshToken);
  if (!stored) {
    return res.status(401).json({ error: "Invalid or expired refresh token." });
  }
  if (stored.expiresAt < new Date() || stored.revoked) {
    return res.status(401).json({ error: "Expired or revoked refresh token." });
  }
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    return res.status(401).json({ error: "User not found." });
  }
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });
  const accessToken = signAccessToken(user);
  const newRefresh = await createRefreshToken(user.id);
  return res.json({ token: accessToken, refreshToken: newRefresh, user: { name: user.name, email: user.email } });
});

app.post("/predict", authMiddleware, async (req, res) => {
  const { ticker } = req.body || {};
  if (!ticker) return res.status(400).json({ error: "Ticker is required." });

  // Reload symbols in case the file was refreshed after server start.
  symbols = loadSymbols();
  const symbol = String(ticker).toUpperCase();
  const symbolEntry = symbols.find((s) => s.symbol === symbol);
  if (!symbolEntry) {
    return res.status(400).json({ error: "Unknown ticker. Please pick a valid symbol." });
  }

  try {
    const upstreamPayload = await fetchPredictionSignal(symbol);
    if (upstreamPayload) {
      const mapped = mapColabSignalToPrediction(symbol, symbolEntry?.name, upstreamPayload);
      return res.json(mapped);
    }
  } catch (err) {
    console.error(`Prediction service request failed for ${symbol}:`, err?.message || err);
    return res.status(502).json({
      error: "Prediction service unavailable. Check ML_SERVICE_URL/COLAB_SIGNAL_URL and runtime status.",
    });
  }

  // Fallback mock response when no upstream prediction service is configured.
  const price = Math.random() * 200 + 50;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (Math.random() - 0.5) * 5;
  const prediction = Math.random() > 0.5 ? "bullish" : "bearish";
  const confidence = Math.floor(Math.random() * 30 + 70);

  return res.json({
    symbol,
    name: symbolEntry?.name || `${symbol} Company`,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    prediction,
    confidence,
  });
});

app.get("/symbols", (_req, res) => {
  const q = (_req.query.q || "").toString().trim().toLowerCase();
  const limit = Math.min(parseInt(_req.query.limit, 10) || 10, 50);

  if (!q) {
    return res.json(symbols.slice(0, limit));
  }

  const filtered = symbols.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );

  return res.json(filtered.slice(0, limit));
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
