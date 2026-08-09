"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { ApiError } from "@/lib/api-error";
import { homeForRole } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const changePassword = useAuthStore((state) => state.changeRequiredPassword);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("novaSenha") ?? "");
    const confirmation = String(form.get("confirmacao") ?? "");

    if (password !== confirmation) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const updatedUser = await changePassword(password);
      router.replace(homeForRole(updatedUser.papel));
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Não foi possível alterar a senha.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-primary">Primeiro acesso</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Crie uma nova senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Antes de continuar, substitua a senha temporária por uma senha pessoal
          com pelo menos oito caracteres.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Nova senha
            <input
              name="novaSenha"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Confirme a nova senha
            <input
              name="confirmacao"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </label>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
