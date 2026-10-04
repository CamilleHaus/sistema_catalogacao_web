"use client";

import { Save, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageMessage } from "@/components/page-message";
import { Button, IconButton, Input, Modal, MultiSelect, Select } from "@/components/ui";
import {
  emptyValue,
  isFilled,
  toConditions,
  toFormValues,
  type FormValue,
  type FormValues,
} from "@/lib/advanced-search";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { notifySuccess } from "@/lib/toast";
import { errorMessage } from "@/lib/work";
import type {
  AdvancedFilter,
  SavedSearchFilter,
  SearchFieldDef,
} from "@/types/domain";

const FORM_ID = "busca-avancada";

/**
 * Busca avançada em forma de formulário: as categorias ficam numa lista à
 * esquerda e, ao escolher uma, aparecem os campos dela. A pessoa preenche só o
 * que quer cruzar; campo vazio não filtra. Também carrega, salva e exclui os
 * filtros salvos do usuário neste projeto.
 */
export function AdvancedSearchModal({
  projetoId,
  fields,
  initial,
  savedFilters,
  activeSavedId,
  onApply,
  onSavedFiltersChange,
  onClose,
}: {
  projetoId: string;
  fields: SearchFieldDef[];
  initial: AdvancedFilter | null;
  savedFilters: SavedSearchFilter[];
  activeSavedId: string | null;
  onApply: (filter: AdvancedFilter | null, savedId: string | null) => void;
  onSavedFiltersChange: () => Promise<void>;
  onClose: () => void;
}) {
  const byId = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const groups = useMemo(() => {
    const result: { name: string; fields: SearchFieldDef[] }[] = [];
    for (const field of fields) {
      const last = result.at(-1);
      if (last?.name === field.grupo) last.fields.push(field);
      else result.push({ name: field.grupo, fields: [field] });
    }
    return result;
  }, [fields]);

  const [values, setValues] = useState<FormValues>(
    () => toFormValues(initial?.condicoes ?? [], byId).values,
  );
  // Abre na primeira categoria com algo preenchido, para a pessoa ver o filtro atual.
  const [activeGroup, setActiveGroup] = useState(
    () =>
      groups.find((group) => group.fields.some((field) => isFilled(field, values[field.id])))
        ?.name ?? groups[0]?.name,
  );
  const [savedId, setSavedId] = useState<string | null>(activeSavedId);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = savedFilters.find((item) => item.id === savedId) ?? null;
  const filledCount = (groupFields: SearchFieldDef[]) =>
    groupFields.filter((field) => isFilled(field, values[field.id])).length;
  const totalFilled = filledCount(fields);
  const current = groups.find((group) => group.name === activeGroup) ?? groups[0];

  function setValue(fieldId: string, value: FormValue) {
    setValues((previous) => ({ ...previous, [fieldId]: value }));
  }

  function clearGroup(groupFields: SearchFieldDef[]) {
    setValues((previous) => {
      const next = { ...previous };
      for (const field of groupFields) delete next[field.id];
      return next;
    });
  }

  /** Formulário → filtro da API; null (com erro na tela) se algo está inválido. */
  function collect(): AdvancedFilter | null {
    const result = toConditions(values, fields);
    if (typeof result === "string") {
      setError(result);
      return null;
    }
    setError(null);
    // Sempre "todas": a obra precisa atender a cada campo preenchido.
    return { combinar: "TODAS", condicoes: result };
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filter = collect();
    if (!filter) return;
    onApply(filter.condicoes.length === 0 ? null : filter, savedId);
  }

  function loadSaved(id: string) {
    setNaming(false);
    setError(null);
    const item = savedFilters.find((filter) => filter.id === id);
    setSavedId(item?.id ?? null);
    if (!item) {
      // "Sem filtros": volta ao formulário vazio.
      setValues({});
      return;
    }
    const restored = toFormValues(item.condicoes, byId);
    setValues(restored.values);
    if (restored.ignored > 0)
      setError("Parte deste filtro usa campos que não existem mais e foi ignorada.");
  }

  async function persist(mode: "novo" | "atualizar") {
    const filter = collect();
    if (!filter) return;
    if (filter.condicoes.length === 0) {
      setError("Preencha ao menos um campo para salvar o filtro.");
      return;
    }
    const nome = mode === "novo" ? name.trim() : saved!.nome;
    if (!nome) {
      setError("Dê um nome ao filtro.");
      return;
    }
    setBusy(true);
    try {
      const base = `/projetos/${projetoId}/busca-avancada/filtros`;
      const result = await apiFetch<SavedSearchFilter>(
        mode === "novo" ? base : `${base}/${saved!.id}`,
        { method: mode === "novo" ? "POST" : "PUT", body: JSON.stringify({ nome, ...filter }) },
      );
      await onSavedFiltersChange();
      setSavedId(result.id);
      setNaming(false);
      setName("");
      notifySuccess(mode === "novo" ? "Filtro salvo." : "Filtro atualizado.");
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function removeSaved() {
    if (!saved) return;
    setBusy(true);
    try {
      await apiFetch(`/projetos/${projetoId}/busca-avancada/filtros/${saved.id}`, {
        method: "DELETE",
      });
      await onSavedFiltersChange();
      setSavedId(null);
      notifySuccess("Filtro excluído.");
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Busca avançada"
      description="Escolha uma categoria e preencha só os campos que quer cruzar. Campo vazio não filtra."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            disabled={totalFilled === 0}
            onClick={() => {
              setValues({});
              setSavedId(null);
              setError(null);
            }}
            className="mr-auto"
          >
            Limpar tudo
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={busy}>
            {totalFilled === 0
              ? "Mostrar todas as obras"
              : `Buscar (${totalFilled} ${totalFilled === 1 ? "campo" : "campos"})`}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={apply} className="grid gap-5">
        {/* Campo (seletor ou nome do filtro novo) ocupa a linha; os botões vêm ao lado. */}
        <div className="grid gap-1.5 rounded-xl border border-border bg-surface-muted p-3">
          <p className="text-sm font-medium text-ink-700">
            {naming ? "Nome do novo filtro" : "Filtros salvos"}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              {naming ? (
                <Input
                  aria-label="Nome do filtro"
                  placeholder="Ex.: Óleos em Ipanema"
                  value={name}
                  maxLength={120}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter aqui salva o filtro, não dispara a busca.
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void persist("novo");
                    }
                  }}
                />
              ) : (
                <Select
                  aria-label="Filtros salvos"
                  placeholder={savedFilters.length === 0 ? "Nenhum filtro salvo" : "Sem filtros"}
                  value={savedId ?? ""}
                  onChange={(event) => loadSaved(event.target.value)}
                  disabled={savedFilters.length === 0}
                  options={savedFilters.map((item) => ({ value: item.id, label: item.nome }))}
                />
              )}
            </div>
            {naming ? (
              <>
                <Button disabled={busy} onClick={() => persist("novo")} className="shrink-0">
                  Salvar
                </Button>
                <IconButton aria-label="Cancelar" onClick={() => setNaming(false)}>
                  <X className="size-4" />
                </IconButton>
              </>
            ) : (
              <>
                {saved && (
                  <Button
                    variant="secondary"
                    disabled={busy || totalFilled === 0}
                    icon={<Save className="size-4" />}
                    onClick={() => persist("atualizar")}
                    className="shrink-0"
                  >
                    Salvar alterações
                  </Button>
                )}
                <Button
                  variant={saved ? "ghost" : "secondary"}
                  disabled={busy || totalFilled === 0}
                  icon={saved ? undefined : <Save className="size-4" />}
                  onClick={() => {
                    setNaming(true);
                    setName(saved ? `${saved.nome} (cópia)` : "");
                  }}
                  className="shrink-0"
                >
                  {saved ? "Salvar como novo" : "Salvar filtro"}
                </Button>
                {saved && (
                  <IconButton
                    aria-label={`Excluir o filtro ${saved.nome}`}
                    variant="dangerGhost"
                    disabled={busy}
                    onClick={removeSaved}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </>
            )}
          </div>
        </div>

        {error && <PageMessage message={error} />}

        <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
          <nav
            aria-label="Categorias da busca"
            className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap"
          >
            {groups.map((group) => {
              const count = filledCount(group.fields);
              const active = group.name === current?.name;
              return (
                <button
                  key={group.name}
                  type="button"
                  onClick={() => setActiveGroup(group.name)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold whitespace-nowrap",
                    active
                      ? "bg-primary text-white"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-950",
                  )}
                >
                  {group.name}
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs font-bold",
                        active ? "bg-white/20 text-white" : "bg-primary-50 text-primary-800",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {current && (
            <section className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-foreground">{current.name}</h3>
                {filledCount(current.fields) > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => clearGroup(current.fields)}>
                    Limpar categoria
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {current.fields.map((field) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    value={values[field.id] ?? emptyValue(field)}
                    onChange={(value) => setValue(field.id, value)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </form>
    </Modal>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: SearchFieldDef;
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  if (field.tipo === "opcao" || field.tipo === "multipla") {
    return (
      <MultiSelect
        label={field.label}
        name={`busca-${field.id}`}
        value={value as string[]}
        onChange={onChange}
        options={field.opcoes ?? []}
        placeholder="Qualquer"
        searchPlaceholder={`Buscar em ${field.label}...`}
        emptyLabel="Nenhuma opção cadastrada."
      />
    );
  }

  if (field.tipo === "existe") {
    return (
      <Select
        label={field.label}
        placeholder="Indiferente"
        value={value as string}
        onChange={(event) => onChange(event.target.value)}
        options={[
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ]}
      />
    );
  }

  if (field.tipo === "texto") {
    return (
      <Input
        label={field.label}
        value={value as string}
        maxLength={300}
        placeholder="Contém..."
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  // Número, valor e data: faixa "de/até"; uma ponta só já filtra.
  const [from, to] = value as string[];
  const inputProps =
    field.tipo === "data"
      ? { type: "date" }
      : { type: "text", inputMode: "decimal" as const, autoComplete: "off" };
  return (
    <fieldset className="grid min-w-0 content-start gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink-700">{field.label}</legend>
      {/* min-w-0 nos dois níveis: sem isso, a largura mínima nativa do input
          empurra o par para fora da coluna e o modal ganha rolagem lateral. */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Input
            {...inputProps}
            aria-label={`${field.label}, de`}
            placeholder="De"
            value={from}
            className="min-w-0"
            onChange={(event) => onChange([event.target.value, to])}
          />
        </div>
        <span aria-hidden className="shrink-0 text-sm text-muted-foreground">
          –
        </span>
        <div className="min-w-0 flex-1">
          <Input
            {...inputProps}
            aria-label={`${field.label}, até`}
            placeholder="Até"
            value={to}
            className="min-w-0"
            onChange={(event) => onChange([from, event.target.value])}
          />
        </div>
      </div>
    </fieldset>
  );
}
