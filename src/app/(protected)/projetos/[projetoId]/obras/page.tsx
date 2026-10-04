"use client";

import type { LucideIcon } from "lucide-react";
import {
  Download,
  Images,
  Pencil,
  PencilLine,
  Plus,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AdvancedSearchModal } from "@/components/advanced-search-modal";
import { AppShell } from "@/components/app-shell";
import { BulkEditModal } from "@/components/bulk-edit-modal";
import { ExportModal } from "@/components/export-modal";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { ArtistRegisterModal } from "@/components/settings-register-modals";
import { WorkCard } from "@/components/work-card";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  Modal,
  MultiSelect,
  PageHeader,
  Select,
  SkeletonCard,
} from "@/components/ui";
import {
  describeParts,
  readFilterFromUrl,
  writeFilterToUrl,
} from "@/lib/advanced-search";
import { apiFetch } from "@/lib/api-client";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";
import {
  errorMessage,
  flattenLocations,
  optionalText,
  workSearchIndex,
} from "@/lib/work";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AdvancedFilter,
  Artist,
  LocationNode,
  Project,
  SavedSearchFilter,
  SearchFieldDef,
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
  const [creatingArtist, setCreatingArtist] = useState(false);
  const [query, setQuery] = useState("");
  const [bulkEditing, setBulkEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [artistFilter, setArtistFilter] = useState("");
  // Busca avançada: o filtro ativo (e de qual filtro salvo veio) e o resultado
  // vindo da API, sobre o qual os filtros rápidos acima continuam valendo.
  const [searchFields, setSearchFields] = useState<SearchFieldDef[] | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedSearchFilter[]>([]);
  const [advanced, setAdvanced] = useState<{
    filter: AdvancedFilter;
    savedId: string | null;
  } | null>(null);
  const [advancedWorks, setAdvancedWorks] = useState<Work[] | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  const searchBase = `/projetos/${projetoId}/busca-avancada`;

  const loadSavedFilters = useCallback(
    () =>
      apiFetch<SavedSearchFilter[]>(`${searchBase}/filtros`).then(
        setSavedFilters,
      ),
    [searchBase],
  );

  useEffect(() => {
    let active = true;
    apiFetch<SearchFieldDef[]>(`${searchBase}/campos`)
      .then((result) => active && setSearchFields(result))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    loadSavedFilters().catch(
      (caught: unknown) => active && setError(errorMessage(caught)),
    );
    return () => {
      active = false;
    };
  }, [searchBase, loadSavedFilters]);

  // Abrir um link com ?busca=... já mostra o acervo filtrado.
  useEffect(() => {
    const filter = readFilterFromUrl();
    if (!filter) return;
    let active = true;
    apiFetch<Work[]>(searchBase, { method: "POST", body: JSON.stringify(filter) })
      .then((result) => {
        if (!active) return;
        setAdvanced({ filter, savedId: null });
        setAdvancedWorks(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        writeFilterToUrl(null);
        setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [searchBase]);

  async function runAdvanced(filter: AdvancedFilter | null, savedId: string | null) {
    setAdvancedOpen(false);
    setError(null);
    if (!filter) {
      setAdvanced(null);
      setAdvancedWorks(null);
      writeFilterToUrl(null);
      return;
    }
    setAdvanced({ filter, savedId });
    setAdvancedWorks(null);
    writeFilterToUrl(filter);
    try {
      setAdvancedWorks(
        await apiFetch<Work[]>(searchBase, {
          method: "POST",
          body: JSON.stringify(filter),
        }),
      );
    } catch (caught: unknown) {
      setAdvanced(null);
      writeFilterToUrl(null);
      setError(errorMessage(caught));
    }
  }

  /** Tira uma condição da busca ativa; a última leva junto o filtro inteiro. */
  function removeCondition(index: number) {
    if (!advanced) return;
    const condicoes = advanced.filter.condicoes.filter((_, position) => position !== index);
    // Deixou de ser o filtro salvo como foi gravado.
    void runAdvanced(condicoes.length ? { ...advanced.filter, condicoes } : null, null);
  }

  const refresh = useCallback(async () => {
    setData(await load());
    // Obra nova pode entrar (ou não) no resultado da busca ativa.
    if (advanced)
      setAdvancedWorks(
        await apiFetch<Work[]>(searchBase, {
          method: "POST",
          body: JSON.stringify(advanced.filter),
        }),
      );
  }, [load, advanced, searchBase]);

  const [project, works, artists, statuses, techniques, locationTree] =
    data ?? [];
  const locations = useMemo(
    () => flattenLocations(locationTree ?? []),
    [locationTree],
  );
  const canEdit =
    user?.papel === "ADMIN_EMPRESA" || project?.permissao === "EDITAR";
  const loading = data === null || (advanced !== null && advancedWorks === null);
  const baseWorks = advanced ? advancedWorks : works;
  const fieldsById = useMemo(
    () => new Map((searchFields ?? []).map((field) => [field.id, field])),
    [searchFields],
  );
  const activeSaved = advanced?.savedId
    ? savedFilters.find((item) => item.id === advanced.savedId)
    : undefined;

  const artistRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const work of baseWorks ?? []) {
      for (const artist of work.artistas) {
        counts.set(artist.id, (counts.get(artist.id) ?? 0) + 1);
      }
    }
    return (artists ?? [])
      .map((artist) => ({ artist, count: counts.get(artist.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.artist.nome.localeCompare(b.artist.nome));
  }, [baseWorks, artists]);

  const visibleWorks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (baseWorks ?? []).filter((work) => {
      if (artistFilter && !work.artistas.some((artist) => artist.id === artistFilter))
        return false;
      return !term || workSearchIndex(work).includes(term);
    });
  }, [baseWorks, query, artistFilter]);

  const filtering = Boolean(
    query.trim() || artistFilter || advanced,
  );

  function clearFilters() {
    setQuery("");
    setArtistFilter("");
    void runAdvanced(null, null);
  }

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
          backRowActions={
            canEdit && (
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => setCreating(true)}
              >
                Nova obra
              </Button>
            )
          }
          eyebrow={project?.cliente.nome}
          title={project ? `Obras de ${project.nome}` : "Carregando..."}
          description="Clique em uma obra para abrir a ficha completa: catalogação, mídias, gestão, pesquisa e financeiro."
          actions={
            !loading && (
              <StatTile
                icon={Images}
                label="Obras catalogadas"
                value={works?.length ?? 0}
              />
            )
          }
        />

        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}

        <section className="mt-8">
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row">
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
                <Button
                  variant="secondary"
                  icon={<SlidersHorizontal className="size-4" />}
                  disabled={!searchFields}
                  onClick={() => setAdvancedOpen(true)}
                  className="shrink-0"
                >
                  Busca avançada
                  {advanced && (
                    <Badge tone="brand">{advanced.filter.condicoes.length}</Badge>
                  )}
                </Button>
                {canEdit && (
                  <Button
                    variant="secondary"
                    icon={<PencilLine className="size-4" />}
                    disabled={loading || visibleWorks.length === 0}
                    onClick={() => setBulkEditing(true)}
                    className="shrink-0"
                  >
                    Editar em massa
                  </Button>
                )}
                <Button
                  variant="secondary"
                  icon={<Download className="size-4" />}
                  disabled={loading}
                  onClick={() => setExporting(true)}
                  className="shrink-0"
                >
                  Exportar
                </Button>
              </div>

              {advanced && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xs sm:flex-row sm:items-start">
                  <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-800 sm:grid">
                    <SlidersHorizontal aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold text-foreground">
                        {activeSaved?.nome ?? "Busca avançada"}
                      </span>
                      {advancedWorks && (
                        <span className="text-muted-foreground">
                          {advancedWorks.length}{" "}
                          {advancedWorks.length === 1 ? "obra encontrada" : "obras encontradas"}
                        </span>
                      )}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {advanced.filter.condicoes.map((condition, index) => {
                        const field = fieldsById.get(condition.campo);
                        const parts = field
                          ? describeParts(condition, field)
                          : { label: condition.campo, value: "" };
                        return (
                          <li
                            key={index}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-muted py-1 pr-1 pl-3 text-xs"
                          >
                            <span className="shrink-0 text-muted-foreground">{parts.label}</span>
                            <span className="truncate font-semibold text-foreground">
                              {parts.value}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remover a condição ${parts.label}`}
                              onClick={() => removeCondition(index)}
                              className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-200 hover:text-foreground"
                            >
                              <X aria-hidden className="size-3" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Pencil className="size-3.5" />}
                      onClick={() => setAdvancedOpen(true)}
                    >
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => runAdvanced(null, null)}>
                      Limpar
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {loading ? (
                  Array.from({ length: 10 }, (_, index) => (
                    <SkeletonCard key={index} />
                  ))
                ) : visibleWorks.length === 0 ? (
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
                    {filtering ? (
                      <EmptyState
                        icon={SearchX}
                        title="Nenhum resultado"
                        action={
                          <Button variant="secondary" onClick={clearFilters}>
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
            </div>

            {!loading && (
              <ArtistSidebar
                artistRows={artistRows}
                totalWorks={baseWorks?.length ?? 0}
                artistFilter={artistFilter}
                onSelect={setArtistFilter}
                canCreate={canEdit}
                onCreate={() => setCreatingArtist(true)}
              />
            )}
          </div>
        </section>

        {exporting && (
          <ExportModal
            projetoId={projetoId}
            // Com busca ou filtro ativo, oferece exportar exatamente o que está na tela.
            listed={filtering ? visibleWorks.map((work) => work.id) : undefined}
            onClose={() => setExporting(false)}
          />
        )}

        {bulkEditing && (
          <BulkEditModal
            projetoId={projetoId}
            obraIds={visibleWorks.map((work) => work.id)}
            onClose={() => setBulkEditing(false)}
            onDone={async (result) => {
              setBulkEditing(false);
              notifySuccess(
                [
                  `${result.atualizadas} ${result.atualizadas === 1 ? "obra atualizada" : "obras atualizadas"}.`,
                  result.movimentacoes > 0 &&
                    `${result.movimentacoes} ${result.movimentacoes === 1 ? "movimentação registrada" : "movimentações registradas"}.`,
                  result.ignoradas > 0 &&
                    `${result.ignoradas} sem o registro ${result.ignoradas === 1 ? "ficou" : "ficaram"} de fora.`,
                ]
                  .filter(Boolean)
                  .join(" "),
              );
              await refresh();
            }}
          />
        )}

        {advancedOpen && searchFields && (
          <AdvancedSearchModal
            projetoId={projetoId}
            fields={searchFields}
            initial={advanced?.filter ?? null}
            savedFilters={savedFilters}
            activeSavedId={advanced?.savedId ?? null}
            onApply={runAdvanced}
            onSavedFiltersChange={loadSavedFilters}
            onClose={() => setAdvancedOpen(false)}
          />
        )}

        {creatingArtist && (
          <ArtistRegisterModal
            item={null}
            onClose={() => setCreatingArtist(false)}
            onSaved={refresh}
          />
        )}

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

function ArtistSidebar({
  artistRows,
  totalWorks,
  artistFilter,
  onSelect,
  canCreate,
  onCreate,
}: {
  artistRows: { artist: Artist; count: number }[];
  totalWorks: number;
  artistFilter: string;
  onSelect: (artistId: string) => void;
  canCreate: boolean;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = term
    ? artistRows.filter(({ artist }) => artist.nome.toLowerCase().includes(term))
    : artistRows;

  return (
    <aside className="rounded-2xl border border-border bg-surface p-4 shadow-sm md:sticky md:top-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Artistas</h2>
        <div className="flex items-center gap-1.5">
          <Badge tone="neutral">{artistRows.length}</Badge>
          {canCreate && (
            <IconButton
              aria-label="Cadastrar artista"
              size="sm"
              variant="secondary"
              onClick={onCreate}
            >
              <Plus className="size-4" />
            </IconButton>
          )}
        </div>
      </div>

      {artistRows.length > 6 && (
        <div className="relative mt-3">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-400"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar artista..."
            aria-label="Buscar artista"
            className="h-9 pl-8 text-sm"
          />
        </div>
      )}

      <ul className="mt-3 grid max-h-112 gap-0.5 overflow-y-auto">
        <li>
          <button
            type="button"
            aria-pressed={artistFilter === ""}
            onClick={() => onSelect("")}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
              artistFilter === ""
                ? "bg-primary text-white"
                : "text-ink-600 hover:bg-surface-muted",
            )}
          >
            Todos
            <span className={artistFilter === "" ? "text-white/80" : "text-muted-foreground"}>
              {totalWorks}
            </span>
          </button>
        </li>
        {visible.length === 0 ? (
          <li className="px-2.5 py-2 text-sm text-muted-foreground">
            Nenhum artista encontrado.
          </li>
        ) : (
          visible.map(({ artist, count }) => {
            const active = artistFilter === artist.id;
            return (
              <li key={artist.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? "" : artist.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "text-ink-600 hover:bg-surface-muted",
                  )}
                >
                  <span className="truncate">{artist.nome}</span>
                  <span className={cn("shrink-0", active ? "text-white/80" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: number;
}) {
  return (
    <Card padding="sm" className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-800">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
