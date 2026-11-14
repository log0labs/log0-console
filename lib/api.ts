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

// Queue of requests waiting while a token refresh is in flight. It is shared by every client
// built with createAuthedApi: there is one session, so one refresh serves them all.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

/**
 * An axios client for a backend that needs the access token.
 *
 * It adds `Authorization: Bearer <token>` to every request, and on a 401 refreshes the token
 * once and retries. Concurrent 401s wait for the same refresh. If the refresh fails it clears
 * the auth state and sends the user to the login page.
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

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return instance(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) throw new Error("Refresh failed");

        const { accessToken } = await res.json();
        const { userId, tenantId, role } = decodeJwt(accessToken);
        useAuthStore
          .getState()
          .setAuth({ accessToken, userId, tenantId, role });
        instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        original.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return instance(original);
      } catch (err) {
        processQueue(err);
        useAuthStore.getState().clearAuth();
        await fetch("/api/auth/cookie", { method: "DELETE" });
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
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
