"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import type { Client, Project } from "@/types/domain";

type OpenModal = "client" | "project" | null;

export default function CompanyAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(
    () => Promise.all([apiFetch<Project[]>("/projetos"), apiFetch<Client[]>("/clientes")]),
    [],
  );

  useEffect(() => {
    let active = true;
    loadData()
      .then(([projectData, clientData]) => {
        if (!active) return;
        setProjects(projectData);
        setClients(clientData);
      })
      .catch((caughtError: unknown) => {
        if (active) setError(messageFrom(caughtError, "Não foi possível carregar os projetos."));
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadData]);

  useEffect(() => {
    if (!openModal) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenModal(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [openModal]);

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
      const [projectData, clientData] = await loadData();
      setProjects(projectData);
      setClients(clientData);
      form.reset();
      setOpenModal(null);
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
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">Gestão da empresa</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Projetos</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setOpenModal("client")} className="rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-50">
              Novo cliente
            </button>
            <button type="button" onClick={() => setOpenModal("project")} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800">
              Novo projeto
            </button>
          </div>
        </div>

        {error && <div className="mt-6"><PageMessage message={error} /></div>}
        {success && <div className="mt-6 rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-800">{success}</div>}

        <section className="mt-8">
          <div className="grid gap-4">
            {!loading && projects.length === 0 ? (
              <EmptyState>Nenhum projeto cadastrado.</EmptyState>
            ) : projects.map((project) => (
              <article key={project.id} className="flex flex-col justify-between gap-5 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-lg font-semibold">{project.nome}</h2>
                    <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${project.status === "ATIVO" ? "bg-success-50 text-success-700" : "bg-ink-100 text-ink-600"}`}>
                      {project.status === "ATIVO" ? "Ativo" : "Arquivado"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{project.cliente.nome} ({project.cliente.codigo})</p>
                  <p className="mt-2 text-xs font-medium text-ink-500">{project._count?.usuarios ?? 0} usuários vinculados</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/projetos/${project.id}/localizacoes`} className="inline-flex rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold hover:bg-ink-50">Localizações</Link>
                  <Link href={`/projetos/${project.id}/obras`} className="inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-800">Ver obras</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {openModal === "client" && (
          <Modal title="Novo cliente" description="O código será convertido para maiúsculas e não poderá ser alterado." onClose={() => setOpenModal(null)}>
            <form className="grid gap-4" onSubmit={handleCreateClient}>
              <Field label="Nome" name="nome" minLength={2} maxLength={150} autoFocus />
              <Field label="Código" name="codigo" maxLength={50} placeholder="Ex.: MAR" />
              <label className="grid gap-2 text-sm font-medium">Descrição opcional<textarea name="descricao" maxLength={1000} className="min-h-24 rounded-xl border border-ink-300 px-3 py-2 outline-none focus:border-primary" /></label>
              <ModalActions saving={saving} onCancel={() => setOpenModal(null)}>Cadastrar cliente</ModalActions>
            </form>
          </Modal>
        )}

        {openModal === "project" && (
          <Modal title="Novo projeto" description="Todo projeto deve pertencer a um cliente." onClose={() => setOpenModal(null)}>
            <form className="grid gap-4" onSubmit={handleCreateProject}>
              <Field label="Nome" name="nome" minLength={2} maxLength={150} autoFocus />
              <label className="grid gap-2 text-sm font-medium">Cliente<select name="clienteId" required className="rounded-xl border border-ink-300 bg-white px-3 py-2 outline-none focus:border-primary"><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nome} ({client.codigo})</option>)}</select></label>
              {clients.length === 0 && <p className="text-sm text-warning-700">Cadastre um cliente antes de criar o primeiro projeto.</p>}
              <ModalActions saving={saving || clients.length === 0} onCancel={() => setOpenModal(null)}>Criar projeto</ModalActions>
            </form>
          </Modal>
        )}
      </AppShell>
    </RoleGate>
  );
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="modal-title" className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-ink-500">{description}</p></div><button type="button" onClick={onClose} aria-label="Fechar modal" className="grid size-9 shrink-0 place-items-center rounded-lg text-xl text-ink-500 hover:bg-ink-100">×</button></div><div className="mt-6">{children}</div></section></div>;
}
function ModalActions({ saving, onCancel, children }: { saving: boolean; onCancel: () => void; children: React.ReactNode }) { return <div className="mt-2 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl border border-ink-300 px-4 py-2.5 font-semibold hover:bg-ink-50">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Aguarde..." : children}</button></div>; }
function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<input name={name} required className="rounded-xl border border-ink-300 px-3 py-2 outline-none focus:border-primary" {...props} /></label>; }
function messageFrom(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
