import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Bell, Search, BarChart3 } from "lucide-react";

const samplePicks = [
  { symbol: "AAPL", name: "Apple Inc.", prediction: "Bullish", confidence: "87%", risk: "Low" },
  { symbol: "TSLA", name: "Tesla, Inc.", prediction: "Bearish", confidence: "73%", risk: "High" },
  { symbol: "NVDA", name: "NVIDIA Corp.", prediction: "Bullish", confidence: "92%", risk: "Medium" },
];

const features = [
  { icon: <Search className="w-5 h-5" />, title: "Smart search", desc: "Autocomplete across thousands of tickers with AI-backed summaries." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Predictive signals", desc: "Confidence scores and direction calls for the next move." },
  { icon: <Shield className="w-5 h-5" />, title: "Risk-aware", desc: "Risk tiers so you can pick entries that match your profile." },
  { icon: <Bell className="w-5 h-5" />, title: "Alerts", desc: "Stay notified as signals shift (coming soon)." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold">Predictable Stocks</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app">
            <Button variant="ghost" className="text-slate-100">Log in</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16 space-y-16">
        <section className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-blue-400 text-blue-200 bg-blue-400/10">AI-powered signals</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Invest with clearer signals.
              <br />
              Let AI surface the next move.
            </h1>
            <p className="text-lg text-slate-300">
              Get AI-driven predictions with confidence and risk tiers, so you can spot opportunities faster and act with conviction.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/app">
                <Button size="lg" variant="gradient">Start free</Button>
              </Link>
              <a href="#demo" className="inline-block">
                <Button size="lg" variant="outline" className="border-blue-400 text-blue-200">
                  Demo 
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span>Real-time autocomplete</span>
              <span>•</span>
              <span>Risk-aware picks</span>
              <span>•</span>
              <span>Alerts coming soon</span>
            </div>
          </div>

          <Card id="demo" className="bg-white/5 border-white/10 shadow-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Sample predictions</p>
                  <p className="text-xl font-semibold">Today&apos;s picks</p>
                </div>
                <Badge className="bg-green-500 text-green-950">Live soon</Badge>
              </div>
              <div className="space-y-3">
                {samplePicks.map((pick) => (
                  <div key={pick.symbol} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pick.symbol}</p>
                      <p className="text-sm text-slate-400">{pick.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-300">{pick.prediction}</p>
                      <p className="text-sm font-semibold text-blue-300">{pick.confidence} confidence</p>
                      <p className="text-xs text-slate-400">Risk: {pick.risk}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">Predictions shown are illustrative; live model results coming soon.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="bg-white/5 border-white/10 h-full">
              <CardContent className="p-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-blue-300">
                  {f.icon}
                </div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-slate-300">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-blue-200">Built for decisive investors</p>
              <p className="text-2xl font-semibold">From search to signal in seconds</p>
              <p className="text-slate-300">Autocomplete, prediction, and risk—without the noise.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/app">
                <Button size="lg" variant="gradient">Start free</Button>
              </Link>
              <a href="#demo" className="inline-block">
                <Button size="lg" variant="outline" className="border-blue-400 text-blue-200">
                  View sample signals
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
