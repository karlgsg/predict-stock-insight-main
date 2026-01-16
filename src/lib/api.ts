export interface StockPredictionResponse {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  prediction: "bullish" | "bearish" | "neutral";
  confidence: number;
}

export class ApiError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL;

function getApiUrl() {
  if (!API_URL) throw new ApiError("Missing VITE_API_URL environment variable.");
  return API_URL.replace(/\/$/, "");
}

export function isApiConfigured() {
  return Boolean(API_URL);
}

export async function fetchStockPrediction(ticker: string, token?: string): Promise<StockPredictionResponse> {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ticker }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unable to read error body");
    throw new ApiError(`Prediction request failed (${response.status}): ${errorText}`, response.status, errorText);
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unable to read error body");
    throw new ApiError(`Login failed (${response.status}): ${errorText}`, response.status, errorText);
  }

  return response.json();
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unable to read error body");
    throw new ApiError(`Registration failed (${response.status}): ${errorText}`, response.status, errorText);
  }

  return response.json();
}
