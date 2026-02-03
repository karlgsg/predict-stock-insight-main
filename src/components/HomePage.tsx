import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ApiError, fetchStockPrediction, isApiConfigured, refreshToken as apiRefresh, type StockPredictionResponse } from "@/lib/api";
import { fetchSymbols, type SymbolResult } from "@/lib/symbols";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Shield,
  AlertTriangle,
  BarChart3,
  LogOut
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PortfolioSection from "./PortfolioSection";

interface User {
  name: string;
  email: string;
  token: string;
  refreshToken?: string;
}

interface HomePageProps {
  user: User;
  onLogout: () => void;
}

interface StockResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  prediction: "bullish" | "bearish" | "neutral";
  confidence: number;
}

const HomePage = ({ user, onLogout }: HomePageProps) => {
  const { setUser } = useAuth();
  const [searchTicker, setSearchTicker] = useState("");
  const [stockResult, setStockResult] = useState<StockResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SymbolResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Mock stock data for demo (in real app, this would call an API)
  const mockStockData: Record<string, StockResult> = {
    AAPL: {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 185.32,
      change: 2.45,
      changePercent: 1.34,
      prediction: "bullish",
      confidence: 87,
    },
    TSLA: {
      symbol: "TSLA", 
      name: "Tesla Inc.",
      price: 248.50,
      change: -5.23,
      changePercent: -2.06,
      prediction: "bearish",
      confidence: 73,
    },
    NVDA: {
      symbol: "NVDA",
      name: "NVIDIA Corporation", 
      price: 875.28,
      change: 15.67,
      changePercent: 1.82,
      prediction: "bullish",
      confidence: 92,
    },
  };

  const mapApiToStockResult = (data: StockPredictionResponse): StockResult => ({
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    prediction: data.prediction,
    confidence: data.confidence,
  });

  const getMockStockResult = (ticker: string): StockResult => {
    return (
      mockStockData[ticker.toUpperCase()] || {
        symbol: ticker.toUpperCase(),
        name: `${ticker.toUpperCase()} Company`,
        price: Math.random() * 200 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        prediction: Math.random() > 0.5 ? "bullish" : "bearish",
        confidence: Math.floor(Math.random() * 30 + 70),
      }
    );
  };

  const predictionMutation = useMutation({
    mutationFn: async (ticker: string) => {
      try {
        const apiResult = await fetchStockPrediction(ticker, user.token);
        return mapApiToStockResult(apiResult);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // If no API URL is configured, fall back to mock data to keep the UI usable.
        if (message.includes("VITE_API_URL")) {
          return getMockStockResult(ticker);
        }
        if (error instanceof ApiError && error.status === 401 && user.refreshToken) {
          // try refresh once
          const refreshed = await apiRefresh(user.refreshToken);
          setUser({
            name: refreshed.user.name,
            email: refreshed.user.email,
            token: refreshed.token,
            refreshToken: refreshed.refreshToken ?? user.refreshToken,
          });
          const retry = await fetchStockPrediction(ticker, refreshed.token);
          return mapApiToStockResult(retry);
        } else if (error instanceof ApiError && error.status === 401) {
          setStatusMessage("Session expired. Please sign in again.");
          onLogout();
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      setStatusMessage(null);
      setStockResult(result);
    },
    onError: (error) => {
      if (error instanceof Error) setStatusMessage(error.message);
      else setStatusMessage("Unable to fetch prediction. Please try again.");
    },
  });

  const handleSearch = (ticker?: string) => {
    const target = (ticker || selectedSymbol || "").trim();
    if (!target) {
      setStatusMessage("Please select a ticker from the list.");
      return;
    }
    setShowSuggestions(false);
    setStockResult(null);
    setStatusMessage(null);
    predictionMutation.mutate(target.toUpperCase());
  };

  const handleSymbolSelect = (symbol: string) => {
    setSearchTicker(symbol.toUpperCase());
    setShowSuggestions(false);
    setSelectedSymbol(symbol.toUpperCase());
    setSuggestions([]);
    setSuppressSuggestions(true);
    window.setTimeout(() => setSuppressSuggestions(false), 200);
    handleSearch(symbol);
  };

  useEffect(() => {
    if (!isApiConfigured()) return;
    if (suppressSuggestions) return;
    const query = searchTicker.trim();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!query) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const results = await fetchSymbols(query, 8);
        setSuggestions(results);
        setShowSuggestions(inputFocused && results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTicker, suppressSuggestions, inputFocused]);

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case "bullish": return "text-profit";
      case "bearish": return "text-loss";
      default: return "text-neutral";
    }
  };

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case "bullish": return <TrendingUp className="w-4 h-4" />;
      case "bearish": return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const riskCategories = [
    {
      title: "High Risk",
      icon: <AlertTriangle className="w-6 h-6" />,
      variant: "risk-high" as const,
      description: "Volatile growth stocks",
    },
    {
      title: "Medium Risk", 
      icon: <Target className="w-6 h-6" />,
      variant: "risk-medium" as const,
      description: "Balanced investments",
    },
    {
      title: "Low Risk",
      icon: <Shield className="w-6 h-6" />,
      variant: "risk-low" as const,
      description: "Stable blue chips",
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="p-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Predictable Stocks</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/portfolio">
              <Button variant="outline" size="sm" className="border-white/30 text-white">
                Portfolio
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Welcome Section */}
        <Card className="glass-card border-white/10 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}!</h2>
                <p className="text-muted-foreground">Ready to discover your next winning stock?</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Search */}
        <Card className="glass-card border-white/10 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Stock Search
            </CardTitle>
            <CardDescription>Enter a stock ticker to get AI-powered predictions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticker (e.g., AAPL, TSLA, NVDA)"
                value={searchTicker}
                onChange={(e) => {
                  setSearchTicker(e.target.value.toUpperCase());
                  setSelectedSymbol(null);
                  setSuppressSuggestions(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="glass-card border-white/20"
                onFocus={() => {
                  setInputFocused(true);
                  if (!suppressSuggestions && suggestions.length) setShowSuggestions(true);
                }}
                onBlur={() => {
                  // Slight delay so clicks on suggestions still register before hiding.
                  setTimeout(() => {
                    setInputFocused(false);
                    setShowSuggestions(false);
                  }, 120);
                }}
              />
              <Button 
                onClick={() => handleSearch()} 
                variant="gradient"
                disabled={predictionMutation.isPending || !searchTicker.trim()}
              >
                {predictionMutation.isPending ? "Analyzing..." : "Search"}
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <Card className="glass-card border-white/10">
                <CardContent className="p-2 space-y-1 max-h-60 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.symbol}
                      className="w-full text-left px-2 py-1 rounded hover:bg-white/10"
                      onClick={() => handleSymbolSelect(s.symbol)}
                    >
                      <span className="font-semibold">{s.symbol}</span>
                      <span className="text-sm text-muted-foreground ml-2">{s.name}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {!isApiConfigured() && (
              <p className="text-sm text-muted-foreground">
                Using mock data because VITE_API_URL is not set.
              </p>
            )}

            {statusMessage && (
              <p className="text-sm text-destructive">
                {statusMessage}
              </p>
            )}

            {/* Stock Result */}
            {stockResult && (
              <Card className="glass-card border-white/10 animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{stockResult.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{stockResult.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${stockResult.price.toFixed(2)}</p>
                      <p className={`text-sm flex items-center gap-1 ${stockResult.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {stockResult.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {stockResult.change >= 0 ? '+' : ''}{stockResult.change.toFixed(2)} ({stockResult.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${getPredictionColor(stockResult.prediction)} border-current`}>
                        {getPredictionIcon(stockResult.prediction)}
                        {stockResult.prediction.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {stockResult.confidence}% confidence
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Chart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Portfolio */}
        <PortfolioSection userEmail={user.email} />

        {/* Risk Categories */}
        <Card className="glass-card border-white/10 animate-slide-up">
          <CardHeader>
            <CardTitle>Risk Categories</CardTitle>
            <CardDescription>Explore stocks by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskCategories.map((category) => (
                <Button
                  key={category.title}
                  variant={category.variant}
                  className="h-auto p-6 flex-col gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    {category.icon}
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold">{category.title}</h3>
                    <p className="text-sm opacity-90">{category.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Powered by Predictable AI • Market data delayed by 15 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
