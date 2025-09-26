"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiGet, apiPost, setAuthToken } from "@/lib/api-client";
import type { User } from "@/types";

type SocialLoginPayload = {
  accessToken: string;
  googleAccessToken?: string | null;
  googleTokenExpiresAt?: string | null;
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  googleAccessToken: string | null;
  googleTokenExpiresAt: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (payload: { name: string; email: string; password: string; role: string }) => Promise<void>;
  completeSocialLogin: (payload: SocialLoginPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nerdeala-auth-token";
const GOOGLE_TOKEN_STORAGE_KEY = "nerdeala-google-access-token";
const GOOGLE_TOKEN_EXP_STORAGE_KEY = "nerdeala-google-token-exp";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleTokenExpiresAt, setGoogleTokenExpiresAt] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedToken = window.localStorage.getItem(STORAGE_KEY);
    const storedGoogleToken = window.localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    const storedGoogleTokenExp = window.localStorage.getItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);

    setGoogleAccessToken(storedGoogleToken ?? null);
    setGoogleTokenExpiresAt(storedGoogleTokenExp ?? null);

    if (storedToken) {
      setAuthToken(storedToken);
      setToken(storedToken);
      apiGet<User>("/api/v1/auth/me")
        .then((profile) => setUser(profile))
        .catch(() => {
          setAuthToken(null);
          setToken(null);
          setGoogleAccessToken(null);
          setGoogleTokenExpiresAt(null);
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
          window.localStorage.removeItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);
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
    setGoogleAccessToken(null);
    setGoogleTokenExpiresAt(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, response.access_token);
      window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);
    }
    const profile = await apiGet<User>("/api/v1/auth/me");
    setUser(profile);
  }, []);

  const completeSocialLogin = useCallback(async ({
    accessToken,
    googleAccessToken: incomingGoogleToken,
    googleTokenExpiresAt: incomingGoogleExpiry
  }: SocialLoginPayload) => {
    setAuthToken(accessToken);
    setToken(accessToken);
    const googleToken = incomingGoogleToken ?? null;
    const googleExpiry = incomingGoogleExpiry ?? null;
    setGoogleAccessToken(googleToken);
    setGoogleTokenExpiresAt(googleExpiry);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, accessToken);
      if (googleToken) {
        window.localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, googleToken);
      } else {
        window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      }
      if (googleExpiry) {
        window.localStorage.setItem(GOOGLE_TOKEN_EXP_STORAGE_KEY, googleExpiry);
      } else {
        window.localStorage.removeItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);
      }
    }

    const profile = await apiGet<User>("/api/v1/auth/me");
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setGoogleAccessToken(null);
    setGoogleTokenExpiresAt(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);
    }
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role: string }) => {
      await apiPost("/api/v1/auth/register", payload);
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      googleAccessToken,
      googleTokenExpiresAt,
      loading,
      login,
      logout,
      register,
      completeSocialLogin
    }),
    [
      completeSocialLogin,
      googleAccessToken,
      googleTokenExpiresAt,
      loading,
      login,
      logout,
      register,
      token,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
