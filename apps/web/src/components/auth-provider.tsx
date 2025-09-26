"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { apiGet, apiPost, setAuthToken } from '@/lib/api-client';
import type { User } from '@/types';

// Auth token storage functions
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nerdeala-auth-token');
}

function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nerdeala-auth-token');
}

function storeAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nerdeala-auth-token', token);
}

// Onboarding types - simplified for now
interface OnboardingState {
  completed: boolean;
  phone_e164?: string;
}

interface SocialLoginPayload {
  access_token: string;
  id_token: string;
  accessToken: string;
  googleAccessToken: string;
  googleTokenExpiresAt: string;
}

async function fetchOnboardingState(): Promise<OnboardingState> {
  try {
    return await apiGet<OnboardingState>('/api/v1/onboarding/');
  } catch (error) {
    return { completed: false };
  }
}

type SessionPayload = {
  user: User;
  onboarding: OnboardingState | null;
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  googleAccessToken: string | null;
  googleTokenExpiresAt: string | null;
  loading: boolean;
  onboardingState: OnboardingState | null;
  onboardingLoading: boolean;
  login: (email: string, password: string) => Promise<SessionPayload>;
  logout: () => void;
  register: (payload: { name: string; email: string; password: string; role: string }) => Promise<void>;
  completeSocialLogin: (payload: SocialLoginPayload) => Promise<SessionPayload>;
  refreshSession: () => Promise<SessionPayload | null>;
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
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  const clearStoredAuth = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setGoogleAccessToken(null);
    setGoogleTokenExpiresAt(null);
    setUser(null);
    setOnboardingState(null);
    removeAuthToken();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);
    }
  }, []);

  const fetchSession = useCallback(async () => {
    const profile = await apiGet<User>("/api/v1/auth/me");
    let onboarding: OnboardingState | null = null;
    try {
      onboarding = await fetchOnboardingState();
    } catch (error) {
      onboarding = null;
    }
    setUser(profile);
    setOnboardingState(onboarding);
    return { user: profile, onboarding } satisfies SessionPayload;
  }, []);

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
      setLoading(true);
      setOnboardingLoading(true);
      fetchSession()
        .catch(() => {
          clearStoredAuth();
        })
        .finally(() => {
          setLoading(false);
          setOnboardingLoading(false);
        });
    } else {
      setLoading(false);
      setOnboardingLoading(false);
    }
  }, [clearStoredAuth, fetchSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiPost<{ access_token: string }>("/api/v1/auth/login", { email, password });
      setAuthToken(response.access_token);
      setToken(response.access_token);
      setGoogleAccessToken(null);
      setGoogleTokenExpiresAt(null);
      storeAuthToken(response.access_token);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(GOOGLE_TOKEN_EXP_STORAGE_KEY);
      }

      setOnboardingLoading(true);
      try {
        return await fetchSession();
      } catch (error) {
        clearStoredAuth();
        throw error;
      } finally {
        setOnboardingLoading(false);
      }
    },
    [clearStoredAuth, fetchSession]
  );

  const completeSocialLogin = useCallback(
    async ({
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

      storeAuthToken(accessToken);
      if (typeof window !== "undefined") {
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

      setOnboardingLoading(true);
      try {
        return await fetchSession();
      } catch (error) {
        clearStoredAuth();
        throw error;
      } finally {
        setOnboardingLoading(false);
      }
    },
    [clearStoredAuth, fetchSession]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
  }, [clearStoredAuth]);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role: string }) => {
      await apiPost("/api/v1/auth/register", payload);
    },
    []
  );

  const refreshSession = useCallback(async () => {
    if (!token) return null;
    setOnboardingLoading(true);
    try {
      return await fetchSession();
    } catch (error) {
      clearStoredAuth();
      throw error;
    } finally {
      setOnboardingLoading(false);
    }
  }, [clearStoredAuth, fetchSession, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      googleAccessToken,
      googleTokenExpiresAt,
      loading,
      onboardingState,
      onboardingLoading,
      login,
      logout,
      register,
      completeSocialLogin,
      refreshSession
    }),
    [
      completeSocialLogin,
      googleAccessToken,
      googleTokenExpiresAt,
      loading,
      login,
      logout,
      onboardingLoading,
      onboardingState,
      refreshSession,
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
