"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { MuseumResearch, WorkCurriculum, WorkPublication, WorkResearch } from "@/types/domain";

export function ResearchForm({ projetoId, obraId, canEdit, onError }: {
  projetoId: string; obraId: string; canEdit: boolean; onError: (value: string) => void;
}) {
  const base = `/projetos/${projetoId}/obras/${obraId}/pesquisa`;
  const [data, setData] = useState<WorkResearch | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => apiFetch<WorkResearch>(base).then(setData), [base]);
  useEffect(() => { load().catch((error: unknown) => onError(msg(error))); }, [load, onError]);

  async function action(fn: () => Promise<unknown>) {
    setBusy(true); onError("");
    try { await fn(); await load(); } catch (error: unknown) { onError(msg(error)); } finally { setBusy(false); }
  }
  async function create(kind: "curriculos" | "publicacoes" | "museologicas", event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    await action(() => apiFetch(`${base}/${kind}`, { method: "POST", body: JSON.stringify(body(kind, new FormData(form))) }).then(() => form.reset()));
  }
  async function update(kind: "curriculos" | "publicacoes" | "museologicas", id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(() => apiFetch(`${base}/${kind}/${id}`, { method: "PATCH", body: JSON.stringify(body(kind, new FormData(event.currentTarget))) }));
  }
  async function remove(path: string) {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    await action(() => apiFetch(`${base}/${path}`, { method: "DELETE" }));
  }
  if (!data) return <p className="mt-3 text-sm text-slate-500">Carregando pesquisa...</p>;
  return <div className="mt-4 grid gap-6 border-t border-slate-100 pt-4">
    <Section title="Currículo da obra" empty={data.curriculos.length === 0}>
      {data.curriculos.map((item) => <Record key={item.id} title={item.nomeExposicao}>
        <CurriculumForm item={item} disabled={!canEdit || busy} onSubmit={(e) => update("curriculos", item.id, e)} />
        {canEdit && <DeleteButton disabled={busy} onClick={() => remove(`curriculos/${item.id}`)} />}
      </Record>)}
      {canEdit && <Create title="Adicionar currículo"><CurriculumForm disabled={busy} onSubmit={(e) => create("curriculos", e)} /></Create>}
    </Section>
    <Section title="Publicações" empty={data.publicacoes.length === 0}>
      {data.publicacoes.map((item) => <Record key={item.id} title={item.titulo} suffix={item.ano?.toString()}>
        <PublicationForm item={item} disabled={!canEdit || busy} onSubmit={(e) => update("publicacoes", item.id, e)} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {item.imagens.map((image) => <div key={image.id} className="rounded-lg border border-slate-200 p-2">
            <a href={image.imagemUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem da publicação"><span role="img" aria-label="Imagem da publicação" className="block aspect-square w-full rounded bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(image.imagemUrl)})` }} /></a>
            {canEdit && <button disabled={busy} onClick={() => remove(`publicacoes/${item.id}/imagens/${image.id}`)} className="mt-1 text-xs font-semibold text-rose-700">Remover imagem</button>}
          </div>)}
        </div>
        {canEdit && <ImageForm disabled={busy} onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const url = new FormData(form).get("imagemUrl"); action(() => apiFetch(`${base}/publicacoes/${item.id}/imagens`, { method: "POST", body: JSON.stringify({ imagemUrl: url }) }).then(() => form.reset())); }} />}
        {canEdit && <DeleteButton disabled={busy} onClick={() => remove(`publicacoes/${item.id}`)} />}
      </Record>)}
      {canEdit && <Create title="Adicionar publicação"><PublicationForm disabled={busy} onSubmit={(e) => create("publicacoes", e)} /></Create>}
    </Section>
    <Section title="Pesquisa museológica" empty={data.pesquisasMuseologicas.length === 0}>
      {data.pesquisasMuseologicas.map((item) => <Record key={item.id} title={item.titulo}>
        <MuseumForm item={item} disabled={!canEdit || busy} onSubmit={(e) => update("museologicas", item.id, e)} />
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs text-cyan-700 underline">Abrir referência</a>}
        {canEdit && <DeleteButton disabled={busy} onClick={() => remove(`museologicas/${item.id}`)} />}
      </Record>)}
      {canEdit && <Create title="Adicionar pesquisa museológica"><MuseumForm disabled={busy} onSubmit={(e) => create("museologicas", e)} /></Create>}
    </Section>
  </div>;
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return <section><h4 className="text-sm font-bold text-slate-800">{title}</h4>{empty && <p className="mt-2 text-xs text-slate-500">Nenhum registro.</p>}<div className="mt-2 grid gap-2">{children}</div></section>;
}
function Record({ title, suffix, children }: { title: string | null; suffix?: string; children: React.ReactNode }) {
  return <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">{title?.trim() || "Sem título"}{suffix ? ` — ${suffix}` : ""}</summary><div className="mt-3">{children}</div></details>;
}
function Create({ title, children }: { title: string; children: React.ReactNode }) {
  return <details className="rounded-xl border border-dashed border-cyan-300 p-3"><summary className="cursor-pointer text-sm font-semibold text-cyan-700">{title}</summary><div className="mt-3">{children}</div></details>;
}
const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50";
function Fields({ children }: { children: React.ReactNode }) { return <div className="grid gap-2">{children}</div>; }
function Save({ disabled }: { disabled: boolean }) { return <button disabled={disabled} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Salvar</button>; }
function DeleteButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="mt-3 text-xs font-semibold text-rose-700">Excluir registro</button>; }
function CurriculumForm({ item, disabled, onSubmit }: { item?: WorkCurriculum; disabled: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}><Fields>{[["nomeExposicao", "Nome da exposição"], ["instituicao", "Instituição"], ["cidade", "Cidade"], ["pais", "País"], ["data", "Data"]].map(([name, placeholder]) => <input key={name} disabled={disabled} name={name} defaultValue={item?.[name as keyof WorkCurriculum] as string ?? ""} placeholder={placeholder} className={input} />)}{!disabled && <Save disabled={disabled} />}</Fields></form>;
}
function PublicationForm({ item, disabled, onSubmit }: { item?: WorkPublication; disabled: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}><Fields><input disabled={disabled} name="titulo" defaultValue={item?.titulo ?? ""} placeholder="Título" className={input} /><input disabled={disabled} type="number" min="0" max="9999" step="1" name="ano" defaultValue={item?.ano ?? ""} placeholder="Ano" className={input} />{[["autor", "Autor"], ["editora", "Editora"], ["pagina", "Página"]].map(([name, placeholder]) => <input key={name} disabled={disabled} name={name} defaultValue={item?.[name as keyof WorkPublication] as string ?? ""} placeholder={placeholder} className={input} />)}{!item && <label className="grid gap-1 text-xs font-semibold text-slate-700">Imagens (opcional)<textarea disabled={disabled} name="imagens" placeholder={"Uma URL por linha\nhttps://..."} className={input} /><span className="font-normal text-slate-500">Informe uma ou várias URLs, uma por linha.</span></label>}{!disabled && <Save disabled={disabled} />}</Fields></form>;
}
function MuseumForm({ item, disabled, onSubmit }: { item?: MuseumResearch; disabled: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}><Fields><input disabled={disabled} name="titulo" defaultValue={item?.titulo ?? ""} placeholder="Título" className={input} /><textarea disabled={disabled} name="descricao" defaultValue={item?.descricao ?? ""} placeholder="Descrição" className={input} /><input disabled={disabled} type="url" name="url" defaultValue={item?.url ?? ""} placeholder="URL" className={input} />{!disabled && <Save disabled={disabled} />}</Fields></form>;
}
function ImageForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) { return <form onSubmit={onSubmit} className="mt-3 flex gap-2"><input required disabled={disabled} type="url" name="imagemUrl" placeholder="URL da imagem" className={`${input} min-w-0 flex-1`} /><button disabled={disabled} className="rounded-lg border border-cyan-700 px-3 text-xs font-semibold text-cyan-700">Adicionar</button></form>; }
function body(kind: string, data: FormData) {
  const keys = kind === "curriculos" ? ["nomeExposicao", "instituicao", "cidade", "pais", "data"] : kind === "publicacoes" ? ["titulo", "ano", "autor", "editora", "pagina"] : ["titulo", "descricao", "url"];
  const result = Object.fromEntries(keys.map((key) => { const value = data.get(key); return [key, key === "ano" ? (value ? Number(value) : null) : (typeof value === "string" && value.trim() ? value.trim() : null)]; }));
  if (kind === "publicacoes" && data.has("imagens")) {
    const value = data.get("imagens");
    return { ...result, imagens: typeof value === "string" ? value.split(/\r?\n/).map((url) => url.trim()).filter(Boolean) : [] };
  }
  return result;
}
function msg(error: unknown) { return error instanceof Error ? error.message : "Não foi possível concluir a operação."; }
