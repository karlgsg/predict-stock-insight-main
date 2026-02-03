import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight, PieChart, TrendingUp, Shield, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { loadPortfolio, savePortfolio, type PortfolioPosition } from "@/lib/portfolio-store";
import { useAuth } from "@/context/AuthContext";

const recentActivity = [
  { type: "Buy", symbol: "NVDA", amount: "$3,500", time: "Today" },
  { type: "Sell", symbol: "TSLA", amount: "$1,200", time: "Yesterday" },
  { type: "Rebalance", symbol: "Portfolio", amount: "$5,000", time: "2 days ago" },
];

const riskColor = (risk: PortfolioPosition["risk"]) => {
  switch (risk) {
    case "Low":
      return "text-green-400";
    case "Medium":
      return "text-yellow-300";
    case "High":
      return "text-red-400";
    default:
      return "text-slate-300";
  }
};

const Portfolio = () => {
  const { user } = useAuth();
  const userEmail = user?.email;
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [activity, setActivity] = useState(recentActivity);
  const [form, setForm] = useState<PortfolioPosition>({
    symbol: "",
    name: "",
    shares: 0,
    price: 0,
    changePct: 0,
    costBasis: 0,
    risk: "Medium",
  });

  useEffect(() => {
    const loaded = loadPortfolio(userEmail);
    setPositions(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    savePortfolio(userEmail, positions);
  }, [positions, userEmail]);

  const totalValue = useMemo(() => positions.reduce((sum, p) => sum + p.price * p.shares, 0), [positions]);
  const totalCost = useMemo(() => positions.reduce((sum, p) => sum + p.costBasis * p.shares, 0), [positions]);
  const totalReturnPct = ((totalValue - totalCost) / totalCost) * 100;

  const allocationBars = positions.map((p) => {
    const value = p.price * p.shares;
    const pct = totalValue ? (value / totalValue) * 100 : 0;
    return { label: p.symbol, value: pct };
  });

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.name || form.shares <= 0 || form.price <= 0 || form.costBasis <= 0) return;
    const newPos: PortfolioPosition = {
      ...form,
      symbol: form.symbol.toUpperCase(),
    };
    setPositions((prev) => [...prev, newPos]);
    setActivity((prev) => [{ type: "Buy", symbol: newPos.symbol, amount: `$${(newPos.price * newPos.shares).toFixed(0)}`, time: "Just now" }, ...prev].slice(0, 6));
    setForm({ symbol: "", name: "", shares: 0, price: 0, changePct: 0, costBasis: 0, risk: "Medium" });
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
            <p className="text-slate-300">Performance, allocation, and risk in one place.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/app">
              <Button variant="outline" className="border-white/30 text-white">
                Home
              </Button>
            </Link>
            <Button variant="outline" className="border-blue-400 text-blue-200">
              <PieChart className="w-4 h-4 mr-2" />
              Rebalance (soon)
            </Button>
            <Button variant="gradient">
              <Bell className="w-4 h-4 mr-2" />
              Create alert
            </Button>
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
              <div className="flex items-center text-sm text-green-300">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                +{totalReturnPct.toFixed(1)}% vs cost basis
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Daily change</CardTitle>
              <CardDescription>Mock intraday move</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold text-green-300">+1.2%</p>
              <p className="text-sm text-slate-300">+$4,280 today</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Risk mix</CardTitle>
              <CardDescription>Allocation by risk tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Low</span>
                <span className="text-green-300">46%</span>
              </div>
              <Progress value={46} />
              <div className="flex items-center justify-between text-sm">
                <span>Medium</span>
                <span className="text-yellow-300">32%</span>
              </div>
              <Progress value={32} />
              <div className="flex items-center justify-between text-sm">
                <span>High</span>
                <span className="text-red-300">22%</span>
              </div>
              <Progress value={22} />
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Allocation, P&L, and risk</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>P/L</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => {
                  const value = p.price * p.shares;
                  const cost = p.costBasis * p.shares;
                  const pl = value - cost;
                  const plPct = ((value - cost) / cost) * 100;
                  const allocationPct = totalValue ? (value / totalValue) * 100 : 0;
                  return (
                    <TableRow key={p.symbol}>
                      <TableCell className="font-semibold">{p.symbol}</TableCell>
                      <TableCell className="text-slate-300">{p.name}</TableCell>
                      <TableCell>{p.shares}</TableCell>
                      <TableCell>${p.price.toFixed(2)}</TableCell>
                      <TableCell className={pl >= 0 ? "text-green-300" : "text-red-300"}>
                        {pl >= 0 ? <ArrowUpRight className="inline w-4 h-4 mr-1" /> : <ArrowDownRight className="inline w-4 h-4 mr-1" />}
                        ${pl.toFixed(0)} ({plPct.toFixed(1)}%)
                      </TableCell>
                      <TableCell>{allocationPct.toFixed(1)}%</TableCell>
                      <TableCell className={riskColor(p.risk)}>{p.risk}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(p.symbol)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              {recentActivity.map((a, i) => (
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
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Edit portfolio</CardTitle>
            <CardDescription>Add or remove positions</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid md:grid-cols-3 gap-4 mb-4" onSubmit={handleAddPosition}>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Apple Inc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  min="0"
                  step="1"
                  value={form.shares}
                  onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })}
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
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costBasis">Cost basis</Label>
                <Input
                  id="costBasis"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costBasis}
                  onChange={(e) => setForm({ ...form, costBasis: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Risk</Label>
                <Select
                  value={form.risk}
                  onValueChange={(v) => setForm({ ...form, risk: v as PortfolioPosition["risk"] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" variant="gradient">Add position</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/30 text-white"
                  onClick={() =>
                    setForm({ symbol: "", name: "", shares: 0, price: 0, changePct: 0, costBasis: 0, risk: "Medium" })
                  }
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>Bring portfolio actions into the app</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="outline" className="border-blue-400 text-blue-200 bg-blue-400/10 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Connect brokerage (coming soon)
            </Badge>
            <Badge variant="outline" className="border-green-400 text-green-200 bg-green-400/10 flex items-center gap-1">
              <Shield className="w-4 h-4" /> Risk alerts
            </Badge>
            <Badge variant="outline" className="border-yellow-300 text-yellow-100 bg-yellow-300/10 flex items-center gap-1">
              <Bell className="w-4 h-4" /> Price targets
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Portfolio;
