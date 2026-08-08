"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { homeForRole } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import type { PapelUsuario } from "@/types/auth";

export function RoleGate({
  allow,
  children,
}: {
  allow: PapelUsuario[];
  children: ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user && !allow.includes(user.papel)) {
      router.replace(homeForRole(user.papel));
    }
  }, [allow, router, user]);

  if (!user || !allow.includes(user.papel)) return <LoadingScreen />;
  return children;
}
