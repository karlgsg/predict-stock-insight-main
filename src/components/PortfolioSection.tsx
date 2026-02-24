import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPortfolio, savePortfolio, type PortfolioPosition } from "@/lib/portfolio-store";

type Holding = {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  price: number;
  changePercent: number;
};

interface PortfolioSectionProps {
  userEmail: string;
  userToken?: string;
}

const PortfolioSection = ({ userEmail, userToken }: PortfolioSectionProps) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadPortfolio(userEmail, userToken);
      if (cancelled) return;
      const mapped: Holding[] = loaded.map((p) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${p.symbol}`,
        symbol: p.symbol,
        shares: p.shares,
        avgCost: p.costBasis,
        price: p.price,
        changePercent: p.changePct ?? 0,
      }));
      setHoldings(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail, userToken]);

  useEffect(() => {
    // keep shared store in sync
    const toSave: PortfolioPosition[] = holdings.map((h) => ({
      symbol: h.symbol,
      name: h.symbol,
      shares: h.shares,
      price: h.price,
      costBasis: h.avgCost,
      changePct: h.changePercent,
      risk: "Medium",
    }));
    void savePortfolio(userEmail, toSave, userToken);
  }, [holdings, userEmail, userToken]);

  const metrics = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.price * h.shares, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.shares, 0);
    const totalPnL = totalValue - totalCost;
    const dayChange = holdings.reduce((sum, h) => sum + h.price * h.shares * (h.changePercent / 100), 0);
    const dayChangePct = totalValue ? (dayChange / totalValue) * 100 : 0;
    return { totalValue, totalCost, totalPnL, dayChange, dayChangePct };
  }, [holdings]);

  const removePosition = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const valueColor = (val: number) => (val > 0 ? "text-profit" : val < 0 ? "text-loss" : "text-muted-foreground");

  return (
    <Card className="glass-card border-white/10 animate-slide-up">
      <CardHeader>
        <div>
          <CardTitle>Portfolio Snapshot</CardTitle>
          <CardDescription>Track holdings, P/L, and daily moves</CardDescription>
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Holdings</h3>
            <span className="text-xs text-muted-foreground">Saved to your account</span>
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
                      No positions yet. Use the Portfolio page to add holdings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
