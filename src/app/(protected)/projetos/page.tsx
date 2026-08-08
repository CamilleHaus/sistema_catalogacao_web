"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import type { Project } from "@/types/domain";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch<Project[]>("/projetos")
      .then((data) => active && setProjects(data))
      .catch((caughtError: unknown) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar os projetos.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <RoleGate allow={["USUARIO"]}>
      <AppShell>
        <p className="text-sm font-semibold text-cyan-700">Seus acessos</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Projetos disponíveis</h1>
        <p className="mt-2 text-sm text-slate-500">Somente projetos ativos vinculados à sua conta são exibidos.</p>
        {error && <div className="mt-6"><PageMessage message={error} /></div>}
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!loading && projects.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3"><EmptyState>Não há projetos disponíveis no momento.</EmptyState></div>
          ) : (
            projects.map((project) => (
              <article key={project.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Projeto ativo</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${project.permissao === "EDITAR" ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-700"}`}>
                    {project.permissao === "EDITAR" ? "Pode editar" : "Somente leitura"}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold">{project.nome}</h2>
                <div className="mt-5 flex flex-wrap gap-2"><Link href={`/projetos/${project.id}/obras`} className="inline-flex rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Ver obras</Link><Link href={`/projetos/${project.id}/localizacoes`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Localizações</Link></div>
              </article>
            ))
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}
