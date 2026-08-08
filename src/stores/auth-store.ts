"use client";

import { create } from "zustand";
import { parseApiError } from "@/lib/api-error";
import type { AuthResponse, AuthenticatedUser } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL não foi configurada.");
}

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  status: AuthStatus;
  bootstrap: () => Promise<void>;
  login: (email: string, senha: string) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  changeRequiredPassword: (novaSenha: string) => Promise<AuthenticatedUser>;
}

async function readAuthResponse(response: Response) {
  if (!response.ok) throw await parseApiError(response);
  return (await response.json()) as AuthResponse;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  status: "loading",

  bootstrap: async () => {
    await get().refreshSession();
  },

  login: async (email, senha) => {
    const result = await readAuthResponse(
      await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      }),
    );

    set({
      accessToken: result.accessToken,
      user: result.usuario,
      status: "authenticated",
    });
    return result.usuario;
  },

  refreshSession: async () => {
    try {
      const result = await readAuthResponse(
        await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        }),
      );
      set({
        accessToken: result.accessToken,
        user: result.usuario,
        status: "authenticated",
      });
      return result.accessToken;
    } catch {
      set({ accessToken: null, user: null, status: "anonymous" });
      return null;
    }
  },

  logout: async () => {
    const token = get().accessToken;

    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }

    set({ accessToken: null, user: null, status: "anonymous" });
  },

  changeRequiredPassword: async (novaSenha) => {
    const token = get().accessToken;
    if (!token) throw new Error("Sessão não encontrada.");

    const response = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ novaSenha }),
    });

    if (!response.ok) throw await parseApiError(response);
    const user = (await response.json()) as AuthenticatedUser;
    set({ user });
    return user;
  },
}));
