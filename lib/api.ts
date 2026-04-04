import axios from "axios";
import { useAuthStore } from "@/store/auth";

/**
 * Auth Service (port 8086)
 *
 * Handles login, logout, token refresh, and user info retrieval.
 * All requests include the access token if available, but it does not handle 401 retries since it's only used for auth operations.
 * */
export const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL,
  headers: { "Content-Type": "application/json" },
});

authApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


/**
 * Incidents Service (port 8087)
 *
 * All incident-related operations: list, detail, state transitions, related log events, etc.
 * Has a 401-retry interceptor that attempts to refresh the token once on 401 responses.
 * If refresh fails, it clears auth state and redirects to login.
 */
export const incidentsApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_INCIDENTS_API_URL,
  headers: { "Content-Type": "application/json" },
});

incidentsApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Queue of requests waiting while a token refresh is in flight
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

incidentsApi.interceptors.response.use(
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
          return incidentsApi(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Refresh failed");

      const { accessToken } = await res.json();
      useAuthStore.getState().setAccessToken(accessToken);
      incidentsApi.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      original.headers.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      return incidentsApi(original);
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
