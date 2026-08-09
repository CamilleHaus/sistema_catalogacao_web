"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-error";
import { homeForRole } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && currentUser) {
      router.replace(
        currentUser.deveAlterarSenha
          ? "/trocar-senha"
          : homeForRole(currentUser.papel),
      );
    }
  }, [currentUser, router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);

    try {
      const user = await login(
        String(form.get("email") ?? ""),
        String(form.get("senha") ?? ""),
      );
      router.replace(
        user.deveAlterarSenha ? "/trocar-senha" : homeForRole(user.papel),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <Link href="/" className="text-sm font-medium text-primary">
          ← Página inicial
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Acesse sua conta</h1>
        <p className="mt-2 text-sm text-slate-500">
          Use o e-mail e a senha fornecidos pelo administrador.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input
              name="senha"
              type="password"
              minLength={8}
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </label>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
