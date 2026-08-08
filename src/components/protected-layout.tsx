"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }

    if (
      status === "authenticated" &&
      user?.deveAlterarSenha &&
      pathname !== "/trocar-senha"
    ) {
      router.replace("/trocar-senha");
      return;
    }

    if (
      status === "authenticated" &&
      user &&
      !user.deveAlterarSenha &&
      pathname === "/trocar-senha"
    ) {
      router.replace(
        user.papel === "ADMIN_GLOBAL"
          ? "/admin-global"
          : user.papel === "ADMIN_EMPRESA"
            ? "/empresa"
            : "/projetos",
      );
    }
  }, [pathname, router, status, user]);

  if (
    status !== "authenticated" ||
    !user ||
    (user.deveAlterarSenha && pathname !== "/trocar-senha") ||
    (!user.deveAlterarSenha && pathname === "/trocar-senha")
  ) {
    return <LoadingScreen />;
  }

  return children;
}
