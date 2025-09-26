"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiGet, apiPost, setAuthToken } from "@/lib/api-client";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (payload: { name: string; email: string; password: string; role: string }) => Promise<void>;
  completeSocialLogin: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nerdeala-auth-token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (storedToken) {
      setAuthToken(storedToken);
      setToken(storedToken);
      apiGet<User>("/api/v1/auth/me")
        .then((profile) => setUser(profile))
        .catch(() => {
          setAuthToken(null);
          setToken(null);
          window.localStorage.removeItem(STORAGE_KEY);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiPost<{ access_token: string }>("/api/v1/auth/login", { email, password });
    setAuthToken(response.access_token);
    setToken(response.access_token);
    window.localStorage.setItem(STORAGE_KEY, response.access_token);
    const profile = await apiGet<User>("/api/v1/auth/me");
    setUser(profile);
  }, []);

  const completeSocialLogin = useCallback(async (accessToken: string) => {
    setAuthToken(accessToken);
    setToken(accessToken);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, accessToken);
    }
    const profile = await apiGet<User>("/api/v1/auth/me");
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role: string }) => {
      await apiPost("/api/v1/auth/register", payload);
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, logout, register, completeSocialLogin }),
    [completeSocialLogin, loading, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
