import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_KEY = process.env.POLYGON_API_KEY;
const PAGE_LIMIT = 1000; // Polygon max per page
const MAX_PAGES = Infinity; // fetch all pages; expect long runs on free tier
const PAGE_DELAY_MS = 2000; // wait between pages to avoid rate limits
const RETRY_DELAY_MS = 60000; // wait on 429 before retrying same page
const BASE_URL = "https://api.polygon.io/v3/reference/tickers";

if (!API_KEY) {
  console.error("Missing POLYGON_API_KEY in environment.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const symbolsPath = path.resolve(__dirname, "../data/symbols.json");

async function fetchPage(cursor) {
  const url = new URL(BASE_URL);
  url.searchParams.set("market", "stocks");
  url.searchParams.set("active", "true");
  url.searchParams.set("locale", "us");
  url.searchParams.set("limit", PAGE_LIMIT.toString());
  if (cursor) url.searchParams.set("cursor", cursor);

  while (true) {
    const res = await fetch(`${url.toString()}&apiKey=${API_KEY}`);
    if (res.status === 429) {
      console.warn(`Rate limited (429). Waiting ${RETRY_DELAY_MS / 1000}s then retrying...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Polygon fetch failed (${res.status}): ${body}`);
    }
    return res.json();
  }
}

async function main() {
  const results = [];
  let cursor;
  let pages = 0;

  console.log("Fetching symbols from Polygon...");
  do {
    const data = await fetchPage(cursor);
    const tickers = data.results || [];
    for (const t of tickers) {
      results.push({ symbol: t.ticker, name: t.name || t.ticker });
    }
    cursor = data.next_url ? new URL(data.next_url).searchParams.get("cursor") : null;
    pages += 1;
    if (pages >= MAX_PAGES) break;
    if (cursor) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
    }
  } while (cursor);

  fs.mkdirSync(path.dirname(symbolsPath), { recursive: true });
  fs.writeFileSync(symbolsPath, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} symbols to ${symbolsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
