import { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  name: string;
  email: string;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) setUserState(JSON.parse(stored) as AuthUser);
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  const setUser = (authUser: AuthUser) => {
    setUserState(authUser);
    try {
      localStorage.setItem("authUser", JSON.stringify(authUser));
    } catch {
      /* ignore storage errors */
    }
  };

  const logout = () => {
    setUserState(null);
    try {
      localStorage.removeItem("authUser");
    } catch {
      /* ignore storage errors */
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
