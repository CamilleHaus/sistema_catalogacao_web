"use client";

import {
  ClipboardList,
  Download,
  Images,
  Landmark,
  Microscope,
  Pencil,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { CatalogingForm } from "@/components/cataloging-form";
import { ExportModal } from "@/components/export-modal";
import { FinancialForm } from "@/components/financial-form";
import { ManagementForm } from "@/components/management-form";
import { PageMessage } from "@/components/page-message";
import { ResearchForm } from "@/components/research-form";
import { RoleGate } from "@/components/role-gate";
import { WorkEditModal } from "@/components/work-edit-modal";
import { WorkFacts } from "@/components/work-facts";
import { WorkPhoto } from "@/components/work-photo";
import { WorkMedia } from "@/components/work-media";
import {
  Badge,
  Button,
  PageHeader,
  Skeleton,
  Tabs,
  type TabItem,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { errorMessage, workTitle } from "@/lib/work";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Artist,
  LocationNode,
  Project,
  Technique,
  Work,
  WorkStatus,
} from "@/types/domain";

type PageData = {
  project: Project;
  work: Work;
  locations: LocationNode[];
  artists: Artist[];
  statuses: WorkStatus[];
  techniques: Technique[];
};

function Panel({ children }: { children: ReactNode }) {
  return <div className="pt-5">{children}</div>;
}

export default function WorkDetailPage() {
  const { projetoId, obraId } = useParams<{
    projetoId: string;
    obraId: string;
  }>();
  const user = useAuthStore((state) => state.user);

  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("catalogacao");
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (): Promise<PageData> => {
    const [project, work, locations, artists, statuses, techniques] =
      await Promise.all([
        apiFetch<Project>(`/projetos/${projetoId}`),
        apiFetch<Work>(`/projetos/${projetoId}/obras/${obraId}`),
        apiFetch<LocationNode[]>(`/projetos/${projetoId}/localizacoes`),
        apiFetch<Artist[]>("/artistas"),
        apiFetch<WorkStatus[]>("/status-obras"),
        apiFetch<Technique[]>(`/tecnicas?projetoId=${projetoId}`),
      ]);
    return { project, work, locations, artists, statuses, techniques };
  }, [projetoId, obraId]);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => active && setData(result))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setData(await load());
  }, [load]);

  // Os formulários herdados sinalizam "sem erro" com string vazia.
  const report = (value: string) => setError(value || null);

  const work = data?.work;
  const canEdit =
    user?.papel === "ADMIN_EMPRESA" || data?.project.permissao === "EDITAR";

  const tabs: TabItem[] = data
    ? [
        {
          id: "catalogacao",
          label: "Catalogação",
          icon: ClipboardList,
          content: (
            <Panel>
              <CatalogingForm
                projetoId={projetoId}
                obraId={data.work.id}
                canEdit={Boolean(canEdit)}
                onError={report}
              />
            </Panel>
          ),
        },
        {
          id: "midias",
          label: "Mídias",
          icon: Images,
          content: (
            <Panel>
              <WorkMedia
                projetoId={projetoId}
                obraId={data.work.id}
                canEdit={Boolean(canEdit)}
                onChanged={refresh}
                onError={report}
              />
            </Panel>
          ),
        },
        {
          id: "conservacao",
          label: "Conservação",
          icon: ShieldCheck,
          content: (
            <Panel>
              <ManagementForm
                kinds={["analises", "restauros"]}
                projetoId={projetoId}
                work={data.work}
                locations={data.locations}
                canEdit={Boolean(canEdit)}
                onChanged={refresh}
                onError={report}
              />
            </Panel>
          ),
        },
        {
          id: "controle",
          label: "Controle",
          icon: Settings2,
          content: (
            <Panel>
              <ManagementForm
                kinds={["servicos", "instrucoes", "movimentacoes"]}
                projetoId={projetoId}
                work={data.work}
                locations={data.locations}
                canEdit={Boolean(canEdit)}
                onChanged={refresh}
                onError={report}
              />
            </Panel>
          ),
        },
        {
          id: "pesquisa",
          label: "Pesquisa",
          icon: Microscope,
          content: (
            <Panel>
              <ResearchForm
                projetoId={projetoId}
                obraId={data.work.id}
                canEdit={Boolean(canEdit)}
                onError={report}
              />
            </Panel>
          ),
        },
        {
          id: "financeiro",
          label: "Financeiro",
          icon: Landmark,
          content: (
            <Panel>
              <FinancialForm
                projetoId={projetoId}
                obraId={data.work.id}
                canEdit={Boolean(canEdit)}
                onError={report}
              />
            </Panel>
          ),
        },
      ]
    : [];

  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <PageHeader
          backHref={`/projetos/${projetoId}/obras`}
          backLabel={
            data ? `Obras de ${data.project.nome}` : "Voltar ao acervo"
          }
          eyebrow={work?.codigoAcervo}
          variant="record"
          // Como no card do acervo: "Título, série X, 1980".
          title={
            work
              ? work.data
                ? `${workTitle(work)}, ${work.data}`
                : workTitle(work)
              : "Carregando..."
          }
          description={
            work?.artistas.map((artist) => artist.nome).join(", ") || undefined
          }
          actions={
            work && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Download className="size-4" />}
                  onClick={() => setExporting(true)}
                >
                  Exportar
                </Button>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Pencil className="size-4" />}
                    onClick={() => setEditing(true)}
                  >
                    Editar ficha
                  </Button>
                ) : (
                  <Badge tone="warning">Somente leitura</Badge>
                )}
              </div>
            )
          }
        />

        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}

        {!data ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Linha 1 — ficha técnica ocupando a largura inteira. */}
            <section className="mt-8">
              <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <WorkPhoto
                  projetoId={projetoId}
                  work={data.work}
                  canEdit={Boolean(canEdit)}
                  onSaved={refresh}
                  onError={report}
                />
                <WorkFacts work={data.work} />
              </div>
            </section>

            {/* Linha 2 — o restante do dossiê. */}
            <Tabs
              items={tabs}
              value={tab}
              onChange={setTab}
              className="mt-10"
            />

            {exporting && (
              <ExportModal
                projetoId={projetoId}
                work={{ id: data.work.id, codigo: data.work.codigoAcervo }}
                onClose={() => setExporting(false)}
              />
            )}

            {editing && (
              <WorkEditModal
                projetoId={projetoId}
                work={data.work}
                artists={data.artists}
                statuses={data.statuses}
                techniques={data.techniques}
                locationTree={data.locations}
                onClose={() => setEditing(false)}
                onSaved={refresh}
              />
            )}
          </>
        )}
      </AppShell>
    </RoleGate>
  );
}
