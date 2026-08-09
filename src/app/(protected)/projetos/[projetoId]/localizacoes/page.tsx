"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { LocationNode, Project } from "@/types/domain";

export default function LocationsPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const user = useAuthStore((state) => state.user);
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canEdit = user?.papel === "ADMIN_EMPRESA" || project?.permissao === "EDITAR";
  const flat = useMemo(() => flatten(tree), [tree]);

  const load = useCallback(() => {
    return Promise.all([
      apiFetch<Project>(`/projetos/${projetoId}`),
      apiFetch<LocationNode[]>(`/projetos/${projetoId}/localizacoes`),
    ]);
  }, [projetoId]);

  useEffect(() => {
    let active = true;
    load().then(([projectData, treeData]) => { if (active) { setProject(projectData); setTree(treeData); } }).catch((caught: unknown) => active && setError(caught instanceof Error ? caught.message : "Não foi possível carregar as localizações."));
    return () => { active = false; };
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const paiId = data.get("paiId");
    setSaving(true); setError(null);
    try {
      await apiFetch(`/projetos/${projetoId}/localizacoes`, { method: "POST", body: JSON.stringify({ nome: data.get("nome"), paiId: paiId || undefined }) });
      const [, treeData] = await load(); setTree(treeData); form.reset();
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "Não foi possível criar a localização."); }
    finally { setSaving(false); }
  }

  return <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}><AppShell>
    <p className="text-sm font-semibold text-primary">{project?.cliente.nome ?? "Projeto"}</p>
    <h1 className="mt-1 text-3xl font-bold tracking-tight">Localizações de {project?.nome ?? "..."}</h1>
    {error && <div className="mt-6"><PageMessage message={error} /></div>}
    {canEdit && <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Adicionar localização</h2><form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]"><label className="grid gap-2 text-sm font-medium">Nome<input required name="nome" maxLength={150} className="rounded-xl border border-slate-300 px-3 py-2" /></label><label className="grid gap-2 text-sm font-medium">Dentro de<select name="paiId" className="rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Raiz do projeto</option>{flat.map(({ node, depth }) => <option key={node.id} value={node.id}>{"— ".repeat(depth)}{node.nome}</option>)}</select></label><button disabled={saving} className="self-end rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Salvando..." : "Adicionar"}</button></form></section>}
    <section className="mt-10"><h2 className="text-xl font-bold">Árvore</h2><div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">{tree.length === 0 ? <EmptyState>Nenhuma localização cadastrada.</EmptyState> : <Tree nodes={tree} />}</div></section>
  </AppShell></RoleGate>;
}

function flatten(nodes: LocationNode[], depth = 0): { node: LocationNode; depth: number }[] { return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.filhos, depth + 1)]); }
function Tree({ nodes }: { nodes: LocationNode[] }) { return <ul className="grid gap-2">{nodes.map((node) => <li key={node.id}><div className="rounded-lg border border-slate-200 px-4 py-3 font-medium">{node.nome}</div>{node.filhos.length > 0 && <div className="ml-6 mt-2 border-l-2 border-primary-100 pl-4"><Tree nodes={node.filhos} /></div>}</li>)}</ul>; }
