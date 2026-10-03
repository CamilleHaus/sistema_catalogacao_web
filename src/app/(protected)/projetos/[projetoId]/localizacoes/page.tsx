"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LocationRegisterModal } from "@/components/location-register-modal";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { Button, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { notifySuccess } from "@/lib/toast";
import { errorMessage } from "@/lib/work";
import { useAuthStore } from "@/stores/auth-store";
import type { LocationNode, Project } from "@/types/domain";

export default function LocationsPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const user = useAuthStore((state) => state.user);
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [dialog, setDialog] = useState<{ item: LocationNode | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canEdit = user?.papel === "ADMIN_EMPRESA" || project?.permissao === "EDITAR";

  const load = useCallback(() => {
    return Promise.all([
      apiFetch<Project>(`/projetos/${projetoId}`),
      apiFetch<LocationNode[]>(`/projetos/${projetoId}/localizacoes`),
    ]);
  }, [projetoId]);

  useEffect(() => {
    let active = true;
    load()
      .then(([projectData, treeData]) => {
        if (active) {
          setProject(projectData);
          setTree(treeData);
        }
      })
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [load]);

  async function reload() {
    const [, treeData] = await load();
    setTree(treeData);
    notifySuccess("Localização salva.");
  }

  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <PageHeader
          eyebrow={project?.cliente.nome ?? "Projeto"}
          title={`Localizações de ${project?.nome ?? "..."}`}
          actions={
            canEdit && (
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => setDialog({ item: null })}
              >
                Adicionar localização
              </Button>
            )
          }
        />

        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold">Árvore</h2>
          <div className="mt-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            {tree.length === 0 ? (
              <EmptyState>Nenhuma localização cadastrada.</EmptyState>
            ) : (
              <Tree nodes={tree} canEdit={canEdit} onEdit={(node) => setDialog({ item: node })} />
            )}
          </div>
        </section>

        {dialog && (
          <LocationRegisterModal
            projetoId={projetoId}
            tree={tree}
            item={dialog.item}
            onClose={() => setDialog(null)}
            onSaved={reload}
          />
        )}
      </AppShell>
    </RoleGate>
  );
}

function Tree({
  nodes,
  canEdit,
  onEdit,
}: {
  nodes: LocationNode[];
  canEdit: boolean;
  onEdit: (node: LocationNode) => void;
}) {
  return (
    <ul className="grid gap-0.5">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-surface-muted">
            <span className="flex min-w-0 items-center gap-2">
              <MapPin aria-hidden className="size-4 shrink-0 text-ink-400" />
              <span className="truncate font-medium text-foreground">{node.nome}</span>
            </span>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Pencil className="size-3.5" />}
                onClick={() => onEdit(node)}
              >
                Editar
              </Button>
            )}
          </div>
          {node.filhos.length > 0 && (
            <div className="mt-0.5 ml-5 border-l border-border pl-4">
              <Tree nodes={node.filhos} canEdit={canEdit} onEdit={onEdit} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
