"use client";

import type { LucideIcon } from "lucide-react";
import {
  FileSpreadsheet,
  FileText,
  LayoutList,
  RectangleHorizontal,
  RectangleVertical,
  Tags,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PageMessage } from "@/components/page-message";
import { Button, Checkbox, Modal, Select } from "@/components/ui";
import { apiDownload, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/work";
import type { ExportFieldsResponse, SavedSearchFilter } from "@/types/domain";

const FORM_ID = "exportacao";
const STORAGE_KEY = "exportacao:campos";
const DEFAULT_FIELDS = [
  "codigoAcervo",
  "titulo",
  "artistas",
  "data",
  "tecnica",
  "dimensoes",
  "localizacao",
];

type Scope = "obra" | "resultado" | "filtro" | "todas";
type Output = "pdf" | "csv";

const FORMATS: {
  id: string;
  label: string;
  icon: LucideIcon;
  detail?: string;
  ready: boolean;
}[] = [
  {
    id: "lista",
    label: "Lista",
    icon: LayoutList,
    detail: "PDF: uma folha A4 por obra · Excel: uma linha por obra",
    ready: true,
  },
  {
    id: "ficha-vertical",
    label: "Ficha técnica vertical",
    icon: RectangleVertical,
    detail: "Grande, média ou pequena",
    ready: false,
  },
  {
    id: "ficha-horizontal",
    label: "Ficha técnica horizontal",
    icon: RectangleHorizontal,
    detail: "Grande, média ou pequena",
    ready: false,
  },
  { id: "etiquetas", label: "Etiquetas", icon: Tags, ready: false },
];

function readStoredFields(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
  } catch {
    return null;
  }
}

function storeFields(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Sem armazenamento (aba anônima etc.): só não lembra a escolha.
  }
}

/**
 * Exportação de obras em PDF ou Excel (CSV). A pessoa escolhe o formato, quais
 * obras (a aberta, as listadas no acervo, um filtro salvo ou todas) e os
 * campos. A última escolha de campos fica lembrada neste navegador.
 */
