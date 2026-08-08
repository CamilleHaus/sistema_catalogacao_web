"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import type { Client, CompanyUser, Paginated, Project } from "@/types/domain";

export default function CompanyAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    return Promise.all([
      apiFetch<Project[]>("/projetos"),
      apiFetch<Client[]>("/clientes"),
      apiFetch<Paginated<CompanyUser>>("/usuarios?limite=10"),
    ]);
  }, []);

  useEffect(() => {
    let active = true;
    loadData()
      .then(([projectData, clientData, userData]) => {
        if (!active) return;
        setProjects(projectData);
        setClients(clientData);
        setUsers(userData.dados);
      })
      .catch((caughtError: unknown) => {
        if (active) setError(messageFrom(caughtError, "Não foi possível carregar a empresa."));
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadData]);

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await submit(
      () => apiFetch("/clientes", {
        method: "POST",
        body: JSON.stringify({
          nome: data.get("nome"),
          codigo: data.get("codigo"),
          descricao: data.get("descricao") || undefined,
        }),
      }),
      "Cliente criado com sucesso.",
      form,
    );
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await submit(
      () => apiFetch("/projetos", {
        method: "POST",
        body: JSON.stringify({ nome: data.get("nome"), clienteId: data.get("clienteId") }),
      }),
      "Projeto criado com sucesso.",
      form,
    );
  }

  async function submit(action: () => Promise<unknown>, successMessage: string, form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      const [projectData, clientData, userData] = await loadData();
      setProjects(projectData);
      setClients(clientData);
      setUsers(userData.dados);
      form.reset();
      setSuccess(successMessage);
    } catch (caughtError: unknown) {
      setError(messageFrom(caughtError, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["ADMIN_EMPRESA"]}>
      <AppShell>
        <p className="text-sm font-semibold text-cyan-700">Gestão da empresa</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Clientes e projetos</h1>
        {error && <div className="mt-6"><PageMessage message={error} /></div>}
        {success && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Summary label="Clientes" value={clients.length} />
          <Summary label="Projetos ativos" value={projects.filter((item) => item.status === "ATIVO").length} />
          <Summary label="Usuários exibidos" value={users.length} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <FormCard title="Cadastrar cliente" description="O código será convertido para maiúsculas e não poderá ser alterado.">
            <form className="mt-5 grid gap-4" onSubmit={handleCreateClient}>
              <Field label="Nome" name="nome" minLength={2} maxLength={150} />
              <Field label="Código" name="codigo" maxLength={50} placeholder="Ex.: MAR" />
              <label className="grid gap-2 text-sm font-medium">Descrição opcional<textarea name="descricao" maxLength={1000} className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600" /></label>
              <SubmitButton disabled={saving}>Cadastrar cliente</SubmitButton>
            </form>
          </FormCard>
          <FormCard title="Criar projeto" description="Todo projeto deve pertencer a um cliente.">
            <form className="mt-5 grid gap-4" onSubmit={handleCreateProject}>
              <Field label="Nome" name="nome" minLength={2} maxLength={150} />
              <label className="grid gap-2 text-sm font-medium">Cliente<select name="clienteId" required className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-cyan-600"><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nome} ({client.codigo})</option>)}</select></label>
              <SubmitButton disabled={saving || clients.length === 0}>Criar projeto</SubmitButton>
              {clients.length === 0 && <p className="text-sm text-amber-700">Cadastre um cliente antes de criar o primeiro projeto.</p>}
            </form>
          </FormCard>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold">Clientes</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!loading && clients.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><EmptyState>Nenhum cliente cadastrado.</EmptyState></div> : clients.map((client) => <article key={client.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><h3 className="font-semibold">{client.nome}</h3><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-800">{client.codigo}</span></div><p className="mt-3 text-sm text-slate-500">{client.descricao || "Sem descrição"}</p><p className="mt-4 text-xs font-semibold text-slate-500">{client._count?.projetos ?? 0} projetos</p></article>)}</div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold">Projetos</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!loading && projects.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><EmptyState>Nenhum projeto cadastrado.</EmptyState></div> : projects.map((project) => <article key={project.id} className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-semibold">{project.nome}</h3><p className="mt-2 text-sm text-slate-500">Cliente: {project.cliente.nome} ({project.cliente.codigo})</p><p className="mt-4 text-sm text-slate-500">{project._count?.usuarios ?? 0} usuários vinculados</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/projetos/${project.id}/obras`} className="inline-flex rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">Obras</Link><Link href={`/projetos/${project.id}/localizacoes`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Localizações</Link></div></article>)}</div>
        </section>
      </AppShell>
    </RoleGate>
  );
}

function messageFrom(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p>{children}</section>; }
function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<input name={name} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600" {...props} /></label>; }
function SubmitButton({ disabled, children }: { disabled: boolean; children: React.ReactNode }) { return <button type="submit" disabled={disabled} className="rounded-xl bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60">{disabled ? "Aguarde..." : children}</button>; }
