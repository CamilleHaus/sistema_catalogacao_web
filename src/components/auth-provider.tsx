"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";

let bootstrapPromise: Promise<void> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    bootstrapPromise ??= useAuthStore.getState().bootstrap();
    void bootstrapPromise;
  }, []);

  return children;
}