export function ExportModal({
  projetoId,
  work,
  listed,
  onClose,
}: {
  projetoId: string;
  /** Na página da obra: a obra aberta. */
  work?: { id: string; codigo: string };
  /** No acervo, com busca ou filtro ativo: as obras na tela. */
  listed?: string[];
  onClose: () => void;
}) {
  const [catalog, setCatalog] = useState<ExportFieldsResponse | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedSearchFilter[]>([]);
  const [scope, setScope] = useState<Scope>(work ? "obra" : listed ? "resultado" : "todas");
  const [filterId, setFilterId] = useState("");
  const [output, setOutput] = useState<Output>("pdf");
  const [withImages, setWithImages] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<ExportFieldsResponse>(`/projetos/${projetoId}/exportacao/campos`),
      apiFetch<SavedSearchFilter[]>(`/projetos/${projetoId}/busca-avancada/filtros`),
    ])
      .then(([fields, filters]) => {
        if (!active) return;
        const known = new Set(fields.campos.map((field) => field.id));
        const remembered = (readStoredFields() ?? DEFAULT_FIELDS).filter((id) => known.has(id));
        setCatalog(fields);
        setSavedFilters(filters);
        setSelected(new Set(remembered.length > 0 ? remembered : DEFAULT_FIELDS));
      })
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [projetoId]);

  const groups = useMemo(() => {
    const result: { name: string; ids: string[]; fields: ExportFieldsResponse["campos"] }[] = [];
    for (const field of catalog?.campos ?? []) {
      const last = result.at(-1);
      if (last?.name === field.grupo) {
        last.fields.push(field);
        last.ids.push(field.id);
      } else result.push({ name: field.grupo, ids: [field.id], fields: [field] });
    }
    return result;
  }, [catalog]);

  const allIds = useMemo(() => catalog?.campos.map((field) => field.id) ?? [], [catalog]);

  function toggle(ids: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.size === 0) {
      setError("Escolha ao menos um campo.");
      return;
    }
    if (scope === "filtro" && !filterId) {
      setError("Escolha o filtro salvo.");
      return;
    }
    const escopo =
      scope === "obra"
        ? { tipo: "obras", obraIds: [work!.id] }
        : scope === "resultado"
          ? { tipo: "obras", obraIds: listed }
          : scope === "filtro"
            ? { tipo: "filtro", filtroId: filterId }
            : { tipo: "todas" };
    // Na ordem do catálogo, a mesma das colunas no arquivo.
    const campos = allIds.filter((id) => selected.has(id));

    setBusy(true);
    setError(null);
    try {
      await apiDownload(
        `/projetos/${projetoId}/exportacao`,
        {
          method: "POST",
          body: JSON.stringify({
            formato: "lista",
            saida: output,
            escopo,
            campos,
            ...(output === "pdf" ? { imagens: withImages } : {}),
          }),
        },
        `lista.${output}`,
      );
      storeFields(campos);
      onClose();
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const scopeOptions: { id: Scope; label: string; detail?: string }[] = [
    ...(work ? [{ id: "obra" as const, label: "Esta obra", detail: work.codigo }] : []),
    ...(listed
      ? [
          {
            id: "resultado" as const,
            label: "Obras listadas no acervo",
            detail: `${listed.length} ${listed.length === 1 ? "obra" : "obras"} da busca atual`,
          },
        ]
      : []),
    { id: "filtro", label: "Um filtro salvo" },
    { id: "todas", label: "Todas as obras do projeto" },
  ];

  return (
    <Modal
      title="Exportar"
      description="Gere um PDF ou uma planilha do Excel com os campos que escolher."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={busy || !catalog || selected.size === 0}
            icon={output === "pdf" ? <FileText className="size-4" /> : <FileSpreadsheet className="size-4" />}
          >
            {busy ? "Gerando..." : output === "pdf" ? "Exportar PDF" : "Exportar Excel"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="grid gap-6">
        {error && <PageMessage message={error} />}

        <Step number={1} title="Formato">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((format) => {
              const Icon = format.icon;
              const active = format.id === "lista";
              return (
                <button
                  key={format.id}
                  type="button"
                  disabled={!format.ready}
                  aria-pressed={active}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-primary-700 bg-primary-50 ring-1 ring-primary-700"
                      : "border-border bg-surface",
                    !format.ready && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn("mt-0.5 size-5 shrink-0", active ? "text-primary-800" : "text-ink-400")}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{format.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {format.ready ? format.detail : "Em breve"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step number={2} title="Quais obras">
          <div className="grid gap-2 sm:grid-cols-2">
            {scopeOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                  scope === option.id ? "border-primary-700 bg-primary-50" : "border-border bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="escopo"
                  checked={scope === option.id}
                  onChange={() => setScope(option.id)}
                  className="mt-0.5 size-4 shrink-0 accent-primary-800"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                  {option.detail && (
                    <span className="block text-xs text-muted-foreground">{option.detail}</span>
                  )}
                  {option.id === "filtro" && scope === "filtro" && (
                    <span className="mt-2 block">
                      <Select
                        aria-label="Filtro salvo"
                        placeholder={savedFilters.length ? "Escolha o filtro" : "Nenhum filtro salvo"}
                        disabled={savedFilters.length === 0}
                        value={filterId}
                        onChange={(event) => setFilterId(event.target.value)}
                        options={savedFilters.map((item) => ({ value: item.id, label: item.nome }))}
                      />
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </Step>

        <Step number={3} title="Arquivo">
          {output === "pdf" && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Cada obra vira uma folha A4: imagem principal e ficha técnica no topo; abaixo, os
              demais campos escolhidos separados por seção.
            </p>
          )}
          <div className="inline-flex rounded-lg border border-border bg-surface-muted p-1">
            {(
              [
                { id: "pdf", label: "PDF", icon: FileText },
                { id: "csv", label: "Excel (CSV)", icon: FileSpreadsheet },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={output === id}
                onClick={() => setOutput(id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  output === id ? "bg-surface text-foreground shadow-xs" : "text-ink-600 hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </button>
            ))}
          </div>
          {output === "pdf" && (
            <Checkbox
              label="Incluir as imagens: galeria da obra e as de cada seção (notas fiscais, certificados, análises…)"
              checked={withImages}
              onChange={(event) => setWithImages(event.target.checked)}
            />
          )}
        </Step>

        <Step
          number={4}
          title="Campos"
          aside={
            catalog && (
              <span className="text-xs font-medium text-muted-foreground">
                {selected.size} de {allIds.length} selecionados
              </span>
            )
          }
        >
          {!catalog ? (
            <p className="text-sm text-muted-foreground">Carregando campos...</p>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-2.5">
                <TriCheckbox
                  label="Selecionar tudo"
                  checked={selected.size === allIds.length}
                  indeterminate={selected.size > 0 && selected.size < allIds.length}
                  onChange={(on) => toggle(allIds, on)}
                />
              </div>
              {groups.map((group) => {
                const count = group.ids.filter((id) => selected.has(id)).length;
                return (
                  <fieldset key={group.name} className="grid gap-2">
                    <legend className="sr-only">{group.name}</legend>
                    <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                      <TriCheckbox
                        label={<span className="font-semibold text-foreground">{group.name}</span>}
                        checked={count === group.ids.length}
                        indeterminate={count > 0 && count < group.ids.length}
                        onChange={(on) => toggle(group.ids, on)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {count}/{group.ids.length}
                      </span>
                    </div>
                    <div className="grid gap-x-4 gap-y-1.5 pl-6 sm:grid-cols-2 lg:grid-cols-3">
                      {group.fields.map((field) => (
                        <label
                          key={field.id}
                          className="flex cursor-pointer items-center gap-2 text-sm text-ink-700"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(field.id)}
                            onChange={(event) => toggle([field.id], event.target.checked)}
                            className="size-4 shrink-0 accent-primary-800"
                          />
                          <span className="min-w-0">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}
        </Step>
      </form>
    </Modal>
  );
}

function Step({
  number,
  title,
  aside,
  children,
}: {
  number: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-white">
            {number}
          </span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Checkbox com o estado "alguns marcados", que o HTML só aceita via JS. */
function TriCheckbox({
  label,
  checked,
  indeterminate,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  indeterminate: boolean;
  onChange: (on: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        // Parcial + clique marca tudo, como em planilhas e e-mails.
        onChange={() => onChange(!checked)}
        className="size-4 shrink-0 accent-primary-800"
      />
      {label}
    </label>
  );
}
