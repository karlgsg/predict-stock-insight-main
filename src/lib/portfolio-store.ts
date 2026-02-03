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

const defaultPositions: PortfolioPosition[] = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 42, price: 185.32, costBasis: 160.0, changePct: 1.3, risk: "Low" },
  { symbol: "TSLA", name: "Tesla, Inc.", shares: 18, price: 248.5, costBasis: 230.0, changePct: -2.1, risk: "High" },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 12, price: 875.28, costBasis: 520.0, changePct: 1.9, risk: "Medium" },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 15, price: 398.2, costBasis: 340.0, changePct: 0.6, risk: "Low" },
  { symbol: "QQQ", name: "Invesco QQQ ETF", shares: 10, price: 412.5, costBasis: 370.0, changePct: 0.4, risk: "Medium" },
  { symbol: "BND", name: "Vanguard Total Bond ETF", shares: 30, price: 72.3, costBasis: 70.0, changePct: 0.1, risk: "Low" },
];

export function loadPortfolio(userEmail?: string): PortfolioPosition[] {
  if (typeof window === "undefined") return defaultPositions;
  try {
    const raw = localStorage.getItem(storageKey(userEmail));
    if (raw) return JSON.parse(raw) as PortfolioPosition[];
    localStorage.setItem(storageKey(userEmail), JSON.stringify(defaultPositions));
    return defaultPositions;
  } catch {
    return defaultPositions;
  }
}

export function savePortfolio(userEmail: string | undefined, positions: PortfolioPosition[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userEmail), JSON.stringify(positions));
  } catch {
    /* ignore storage errors */
  }
}
