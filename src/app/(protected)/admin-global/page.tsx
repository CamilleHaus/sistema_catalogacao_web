"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import type { Company, CompanyUser, Paginated } from "@/types/domain";

export default function GlobalAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Company[]>("/admin-global/empresas"),
      apiFetch<Paginated<CompanyUser>>("/admin-global/usuarios?limite=10"),
    ])
      .then(([companyData, userData]) => {
        if (!active) return;
        setCompanies(companyData);
        setUsers(userData.dados);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Não foi possível carregar a área global.",
          );
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await apiFetch("/admin-global/empresas", {
        method: "POST",
        body: JSON.stringify({
          empresa: { nome: data.get("empresaNome") },
          administrador: {
            nome: data.get("administradorNome"),
            email: data.get("administradorEmail"),
            cpf: data.get("administradorCpf"),
            senhaTemporaria: data.get("senhaTemporaria"),
          },
        }),
      });

      const companyData = await apiFetch<Company[]>("/admin-global/empresas");
      setCompanies(companyData);
      setSuccess("Empresa e primeiro administrador criados com sucesso.");
      form.reset();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível criar a empresa.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <RoleGate allow={["ADMIN_GLOBAL"]}>
      <AppShell>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-primary">Área global</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Visão administrativa</h1>
          </div>
        </div>
        {error && <div className="mt-6"><PageMessage message={error} /></div>}
        {success && (
          <div className="mt-6 rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-800">
            {success}
          </div>
        )}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">Criar empresa</h2>
            <p className="mt-1 text-sm text-ink-500">
              Cadastre a empresa e seu primeiro administrador de uma só vez.
            </p>
          </div>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreateCompany}>
            <FormField label="Nome da empresa" name="empresaNome" autoComplete="organization" />
            <FormField label="Nome do administrador" name="administradorNome" autoComplete="name" />
            <FormField label="E-mail do administrador" name="administradorEmail" type="email" autoComplete="email" />
            <FormField label="CPF do administrador" name="administradorCpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} />
            <FormField label="Senha temporária" name="senhaTemporaria" type="password" autoComplete="new-password" minLength={8} />
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Criando..." : "Criar empresa"}
              </button>
            </div>
          </form>
        </section>
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Empresas" value={companies.length} />
          <SummaryCard label="Usuários recentes" value={users.length} />
          <SummaryCard
            label="Projetos cadastrados"
            value={companies.reduce((total, item) => total + item._count.projetos, 0)}
          />
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-bold">Empresas</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {!loading && companies.length === 0 ? (
              <div className="md:col-span-2"><EmptyState>Nenhuma empresa cadastrada.</EmptyState></div>
            ) : (
              companies.map((company) => (
                <article key={company.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">{company.nome}</h3>
                  <p className="mt-2 text-sm text-ink-500">
                    {company._count.usuarios} usuários · {company._count.projetos} projetos
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </AppShell>
    </RoleGate>
  );
}

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-ink-700">
      {label}
      <input
        {...props}
        required
        className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-100"
      />
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-ink-950 p-5 text-white">
      <p className="text-sm text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
