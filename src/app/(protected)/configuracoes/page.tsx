"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import {
  ArtistRegisterModal,
  ClientRegisterModal,
  NameRegisterModal,
  TagRegisterModal,
  TechniqueRegisterModal,
} from "@/components/settings-register-modals";
import { Badge, Button, ListRow, RowList } from "@/components/ui";
import { WorkSetRegisterModal } from "@/components/work-set-register-modal";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { notifySuccess } from "@/lib/toast";
import { errorMessage } from "@/lib/work";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Artist,
  CatalogCategory,
  CatalogTag,
  Client,
  NamedReference,
  Project,
  SignatureLocation,
  Technique,
  WorkSet,
  WorkStatus,
} from "@/types/domain";

type PageData = [
  Artist[],
  WorkStatus[],
  Technique[],
  Project[],
  CatalogCategory[],
  CatalogTag[],
  SignatureLocation[],
  NamedReference[],
  NamedReference[],
  { estadosConservacao: NamedReference[]; tiposServico: NamedReference[] },
  WorkSet[],
];

type RegisterTab =
  | "clientes"
  | "artistas"
  | "status"
  | "tecnicas"
  | "fichasMae"
  | "categorias"
  | "tags"
  | "assinaturas"
  | "negociacao"
  | "seguros"
  | "conservacao"
  | "servicos";

const registerTabs: { id: RegisterTab; label: string; adminOnly?: boolean }[] = [
  { id: "clientes", label: "Clientes", adminOnly: true },
  { id: "artistas", label: "Artistas" },
  { id: "status", label: "Status" },
  { id: "tecnicas", label: "Técnicas" },
  { id: "fichasMae", label: "Fichas mãe" },
  { id: "categorias", label: "Categorias" },
  { id: "tags", label: "Tags" },
  { id: "assinaturas", label: "Locais de assinatura" },
  { id: "negociacao", label: "Formas de negociação" },
  { id: "seguros", label: "Modalidades de seguro" },
  { id: "conservacao", label: "Estados de conservação", adminOnly: true },
  { id: "servicos", label: "Tipos de serviço", adminOnly: true },
];

type NameOnlyConfig = { path: string; createTitle: string; editTitle: string };

/** Cadastros cuja API só aceita `{ nome }` — uma única forma (`NameRegisterModal`) atende a todos. */
const NAME_ONLY_TABS: Partial<Record<RegisterTab, NameOnlyConfig>> = {
  status: { path: "/status-obras", createTitle: "Novo status", editTitle: "Editar status" },
  categorias: {
    path: "/categorias-catalogacao",
    createTitle: "Nova categoria",
    editTitle: "Editar categoria",
  },
  assinaturas: {
    path: "/locais-assinatura",
    createTitle: "Novo local de assinatura",
    editTitle: "Editar local de assinatura",
  },
  negociacao: {
    path: "/formas-negociacao",
    createTitle: "Nova forma de negociação",
    editTitle: "Editar forma de negociação",
  },
  seguros: {
    path: "/modalidades-seguro",
    createTitle: "Nova modalidade de seguro",
    editTitle: "Editar modalidade de seguro",
  },
  conservacao: {
    path: "/gestao-auxiliares/estados-conservacao",
    createTitle: "Novo estado de conservação",
    editTitle: "Editar estado de conservação",
  },
  servicos: {
    path: "/gestao-auxiliares/tipos-servico",
    createTitle: "Novo tipo de serviço",
    editTitle: "Editar tipo de serviço",
  },
};

type Dialog =
  | ({ kind: "name"; item: NamedReference | null } & NameOnlyConfig)
  | { kind: "tag"; item: CatalogTag | null }
  | { kind: "artist"; item: Artist | null }
  | { kind: "client"; item: Client | null }
  | { kind: "technique"; item: Technique | null }
  | { kind: "workSet"; item: WorkSet | null };

