import { create } from "zustand";

export type Role = "ADMIN" | "ENGINEER" | "VIEWER";

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  tenantId: string | null;
  role: Role | null;
  authReady: boolean;

  setAuth: (payload: {
    accessToken: string;
    userId: string;
    tenantId: string;
    role: Role;
  }) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  markReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  tenantId: null,
  role: null,
  authReady: false,

  setAuth: ({ accessToken, userId, tenantId, role }) =>
    set({ accessToken, userId, tenantId, role, authReady: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () =>
    set({
      accessToken: null,
      userId: null,
      tenantId: null,
      role: null,
      authReady: false,
    }),

  markReady: () => set({ authReady: true }),
}));
