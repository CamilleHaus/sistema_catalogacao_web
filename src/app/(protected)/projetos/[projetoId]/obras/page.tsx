"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { CatalogingForm } from "@/components/cataloging-form";
import { ResearchForm } from "@/components/research-form";
import { FinancialForm } from "@/components/financial-form";
import { WorkMedia } from "@/components/work-media";
import { ManagementForm } from "@/components/management-form";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Artist,
  LocationNode,
  Project,
  Technique,
  Work,
  WorkDimension,
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

export default function WorksPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
      .catch((caught: unknown) => active && setError(message(caught)));
    return () => {
      active = false;
    };
  }, [load]);
  const locations = useMemo(() => flatten(data?.[5] ?? []), [data]);
  const canEdit =
    user?.papel === "ADMIN_EMPRESA" || data?.[0].permissao === "EDITAR";

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
          titulo: optional(values, "titulo"),
          edicao: optional(values, "edicao"),
          data: optional(values, "data"),
          statusId: optional(values, "statusId"),
          tecnicaId: optional(values, "tecnicaId"),
          localizacaoId: optional(values, "localizacaoId"),
          artistaIds: values.getAll("artistaIds"),
        }),
      });
      setData(await load());
      form.reset();
    } catch (caught: unknown) {
      setError(message(caught));
    } finally {
      setSaving(false);
    }
  }

  const project = data?.[0];
  const works = data?.[1] ?? [];
  const artists = data?.[2] ?? [];
  const statuses = data?.[3] ?? [];
  const techniques = data?.[4] ?? [];
  return (
    <RoleGate allow={["ADMIN_EMPRESA", "USUARIO"]}>
      <AppShell>
        <p className="text-sm font-semibold text-primary">
          {project?.cliente.nome ?? "Catálogo"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Obras de {project?.nome ?? "..."}
        </h1>
        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}
        {canEdit && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Cadastrar obra</h2>
            <p className="mt-1 text-sm text-slate-500">
              Somente o número manual é obrigatório.
            </p>
            <form
              onSubmit={create}
              className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            >
              <Field
                name="numeroManual"
                label="Número manual"
                required
                maxLength={100}
              />
              <Field name="titulo" label="Título" maxLength={300} />
              <Field name="edicao" label="Edição" maxLength={150} />
              <Field name="data" label="Data" maxLength={150} />
              <Select
                name="statusId"
                label="Status"
                options={statuses.map((item) => ({
                  value: item.id,
                  label: item.nome,
                }))}
              />
              <Select
                name="tecnicaId"
                label="Técnica"
                options={techniques.map((item) => ({
                  value: item.id,
                  label: `${item.nome}${item.projeto ? ` — ${item.projeto.nome}` : " — geral"}`,
                }))}
              />
              <Select
                name="localizacaoId"
                label="Localização"
                options={locations.map(({ node, depth }) => ({
                  value: node.id,
                  label: `${"— ".repeat(depth)}${node.nome}`,
                }))}
              />
              <label className="grid gap-2 text-sm font-medium">
                Artistas
                <select
                  multiple
                  name="artistaIds"
                  className="min-h-28 rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  {artists.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60 md:col-span-2 xl:col-span-4"
              >
                {saving ? "Salvando..." : "Cadastrar obra"}
              </button>
            </form>
          </section>
        )}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold">Acervo</h2>
            <span className="text-sm text-slate-500">{works.length} obras</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {works.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState>Nenhuma obra cadastrada.</EmptyState>
              </div>
            ) : (
              works.map((work) => (
                <article
                  key={work.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  {work.fotoPrincipalUrl && (
                    <div
                      role="img"
                      aria-label={`Foto principal de ${work.tituloExibicao}`}
                      className="mb-4 aspect-[4/3] rounded-xl bg-slate-100 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${JSON.stringify(work.fotoPrincipalUrl)})`,
                      }}
                    />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {work.codigoAcervo}
                  </span>
                  <h3 className="mt-2 text-lg font-bold">
                    {work.tituloExibicao}
                  </h3>
                  {work.artistas.length > 0 && (
                    <p className="mt-2 text-sm text-slate-600">
                      {work.artistas.map((artist) => artist.nome).join(", ")}
                    </p>
                  )}
                  <dl className="mt-4 grid gap-1 text-sm text-slate-500">
                    {work.data && <div>Data: {work.data}</div>}
                    {work.status && <div>Status: {work.status.nome}</div>}
                    {work.tecnica && <div>Técnica: {work.tecnica.nome}</div>}
                    {work.localizacao && (
                      <div>Localização: {work.localizacao.nome}</div>
                    )}
                  </dl>
                  {work.dimensoes.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      {work.dimensoes.map((dimension) => (
                        <p
                          key={dimension.id}
                          className="mt-1 text-xs text-slate-500"
                        >
                          <strong>
                            {dimension.tipo === "COM_MOLDURA"
                              ? "Com moldura"
                              : "Sem moldura"}
                            :
                          </strong>{" "}
                          {formatDimension(dimension)}
                        </p>
                      ))}
                    </div>
                  )}
                  {canEdit && (
                    <>
                      <PhotoForm
                        projetoId={projetoId}
                        work={work}
                        onSaved={async () => setData(await load())}
                        onError={setError}
                      />
                      <DimensionForm
                        projetoId={projetoId}
                        workId={work.id}
                        label="Sem moldura"
                        tipo="SEM_MOLDURA"
                        current={work.dimensoes.find(
                          (item) => item.tipo === "SEM_MOLDURA",
                        )}
                        onSaved={async () => setData(await load())}
                        onError={setError}
                      />
                      <DimensionForm
                        projetoId={projetoId}
                        workId={work.id}
                        label="Com moldura"
                        tipo="COM_MOLDURA"
                        current={work.dimensoes.find(
                          (item) => item.tipo === "COM_MOLDURA",
                        )}
                        onSaved={async () => setData(await load())}
                        onError={setError}
                      />
                    </>
                  )}
                  <details className="mt-4 border-t border-slate-100 pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      Catalogação
                    </summary>
                    <CatalogingForm
                      projetoId={projetoId}
                      obraId={work.id}
                      canEdit={Boolean(canEdit)}
                      onError={setError}
                    />
                  </details>
                  <WorkMedia
                    projetoId={projetoId}
                    obraId={work.id}
                    canEdit={Boolean(canEdit)}
                    onChanged={async () => setData(await load())}
                    onError={setError}
                  />
                  <ManagementForm projetoId={projetoId} work={work} locations={data?.[5] ?? []} canEdit={Boolean(canEdit)} onChanged={async () => setData(await load())} onError={setError} />
                  <details className="mt-4 border-t border-slate-100 pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      Pesquisa
                    </summary>
                    <ResearchForm
                      projetoId={projetoId}
                      obraId={work.id}
                      canEdit={Boolean(canEdit)}
                      onError={setError}
                    />
                  </details>
                  <details className="mt-4 border-t border-slate-100 pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">Financeiro</summary>
                    <FinancialForm projetoId={projetoId} obraId={work.id} canEdit={Boolean(canEdit)} onError={setError} />
                  </details>
                </article>
              ))
            )}
          </div>
        </section>
      </AppShell>
    </RoleGate>
  );
}

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
function optional(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" && value ? value : undefined;
}
function flatten(
  nodes: LocationNode[],
  depth = 0,
): { node: LocationNode; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.filhos, depth + 1),
  ]);
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
        className="rounded-xl border border-slate-300 px-3 py-2"
        {...props}
      />
    </label>
  );
}
function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        name={name}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2"
      >
        <option value="">Não informado</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function formatDimension(dimension: import("@/types/domain").WorkDimension) {
  if (dimension.formato === "VARIAVEL") return dimension.descricaoVariavel;
  const depth =
    dimension.profundidade === null ? "" : ` × ${dimension.profundidade}`;
  return `${dimension.altura} × ${dimension.largura}${depth} ${dimension.unidade?.toLowerCase()}`;
}
function PhotoForm({
  projetoId,
  work,
  onSaved,
  onError,
}: {
  projetoId: string;
  work: Work;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const url = data.get("url");
    setBusy(true);
    onError("");
    try {
      await apiFetch(`/projetos/${projetoId}/obras/${work.id}/foto-principal`, {
        method: "PUT",
        body: JSON.stringify({ url, creditos: optional(data, "creditos") }),
      });
      await onSaved();
    } catch (caught: unknown) {
      onError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    onError("");
    try {
      await apiFetch(`/projetos/${projetoId}/obras/${work.id}/foto-principal`, {
        method: "DELETE",
      });
      await onSaved();
    } catch (caught: unknown) {
      onError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mt-4 border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Foto principal
      </summary>
      <form onSubmit={save} className="mt-3 grid gap-2">
        <input
          type="url"
          name="url"
          required
          defaultValue={work.fotoPrincipalUrl ?? ""}
          placeholder="https://..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="creditos"
          maxLength={500}
          defaultValue={work.fotoPrincipalCreditos ?? ""}
          placeholder="Créditos (opcional)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
          >
            Salvar URL
          </button>
          {work.fotoPrincipalUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
            >
              Remover
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
function DimensionForm({
  projetoId,
  workId,
  tipo,
  label,
  current,
  onSaved,
  onError,
}: {
  projetoId: string;
  workId: string;
  tipo: "SEM_MOLDURA" | "COM_MOLDURA";
  label: string;
  current?: WorkDimension;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [format, setFormat] = useState<"NUMERICA" | "VARIAVEL">(
    current?.formato ?? "NUMERICA",
  );
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body =
      format === "VARIAVEL"
        ? { descricaoVariavel: data.get("descricaoVariavel") }
        : {
            altura: Number(data.get("altura")),
            largura: Number(data.get("largura")),
            profundidade: optionalNumber(data, "profundidade"),
            unidade: data.get("unidade"),
          };
    setBusy(true);
    onError("");
    try {
      await apiFetch(
        `/projetos/${projetoId}/obras/${workId}/dimensoes/${tipo}`,
        { method: "PUT", body: JSON.stringify(body) },
      );
      await onSaved();
    } catch (caught: unknown) {
      onError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    onError("");
    try {
      await apiFetch(
        `/projetos/${projetoId}/obras/${workId}/dimensoes/${tipo}`,
        { method: "DELETE" },
      );
      await onSaved();
    } catch (caught: unknown) {
      onError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mt-3 border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Dimensão {label.toLowerCase()}
      </summary>
      <form onSubmit={save} className="mt-3 grid gap-2">
        <select
          value={format}
          onChange={(event) => setFormat(event.target.value as typeof format)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="NUMERICA">Numérica</option>
          <option value="VARIAVEL">Variável</option>
        </select>
        {format === "VARIAVEL" ? (
          <textarea
            required
            name="descricaoVariavel"
            defaultValue={current?.descricaoVariavel ?? ""}
            placeholder="Descrição das dimensões"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <input
                required
                type="number"
                step="0.001"
                min="0.001"
                name="altura"
                defaultValue={current?.altura ?? ""}
                placeholder="Altura"
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                required
                type="number"
                step="0.001"
                min="0.001"
                name="largura"
                defaultValue={current?.largura ?? ""}
                placeholder="Largura"
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                type="number"
                step="0.001"
                min="0.001"
                name="profundidade"
                defaultValue={current?.profundidade ?? ""}
                placeholder="Prof."
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
            <select
              name="unidade"
              defaultValue={current?.unidade ?? "CM"}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="CM">Centímetros</option>
              <option value="IN">Polegadas</option>
            </select>
          </>
        )}
        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
          >
            Salvar
          </button>
          {current && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
            >
              Remover
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
function optionalNumber(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" && value ? Number(value) : undefined;
}
