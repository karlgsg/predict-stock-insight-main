import AuthPage from "@/components/AuthPage";
import HomePage from "@/components/HomePage";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { user, setUser, logout } = useAuth();

  if (!user) {
    return <AuthPage onAuth={setUser} />;
  }

  return <HomePage user={user} onLogout={logout} />;
};

export default Index;
