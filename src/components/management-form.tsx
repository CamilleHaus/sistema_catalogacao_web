"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  ClipboardCheck,
  FileText,
  Hammer,
  PackageOpen,
  Plus,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Button,
  FilePicker,
  Input,
  Modal,
  RecordCard,
  RecordSection,
  Select,
  Tabs,
  Textarea,
  useFilePick,
  type FactRow,
  type SelectOption,
  type TabItem,
} from "@/components/ui";
import { apiFetch, uploadProjectFile } from "@/lib/api-client";
import { errorMessage } from "@/lib/work";
import type { LocationNode, NamedReference, Work } from "@/types/domain";

type Image = {
  id: string;
  imagemUrl: string;
  creditos?: string | null;
  comentarios?: string | null;
};
type Item = { id: string; [key: string]: unknown; imagens?: Image[] };
type Data = Record<Kind, Item[]>;
type Aux = {
  estadosConservacao: NamedReference[];
  tiposServico: NamedReference[];
};
type Kind =
  | "analises"
  | "restauros"
  | "servicos"
  | "instrucoes"
  | "movimentacoes";

type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "date" | "textarea" | "select";
  options?: (context: { aux: Aux; locations: SelectOption[] }) => SelectOption[];
  span?: 1 | 2;
};

const FORM_ID = "editar-gestao";

const SECTIONS: Record<
  Kind,
  { label: string; singular: string; icon: LucideIcon; fields: FieldSpec[] }
> = {
  analises: {
    label: "Análises",
    singular: "análise de conservação",
    icon: ClipboardCheck,
    fields: [
      { name: "data", label: "Data", type: "date" },
      {
        name: "estadoConservacaoId",
        label: "Estado de conservação",
        type: "select",
        options: ({ aux }) =>
          aux.estadosConservacao.map((x) => ({ value: x.id, label: x.nome })),
      },
      { name: "avaliador", label: "Avaliador" },
      { name: "observacoes", label: "Observações", type: "textarea", span: 2 },
    ],
  },
  restauros: {
    label: "Restauros",
    singular: "restauro",
    icon: Hammer,
    fields: [
      { name: "dataEntrada", label: "Data de entrada" },
      { name: "dataSaida", label: "Data de saída" },
      { name: "localRestauro", label: "Local do restauro" },
      { name: "motivo", label: "Motivo" },
      { name: "observacoes", label: "Observações", type: "textarea", span: 2 },
    ],
  },
  servicos: {
    label: "Serviços",
    singular: "serviço",
    icon: Wrench,
    fields: [
      { name: "data", label: "Data" },
      {
        name: "tipoServicoId",
        label: "Tipo de serviço",
        type: "select",
        options: ({ aux }) =>
          aux.tiposServico.map((x) => ({ value: x.id, label: x.nome })),
      },
      { name: "local", label: "Local" },
      { name: "observacoes", label: "Observações", type: "textarea", span: 2 },
    ],
  },
  instrucoes: {
    label: "Instruções",
    singular: "instrução",
    icon: PackageOpen,
    fields: [
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: () => [
          { value: "EMBALAGEM", label: "Embalagem" },
          { value: "TRANSPORTE", label: "Transporte" },
        ],
      },
      { name: "data", label: "Data" },
      { name: "profissionalResponsavel", label: "Profissional responsável" },
      { name: "observacoes", label: "Observações", type: "textarea", span: 2 },
    ],
  },
  movimentacoes: {
    label: "Movimentações",
    singular: "movimentação",
    icon: ArrowLeftRight,
    fields: [
      { name: "data", label: "Data" },
      { name: "realizadoPor", label: "Realizado por" },
      {
        name: "localSaidaId",
        label: "De",
        type: "select",
        options: ({ locations }) => locations,
      },
      {
        name: "localEntradaId",
        label: "Para",
        type: "select",
        options: ({ locations }) => locations,
      },
      { name: "observacoes", label: "Observações", type: "textarea", span: 2 },
    ],
  },
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function dateValue(value: unknown) {
  const raw = text(value);
  return raw ? raw.slice(0, 10) : "";
}
function named(item: Item, key: string) {
  return text((item[key] as NamedReference | undefined)?.nome);
}
function flattenLocationOptions(
  nodes: LocationNode[],
  depth = 0,
): SelectOption[] {
  return nodes.flatMap((node) => [
    { value: node.id, label: `${"— ".repeat(depth)}${node.nome}` },
    ...flattenLocationOptions(node.filhos, depth + 1),
  ]);
}

