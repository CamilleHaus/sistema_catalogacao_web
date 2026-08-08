"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import type { CompanyUser, Paginated, Project, ProjectPermission, ProjectUserLink } from "@/types/domain";

export default function UsersPage() {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [links, setLinks] = useState<ProjectUserLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const commonUsers = useMemo(() => users.filter((user) => user.papel === "USUARIO" && user.ativo), [users]);

  const loadBase = useCallback(() => Promise.all([
    apiFetch<Paginated<CompanyUser>>("/usuarios?limite=100&ativo=true"),
    apiFetch<Project[]>("/projetos?status=ATIVO"),
  ]), []);

  useEffect(() => { let active = true; loadBase().then(([userData, projectData]) => { if (active) { setUsers(userData.dados); setProjects(projectData); } }).catch((caught: unknown) => active && setError(message(caught))); return () => { active = false; }; }, [loadBase]);
  useEffect(() => { if (!projectId) return; let active = true; apiFetch<ProjectUserLink[]>(`/projetos/${projectId}/usuarios`).then((data) => active && setLinks(data)).catch((caught: unknown) => active && setError(message(caught))); return () => { active = false; }; }, [projectId]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const selectedProject = String(data.get("projetoId") || "");
    setSaving(true); clearMessages();
    try {
      await apiFetch("/usuarios", { method: "POST", body: JSON.stringify({ nome: data.get("nome"), email: data.get("email"), papel: "USUARIO", senhaTemporaria: data.get("senha"), projetos: [{ projetoId: selectedProject, permissao: data.get("permissao") }] }) });
      const [userData, projectData] = await loadBase(); setUsers(userData.dados); setProjects(projectData); form.reset(); setSuccess("Usuário criado e vinculado ao projeto.");
      if (projectId === selectedProject) setLinks(await apiFetch(`/projetos/${projectId}/usuarios`));
    } catch (caught: unknown) { setError(message(caught)); } finally { setSaving(false); }
  }

  async function updateAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!projectId) return; const data = new FormData(event.currentTarget); const selectedIds = data.getAll("usuarioId").map(String); const currentIds = new Set(links.map((link) => link.usuario.id)); const removedIds = [...currentIds].filter((id) => !selectedIds.includes(id));
    setSaving(true); clearMessages();
    try {
      await apiFetch(`/projetos/${projectId}/usuarios`, { method: "PUT", body: JSON.stringify({ usuarios: selectedIds.map((usuarioId) => ({ usuarioId, permissao: data.get(`permissao-${usuarioId}`) as ProjectPermission })), ...(data.get("confirmarRemocoes") ? { confirmarDesativacaoUsuarioIds: removedIds } : {}) }) });
      setLinks(await apiFetch(`/projetos/${projectId}/usuarios`)); setSuccess("Permissões atualizadas.");
    } catch (caught: unknown) { setError(message(caught)); } finally { setSaving(false); }
  }

  const linked = new Map(links.map((link) => [link.usuario.id, link.permissao]));
  function clearMessages() { setError(null); setSuccess(null); }
  return <RoleGate allow={["ADMIN_EMPRESA"]}><AppShell>
    <p className="text-sm font-semibold text-cyan-700">Administração</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Usuários e acessos</h1>
    {error && <div className="mt-6"><PageMessage message={error} /></div>}{success && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Novo usuário</h2><p className="mt-1 text-sm text-slate-500">O primeiro projeto é obrigatório; outros acessos podem ser adicionados abaixo.</p><form onSubmit={createUser} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Field name="nome" label="Nome" required minLength={2} /><Field name="email" label="E-mail" required type="email" /><Field name="senha" label="Senha temporária" required type="password" minLength={8} /><SelectProject projects={projects} /><PermissionSelect name="permissao" defaultValue="VISUALIZAR" /><button disabled={saving || projects.length === 0} className="rounded-xl bg-cyan-700 px-5 py-3 font-semibold text-white disabled:opacity-60 md:col-span-2 xl:col-span-5">{saving ? "Salvando..." : "Criar usuário"}</button></form></section>
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Permissões por projeto</h2><label className="mt-5 grid max-w-xl gap-2 text-sm font-medium">Projeto<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setLinks([]); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Selecione</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome}</option>)}</select></label>{projectId && <form onSubmit={updateAccess} className="mt-6"><div className="grid gap-3">{commonUsers.map((user) => <div key={user.id} className="grid items-center gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_auto_auto]"><div><p className="font-semibold">{user.nome}</p><p className="text-sm text-slate-500">{user.email}</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="usuarioId" value={user.id} defaultChecked={linked.has(user.id)} key={`${projectId}-${user.id}-${linked.has(user.id)}`} /> Vinculado</label><PermissionSelect name={`permissao-${user.id}`} defaultValue={linked.get(user.id) ?? "VISUALIZAR"} /></div>)}</div><label className="mt-5 flex items-start gap-2 text-sm text-amber-800"><input type="checkbox" name="confirmarRemocoes" className="mt-1" /> Confirmo a desativação de usuários que perderem seu último projeto.</label><button disabled={saving} className="mt-5 rounded-xl bg-cyan-700 px-5 py-3 font-semibold text-white disabled:opacity-60">Salvar permissões</button></form>}</section>
  </AppShell></RoleGate>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Não foi possível concluir a operação."; }
function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<input name={name} className="rounded-xl border border-slate-300 px-3 py-2" {...props} /></label>; }
function SelectProject({ projects }: { projects: Project[] }) { return <label className="grid gap-2 text-sm font-medium">Projeto<select required name="projetoId" className="rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Selecione</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome}</option>)}</select></label>; }
function PermissionSelect({ name, defaultValue }: { name: string; defaultValue: ProjectPermission }) { return <label className="grid gap-2 text-sm font-medium">Permissão<select name={name} defaultValue={defaultValue} className="rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="VISUALIZAR">Visualizar</option><option value="EDITAR">Editar</option></select></label>; }
