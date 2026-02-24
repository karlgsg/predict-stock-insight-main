import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { fetchQuotes, type QuoteResponse } from "@/lib/api";
import { loadPortfolio, savePortfolio, type PortfolioPosition } from "@/lib/portfolio-store";
import { fetchSupportedSymbols, fetchSymbols, type SymbolResult } from "@/lib/symbols";
import { useAuth } from "@/context/AuthContext";

const initialActivity: Array<{ type: string; symbol: string; amount: string; time: string }> = [];

const Portfolio = () => {
  const { user } = useAuth();
  const userEmail = user?.email;
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [activity, setActivity] = useState(initialActivity);
  const [supportedSet, setSupportedSet] = useState<Set<string>>(new Set());
  const [showAiOnly, setShowAiOnly] = useState(false);
  const [quotesBySymbol, setQuotesBySymbol] = useState<Record<string, QuoteResponse>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quotesUpdatedAt, setQuotesUpdatedAt] = useState<Date | null>(null);
  const [symbolSuggestions, setSymbolSuggestions] = useState<SymbolResult[]>([]);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [symbolFocused, setSymbolFocused] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioPosition>({
    symbol: "",
    name: "",
    shares: 0,
    price: 0,
    changePct: 0,
    costBasis: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadPortfolio(userEmail, user?.token);
      if (!cancelled) setPositions(loaded);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, user?.token]);

  useEffect(() => {
    void savePortfolio(userEmail, positions, user?.token);
  }, [positions, userEmail, user?.token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const symbols = await fetchSupportedSymbols();
        if (!cancelled) {
          setSupportedSet(new Set(symbols.map((s) => s.toUpperCase())));
        }
      } catch {
        if (!cancelled) setSupportedSet(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const run = async () => {
      if (!user?.token || positions.length === 0) {
        if (!cancelled) {
          setQuotesBySymbol({});
          setQuotesLoading(false);
          setQuotesError(null);
        }
        return;
      }

      if (!cancelled) setQuotesLoading(true);
      try {
        const symbols = positions.map((p) => p.symbol.toUpperCase());
        const quotes = await fetchQuotes(symbols, user.token);
        if (cancelled) return;
        const next: Record<string, QuoteResponse> = {};
        for (const q of quotes) {
          next[q.symbol.toUpperCase()] = q;
        }
        setQuotesBySymbol(next);
        setQuotesUpdatedAt(new Date());
        setQuotesError(null);
      } catch {
        if (!cancelled) {
          setQuotesError("Live quotes unavailable");
        }
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    };

    void run();
    intervalId = window.setInterval(() => {
      void run();
    }, 60_000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [positions, user?.token]);

  useEffect(() => {
    if (!symbolFocused) return;
    const query = form.symbol.trim();
    if (!query) {
      setSymbolSuggestions([]);
      setShowSymbolSuggestions(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const results = await fetchSymbols(query, 8, false);
        setSymbolSuggestions(results);
        setShowSymbolSuggestions(results.length > 0);
      } catch {
        setSymbolSuggestions([]);
        setShowSymbolSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [form.symbol, symbolFocused]);

  const positionsWithLive = useMemo(
    () =>
      positions.map((p) => {
        const live = quotesBySymbol[p.symbol.toUpperCase()];
        return {
          ...p,
          price: live?.price ?? p.price,
          changePct: live?.changePct ?? p.changePct,
        };
      }),
    [positions, quotesBySymbol]
  );

  const totalValue = useMemo(
    () => positionsWithLive.reduce((sum, p) => sum + p.price * p.shares, 0),
    [positionsWithLive]
  );
  const totalCost = useMemo(
    () => positionsWithLive.reduce((sum, p) => sum + p.costBasis * p.shares, 0),
    [positionsWithLive]
  );
  const totalReturnPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const dayChange = useMemo(
    () => positionsWithLive.reduce((sum, p) => sum + p.price * p.shares * ((p.changePct || 0) / 100), 0),
    [positionsWithLive]
  );
  const dayChangePct = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

  const displayedPositions = useMemo(() => {
    if (!showAiOnly) return positionsWithLive;
    return positionsWithLive.filter((p) => supportedSet.has(p.symbol.toUpperCase()));
  }, [positionsWithLive, showAiOnly, supportedSet]);

  const allocationBars = displayedPositions.map((p) => {
    const value = p.price * p.shares;
    const pct = totalValue ? (value / totalValue) * 100 : 0;
    return { label: p.symbol, value: pct };
  });

  const quoteStatus = useMemo(() => {
    if (quotesLoading) return "Updating quotes...";
    if (quotesError) return quotesError;
    if (quotesUpdatedAt) return `Quotes updated ${quotesUpdatedAt.toLocaleTimeString()}`;
    return "Quotes pending";
  }, [quotesLoading, quotesError, quotesUpdatedAt]);

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    void (async () => {
      if (!form.symbol || form.shares <= 0 || form.price <= 0) return;

      const targetSymbol = form.symbol.trim().toUpperCase();
      let resolvedSymbol: SymbolResult | null = null;
      if (selectedSymbol && selectedSymbol.symbol.toUpperCase() === targetSymbol) {
        resolvedSymbol = selectedSymbol;
      } else {
        const found = await fetchSymbols(targetSymbol, 10, false);
        resolvedSymbol = found.find((s) => s.symbol.toUpperCase() === targetSymbol) ?? null;
      }

      if (!resolvedSymbol) {
        setFormError("Select a valid symbol from suggestions.");
        return;
      }

      setPositions((prev) => {
        const idx = prev.findIndex((p) => p.symbol.toUpperCase() === targetSymbol);
        if (idx === -1) {
          const newPos: PortfolioPosition = {
            ...form,
            symbol: targetSymbol,
            name: resolvedSymbol.name,
            costBasis: form.price,
          };
          return [...prev, newPos];
        }

        const existing = prev[idx];
        const newShares = existing.shares + form.shares;
        const weightedCostBasis =
          (existing.costBasis * existing.shares + form.price * form.shares) / newShares;

        const merged: PortfolioPosition = {
          ...existing,
          symbol: targetSymbol,
          name: resolvedSymbol.name,
          shares: Number(newShares.toFixed(6)),
          price: form.price,
          costBasis: Number(weightedCostBasis.toFixed(6)),
        };

        const next = [...prev];
        next[idx] = merged;
        return next;
      });
      setActivity((prev) => [{ type: "Buy", symbol: targetSymbol, amount: `$${(form.price * form.shares).toFixed(0)}`, time: "Just now" }, ...prev].slice(0, 6));
      setSelectedSymbol(null);
      setSymbolSuggestions([]);
      setShowSymbolSuggestions(false);
      setForm({ symbol: "", name: "", shares: 0, price: 0, changePct: 0, costBasis: 0 });
    })();
  };

  const handleRemove = (symbol: string) => {
    setPositions((prev) => prev.filter((p) => p.symbol !== symbol));
    setActivity((prev) => [{ type: "Sell", symbol, amount: "Removed", time: "Just now" }, ...prev].slice(0, 6));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-blue-200">Portfolio overview</p>
            <h1 className="text-3xl font-bold">Your holdings at a glance</h1>
            <p className="text-slate-300">Performance and allocation with live market quotes.</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="border-blue-400 text-blue-200 bg-blue-400/10">
              {quoteStatus}
            </Badge>
            <Link to="/app">
              <Button variant="outline" className="border-white/30 text-white">
                Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Total value</CardTitle>
              <CardDescription>Current market value</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold">${totalValue.toFixed(0)}</p>
              <div className={`flex items-center text-sm ${totalReturnPct >= 0 ? "text-green-300" : "text-red-300"}`}>
                <ArrowUpRight className="w-4 h-4 mr-1" />
                {totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(1)}% vs cost basis
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Daily change</CardTitle>
              <CardDescription>Estimated from live quote vs previous close</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className={`text-3xl font-bold ${dayChange >= 0 ? "text-green-300" : "text-red-300"}`}>
                {dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%
              </p>
              <p className="text-sm text-slate-300">
                {dayChange >= 0 ? "+" : ""}${dayChange.toFixed(2)} today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Positions</CardTitle>
              <CardDescription>Total active holdings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold">{positions.length}</p>
              <p className="text-sm text-slate-300">
                {positions.length === 1 ? "1 holding tracked" : `${positions.length} holdings tracked`}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Allocation and P/L</CardDescription>
            <div className="flex gap-2">
              <Button
                variant={showAiOnly ? "outline" : "gradient"}
                size="sm"
                onClick={() => setShowAiOnly(false)}
              >
                All
              </Button>
              <Button
                variant={showAiOnly ? "gradient" : "outline"}
                size="sm"
                onClick={() => setShowAiOnly(true)}
              >
                AI Supported
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>P/L</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedPositions.map((p) => {
                  const value = p.price * p.shares;
                  const cost = p.costBasis * p.shares;
                  const pl = value - cost;
                  const plPct = ((value - cost) / cost) * 100;
                  const day = value * ((p.changePct || 0) / 100);
                  const allocationPct = totalValue ? (value / totalValue) * 100 : 0;
                  const aiSupported = supportedSet.has(p.symbol.toUpperCase());
                  return (
                    <TableRow key={p.symbol}>
                      <TableCell className="font-semibold">{p.symbol}</TableCell>
                      <TableCell className="text-slate-300">{p.name}</TableCell>
                      <TableCell>{p.shares}</TableCell>
                      <TableCell>${p.price.toFixed(2)}</TableCell>
                      <TableCell className={day >= 0 ? "text-green-300" : "text-red-300"}>
                        {day >= 0 ? "+" : ""}${day.toFixed(2)} ({p.changePct >= 0 ? "+" : ""}{p.changePct.toFixed(2)}%)
                      </TableCell>
                      <TableCell className={pl >= 0 ? "text-green-300" : "text-red-300"}>
                        {pl >= 0 ? <ArrowUpRight className="inline w-4 h-4 mr-1" /> : <ArrowDownRight className="inline w-4 h-4 mr-1" />}
                        ${pl.toFixed(0)} ({plPct.toFixed(1)}%)
                      </TableCell>
                      <TableCell>{allocationPct.toFixed(1)}%</TableCell>
                      <TableCell>
                        {aiSupported ? (
                          <Badge variant="outline" className="border-green-400 text-green-300">
                            AI Supported
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-500 text-slate-300">
                            Tracking only
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(p.symbol)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {displayedPositions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-400 py-6">
                      No positions in this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Allocation</CardTitle>
              <CardDescription>How capital is split</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allocationBars.map((a) => (
                <div key={a.label}>
                  <div className="flex justify-between text-sm text-slate-200">
                    <span>{a.label}</span>
                    <span>{a.value.toFixed(1)}%</span>
                  </div>
                  <Progress value={a.value} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest moves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="font-semibold">{a.type}</p>
                    <p className="text-sm text-slate-300">{a.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-200">{a.amount}</p>
                    <p className="text-xs text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-slate-400">No recent actions yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Edit portfolio</CardTitle>
            <CardDescription>Add buy trades (cost basis auto-calculated)</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid md:grid-cols-3 gap-4 mb-4" onSubmit={handleAddPosition}>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={form.symbol}
                  onChange={(e) => {
                    setSelectedSymbol(null);
                    setFormError(null);
                    setForm({ ...form, symbol: e.target.value.toUpperCase() });
                  }}
                  onFocus={() => {
                    setSymbolFocused(true);
                    if (symbolSuggestions.length > 0) setShowSymbolSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setSymbolFocused(false);
                      setShowSymbolSuggestions(false);
                    }, 120);
                  }}
                  placeholder="AAPL"
                  required
                />
                {showSymbolSuggestions && symbolSuggestions.length > 0 && (
                  <div className="rounded-md border border-white/10 bg-slate-900 max-h-56 overflow-auto">
                    {symbolSuggestions.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-white/10"
                        onClick={() => {
                          setSelectedSymbol(s);
                          setFormError(null);
                          setForm((prev) => ({ ...prev, symbol: s.symbol, name: s.name }));
                          setShowSymbolSuggestions(false);
                        }}
                      >
                        <span className="font-semibold">{s.symbol}</span>
                        <span className="ml-2 text-sm text-slate-300">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  readOnly
                  placeholder="Auto-filled from symbol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  min="0"
                  step="1"
                  value={form.shares === 0 ? "" : form.shares}
                  onChange={(e) =>
                    setForm({ ...form, shares: e.target.value === "" ? 0 : Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price === 0 ? "" : form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value === "" ? 0 : Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" variant="gradient">Add buy trade</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/30 text-white"
                  onClick={() => {
                    setSelectedSymbol(null);
                    setSymbolSuggestions([]);
                    setShowSymbolSuggestions(false);
                    setFormError(null);
                    setForm({ symbol: "", name: "", shares: 0, price: 0, changePct: 0, costBasis: 0 });
                  }}
                >
                  Clear
                </Button>
              </div>
              {formError && (
                <p className="md:col-span-3 text-sm text-red-300">{formError}</p>
              )}
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Portfolio;
