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
];

export default function RegistersPage() {
  const user = useAuthStore((state) => state.user);
  const [artists, setArtists] = useState<Artist[]>([]);
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
      form.reset();
      setMessage(success);
    } catch (caught: unknown) {
      setError(text(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <p className="text-sm font-semibold text-cyan-700">Ficha técnica</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Cadastros auxiliares
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Artistas e valores reutilizáveis nas obras da empresa.
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

        {user?.papel === "ADMIN_EMPRESA" && (
          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <Card title="Novo artista">
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
            </Card>
            <Card title="Novo status">
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
            </Card>
            <Card title="Nova técnica">
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
            </Card>
          </div>
        )}

        {canManageCataloging && (
          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <Card title="Nova categoria de catalogação">
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
            </Card>
            <Card title="Nova tag">
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
            </Card>
            <Card title="Novo local de assinatura">
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
            </Card>
          </div>
        )}
        {canManageCataloging && (
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <Card title="Nova forma de negociação"><form className="grid gap-3" onSubmit={(event) => submit(event, "/formas-negociacao", "Forma de negociação criada.", (data) => ({ nome: data.get("nome") }))}><Field name="nome" label="Nome" required maxLength={150}/><Button saving={saving}>Cadastrar forma</Button></form></Card>
            <Card title="Nova modalidade de seguro"><form className="grid gap-3" onSubmit={(event) => submit(event, "/modalidades-seguro", "Modalidade de seguro criada.", (data) => ({ nome: data.get("nome") }))}><Field name="nome" label="Nome" required maxLength={150}/><Button saving={saving}>Cadastrar modalidade</Button></form></Card>
          </div>
        )}

        <div className="mt-10 grid gap-8 xl:grid-cols-3">
          <List
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
          />
          <List
            title="Status"
            empty="Nenhum status cadastrado."
            items={statuses.map((status) => ({
              id: status.id,
              title: status.nome,
            }))}
          />
          <List
            title="Técnicas"
            empty="Nenhuma técnica cadastrada."
            items={techniques.map((technique) => ({
              id: technique.id,
              title: technique.nome,
              detail: technique.projeto
                ? `Projeto: ${technique.projeto.nome}`
                : "Geral da empresa",
            }))}
          />
        </div>
        <div className="mt-10 grid gap-8 xl:grid-cols-2"><List title="Formas de negociação" empty="Nenhuma forma cadastrada." items={negotiationForms.map((item) => ({ id: item.id, title: item.nome }))}/><List title="Modalidades de seguro" empty="Nenhuma modalidade cadastrada." items={insuranceTypes.map((item) => ({ id: item.id, title: item.nome }))}/></div>
        <div className="mt-10 grid gap-8 xl:grid-cols-3">
          <List
            title="Categorias de catalogação"
            empty="Nenhuma categoria cadastrada."
            items={categories.map((item) => ({
              id: item.id,
              title: item.nome,
            }))}
          />
          <List
            title="Tags"
            empty="Nenhuma tag cadastrada."
            items={tags.map((item) => ({
              id: item.id,
              title: item.nome,
              detail: item.cor ?? "Sem cor",
            }))}
          />
          <List
            title="Locais de assinatura"
            empty="Nenhum local cadastrado."
            items={signatureLocations.map((item) => ({
              id: item.id,
              title: item.nome,
            }))}
          />
        </div>
      </AppShell>
    </RoleGate>
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
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>
      {children}
    </section>
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
        className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600"
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
      className="mt-2 rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
    >
      {saving ? "Salvando..." : children}
    </button>
  );
}
function List({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; detail?: string }[];
}) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 grid gap-3">
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
