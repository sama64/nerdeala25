import { env } from "@/lib/env";
import { apiFetch } from "@/lib/fetcher";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function withAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  return {
    ...init,
    headers: Object.fromEntries(headers.entries())
  };
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(`${env.apiBaseUrl}${path}`, withAuth(init));
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return apiFetch<T>(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    ...withAuth(init)
  });
}

export async function apiPatch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return apiFetch<T>(`${env.apiBaseUrl}${path}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...withAuth(init)
  });
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(`${env.apiBaseUrl}${path}`, {
    method: "DELETE",
    ...withAuth(init)
  });
}
