import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight, PieChart, TrendingUp, Shield, Bell } from "lucide-react";

type Position = {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  changePct: number;
  costBasis: number;
  allocation: number;
  risk: "Low" | "Medium" | "High";
};

const positions: Position[] = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 42, price: 185.32, changePct: 1.3, costBasis: 160.0, allocation: 28, risk: "Low" },
  { symbol: "TSLA", name: "Tesla, Inc.", shares: 18, price: 248.5, changePct: -2.1, costBasis: 230.0, allocation: 18, risk: "High" },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 12, price: 875.28, changePct: 1.9, costBasis: 520.0, allocation: 24, risk: "Medium" },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 15, price: 398.2, changePct: 0.6, costBasis: 340.0, allocation: 12, risk: "Low" },
  { symbol: "QQQ", name: "Invesco QQQ ETF", shares: 10, price: 412.5, changePct: 0.4, costBasis: 370.0, allocation: 10, risk: "Medium" },
  { symbol: "BND", name: "Vanguard Total Bond ETF", shares: 30, price: 72.3, changePct: 0.1, costBasis: 70.0, allocation: 8, risk: "Low" },
];

const recentActivity = [
  { type: "Buy", symbol: "NVDA", amount: "$3,500", time: "Today" },
  { type: "Sell", symbol: "TSLA", amount: "$1,200", time: "Yesterday" },
  { type: "Rebalance", symbol: "Portfolio", amount: "$5,000", time: "2 days ago" },
];

const riskColor = (risk: Position["risk"]) => {
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
  const totalValue = useMemo(() => positions.reduce((sum, p) => sum + p.price * p.shares, 0), []);
  const totalCost = useMemo(() => positions.reduce((sum, p) => sum + p.costBasis * p.shares, 0), []);
  const totalReturnPct = ((totalValue - totalCost) / totalCost) * 100;

  const allocationBars = positions.map((p) => ({
    label: p.symbol,
    value: p.allocation,
  }));

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => {
                  const value = p.price * p.shares;
                  const cost = p.costBasis * p.shares;
                  const pl = value - cost;
                  const plPct = ((value - cost) / cost) * 100;
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
                      <TableCell>{p.allocation}%</TableCell>
                      <TableCell className={riskColor(p.risk)}>{p.risk}</TableCell>
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
                    <span>{a.value}%</span>
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
