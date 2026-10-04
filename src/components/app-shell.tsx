"use client";

import type { LucideIcon } from "lucide-react";
import { LogOut, Settings, SquareLibrary, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { homeForRole } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import type { PapelUsuario } from "@/types/auth";

const roleLabels: Record<PapelUsuario, string> = {
  ADMIN_GLOBAL: "Administrador global",
  ADMIN_EMPRESA: "Administrador da empresa",
  USUARIO: "Usuário",
};

const NAV: Record<
  PapelUsuario,
  { href: string; label: string; icon: LucideIcon }[]
> = {
  ADMIN_GLOBAL: [],
  ADMIN_EMPRESA: [
    { href: "/empresa", label: "Clientes e projetos", icon: SquareLibrary },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
    { href: "/usuarios", label: "Usuários e acessos", icon: Users },
  ],
  USUARIO: [
    { href: "/projetos", label: "Projetos", icon: SquareLibrary },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) return null;

  const links = NAV[user.papel];

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-6 px-5 py-3 sm:px-8 lg:px-12">
          <Link
            href={homeForRole(user.papel)}
            className="-my-3 flex shrink-0 self-stretch"
          >
            {/* Só o símbolo, recortado na altura do M: o -my-3 + self-stretch
                fazem o M ir de borda a borda do header; os blocos que passam
                acima e abaixo dele ficam de fora do recorte. O translate puxa
                os blocos à esquerda do M (~19,5% da largura) para a margem,
                alinhando a haste do M com o título da página. */}
            <Image
              src="/logo-mille-simbolo.png"
              alt="mille catalogação"
              width={323}
              height={144}
              priority
              className="h-full w-auto -translate-x-[19.5%]"
            />
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.nome}</p>
              <p className="text-xs text-white/70">{roleLabels[user.papel]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <LogOut aria-hidden className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[100rem] flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  );
}