export default function RegistersPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<RegisterTab>(() =>
    useAuthStore.getState().user?.papel === "ADMIN_EMPRESA" ? "clientes" : "artistas",
  );
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [statuses, setStatuses] = useState<WorkStatus[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [tags, setTags] = useState<CatalogTag[]>([]);
  const [signatureLocations, setSignatureLocations] = useState<SignatureLocation[]>([]);
  const [negotiationForms, setNegotiationForms] = useState<NamedReference[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<NamedReference[]>([]);
  const [conservationStates, setConservationStates] = useState<NamedReference[]>([]);
  const [serviceTypes, setServiceTypes] = useState<NamedReference[]>([]);
  const [workSets, setWorkSets] = useState<WorkSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canManageCataloging =
    user?.papel === "ADMIN_EMPRESA" ||
    projects.some((project) => project.permissao === "EDITAR");

  async function load() {
    return Promise.all([
      apiFetch<Artist[]>("/artistas"),
      apiFetch<WorkStatus[]>("/status-obras"),
      apiFetch<Technique[]>("/tecnicas"),
      apiFetch<Project[]>("/projetos?status=ATIVO"),
      apiFetch<CatalogCategory[]>("/categorias-catalogacao"),
      apiFetch<CatalogTag[]>("/tags"),
      apiFetch<SignatureLocation[]>("/locais-assinatura"),
      apiFetch<NamedReference[]>("/formas-negociacao"),
      apiFetch<NamedReference[]>("/modalidades-seguro"),
      apiFetch<{
        estadosConservacao: NamedReference[];
        tiposServico: NamedReference[];
      }>("/gestao-auxiliares"),
      apiFetch<WorkSet[]>("/fichas-mae"),
    ]);
  }

  function apply(data: PageData) {
    setArtists(data[0]);
    setStatuses(data[1]);
    setTechniques(data[2]);
    setProjects(data[3]);
    setCategories(data[4]);
    setTags(data[5]);
    setSignatureLocations(data[6]);
    setNegotiationForms(data[7]);
    setInsuranceTypes(data[8]);
    setConservationStates(data[9].estadosConservacao);
    setServiceTypes(data[9].tiposServico);
    setWorkSets(data[10]);
  }

  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && apply(data))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user?.papel !== "ADMIN_EMPRESA") return;
    let active = true;
    apiFetch<Client[]>("/clientes")
      .then((data) => active && setClients(data))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [user?.papel]);

  async function reload() {
    apply(await load());
    if (user?.papel === "ADMIN_EMPRESA") setClients(await apiFetch<Client[]>("/clientes"));
    notifySuccess("Cadastro salvo.");
  }

  function openCreate() {
    setError(null);
    if (activeTab === "clientes") return setDialog({ kind: "client", item: null });
    if (activeTab === "artistas") return setDialog({ kind: "artist", item: null });
    if (activeTab === "tecnicas") return setDialog({ kind: "technique", item: null });
    if (activeTab === "tags") return setDialog({ kind: "tag", item: null });
    if (activeTab === "fichasMae") return setDialog({ kind: "workSet", item: null });
    const config = NAME_ONLY_TABS[activeTab];
    if (config) setDialog({ kind: "name", item: null, ...config });
  }

  function closeDialog() {
    setDialog(null);
  }

  const activeLabel = registerTabs.find((tab) => tab.id === activeTab)?.label ?? "Configuração";
  const canEdit =
    user?.papel === "ADMIN_EMPRESA" ||
    (canManageCataloging &&
      ["categorias", "tags", "assinaturas", "negociacao", "seguros", "fichasMae"].includes(
        activeTab,
      ));
  // A ficha mãe é do projeto: quem não é admin só edita nos projetos com permissão.
  const editableProjects = projects.filter(
    (project) => user?.papel === "ADMIN_EMPRESA" || project.permissao === "EDITAR",
  );

  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie os valores reutilizáveis nas obras da empresa.
        </p>
        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            aria-label="Tipos de configuração"
            className="overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-sm"
          >
            {registerTabs
              .filter((tab) => !tab.adminOnly || user?.papel === "ADMIN_EMPRESA")
              .map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setDialog(null);
                  }}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={cn(
                    "flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold",
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-950",
                  )}
                >
                  {tab.label}
                </button>
              ))}
          </nav>

          <div className="min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">{activeLabel}</h2>
              {canEdit && (
                <Button icon={<Plus className="size-4" />} onClick={openCreate}>
                  Novo cadastro
                </Button>
              )}
            </div>

            <div className="mt-6">
              {activeTab === "clientes" && user?.papel === "ADMIN_EMPRESA" && (
                <RegisterRowList empty="Nenhum cliente cadastrado.">
                  {clients.map((client) => (
                    <ListRow
                      key={client.id}
                      title={
                        <span className="flex flex-wrap items-center gap-2">
                          {client.nome}
                          <Badge tone="brand">{client.codigo}</Badge>
                        </span>
                      }
                      detail={client.descricao || "Sem descrição"}
                      meta={
                        <span className="text-xs font-semibold text-muted-foreground">
                          {client._count?.projetos ?? 0} projetos
                        </span>
                      }
                      onEdit={() => setDialog({ kind: "client", item: client })}
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "artistas" && (
                <RegisterRowList empty="Nenhum artista cadastrado.">
                  {artists.map((artist) => (
                    <ListRow
                      key={artist.id}
                      title={artist.nome}
                      detail={
                        [artist.localNascimento, artist.anoNascimento]
                          .filter(Boolean)
                          .join(", ") || "Dados biográficos não informados"
                      }
                      onEdit={
                        user?.papel === "ADMIN_EMPRESA"
                          ? () => setDialog({ kind: "artist", item: artist })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "status" && (
                <RegisterRowList empty="Nenhum status cadastrado.">
                  {statuses.map((status) => (
                    <ListRow
                      key={status.id}
                      title={status.nome}
                      onEdit={
                        user?.papel === "ADMIN_EMPRESA"
                          ? () =>
                              setDialog({ kind: "name", item: status, ...NAME_ONLY_TABS.status! })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "tecnicas" && (
                <RegisterRowList empty="Nenhuma técnica cadastrada.">
                  {techniques.map((technique) => (
                    <ListRow
                      key={technique.id}
                      title={technique.nome}
                      detail={
                        technique.projeto ? `Projeto: ${technique.projeto.nome}` : "Geral da empresa"
                      }
                      onEdit={
                        user?.papel === "ADMIN_EMPRESA"
                          ? () => setDialog({ kind: "technique", item: technique })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "fichasMae" && (
                <RegisterRowList empty="Nenhuma ficha mãe cadastrada.">
                  {workSets.map((item) => (
                    <ListRow
                      key={item.id}
                      title={
                        <span className="flex min-w-0 items-center gap-2">
                          <Badge tone="brand">{item.codigo}</Badge>
                          <span className="line-clamp-1">{item.descricao}</span>
                        </span>
                      }
                      detail={`Projeto: ${item.projeto.nome}`}
                      meta={
                        <span className="text-xs font-semibold text-muted-foreground">
                          {item.totalObras} {item.totalObras === 1 ? "obra" : "obras"}
                        </span>
                      }
                      onEdit={
                        editableProjects.some((project) => project.id === item.projetoId)
                          ? () => setDialog({ kind: "workSet", item })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "categorias" && (
                <RegisterRowList empty="Nenhuma categoria cadastrada.">
                  {categories.map((category) => (
                    <ListRow
                      key={category.id}
                      title={category.nome}
                      onEdit={
                        canEdit
                          ? () =>
                              setDialog({
                                kind: "name",
                                item: category,
                                ...NAME_ONLY_TABS.categorias!,
                              })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "tags" && (
                <RegisterRowList empty="Nenhuma tag cadastrada.">
                  {tags.map((tag) => (
                    <ListRow
                      key={tag.id}
                      leading={<TagDot color={tag.cor} />}
                      title={tag.nome}
                      detail={tag.cor ? undefined : "Sem cor"}
                      onEdit={canEdit ? () => setDialog({ kind: "tag", item: tag }) : undefined}
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "assinaturas" && (
                <RegisterRowList empty="Nenhum local cadastrado.">
                  {signatureLocations.map((location) => (
                    <ListRow
                      key={location.id}
                      title={location.nome}
                      onEdit={
                        canEdit
                          ? () =>
                              setDialog({
                                kind: "name",
                                item: location,
                                ...NAME_ONLY_TABS.assinaturas!,
                              })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "negociacao" && (
                <RegisterRowList empty="Nenhuma forma cadastrada.">
                  {negotiationForms.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.nome}
                      onEdit={
                        canEdit
                          ? () =>
                              setDialog({
                                kind: "name",
                                item,
                                ...NAME_ONLY_TABS.negociacao!,
                              })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "seguros" && (
                <RegisterRowList empty="Nenhuma modalidade cadastrada.">
                  {insuranceTypes.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.nome}
                      onEdit={
                        canEdit
                          ? () =>
                              setDialog({
                                kind: "name",
                                item,
                                ...NAME_ONLY_TABS.seguros!,
                              })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "conservacao" && (
                <RegisterRowList empty="Nenhum estado cadastrado.">
                  {conservationStates.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.nome}
                      onEdit={
                        user?.papel === "ADMIN_EMPRESA"
                          ? () =>
                              setDialog({
                                kind: "name",
                                item,
                                ...NAME_ONLY_TABS.conservacao!,
                              })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}

              {activeTab === "servicos" && (
                <RegisterRowList empty="Nenhum tipo cadastrado.">
                  {serviceTypes.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.nome}
                      onEdit={
                        user?.papel === "ADMIN_EMPRESA"
                          ? () =>
                              setDialog({
                                kind: "name",
                                item,
                                ...NAME_ONLY_TABS.servicos!,
                              })
                          : undefined
                      }
                    />
                  ))}
                </RegisterRowList>
              )}
            </div>
          </div>
        </div>

        {dialog?.kind === "name" && (
          <NameRegisterModal
            path={dialog.path}
            createTitle={dialog.createTitle}
            editTitle={dialog.editTitle}
            item={dialog.item}
            onClose={closeDialog}
            onSaved={reload}
          />
        )}
        {dialog?.kind === "tag" && (
          <TagRegisterModal item={dialog.item} onClose={closeDialog} onSaved={reload} />
        )}
        {dialog?.kind === "artist" && (
          <ArtistRegisterModal item={dialog.item} onClose={closeDialog} onSaved={reload} />
        )}
        {dialog?.kind === "client" && (
          <ClientRegisterModal item={dialog.item} onClose={closeDialog} onSaved={reload} />
        )}
        {dialog?.kind === "technique" && (
          <TechniqueRegisterModal
            item={dialog.item}
            projects={projects}
            onClose={closeDialog}
            onSaved={reload}
          />
        )}
        {dialog?.kind === "workSet" && (
          <WorkSetRegisterModal
            item={dialog.item}
            projects={editableProjects}
            onClose={closeDialog}
            onSaved={reload}
          />
        )}
      </AppShell>
    </RoleGate>
  );
}

function RegisterRowList({
  empty,
  children,
}: {
  empty: string;
  children: ReactNode[];
}) {
  if (children.length === 0) return <EmptyState>{empty}</EmptyState>;
  return <RowList>{children}</RowList>;
}

function TagDot({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 rounded-full",
        !color && "border border-dashed border-border-strong",
      )}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}
