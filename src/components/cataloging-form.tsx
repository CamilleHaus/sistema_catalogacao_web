"use client";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type {
  CatalogCategory,
  Cataloging,
  CatalogTag,
  SignatureLocation,
} from "@/types/domain";
type Refs = {
  categories: CatalogCategory[];
  tags: CatalogTag[];
  locations: SignatureLocation[];
};
export function CatalogingForm({
  projetoId,
  obraId,
  canEdit,
  onError,
}: {
  projetoId: string;
  obraId: string;
  canEdit: boolean;
  onError: (value: string) => void;
}) {
  const [catalog, setCatalog] = useState<Cataloging | null>(null);
  const [refs, setRefs] = useState<Refs>({
    categories: [],
    tags: [],
    locations: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = `/projetos/${projetoId}/obras/${obraId}/catalogacao`;
  async function load() {
    const [value, categories, tags, locations] = await Promise.all([
      apiFetch<Cataloging | null>(base),
      apiFetch<CatalogCategory[]>("/categorias-catalogacao"),
      apiFetch<CatalogTag[]>("/tags"),
      apiFetch<SignatureLocation[]>("/locais-assinatura"),
    ]);
    setCatalog(value);
    setRefs({ categories, tags, locations });
    setLoaded(true);
  }
  useEffect(() => {
    Promise.all([
      apiFetch<Cataloging | null>(base),
      apiFetch<CatalogCategory[]>("/categorias-catalogacao"),
      apiFetch<CatalogTag[]>("/tags"),
      apiFetch<SignatureLocation[]>("/locais-assinatura"),
    ])
      .then(([value, categories, tags, locations]) => {
        setCatalog(value);
        setRefs({ categories, tags, locations });
        setLoaded(true);
      })
      .catch((error: unknown) => onError(msg(error)));
  }, [base, onError]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    onError("");
    try {
      await fn();
    } catch (error: unknown) {
      onError(msg(error));
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action(() =>
      apiFetch<Cataloging>(base, {
        method: "PUT",
        body: JSON.stringify({
          categoriaId: empty(data, "categoriaId"),
          proveniencia: empty(data, "proveniencia"),
          observacoes: empty(data, "observacoes"),
          tagIds: data.getAll("tagIds"),
        }),
      }).then(setCatalog),
    );
  }
  async function addSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await action(() =>
      apiFetch(`${base}/assinaturas`, {
        method: "POST",
        body: JSON.stringify({
          localAssinaturaId: data.get("localAssinaturaId"),
          imagemUrl: empty(data, "imagemUrl"),
        }),
      }).then(async () => {
        await load();
        form.reset();
      }),
    );
  }
  async function addCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await action(() =>
      apiFetch(`${base}/certificados`, {
        method: "POST",
        body: JSON.stringify({
          imagemUrl: data.get("imagemUrl"),
          observacoes: empty(data, "observacoes"),
        }),
      }).then(async () => {
        await load();
        form.reset();
      }),
    );
  }
  async function remove(path: string) {
    await action(() => apiFetch(path, { method: "DELETE" }).then(load));
  }
  if (!loaded)
    return (
      <p className="mt-3 text-sm text-slate-500">Carregando catalogação...</p>
    );
  return (
    <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4">
      <form onSubmit={save} className="grid gap-3">
        <label className="grid gap-1 text-xs font-semibold">
          Categoria
          <select
            disabled={!canEdit}
            name="categoriaId"
            defaultValue={catalog?.categoria?.id ?? ""}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Não informada</option>
            {refs.categories.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Proveniência
          <textarea
            disabled={!canEdit}
            name="proveniencia"
            defaultValue={catalog?.proveniencia ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Tags
          <select
            disabled={!canEdit}
            multiple
            name="tagIds"
            defaultValue={catalog?.tags.map((x) => x.id) ?? []}
            className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {refs.tags.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Observações
          <textarea
            disabled={!canEdit}
            name="observacoes"
            defaultValue={catalog?.observacoes ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        {canEdit && (
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            {catalog ? "Salvar catalogação" : "Criar catalogação"}
          </button>
        )}
      </form>
      {catalog && (
        <>
          <div>
            <h4 className="text-sm font-bold">Assinaturas</h4>
            {catalog.assinaturas.map((x) => (
              <div key={x.id} className="mt-2 flex justify-between text-sm">
                <span>
                  {x.localAssinatura.nome}
                  {x.imagemUrl && (
                    <>
                      {" "}
                      —{" "}
                      <a
                        className="text-primary underline"
                        href={x.imagemUrl}
                        target="_blank"
                      >
                        imagem
                      </a>
                    </>
                  )}
                </span>
                {canEdit && (
                  <button
                    onClick={() => remove(`${base}/assinaturas/${x.id}`)}
                    className="text-xs font-semibold text-rose-700"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <form onSubmit={addSignature} className="mt-3 grid gap-2">
                <select
                  required
                  name="localAssinaturaId"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecione o local</option>
                  {refs.locations.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  name="imagemUrl"
                  placeholder="URL da imagem (opcional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  disabled={busy}
                  className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary"
                >
                  Adicionar assinatura
                </button>
              </form>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold">Certificados</h4>
            {catalog.certificados.map((x) => (
              <div key={x.id} className="mt-2 flex justify-between text-sm">
                <span>
                  <a
                    className="text-primary underline"
                    href={x.imagemUrl}
                    target="_blank"
                  >
                    Ver certificado
                  </a>
                  {x.observacoes && <> — {x.observacoes}</>}
                </span>
                {canEdit && (
                  <button
                    onClick={() => remove(`${base}/certificados/${x.id}`)}
                    className="text-xs font-semibold text-rose-700"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <form onSubmit={addCertificate} className="mt-3 grid gap-2">
                <input
                  required
                  type="url"
                  name="imagemUrl"
                  placeholder="URL da imagem"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="observacoes"
                  placeholder="Observações (opcional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  disabled={busy}
                  className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary"
                >
                  Adicionar certificado
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function empty(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function msg(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
