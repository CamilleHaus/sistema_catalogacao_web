"use client";

import { Plus, Search, SearchX, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { WorkCard } from "@/components/work-card";
import {
  Badge,
  Button,
  Input,
  Modal,
  MultiSelect,
  PageHeader,
  SectionHeader,
  Select,
  SkeletonCard,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import {
  errorMessage,
  flattenLocations,
  optionalText,
  workSearchIndex,
} from "@/lib/work";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Artist,
  LocationNode,
  Project,
  Technique,
  Work,
  WorkStatus,
} from "@/types/domain";

type PageData = [
  Project,
  Work[],
  Artist[],
  WorkStatus[],
  Technique[],
  LocationNode[],
];

const CREATE_FORM_ID = "nova-obra";

export default function WorksPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const user = useAuthStore((state) => state.user);

  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [techniqueFilter, setTechniqueFilter] = useState("");

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<Project>(`/projetos/${projetoId}`),
        apiFetch<Work[]>(`/projetos/${projetoId}/obras`),
        apiFetch<Artist[]>("/artistas"),
        apiFetch<WorkStatus[]>("/status-obras"),
        apiFetch<Technique[]>(`/tecnicas?projetoId=${projetoId}`),
        apiFetch<LocationNode[]>(`/projetos/${projetoId}/localizacoes`),
      ]),
    [projetoId],
  );

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

  const [project, works, artists, statuses, techniques, locationTree] =
    data ?? [];
  const locations = useMemo(
    () => flattenLocations(locationTree ?? []),
    [locationTree],
  );
  const canEdit =
    user?.papel === "ADMIN_EMPRESA" || project?.permissao === "EDITAR";
  const loading = data === null;

  const visibleWorks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (works ?? []).filter((work) => {
      if (statusFilter && work.status?.id !== statusFilter) return false;
      if (techniqueFilter && work.tecnica?.id !== techniqueFilter) return false;
      return !term || workSearchIndex(work).includes(term);
    });
  }, [works, query, statusFilter, techniqueFilter]);

  const filtering = Boolean(query.trim() || statusFilter || techniqueFilter);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/projetos/${projetoId}/obras`, {
        method: "POST",
        body: JSON.stringify({
          numeroManual: values.get("numeroManual"),
          titulo: optionalText(values, "titulo"),
          edicao: optionalText(values, "edicao"),
          data: optionalText(values, "data"),
          statusId: optionalText(values, "statusId"),
          tecnicaId: optionalText(values, "tecnicaId"),
          localizacaoId: optionalText(values, "localizacaoId"),
          artistaIds: values.getAll("artistaIds"),
        }),
      });
      await refresh();
      form.reset();
      setCreating(false);
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <PageHeader
          backHref={user?.papel === "ADMIN_EMPRESA" ? "/empresa" : "/projetos"}
          backLabel="Projetos"
          eyebrow={project?.cliente.nome}
          title={project ? `Obras de ${project.nome}` : "Carregando..."}
          description="Clique em uma obra para abrir a ficha completa: catalogação, mídias, gestão, pesquisa e financeiro."
          actions={
            canEdit && (
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => setCreating(true)}
              >
                Nova obra
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
          <SectionHeader
            title="Acervo"
            meta={loading ? undefined : `${visibleWorks.length} de ${works?.length ?? 0}`}
          />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por código, título, artista, técnica..."
                aria-label="Buscar obras"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrar por status"
              placeholder="Todos os status"
              className="sm:w-48"
              options={(statuses ?? []).map((item) => ({
                value: item.id,
                label: item.nome,
              }))}
            />
            <Select
              value={techniqueFilter}
              onChange={(event) => setTechniqueFilter(event.target.value)}
              aria-label="Filtrar por técnica"
              placeholder="Todas as técnicas"
              className="sm:w-48"
              options={(techniques ?? []).map((item) => ({
                value: item.id,
                label: item.nome,
              }))}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard key={index} />
              ))
            ) : visibleWorks.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                {filtering ? (
                  <EmptyState
                    icon={SearchX}
                    title="Nenhum resultado"
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setQuery("");
                          setStatusFilter("");
                          setTechniqueFilter("");
                        }}
                      >
                        Limpar filtros
                      </Button>
                    }
                  >
                    Nenhuma obra corresponde à busca ou aos filtros aplicados.
                  </EmptyState>
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="Acervo vazio"
                    action={
                      canEdit && (
                        <Button
                          icon={<Plus className="size-4" />}
                          onClick={() => setCreating(true)}
                        >
                          Cadastrar primeira obra
                        </Button>
                      )
                    }
                  >
                    Nenhuma obra cadastrada neste projeto ainda.
                  </EmptyState>
                )}
              </div>
            ) : (
              visibleWorks.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  href={`/projetos/${projetoId}/obras/${work.id}`}
                />
              ))
            )}
          </div>
        </section>

        {creating && (
          <Modal
            title="Nova obra"
            description="Somente o número manual é obrigatório — o resto pode ser preenchido depois na ficha."
            size="lg"
            onClose={() => setCreating(false)}
            footer={
              <>
                <Button variant="secondary" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
                <Button type="submit" form={CREATE_FORM_ID} disabled={saving}>
                  {saving ? "Salvando..." : "Cadastrar obra"}
                </Button>
              </>
            }
          >
            <form
              id={CREATE_FORM_ID}
              onSubmit={create}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Input
                name="numeroManual"
                label="Número manual"
                required
                maxLength={100}
                autoFocus
              />
              <Input name="titulo" label="Título" maxLength={300} />
              <Input name="edicao" label="Edição" maxLength={150} />
              <Input name="data" label="Data" maxLength={150} />
              <Select
                name="statusId"
                label="Status"
                placeholder="Não informado"
                options={(statuses ?? []).map((item) => ({
                  value: item.id,
                  label: item.nome,
                }))}
              />
              <Select
                name="tecnicaId"
                label="Técnica"
                placeholder="Não informada"
                options={(techniques ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.nome}${item.projeto ? ` — ${item.projeto.nome}` : " — geral"}`,
                }))}
              />
              <Select
                name="localizacaoId"
                label="Localização"
                span={2}
                placeholder="Não informada"
                options={locations.map(({ node, depth }) => ({
                  value: node.id,
                  label: `${"— ".repeat(depth)}${node.nome}`,
                }))}
              />
              <MultiSelect
                name="artistaIds"
                label="Artistas"
                className="sm:col-span-2"
                searchPlaceholder="Buscar artista..."
                emptyLabel="Nenhum artista cadastrado."
                options={(artists ?? []).map((item) => ({
                  value: item.id,
                  label: item.nome,
                }))}
              />
              {!canEdit && (
                <div className="sm:col-span-2">
                  <Badge tone="warning">
                    Você não tem permissão para editar este projeto.
                  </Badge>
                </div>
              )}
            </form>
          </Modal>
        )}
      </AppShell>
    </RoleGate>
  );
}
