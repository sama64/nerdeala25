export type ApiError = {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
};

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(input, {
    ...init,
    headers: Object.fromEntries(headers.entries())
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch (error) {
      // ignore invalid json, fallback to text
    }

    const error: ApiError = {
      message:
        (typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : response.statusText) || "Error inesperado",
      statusCode: response.status,
      details: typeof payload === "object" && payload && !Array.isArray(payload) ? (payload as Record<string, unknown>) : undefined
    };

    throw error;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
