"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Artist,
  CatalogCategory,
  CatalogTag,
  Client,
  Project,
  SignatureLocation,
  NamedReference,
  Technique,
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
];

type RegisterTab = "clientes" | "artistas" | "status" | "tecnicas" | "categorias" | "tags" | "assinaturas" | "negociacao" | "seguros" | "conservacao" | "servicos";

const registerTabs: { id: RegisterTab; label: string; adminOnly?: boolean }[] = [
  { id: "clientes", label: "Clientes", adminOnly: true },
  { id: "artistas", label: "Artistas" },
  { id: "status", label: "Status" },
  { id: "tecnicas", label: "Técnicas" },
  { id: "categorias", label: "Categorias" },
  { id: "tags", label: "Tags" },
  { id: "assinaturas", label: "Locais de assinatura" },
  { id: "negociacao", label: "Formas de negociação" },
  { id: "seguros", label: "Modalidades de seguro" },
  { id: "conservacao", label: "Estados de conservação", adminOnly: true },
  { id: "servicos", label: "Tipos de serviço", adminOnly: true },
];

export default function RegistersPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<RegisterTab>(() =>
    useAuthStore.getState().user?.papel === "ADMIN_EMPRESA" ? "clientes" : "artistas",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [statuses, setStatuses] = useState<WorkStatus[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [tags, setTags] = useState<CatalogTag[]>([]);
  const [signatureLocations, setSignatureLocations] = useState<
    SignatureLocation[]
  >([]);
  const [negotiationForms, setNegotiationForms] = useState<NamedReference[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<NamedReference[]>([]);
  const [conservationStates, setConservationStates] = useState<NamedReference[]>([]);
  const [serviceTypes, setServiceTypes] = useState<NamedReference[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
      apiFetch<{ estadosConservacao: NamedReference[]; tiposServico: NamedReference[] }>("/gestao-auxiliares"),
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
  }

  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && apply(data))
      .catch((caught: unknown) => active && setError(text(caught)));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user?.papel !== "ADMIN_EMPRESA") return;
    let active = true;
    apiFetch<Client[]>("/clientes")
      .then((data) => active && setClients(data))
      .catch((caught: unknown) => active && setError(text(caught)));
    return () => { active = false; };
  }, [user?.papel]);

  useEffect(() => {
    if (!createOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCreateOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [createOpen]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    success: string,
    body: (data: FormData) => object,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body(new FormData(form))),
      });
      apply(await load());
      if (path === "/clientes") setClients(await apiFetch<Client[]>("/clientes"));
      form.reset();
      setCreateOpen(false);
      setMessage(success);
    } catch (caught: unknown) {
      setError(text(caught));
    } finally {
      setSaving(false);
    }
  }
  async function renameAux(path: string, id: string, nome: string) {
    setSaving(true); setError(null);
    try { await apiFetch(`${path}/${id}`, { method: "PATCH", body: JSON.stringify({ nome }) }); apply(await load()); }
    catch (caught: unknown) { setError(text(caught)); } finally { setSaving(false); }
  }
  const activeLabel = registerTabs.find((tab) => tab.id === activeTab)?.label ?? "Configuração";
  const canCreate = user?.papel === "ADMIN_EMPRESA" || (canManageCataloging && ["categorias", "tags", "assinaturas", "negociacao", "seguros"].includes(activeTab));

  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-2 text-sm text-slate-500">
          Gerencie os valores reutilizáveis nas obras da empresa.
        </p>
        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}
        {message && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Tipos de configuração" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {registerTabs.filter((tab) => !tab.adminOnly || user?.papel === "ADMIN_EMPRESA").map((tab) => (
              <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setCreateOpen(false); }} aria-current={activeTab === tab.id ? "page" : undefined} className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${activeTab === tab.id ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">{activeLabel}</h2>
              {canCreate && <button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800">Novo cadastro</button>}
            </div>

        {createOpen && <Modal title={activeLabel} onClose={() => setCreateOpen(false)}>
        {activeTab === "clientes" && user?.papel === "ADMIN_EMPRESA" && <Card title="Novo cliente"><form className="grid gap-3" onSubmit={(event) => submit(event, "/clientes", "Cliente criado.", (data) => ({ nome: data.get("nome"), codigo: data.get("codigo"), descricao: value(data, "descricao") }))}><Field name="nome" label="Nome" required minLength={2} maxLength={150}/><Field name="codigo" label="Código" required maxLength={50} placeholder="Ex.: MAR"/><label className="grid gap-2 text-sm font-medium">Descrição opcional<textarea name="descricao" maxLength={1000} className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-primary"/></label><Button saving={saving}>Cadastrar cliente</Button></form></Card>}

        {user?.papel === "ADMIN_EMPRESA" && (
          <div className="mt-6">
            {activeTab === "artistas" && <Card title="Novo artista">
              <form
                className="grid gap-3"
                onSubmit={(event) =>
                  submit(event, "/artistas", "Artista criado.", (data) => ({
                    nome: data.get("nome"),
                    localNascimento: value(data, "localNascimento"),
                    anoNascimento: numberValue(data, "anoNascimento"),
                    localFalecimento: value(data, "localFalecimento"),
                    anoFalecimento: numberValue(data, "anoFalecimento"),
                  }))
                }
              >
                <Field name="nome" label="Nome" required />
                <Field name="localNascimento" label="Local de nascimento" />
                <Field
                  name="anoNascimento"
                  label="Ano de nascimento"
                  type="number"
                  min={0}
                  max={9999}
                />
                <Field name="localFalecimento" label="Local de falecimento" />
                <Field
                  name="anoFalecimento"
                  label="Ano de falecimento"
                  type="number"
                  min={0}
                  max={9999}
                />
                <Button saving={saving}>Cadastrar artista</Button>
              </form>
            </Card>}
            {activeTab === "status" && <Card title="Novo status">
              <form
                className="grid gap-3"
                onSubmit={(event) =>
                  submit(event, "/status-obras", "Status criado.", (data) => ({
                    nome: data.get("nome"),
                  }))
                }
              >
                <Field name="nome" label="Nome" required />
                <Button saving={saving}>Cadastrar status</Button>
              </form>
            </Card>}
            {activeTab === "tecnicas" && <Card title="Nova técnica">
              <form
                className="grid gap-3"
                onSubmit={(event) =>
                  submit(event, "/tecnicas", "Técnica criada.", (data) => ({
                    nome: data.get("nome"),
                    projetoId: value(data, "projetoId"),
                  }))
                }
              >
                <Field name="nome" label="Nome" required />
                <label className="grid gap-2 text-sm font-medium">
                  Escopo
                  <select
                    name="projetoId"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Geral da empresa</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        Projeto: {project.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <Button saving={saving}>Cadastrar técnica</Button>
              </form>
            </Card>}
          </div>
        )}

        {canManageCataloging && (
          <div className="mt-6">
            {activeTab === "categorias" && <Card title="Nova categoria de catalogação">
              <form
                className="grid gap-3"
                onSubmit={(event) =>
                  submit(
                    event,
                    "/categorias-catalogacao",
                    "Categoria criada.",
                    (data) => ({ nome: data.get("nome") }),
                  )
                }
              >
                <Field name="nome" label="Nome" required maxLength={150} />
                <Button saving={saving}>Cadastrar categoria</Button>
              </form>
            </Card>}
            {activeTab === "tags" && <Card title="Nova tag">
              <form
                className="grid gap-3"
                onSubmit={(event) =>
                  submit(event, "/tags", "Tag criada.", (data) => ({
                    nome: data.get("nome"),
                    cor: value(data, "cor"),
                  }))
                }
              >
                <Field name="nome" label="Nome" required maxLength={150} />
                <Field
                  name="cor"
                  label="Cor hexadecimal (opcional)"
                  placeholder="#3B82F6"
                  pattern="#[0-9A-Fa-f]{6}"
                />
                <Button saving={saving}>Cadastrar tag</Button>
              </form>
            </Card>}
            {activeTab === "assinaturas" && <Card title="Novo local de assinatura">
              <form
                className="grid gap-3"
                onSubmit={(event) =>
                  submit(
                    event,
                    "/locais-assinatura",
                    "Local de assinatura criado.",
                    (data) => ({ nome: data.get("nome") }),
                  )
                }
              >
                <Field name="nome" label="Nome" required maxLength={150} />
                <Button saving={saving}>Cadastrar local</Button>
              </form>
            </Card>}
          </div>
        )}
        {canManageCataloging && (
          <div className="mt-6">
            {activeTab === "negociacao" && <Card title="Nova forma de negociação"><form className="grid gap-3" onSubmit={(event) => submit(event, "/formas-negociacao", "Forma de negociação criada.", (data) => ({ nome: data.get("nome") }))}><Field name="nome" label="Nome" required maxLength={150}/><Button saving={saving}>Cadastrar forma</Button></form></Card>}
            {activeTab === "seguros" && <Card title="Nova modalidade de seguro"><form className="grid gap-3" onSubmit={(event) => submit(event, "/modalidades-seguro", "Modalidade de seguro criada.", (data) => ({ nome: data.get("nome") }))}><Field name="nome" label="Nome" required maxLength={150}/><Button saving={saving}>Cadastrar modalidade</Button></form></Card>}
          </div>
        )}
        {user?.papel === "ADMIN_EMPRESA" && <div className="mt-6">{activeTab === "conservacao" && <Card title="Novo estado de conservação"><form className="grid gap-3" onSubmit={e=>submit(e,"/gestao-auxiliares/estados-conservacao","Estado criado.",d=>({nome:d.get("nome")}))}><Field name="nome" label="Nome" required/><Button saving={saving}>Cadastrar estado</Button></form></Card>}{activeTab === "servicos" && <Card title="Novo tipo de serviço"><form className="grid gap-3" onSubmit={e=>submit(e,"/gestao-auxiliares/tipos-servico","Tipo criado.",d=>({nome:d.get("nome")}))}><Field name="nome" label="Nome" required/><Button saving={saving}>Cadastrar tipo</Button></form></Card>}</div>}
        </Modal>}

        {user?.papel === "ADMIN_EMPRESA" && activeTab === "clientes" && (
          <section className="mt-10">
            <div className="grid gap-3">
              {clients.length === 0 ? <EmptyState>Nenhum cliente cadastrado.</EmptyState> : clients.map((client) => (
                <article key={client.id} className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{client.nome}</h3>
                      <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-bold text-primary-800">{client.codigo}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{client.descricao || "Sem descrição"}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-slate-500">{client._count?.projetos ?? 0} projetos</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-8 xl:grid-cols-3">
          {activeTab === "artistas" && <List
            title="Artistas"
            empty="Nenhum artista cadastrado."
            items={artists.map((artist) => ({
              id: artist.id,
              title: artist.nome,
              detail:
                [artist.localNascimento, artist.anoNascimento]
                  .filter(Boolean)
                  .join(", ") || "Dados biográficos não informados",
            }))}
          />}
          {activeTab === "status" && <List
            title="Status"
            empty="Nenhum status cadastrado."
            items={statuses.map((status) => ({
              id: status.id,
              title: status.nome,
            }))}
          />}
          {activeTab === "tecnicas" && <List
            title="Técnicas"
            empty="Nenhuma técnica cadastrada."
            items={techniques.map((technique) => ({
              id: technique.id,
              title: technique.nome,
              detail: technique.projeto
                ? `Projeto: ${technique.projeto.nome}`
                : "Geral da empresa",
            }))}
          />}
        </div>
        <div className="mt-10 grid gap-8 xl:grid-cols-2">{activeTab === "negociacao" && <List title="Formas de negociação" empty="Nenhuma forma cadastrada." items={negotiationForms.map((item) => ({ id: item.id, title: item.nome }))}/>} {activeTab === "seguros" && <List title="Modalidades de seguro" empty="Nenhuma modalidade cadastrada." items={insuranceTypes.map((item) => ({ id: item.id, title: item.nome }))}/>}</div>
        <div className="mt-10 grid gap-8 xl:grid-cols-2">{activeTab === "conservacao" && <EditableAux title="Estados de conservação" items={conservationStates} canEdit={user?.papel==="ADMIN_EMPRESA"} saving={saving} rename={(id,nome)=>renameAux("/gestao-auxiliares/estados-conservacao",id,nome)}/>} {activeTab === "servicos" && <EditableAux title="Tipos de serviço" items={serviceTypes} canEdit={user?.papel==="ADMIN_EMPRESA"} saving={saving} rename={(id,nome)=>renameAux("/gestao-auxiliares/tipos-servico",id,nome)}/>}</div>
        <div className="mt-10 grid gap-8 xl:grid-cols-3">
          {activeTab === "categorias" && <List
            title="Categorias de catalogação"
            empty="Nenhuma categoria cadastrada."
            items={categories.map((item) => ({
              id: item.id,
              title: item.nome,
            }))}
          />}
          {activeTab === "tags" && <List
            title="Tags"
            empty="Nenhuma tag cadastrada."
            items={tags.map((item) => ({
              id: item.id,
              title: item.nome,
              detail: item.cor ?? "Sem cor",
            }))}
          />}
          {activeTab === "assinaturas" && <List
            title="Locais de assinatura"
            empty="Nenhum local cadastrado."
            items={signatureLocations.map((item) => ({
              id: item.id,
              title: item.nome,
            }))}
          />}
        </div>
          </div>
        </div>
      </AppShell>
    </RoleGate>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="configuration-modal-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="configuration-modal-title" className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal" className="grid size-9 shrink-0 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="mt-2">{children}</div>
      </section>
    </div>
  );
}

function text(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
function value(data: FormData, name: string) {
  const item = data.get(name);
  return typeof item === "string" && item ? item : undefined;
}
function numberValue(data: FormData, name: string) {
  const item = value(data, name);
  return item ? Number(item) : undefined;
}
function Card({
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full">{children}</section>
  );
}
function Field({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        name={name}
        className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-primary"
        {...props}
      />
    </label>
  );
}
function Button({
  saving,
  children,
}: {
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={saving}
      className="mt-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60"
    >
      {saving ? "Salvando..." : children}
    </button>
  );
}
function List({
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; detail?: string }[];
}) {
  return (
    <section>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <EmptyState>{empty}</EmptyState>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl bg-white p-4 shadow-sm"
            >
              <h3 className="font-semibold">{item.title}</h3>
              {item.detail && (
                <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
function EditableAux({items,canEdit,saving,rename}:{title:string;items:NamedReference[];canEdit:boolean;saving:boolean;rename:(id:string,nome:string)=>Promise<void>}) { return <section><div className="grid gap-3">{items.length===0?<EmptyState>Nenhum cadastro.</EmptyState>:items.map(x=><article key={x.id} className="rounded-xl border border-slate-100 bg-white p-4">{canEdit?<form onSubmit={e=>{e.preventDefault();const nome=new FormData(e.currentTarget).get("nome");if(typeof nome==="string")void rename(x.id,nome)}} className="flex gap-2"><input name="nome" defaultValue={x.nome} required className="min-w-0 flex-1 rounded-lg border px-3 py-2"/><button disabled={saving} className="rounded-lg border px-3 text-xs font-semibold">Salvar</button></form>:<h3 className="font-semibold">{x.nome}</h3>}</article>)}</div></section> }