/** Título do card: o dado mais reconhecível de cada tipo de registro. */
function titleOf(kind: Kind, item: Item) {
  if (kind === "analises")
    return (
      dateValue(item.data) ||
      named(item, "estadoConservacao") ||
      text(item.avaliador) ||
      "Sem título"
    );
  if (kind === "restauros")
    return text(item.dataEntrada) || text(item.localRestauro) || "Sem título";
  if (kind === "servicos")
    return named(item, "tipoServico") || text(item.data) || "Sem título";
  if (kind === "instrucoes")
    return text(item.tipo) || text(item.data) || "Sem título";

  const from = text(item.localSaidaSnapshot);
  const to = text(item.localEntradaSnapshot);
  if (from && to) return `${from} → ${to}`;
  if (from) return `De: ${from}`;
  if (to) return `Para: ${to}`;
  return text(item.data) || "Sem título";
}

/** Valores em leitura: resolve ids para nomes e usa os snapshots gravados. */
function rowsOf(kind: Kind, item: Item): FactRow[] {
  const base: FactRow[] = SECTIONS[kind].fields.map((field) => {
    if (field.name === "estadoConservacaoId")
      return ["Estado de conservação", named(item, "estadoConservacao")];
    if (field.name === "tipoServicoId")
      return ["Tipo de serviço", named(item, "tipoServico")];
    if (field.name === "localSaidaId")
      return ["De", text(item.localSaidaSnapshot)];
    if (field.name === "localEntradaId")
      return ["Para", text(item.localEntradaSnapshot)];
    if (field.type === "date") return [field.label, dateValue(item[field.name])];
    return [field.label, text(item[field.name])];
  });
  return base;
}

