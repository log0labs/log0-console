import axios, { type AxiosInstance } from "axios";
import { useAuthStore } from "@/store/auth";
import { decodeJwt } from "@/lib/jwt";

/**
 * Auth Service (port 8086)
 *
 * Handles login, logout, token refresh, and user info retrieval.
 * All requests include the access token if available, but it does not handle 401 retries since it's only used for auth operations.
 * */
export const authApi = axios.create({
  headers: { "Content-Type": "application/json" },
});

authApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// One refresh at a time. Refresh tokens rotate, so two refreshes at once would make the second one
// fail and log the user out: every caller (an axios 401, the event-stream reader) shares the same
// in-flight promise instead.
let refreshing: Promise<string> | null = null;

/** Get a fresh access token from the refresh cookie and store it. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<string> {
  refreshing ??= (async () => {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (!res.ok) throw new Error("Refresh failed");

    const { accessToken } = (await res.json()) as { accessToken: string };
    const { userId, tenantId, role } = decodeJwt(accessToken);
    useAuthStore.getState().setAuth({ accessToken, userId, tenantId, role });
    return accessToken;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

let endingSession = false;

/** The session cannot be recovered: clear it and send the user to the login page (once, however many calls failed). */
export async function endSession(): Promise<void> {
  if (endingSession) return;
  endingSession = true;
  try {
    useAuthStore.getState().clearAuth();
    await fetch("/api/auth/cookie", { method: "DELETE" });
    window.location.href = "/login";
  } finally {
    endingSession = false;
  }
}

/**
 * An axios client for a backend that needs the access token.
 *
 * It adds `Authorization: Bearer <token>` to every request, and on a 401 refreshes the token
 * once and retries. Concurrent 401s share one refresh. If the refresh fails the session ends.
 */
export function createAuthedApi(): AxiosInstance {
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;

      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }
      original._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return instance(original);
      } catch (err) {
        await endSession();
        return Promise.reject(err);
      }
    }
  );

  return instance;
}

/**
 * Incidents Service (port 8087)
 *
 * All incident-related operations: list, detail, state transitions, related log events, etc.
 */
export const incidentsApi = createAuthedApi();

/**
 * AI Service (port 8085)
 *
 * AI investigations of incidents, the repositories and LLM settings they use. Same token
 * handling as the incidents client; the console proxy routes these paths to AI_API_URL.
 */
export const aiApi = createAuthedApi();

/**
 * Log out: revoke the refresh token on the server first (best effort, so a network error never traps the
 * user in a session), then clear the local session and go to the login page.
 */
export async function signOut(): Promise<void> {
  try {
    await authApi.post("/api/v1/auth/logout");
  } catch {
    /* the local session is cleared either way */
  }
  await endSession();
}
