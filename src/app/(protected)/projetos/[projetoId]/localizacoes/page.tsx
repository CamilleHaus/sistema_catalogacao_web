"use client";

import { ChevronRight, Pencil, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LocationRegisterModal } from "@/components/location-register-modal";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { Button, PageHeader, RowList } from "@/components/ui";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api-client";
import { notifySuccess } from "@/lib/toast";
import { errorMessage, flattenLocations } from "@/lib/work";
import { useAuthStore } from "@/stores/auth-store";
import type { LocationNode, Project } from "@/types/domain";

export default function LocationsPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const user = useAuthStore((state) => state.user);
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [dialog, setDialog] = useState<{
    item: LocationNode | null;
    parent?: LocationNode;
  } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
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

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reload(message = "Localização salva.") {
    const [, treeData] = await load();
    setTree(treeData);
    notifySuccess(message);
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

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {tree.length === 0 ? (
            <EmptyState>Nenhuma localização cadastrada.</EmptyState>
          ) : (
            <RowList>
              {tree.map((root) => (
                <RootRow
                  key={root.id}
                  root={root}
                  expanded={open.has(root.id)}
                  canEdit={canEdit}
                  onToggle={() => toggle(root.id)}
                  onEdit={(node) => setDialog({ item: node })}
                  onAddChild={() => {
                    // Abre a raiz para a nova sublocalização aparecer logo após salvar.
                    setOpen((current) => new Set(current).add(root.id));
                    setDialog({ item: null, parent: root });
                  }}
                />
              ))}
            </RowList>
          )}
        </section>

        {dialog && (
          <LocationRegisterModal
            projetoId={projetoId}
            item={dialog.item}
            parent={dialog.parent}
            onClose={() => setDialog(null)}
            onSaved={reload}
          />
        )}
      </AppShell>
    </RoleGate>
  );
}

function RootRow({
  root,
  expanded,
  canEdit,
  onToggle,
  onEdit,
  onAddChild,
}: {
  root: LocationNode;
  expanded: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onEdit: (node: LocationNode) => void;
  onAddChild: () => void;
}) {
  // Níveis abaixo do segundo, cadastrados antes, continuam visíveis e recuados.
  const children = flattenLocations(root.filhos);
  const panelId = `sublocalizacoes-${root.id}`;

  return (
    <li>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-ink-400 transition-transform",
              expanded && "rotate-90",
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {root.nome}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {children.length === 0
                ? "Sem sublocalizações"
                : `${children.length} ${children.length === 1 ? "sublocalização" : "sublocalizações"}`}
            </span>
          </span>
        </button>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Pencil className="size-3.5" />}
            onClick={() => onEdit(root)}
          >
            Editar
          </Button>
        )}
      </div>

      {expanded && (
        <div id={panelId} className="border-t border-border bg-surface-muted px-4 py-2">
          {children.length === 0 && (
            <p className="py-2 pl-7 text-sm text-muted-foreground">
              Nenhuma sublocalização cadastrada.
            </p>
          )}
          {children.length > 0 && (
            <ul className="grid gap-0.5">
              {children.map(({ node, depth }) => (
                <li
                  key={node.id}
                  className="flex items-center justify-between gap-3 py-1.5"
                  style={{ paddingLeft: `${1.75 + depth * 1.25}rem` }}
                >
                  <span className="truncate text-sm text-foreground">{node.nome}</span>
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
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div className="py-1.5 pl-5">
              <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={onAddChild}>
                Adicionar sublocalização
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