export function ManagementForm({
  kinds,
  projetoId,
  work,
  locations,
  canEdit,
  onChanged,
  onError,
}: {
  /** Quais seções renderizar — Conservação e Controle mostram subconjuntos diferentes. */
  kinds: Kind[];
  projetoId: string;
  work: Work;
  locations: LocationNode[];
  canEdit: boolean;
  onChanged: () => Promise<void>;
  onError: (v: string) => void;
}) {
  const base = `/projetos/${projetoId}/obras/${work.id}/gestao`;
  const [data, setData] = useState<Data | null>(null);
  const [aux, setAux] = useState<Aux | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Kind>(kinds[0]);
  const [editing, setEditing] = useState<{
    kind: Kind;
    id: string | null;
  } | null>(null);

  const locationOptions = flattenLocationOptions(locations);

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<Data>(base),
        apiFetch<Aux>("/gestao-auxiliares"),
      ]).then(([records, auxiliary]) => {
        setData(records);
        setAux(auxiliary);
      }),
    [base],
  );

  useEffect(() => {
    let active = true;
    load().catch((caught: unknown) => {
      if (active) onError(errorMessage(caught));
    });
    return () => {
      active = false;
    };
  }, [load, onError]);

  async function action(run: () => Promise<unknown>, refreshWork = false) {
    setBusy(true);
    onError("");
    try {
      await run();
      await load();
      if (refreshWork) await onChanged();
      return true;
    } catch (caught: unknown) {
      onError(errorMessage(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: Kind, id: string) {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    await action(
      () => apiFetch(`${base}/${kind}/${id}`, { method: "DELETE" }),
      kind === "movimentacoes",
    );
  }

  if (!data || !aux) {
    return <p className="text-sm text-muted-foreground">Carregando gestão...</p>;
  }

  const editingItem =
    editing?.id != null
      ? data[editing.kind].find((item) => item.id === editing.id)
      : undefined;

  const tabs: TabItem[] = kinds.map((kind) => ({
    id: kind,
    label: SECTIONS[kind].label,
    icon: SECTIONS[kind].icon,
    count: data[kind].length,
    content: (
      <RecordSection
        title={SECTIONS[kind].label}
        icon={SECTIONS[kind].icon}
        addLabel="Adicionar"
        canAdd={canEdit}
        onAdd={() => setEditing({ kind, id: null })}
        isEmpty={data[kind].length === 0}
        emptyText={`Nenhuma ${SECTIONS[kind].singular} registrada nesta obra.`}
      >
        {data[kind].map((item) => (
          <RecordCard
            key={item.id}
            title={titleOf(kind, item)}
            rows={rowsOf(kind, item)}
            busy={busy}
            onEdit={canEdit ? () => setEditing({ kind, id: item.id }) : undefined}
            onDelete={canEdit ? () => remove(kind, item.id) : undefined}
            extra={<CardExtra kind={kind} item={item} />}
          />
        ))}
      </RecordSection>
    ),
  }));

  return (
    <>
      <Tabs
        variant="nested"
        items={tabs}
        value={tab}
        onChange={(id) => setTab(id as Kind)}
      />

      {editing && (
        <ManagementModal
          base={base}
          projetoId={projetoId}
          kind={editing.kind}
          item={editingItem}
          aux={aux}
          locations={locationOptions}
          currentLocation={work.localizacao?.id}
          busy={busy}
          onClose={() => setEditing(null)}
          onAction={action}
        />
      )}
    </>
  );
}

/** Miniaturas e relatório aparecem no card, em leitura. */
function CardExtra({ kind, item }: { kind: Kind; item: Item }) {
  if (kind === "restauros") {
    const url = text(item.relatorioUrl);
    if (!url) return null;
    return (
      <div className="flex items-center gap-3">
        <FileText aria-hidden className="size-4 shrink-0 text-ink-500" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary-700 underline"
        >
          Abrir relatório
        </a>
        <a
          href={url}
          download
          className="text-sm font-medium text-primary-700 underline"
        >
          Baixar
        </a>
      </div>
    );
  }

  const images = item.imagens ?? [];
  if (kind !== "analises" && kind !== "instrucoes") return null;
  if (images.length === 0) return null;

  return (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Imagens
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {images.map((image) => (
          <a
            key={image.id}
            href={image.imagemUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir imagem"
            className="block aspect-square rounded-sm border border-border bg-ink-100 bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(image.imagemUrl)})` }}
          />
        ))}
      </div>
    </>
  );
}

function ManagementModal({
  base,
  projetoId,
  kind,
  item,
  aux,
  locations,
  currentLocation,
  busy,
  onClose,
  onAction,
}: {
  base: string;
  projetoId: string;
  kind: Kind;
  item?: Item;
  aux: Aux;
  locations: SelectOption[];
  currentLocation?: string;
  busy: boolean;
  onClose: () => void;
  onAction: (run: () => Promise<unknown>, refreshWork?: boolean) => Promise<boolean>;
}) {
  const spec = SECTIONS[kind];
  const imagePick = useFilePick("imagem");
  const reportPick = useFilePick("relatorio");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      spec.fields.map((field) => {
        const raw = form.get(field.name);
        return [
          field.name,
          typeof raw === "string" && raw.trim() ? raw.trim() : null,
        ];
      }),
    );

    const ok = await onAction(
      () =>
        item
          ? apiFetch(`${base}/${kind}/${item.id}`, {
              method: "PATCH",
              body: JSON.stringify(body),
            })
          : apiFetch(`${base}/${kind}`, {
              method: "POST",
              body: JSON.stringify(body),
            }),
      kind === "movimentacoes",
    );
    if (ok) onClose();
  }

  const supportsImages = kind === "analises" || kind === "instrucoes";
  const images = item?.imagens ?? [];
  const currentReport = text(item?.relatorioUrl);

  return (
    <Modal
      title={`${item ? "Editar" : "Adicionar"} ${spec.singular}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        {spec.fields.map((field) => {
          if (field.type === "textarea") {
            return (
              <Textarea
                key={field.name}
                name={field.name}
                label={field.label}
                span={field.span}
                rows={3}
                defaultValue={text(item?.[field.name])}
              />
            );
          }
          if (field.type === "select") {
            const defaultValue =
              field.name === "localSaidaId"
                ? text(item?.localSaidaId) || currentLocation || ""
                : text(item?.[field.name]);
            return (
              <Select
                key={field.name}
                name={field.name}
                label={field.label}
                span={field.span}
                placeholder="Não informado"
                defaultValue={defaultValue}
                options={field.options?.({ aux, locations }) ?? []}
              />
            );
          }
          return (
            <Input
              key={field.name}
              name={field.name}
              label={field.label}
              span={field.span}
              type={field.type === "date" ? "date" : "text"}
              defaultValue={
                field.type === "date"
                  ? dateValue(item?.[field.name])
                  : text(item?.[field.name])
              }
            />
          );
        })}
      </form>

      {/* Imagens e relatório têm endpoints próprios, então agem na hora e
          ficam fora do <form> — HTML não permite formulário aninhado. */}
      {item && supportsImages && (
        <section className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold tracking-tight">Imagens</h3>
          {images.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma imagem neste registro.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((image) => (
                <div key={image.id} className="relative">
                  <a
                    href={image.imagemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir imagem"
                    className="block aspect-square rounded-sm border border-border bg-ink-100 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${JSON.stringify(image.imagemUrl)})`,
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Remover imagem"
                    onClick={() =>
                      onAction(() =>
                        apiFetch(
                          `${base}/${kind}/${item.id}/imagens/${image.id}`,
                          { method: "DELETE" },
                        ),
                      )
                    }
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-sm border border-border bg-surface text-danger-700 shadow-sm hover:bg-danger-50"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid gap-2">
            <FilePicker
              accept="imagem"
              multiple
              files={imagePick.files}
              onFiles={imagePick.choose}
              disabled={busy}
              invalid={Boolean(imagePick.problem)}
            />
            {imagePick.problem && (
              <p className="text-xs font-medium text-danger-700">
                {imagePick.problem}
              </p>
            )}
            <Button
              variant="secondary"
              className="justify-self-end"
              disabled={busy || imagePick.files.length === 0}
              icon={<Plus className="size-4" />}
              onClick={async () => {
                const ok = await onAction(async () => {
                  for (const file of imagePick.files) {
                    const { url } = await uploadProjectFile(projetoId, file);
                    await apiFetch(`${base}/${kind}/${item.id}/imagens`, {
                      method: "POST",
                      body: JSON.stringify({ imagemUrl: url }),
                    });
                  }
                });
                if (ok) imagePick.clear();
              }}
            >
              Adicionar
            </Button>
          </div>
        </section>
      )}

      {item && kind === "restauros" && (
        <section className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold tracking-tight">Relatório</h3>
          {currentReport ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                href={currentReport}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary-700 underline"
              >
                Abrir relatório
              </a>
              <Button
                size="sm"
                variant="dangerGhost"
                disabled={busy}
                onClick={() =>
                  onAction(() =>
                    apiFetch(`${base}/restauros/${item.id}/relatorio`, {
                      method: "DELETE",
                    }),
                  )
                }
              >
                Remover
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum relatório anexado.
            </p>
          )}

          <div className="mt-3 grid gap-2">
            <FilePicker
              accept="relatorio"
              files={reportPick.files}
              onFiles={reportPick.choose}
              disabled={busy}
              invalid={Boolean(reportPick.problem)}
            />
            {reportPick.problem && (
              <p className="text-xs font-medium text-danger-700">
                {reportPick.problem}
              </p>
            )}
            <Button
              variant="secondary"
              className="justify-self-end"
              disabled={busy || reportPick.files.length === 0}
              onClick={async () => {
                const ok = await onAction(async () => {
                  const { url } = await uploadProjectFile(
                    projetoId,
                    reportPick.files[0],
                  );
                  return apiFetch(`${base}/restauros/${item.id}/relatorio`, {
                    method: "PUT",
                    body: JSON.stringify({ url }),
                  });
                });
                if (ok) reportPick.clear();
              }}
            >
              {currentReport ? "Substituir" : "Adicionar"}
            </Button>
          </div>
        </section>
      )}
    </Modal>
  );
}
