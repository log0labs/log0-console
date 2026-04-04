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
  const markReady = useAuthStore((s) => s.markReady);
  const accessToken = useAuthStore((s) => s.accessToken);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    // If already hydrated from a previous client-side login, just mark ready
    if (accessToken) {
      markReady();
      return;
    }
    initialized.current = true;

    fetch("/api/auth/refresh", { method: "POST" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ accessToken: token }: { accessToken: string }) => {
        const { userId, tenantId, role } = decodeJwt(token);
        setAuth({ accessToken: token, userId, tenantId, role });
      })
      .catch(() => {
        // Refresh failed - mark ready anyway so the UI unblocks;
        // middleware will redirect to /login on next navigation
        markReady();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
