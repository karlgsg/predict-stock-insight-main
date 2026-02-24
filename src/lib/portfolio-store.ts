export type PortfolioPosition = {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  costBasis: number;
  changePct: number;
  risk?: "Low" | "Medium" | "High";
};

const storageKey = (userEmail?: string) => `portfolio_positions_${userEmail || "guest"}`;

const defaultPositions: PortfolioPosition[] = [];

function loadLocal(userEmail?: string): PortfolioPosition[] {
  if (typeof window === "undefined") return defaultPositions;
  try {
    const raw = localStorage.getItem(storageKey(userEmail));
    if (raw) return JSON.parse(raw) as PortfolioPosition[];
    return defaultPositions;
  } catch {
    return defaultPositions;
  }
}

function saveLocal(userEmail: string | undefined, positions: PortfolioPosition[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userEmail), JSON.stringify(positions));
  } catch {
    /* ignore storage errors */
  }
}

function getApiUrl() {
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  return apiUrl || "";
}

export async function loadPortfolio(userEmail?: string, token?: string): Promise<PortfolioPosition[]> {
  const apiUrl = getApiUrl();
  if (!apiUrl || !token) {
    return loadLocal(userEmail);
  }

  try {
    const res = await fetch(`${apiUrl}/portfolio`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Portfolio load failed (${res.status})`);
    }
    const rows = (await res.json()) as Array<{
      symbol: string;
      name: string;
      shares: number;
      price: number;
      costBasis: number;
      changePct: number;
      risk?: "Low" | "Medium" | "High";
    }>;
    const mapped: PortfolioPosition[] = rows.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      shares: Number(r.shares),
      price: Number(r.price),
      costBasis: Number(r.costBasis),
      changePct: Number(r.changePct || 0),
      risk: r.risk,
    }));
    saveLocal(userEmail, mapped);
    return mapped;
  } catch {
    return loadLocal(userEmail);
  }
}

export async function savePortfolio(
  userEmail: string | undefined,
  positions: PortfolioPosition[],
  token?: string
): Promise<void> {
  saveLocal(userEmail, positions);

  const apiUrl = getApiUrl();
  if (!apiUrl || !token) return;

  const bySymbol = new Map(positions.map((p) => [p.symbol.toUpperCase(), p]));
  const existingRes = await fetch(`${apiUrl}/portfolio`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!existingRes.ok) throw new Error(`Portfolio sync failed (${existingRes.status})`);
  const existing = (await existingRes.json()) as Array<{ symbol: string }>;
  const existingSymbols = new Set(existing.map((p) => String(p.symbol || "").toUpperCase()));

  for (const position of positions) {
    const payload = {
      ...position,
      symbol: position.symbol.toUpperCase(),
    };
    const res = await fetch(`${apiUrl}/portfolio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Portfolio upsert failed (${res.status})`);
  }

  for (const symbol of existingSymbols) {
    if (bySymbol.has(symbol)) continue;
    const res = await fetch(`${apiUrl}/portfolio/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`Portfolio delete failed (${res.status})`);
  }
}
