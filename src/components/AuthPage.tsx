import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, TrendingUp } from "lucide-react";
import { login, register } from "@/lib/api";

interface AuthPageProps {
  onAuth: (user: { name: string; email: string; token: string; refreshToken?: string }) => void;
}

const AuthPage = ({ onAuth }: AuthPageProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const authMutation = useMutation({
    mutationFn: async () => {
      if (isLogin) {
        return login(formData.email, formData.password);
      }
      return register(formData.name, formData.email, formData.password);
    },
    onSuccess: (data) => {
      onAuth({
        name: data.user.name,
        email: data.user.email,
        token: data.token,
        refreshToken: data.refreshToken,
      });
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      setErrorMessage(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    authMutation.mutate();
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className={`w-full ${isLogin ? "max-w-md" : "max-w-4xl"} animate-fade-in`}>
        <div className="mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-primary"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Predictable Stocks
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered stock predictions at your fingertips
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass-card border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Sign in to access your portfolio" 
                : "Join thousands of smart investors"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="glass-card border-white/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        className="glass-card border-white/20 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-sm text-destructive text-center">{errorMessage}</p>
                  )}

                  <Button 
                    type="submit" 
                    variant="gradient" 
                    className="w-full" 
                    size="lg"
                    disabled={authMutation.isPending}
                  >
                    {authMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsLogin(false);
                      setErrorMessage(null);
                    }}
                    className="text-sm hover:text-primary"
                  >
                    Don't have an account? Sign up
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 items-start">
                <div className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="glass-card border-white/20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="glass-card border-white/20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          className="glass-card border-white/20 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {errorMessage && (
                      <p className="text-sm text-destructive text-center">{errorMessage}</p>
                    )}

                    <Button 
                      type="submit" 
                      variant="gradient" 
                      className="w-full" 
                      size="lg"
                      disabled={authMutation.isPending}
                    >
                      {authMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsLogin(true);
                        setErrorMessage(null);
                      }}
                      className="text-sm hover:text-primary"
                    >
                      Already have an account? Sign in
                    </Button>
                  </div>
                </div>

                <div className="glass-card border-white/10 p-5 space-y-3 md:mt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Included in Free
                  </div>
                  <h3 className="text-xl font-semibold">What you get</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      Real-time stock predictions using our advanced predictable AI.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      Curated watchlist with sentiment insights to track movers.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      Portfolio made easy to use so you can track all investments.
                    </li>
                  </ul>
                  <div className="pt-3 border-t border-white/5 text-sm text-muted-foreground">
                    Looking for more advanced features?{" "}
                    <span className="text-primary font-semibold">Check our premium plans.</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          Powered by Predictable AI
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
