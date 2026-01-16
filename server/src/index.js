import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const symbolsPath = path.resolve(__dirname, "../data/symbols.json");

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

// In-memory user store: email -> { id, name, email, passwordHash }
const users = new Map();

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: "1h",
  });
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
  if (users.has(email.toLowerCase())) {
    return res.status(409).json({ error: "User already exists." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nanoid(), name, email: email.toLowerCase(), passwordHash };
  users.set(user.email, user);
  const token = signToken(user);
  return res.json({ token, user: { name: user.name, email: user.email } });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = users.get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const token = signToken(user);
  return res.json({ token, user: { name: user.name, email: user.email } });
});

app.post("/predict", authMiddleware, (req, res) => {
  const { ticker } = req.body || {};
  if (!ticker) return res.status(400).json({ error: "Ticker is required." });

  // Placeholder prediction (replace with ML model later)
  const symbol = String(ticker).toUpperCase();
  if (!symbols.find((s) => s.symbol === symbol)) {
    return res.status(400).json({ error: "Unknown ticker. Please pick a valid symbol." });
  }

  const price = Math.random() * 200 + 50;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (Math.random() - 0.5) * 5;
  const prediction = Math.random() > 0.5 ? "bullish" : "bearish";
  const confidence = Math.floor(Math.random() * 30 + 70);

  return res.json({
    symbol,
    name: `${symbol} Company`,
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

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
