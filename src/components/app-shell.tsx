"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { homeForRole } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

const roleLabels = {
  ADMIN_GLOBAL: "Administrador global",
  ADMIN_EMPRESA: "Administrador da empresa",
  USUARIO: "Usuário",
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link
            href={homeForRole(user.papel)}
            className="text-lg font-bold tracking-tight"
          >
            Catálogo
          </Link>
          {user.papel === "ADMIN_EMPRESA" && (
            <nav className="flex flex-1 items-center gap-2 text-sm font-semibold">
              <Link
                href="/empresa"
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
              >
                Clientes e projetos
              </Link>
              <Link
                href="/cadastros"
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
              >
                Cadastros auxiliares
              </Link>
              <Link
                href="/usuarios"
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
              >
                Usuários e acessos
              </Link>
            </nav>
          )}
          {user.papel === "USUARIO" && (
            <nav className="flex flex-1 items-center gap-2 text-sm font-semibold">
              <Link
                href="/cadastros"
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
              >
                Cadastros auxiliares
              </Link>
            </nav>
          )}
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.nome}</p>
              <p className="text-xs text-slate-500">{roleLabels[user.papel]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
