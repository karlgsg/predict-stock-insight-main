import { isApiConfigured } from "./api";

export interface SymbolResult {
  symbol: string;
  name: string;
}

export async function fetchSymbols(query: string, limit = 10): Promise<SymbolResult[]> {
  if (!isApiConfigured()) {
    return [];
  }

  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/symbols`);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", limit.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Symbol search failed (${res.status})`);
  }
  return res.json();
}
