"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { decodeJwt } from "@/lib/jwt";

/**
 * Runs once on mount inside the console layout.
 * If the Zustand store is empty (e.g. after a page refresh), it calls the
 * Next.js refresh route to get a new access token and repopulates the store
 * by decoding the JWT payload (userId, tenantId, role).
 */
export function AuthInitializer() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || accessToken) return;
    initialized.current = true;

    fetch("/api/auth/refresh", { method: "POST" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ accessToken: token }: { accessToken: string }) => {
        const { userId, tenantId, role } = decodeJwt(token);
        setAuth({ accessToken: token, userId, tenantId, role });
      })
      .catch(() => {
        // Refresh failed - middleware will redirect to /login on next navigation
      });
  }, [accessToken, setAuth]);

  return null;
}
