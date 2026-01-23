import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Holding = {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  price: number;
  changePercent: number;
};

const defaultHoldings: Holding[] = [
  { id: "aapl", symbol: "AAPL", shares: 12, avgCost: 165.4, price: 185.3, changePercent: 0.82 },
  { id: "tsla", symbol: "TSLA", shares: 5, avgCost: 238.1, price: 248.5, changePercent: -1.12 },
  { id: "nvda", symbol: "NVDA", shares: 3, avgCost: 720.0, price: 875.3, changePercent: 1.65 },
];

const storageKey = (email: string) => `portfolio_${email || "guest"}`;

interface PortfolioSectionProps {
  userEmail: string;
}

const PortfolioSection = ({ userEmail }: PortfolioSectionProps) => {
  const [holdings, setHoldings] = useState<Holding[]>(defaultHoldings);
  const [newPosition, setNewPosition] = useState({ symbol: "", shares: "", avgCost: "" });

  // Load / persist to localStorage per-user
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey(userEmail));
      if (raw) {
        setHoldings(JSON.parse(raw));
      } else {
        localStorage.setItem(storageKey(userEmail), JSON.stringify(defaultHoldings));
      }
    } catch {
      /* ignore storage errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey(userEmail), JSON.stringify(holdings));
    } catch {
      /* ignore storage errors */
    }
  }, [holdings, userEmail]);

  const metrics = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.price * h.shares, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.shares, 0);
    const totalPnL = totalValue - totalCost;
    const dayChange = holdings.reduce((sum, h) => sum + h.price * h.shares * (h.changePercent / 100), 0);
    const dayChangePct = totalValue ? (dayChange / totalValue) * 100 : 0;
    return { totalValue, totalCost, totalPnL, dayChange, dayChangePct };
  }, [holdings]);

  const addPosition = () => {
    const symbol = newPosition.symbol.trim().toUpperCase();
    const shares = parseFloat(newPosition.shares);
    const avgCost = parseFloat(newPosition.avgCost);
    if (!symbol || !shares || !avgCost || shares <= 0 || avgCost <= 0) return;

    // Simulate a current price around avg cost and a small daily move.
    const price = Number((avgCost * (1 + (Math.random() - 0.5) * 0.12)).toFixed(2));
    const changePercent = Number(((Math.random() - 0.5) * 4).toFixed(2));

    setHoldings((prev) => [
      ...prev,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${symbol}`,
        symbol,
        shares,
        avgCost,
        price,
        changePercent,
      },
    ]);
    setNewPosition({ symbol: "", shares: "", avgCost: "" });
  };

  const removePosition = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const valueColor = (val: number) => (val > 0 ? "text-profit" : val < 0 ? "text-loss" : "text-muted-foreground");

  return (
    <Card className="glass-card border-white/10 animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Portfolio Snapshot</CardTitle>
            <CardDescription>Track holdings, P/L, and daily moves</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Local preview
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Stat
            label="Portfolio value"
            value={`$${metrics.totalValue.toFixed(2)}`}
            detail={`Cost basis $${metrics.totalCost.toFixed(2)}`}
          />
          <Stat
            label="Total P/L"
            value={`${metrics.totalPnL >= 0 ? "+" : ""}$${metrics.totalPnL.toFixed(2)}`}
            valueClass={valueColor(metrics.totalPnL)}
          />
          <Stat
            label="Today's change"
            value={`${metrics.dayChange >= 0 ? "+" : ""}$${metrics.dayChange.toFixed(2)}`}
            valueClass={valueColor(metrics.dayChange)}
            detail={`${metrics.dayChangePct >= 0 ? "+" : ""}${metrics.dayChangePct.toFixed(2)}%`}
          />
          <Stat
            label="Positions"
            value={holdings.length.toString()}
            detail="Active holdings"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Holdings</h3>
              <span className="text-xs text-muted-foreground">Local mock data</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-right">Shares</th>
                    <th className="px-3 py-2 text-right">Avg Cost</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">P/L</th>
                    <th className="px-3 py-2 text-right">Day</th>
                    <th className="px-3 py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const value = h.price * h.shares;
                    const cost = h.avgCost * h.shares;
                    const pnl = value - cost;
                    const day = value * (h.changePercent / 100);
                    return (
                      <tr key={h.id} className="border-t border-white/5">
                        <td className="px-3 py-2 font-semibold">{h.symbol}</td>
                        <td className="px-3 py-2 text-right">{h.shares}</td>
                        <td className="px-3 py-2 text-right">${h.avgCost.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">${h.price.toFixed(2)}</td>
                        <td className={cn("px-3 py-2 text-right", valueColor(pnl))}>
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </td>
                        <td className={cn("px-3 py-2 text-right", valueColor(day))}>
                          {day >= 0 ? "+" : ""}${day.toFixed(2)} ({h.changePercent >= 0 ? "+" : ""}{h.changePercent.toFixed(2)}%)
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => removePosition(h.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {holdings.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={7}>
                        No positions yet. Add your first holding.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card border-white/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Add position</h3>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Ticker (e.g., MSFT)"
                value={newPosition.symbol}
                onChange={(e) => setNewPosition({ ...newPosition, symbol: e.target.value })}
                className="glass-card border-white/20"
              />
              <Input
                placeholder="Shares"
                type="number"
                min="0"
                value={newPosition.shares}
                onChange={(e) => setNewPosition({ ...newPosition, shares: e.target.value })}
                className="glass-card border-white/20"
              />
              <Input
                placeholder="Average cost ($)"
                type="number"
                min="0"
                value={newPosition.avgCost}
                onChange={(e) => setNewPosition({ ...newPosition, avgCost: e.target.value })}
                className="glass-card border-white/20"
              />
              <Button variant="gradient" className="w-full" onClick={addPosition}>
                Add to portfolio
              </Button>
              <p className="text-xs text-muted-foreground">
                Portfolio is stored locally per account for now. Hook this to your API when ready.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface StatProps {
  label: string;
  value: string;
  detail?: string;
  valueClass?: string;
}

const Stat = ({ label, value, detail, valueClass }: StatProps) => (
  <div className="glass-card border-white/10 p-4 space-y-1">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={cn("text-xl font-semibold", valueClass)}>{value}</p>
    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
  </div>
);

export default PortfolioSection;
