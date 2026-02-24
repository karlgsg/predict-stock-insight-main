import { isApiConfigured } from "./api";

export interface SymbolResult {
  symbol: string;
  name: string;
}

export async function fetchSymbols(query: string, limit = 10, supportedOnly = false): Promise<SymbolResult[]> {
  if (!isApiConfigured()) {
    return [];
  }

  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/symbols`);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", limit.toString());
  if (supportedOnly) url.searchParams.set("supported", "true");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Symbol search failed (${res.status})`);
  }
  return res.json();
}

export async function fetchSupportedSymbols(): Promise<string[]> {
  if (!isApiConfigured()) {
    return [];
  }

  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/supported-symbols`);
  if (!res.ok) {
    throw new Error(`Supported symbols fetch failed (${res.status})`);
  }
  const payload = (await res.json()) as { symbols?: string[] };
  return Array.isArray(payload?.symbols) ? payload.symbols : [];
}
