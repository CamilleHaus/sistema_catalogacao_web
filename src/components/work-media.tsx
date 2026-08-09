"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AttachmentType, WorkAttachment, WorkGallery } from "@/types/domain";

const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm";
const types: AttachmentType[] = ["IMAGEM", "PDF", "DOCUMENTO", "PLANILHA", "APRESENTACAO", "AUDIO", "VIDEO", "OUTRO"];

export function WorkMedia({ projetoId, obraId, canEdit, onChanged, onError }: { projetoId: string; obraId: string; canEdit: boolean; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const base = `/projetos/${projetoId}/obras/${obraId}`;
  const [gallery, setGallery] = useState<WorkGallery | null>(null);
  const [attachments, setAttachments] = useState<WorkAttachment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [g, a] = await Promise.all([apiFetch<WorkGallery>(`${base}/galeria`), apiFetch<WorkAttachment[]>(`${base}/anexos`)]);
    setGallery(g); setAttachments(a);
  }, [base]);
  useEffect(() => {
    let active = true;
    Promise.all([apiFetch<WorkGallery>(`${base}/galeria`), apiFetch<WorkAttachment[]>(`${base}/anexos`)])
      .then(([g, a]) => { if (active) { setGallery(g); setAttachments(a); } })
      .catch((e: unknown) => { if (active) onError(message(e)); });
    return () => { active = false; };
  }, [base, onError]);
  const items = useMemo(() => [
    ...(gallery?.imagens.map((item) => ({ ...item, origem: "OBRA" as const })) ?? []),
    ...(gallery?.assinaturas.map((item) => ({ ...item, creditos: null, observacoes: `Local: ${item.localAssinatura.nome}`, principal: false, origem: "ASSINATURA" as const })) ?? []),
  ].sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm)), [gallery]);
  async function action(run: () => Promise<unknown>, refreshWork = false) {
    setBusy(true); onError("");
    try { await run(); await load(); if (refreshWork) await onChanged(); }
    catch (e: unknown) { onError(message(e)); }
    finally { setBusy(false); }
  }
  function addImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    action(() => apiFetch(`${base}/imagens`, { method: "POST", body: JSON.stringify({ imagemUrl: data.get("imagemUrl"), creditos: optional(data, "creditos"), observacoes: optional(data, "observacoes") }) })).then(() => form.reset());
  }
  function addAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    action(() => apiFetch(`${base}/anexos`, { method: "POST", body: JSON.stringify({ arquivoUrl: data.get("arquivoUrl"), tipo: data.get("tipo"), observacoes: optional(data, "observacoes") }) })).then(() => form.reset());
  }
  return <details className="mt-4 border-t border-slate-100 pt-3">
    <summary className="cursor-pointer text-sm font-semibold text-primary">Imagens e Anexos</summary>
    <section className="mt-4"><h4 className="text-sm font-bold">Obras</h4>
      {!gallery ? <p className="mt-2 text-xs text-slate-500">Carregando…</p> : items.length === 0 ? <p className="mt-2 text-xs text-slate-500">Nenhuma imagem.</p> : <div className="mt-3 grid grid-cols-2 gap-3">{items.map((item) => <article key={`${item.origem}-${item.id}`} className="overflow-hidden rounded-xl border bg-white">
        <a href={item.imagemUrl} target="_blank" rel="noopener noreferrer"><span role="img" aria-label={item.origem === "ASSINATURA" ? "Assinatura" : "Imagem da obra"} className="block aspect-square bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(item.imagemUrl)})` }} /></a>
        <div className="p-2 text-xs">{item.principal && <strong className="rounded bg-primary-100 px-1.5 py-0.5 text-primary-800">Principal</strong>}{item.origem === "ASSINATURA" && <strong className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-800">Assinatura</strong>}{item.creditos && <p className="mt-2 text-slate-600">{item.creditos}</p>}{item.observacoes && <details className="mt-2"><summary className="cursor-pointer font-semibold">Detalhes</summary><p className="mt-1 text-slate-600">{item.observacoes}</p></details>}
        {canEdit && item.origem === "OBRA" && <div className="mt-2 flex flex-wrap gap-1">{!item.principal && <button disabled={busy} onClick={() => action(() => apiFetch(`${base}/imagens/${item.id}/principal`, { method: "PATCH" }), true)} className="rounded border px-2 py-1 font-semibold">Definir principal</button>}<button disabled={busy} onClick={() => action(() => apiFetch(`${base}/imagens/${item.id}`, { method: "DELETE" }), item.principal)} className="rounded border border-rose-200 px-2 py-1 font-semibold text-rose-700">Excluir</button></div>}</div>
      </article>)}</div>}
      {canEdit && <form onSubmit={addImage} className="mt-3 grid gap-2"><input required type="url" name="imagemUrl" placeholder="URL da imagem" className={field}/><input name="creditos" maxLength={500} placeholder="Créditos (opcional)" className={field}/><textarea name="observacoes" maxLength={5000} placeholder="Observações (opcional)" className={field}/><button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Adicionar imagem</button></form>}
    </section>
    <section className="mt-5 border-t pt-4"><h4 className="text-sm font-bold">Anexos</h4>
      {!attachments ? <p className="mt-2 text-xs text-slate-500">Carregando…</p> : attachments.length === 0 ? <p className="mt-2 text-xs text-slate-500">Nenhum anexo.</p> : <div className="mt-3 grid grid-cols-2 gap-3">{attachments.map((item) => <article key={item.id} className="rounded-xl border p-3 text-xs"><a href={item.arquivoUrl} target="_blank" rel="noopener noreferrer" className="block font-bold text-primary">{item.tipo === "IMAGEM" ? "▧" : item.tipo === "PDF" ? "PDF" : "Arquivo"}<span className="mt-1 block text-slate-700">{item.tipo}</span></a>{item.observacoes && <details className="mt-2"><summary className="cursor-pointer font-semibold">Detalhes</summary><p className="mt-1 text-slate-600">{item.observacoes}</p></details>}{canEdit && <button disabled={busy} onClick={() => action(() => apiFetch(`${base}/anexos/${item.id}`, { method: "DELETE" }))} className="mt-2 rounded border border-rose-200 px-2 py-1 font-semibold text-rose-700">Excluir</button>}</article>)}</div>}
      {canEdit && <form onSubmit={addAttachment} className="mt-3 grid gap-2"><input required type="url" name="arquivoUrl" placeholder="URL do arquivo" className={field}/><select required name="tipo" className={field}>{types.map((type) => <option key={type}>{type}</option>)}</select><textarea name="observacoes" maxLength={5000} placeholder="Observações (opcional)" className={field}/><button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Adicionar anexo</button></form>}
    </section>
  </details>;
}
function optional(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" && value.trim() ? value : undefined; }
function message(error: unknown) { return error instanceof Error ? error.message : "Não foi possível concluir a operação."; }
