import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setToken, getToken } from "./client";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  area: string;
  roles: ("user" | "owner" | "admin")[];
  status: "active" | "suspended";
  avatarColor: string;
  createdAt: number;
}

interface AuthContextValue {
  user: AppUser | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  register: (input: RegisterInput) => Promise<AppUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  city: string;
  password: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthResponse {
  user: AppUser;
  token: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [booting, setBooting] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setBooting(false);
      return;
    }
    try {
      const res = await api<{ user: AppUser }>("/auth/me");
      setUser(res.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
    });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // session may already be gone — log out locally regardless
    }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
