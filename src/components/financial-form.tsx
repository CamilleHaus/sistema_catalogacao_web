"use client";

import {
  Copy,
  FileSpreadsheet,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Button,
  Input,
  Modal,
  RecordCard,
  RecordSection,
  Select,
  Textarea,
  Tabs,
  type FactRow,
  type TabItem,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { errorMessage } from "@/lib/work";
import type {
  FinancialDocument,
  FinancialOperation,
  NamedReference,
  WorkFinancial,
  WorkInsurance,
} from "@/types/domain";

const FORM_ID = "editar-financeiro";
const CURRENCIES = ["BRL", "USD", "EUR", "GBP"];

type OperationKind = "aquisicao" | "venda";
type DocumentPath =
  | "aquisicao/notas-fiscais"
  | "aquisicao/comprovantes"
  | "venda/comprovantes";

type Editing =
  | { kind: "operation"; operation: OperationKind }
  | { kind: "document"; path: DocumentPath; numbered: boolean; id: string | null }
  | { kind: "evaluation"; id: string | null }
  | { kind: "insurance"; id: string | null; copyFrom?: WorkInsurance }
  | null;

function dateInput(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}

function dateLabel(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(value),
      )
    : "";
}

function money(currency?: string | null, amount?: string | null) {
  if (!amount) return null;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return amount;
  return currency
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
      }).format(parsed)
    : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(
        parsed,
      );
}

function discountLabel(operation: FinancialOperation) {
  if (!operation.desconto || !operation.tipoDesconto) return null;
  return operation.tipoDesconto === "PERCENTUAL"
    ? `${operation.desconto}%`
    : money(operation.moeda, operation.desconto);
}

/** Prévia do valor final enquanto o usuário digita, no modal da operação. */
function calculate(value: string, type: string, discount: string) {
  if (!value) return null;
  const amount = Number(value);
  const off = Number(discount || 0);
  const result =
    type === "PERCENTUAL"
      ? amount - (amount * off) / 100
      : type === "VALOR_FIXO"
        ? amount - off
        : amount;
  return Number.isFinite(result) && result >= 0 ? result.toFixed(2) : null;
}

export function FinancialForm({
  projetoId,
  obraId,
  canEdit,
  onError,
}: {
  projetoId: string;
  obraId: string;
  canEdit: boolean;
  onError: (v: string) => void;
}) {
  const base = `/projetos/${projetoId}/obras/${obraId}/financeiro`;
  const [data, setData] = useState<WorkFinancial | null>(null);
  const [forms, setForms] = useState<NamedReference[]>([]);
  const [types, setTypes] = useState<NamedReference[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("aquisicao");
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<WorkFinancial>(base),
        apiFetch<NamedReference[]>("/formas-negociacao"),
        apiFetch<NamedReference[]>("/modalidades-seguro"),
      ]).then(([financial, negotiation, insurance]) => {
        setData(financial);
        setForms(negotiation);
        setTypes(insurance);
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

  async function action(run: () => Promise<unknown>) {
    setBusy(true);
    onError("");
    try {
      await run();
      await load();
      return true;
    } catch (caught: unknown) {
      onError(errorMessage(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    await action(() => apiFetch(`${base}/${path}`, { method: "DELETE" }));
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Carregando financeiro...</p>
    );
  }

  function documentsOf(path: DocumentPath): FinancialDocument[] {
    if (!data) return [];
    if (path === "aquisicao/notas-fiscais")
      return data.aquisicao?.notasFiscais ?? [];
    if (path === "aquisicao/comprovantes")
      return data.aquisicao?.comprovantes ?? [];
    return data.venda?.comprovantes ?? [];
  }

  function operationRows(operation: FinancialOperation, kind: OperationKind) {
    const rows: FactRow[] = [
      ["Forma de negociação", operation.formaNegociacao?.nome],
      ["Data", operation.data],
      [
        kind === "aquisicao" ? "Adquirido de" : "Vendido para",
        kind === "aquisicao" ? operation.adquiridoDe : operation.vendidoPara,
      ],
      ["Valor", money(operation.moeda, operation.valor)],
      ["Desconto", discountLabel(operation)],
      ["Valor final", money(operation.moeda, operation.valorFinal)],
    ];
    return rows;
  }

  function documentSection(
    title: string,
    path: DocumentPath,
    numbered: boolean,
  ) {
    const items = documentsOf(path);
    return (
      <RecordSection
        key={path}
        title={title}
        icon={numbered ? Receipt : FileSpreadsheet}
        addLabel="Adicionar documento"
        canAdd={canEdit}
        onAdd={() => setEditing({ kind: "document", path, numbered, id: null })}
        isEmpty={items.length === 0}
        emptyText={`Nenhum registro em ${title.toLowerCase()}.`}
      >
        {items.map((item) => (
          <RecordCard
            key={item.id}
            title={
              (numbered && item.numero) || dateLabel(item.data) || "Sem título"
            }
            rows={[
              ...(numbered
                ? ([["Número", item.numero]] as FactRow[])
                : ([] as FactRow[])),
              ["Data", dateLabel(item.data)],
              ["Valor", money(item.moeda, item.valor)],
              [
                "Imagem",
                item.imagemUrl ? (
                  <a
                    href={item.imagemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-700 underline"
                  >
                    Abrir imagem
                  </a>
                ) : null,
              ],
              ["Comentários", item.comentarios],
            ]}
            busy={busy}
            onEdit={
              canEdit
                ? () =>
                    setEditing({
                      kind: "document",
                      path,
                      numbered,
                      id: item.id,
                    })
                : undefined
            }
            onDelete={canEdit ? () => remove(`${path}/${item.id}`) : undefined}
          />
        ))}
      </RecordSection>
    );
  }

  function operationTab(kind: OperationKind, title: string) {
    const operation = kind === "aquisicao" ? data!.aquisicao : data!.venda;
    return (
      <div className="grid gap-8">
        <div>
          {operation ? (
            <RecordCard
              title={title}
              rows={operationRows(operation, kind)}
              busy={busy}
              onEdit={
                canEdit
                  ? () => setEditing({ kind: "operation", operation: kind })
                  : undefined
              }
              onDelete={canEdit ? () => remove(kind) : undefined}
            />
          ) : (
            <RecordSection
              title={title}
              icon={kind === "aquisicao" ? ShoppingCart : Tag}
              addLabel={`Registrar ${title.toLowerCase()}`}
              canAdd={canEdit}
              onAdd={() => setEditing({ kind: "operation", operation: kind })}
              isEmpty
              emptyText={`Nenhuma ${title.toLowerCase()} registrada para esta obra.`}
            />
          )}
        </div>

        {operation && kind === "aquisicao" && (
          <>
            {documentSection("Notas fiscais", "aquisicao/notas-fiscais", true)}
            {documentSection(
              "Comprovantes de pagamento",
              "aquisicao/comprovantes",
              false,
            )}
          </>
        )}
        {operation &&
          kind === "venda" &&
          documentSection(
            "Comprovantes de venda",
            "venda/comprovantes",
            false,
          )}
      </div>
    );
  }

  const tabs: TabItem[] = [
    {
      id: "aquisicao",
      label: "Aquisição",
      icon: ShoppingCart,
      content: operationTab("aquisicao", "Aquisição"),
    },
    {
      id: "venda",
      label: "Venda",
      icon: Tag,
      content: operationTab("venda", "Venda"),
    },
    {
      id: "avaliacoes",
      label: "Avaliações",
      icon: TrendingUp,
      count: data.avaliacoes.length,
      content: (
        <RecordSection
          title="Avaliações"
          icon={TrendingUp}
          addLabel="Adicionar avaliação"
          canAdd={canEdit}
          onAdd={() => setEditing({ kind: "evaluation", id: null })}
          isEmpty={data.avaliacoes.length === 0}
          emptyText="Nenhuma avaliação registrada nesta obra."
        >
          {data.avaliacoes.map((item) => (
            <RecordCard
              key={item.id}
              title={dateLabel(item.data) || item.avaliador || "Sem título"}
              rows={[
                ["Data", dateLabel(item.data)],
                ["Valor", money(item.moeda, item.valor)],
                ["Avaliador", item.avaliador],
                ["Comentários", item.comentarios],
              ]}
              busy={busy}
              onEdit={
                canEdit
                  ? () => setEditing({ kind: "evaluation", id: item.id })
                  : undefined
              }
              onDelete={
                canEdit ? () => remove(`avaliacoes/${item.id}`) : undefined
              }
            />
          ))}
        </RecordSection>
      ),
    },
    {
      id: "seguros",
      label: "Seguros",
      icon: ShieldCheck,
      count: data.seguros.length,
      content: (
        <RecordSection
          title="Seguros"
          icon={ShieldCheck}
          addLabel="Adicionar seguro"
          canAdd={canEdit}
          onAdd={() => setEditing({ kind: "insurance", id: null })}
          isEmpty={data.seguros.length === 0}
          emptyText="Nenhum seguro registrado nesta obra."
        >
          {data.seguros.map((item) => (
            <RecordCard
              key={item.id}
              title={
                item.vigencia || item.modalidadeSeguro?.nome || "Sem título"
              }
              rows={[
                ["Vigência", item.vigencia],
                ["Modalidade", item.modalidadeSeguro?.nome],
                ["Valor", money(item.moeda, item.valor)],
                ["Observações", item.observacoes],
              ]}
              busy={busy}
              onEdit={
                canEdit
                  ? () => setEditing({ kind: "insurance", id: item.id })
                  : undefined
              }
              onDelete={canEdit ? () => remove(`seguros/${item.id}`) : undefined}
              extra={
                canEdit ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    icon={<Copy className="size-4" />}
                    onClick={() =>
                      setEditing({ kind: "insurance", id: null, copyFrom: item })
                    }
                  >
                    Duplicar seguro
                  </Button>
                ) : undefined
              }
            />
          ))}
        </RecordSection>
      ),
    },
  ];

  async function save(path: string, method: "POST" | "PATCH", body: unknown) {
    const ok = await action(() =>
      apiFetch(`${base}/${path}`, { method, body: JSON.stringify(body) }),
    );
    if (ok) setEditing(null);
  }

  const editingDocument =
    editing?.kind === "document" && editing.id
      ? documentsOf(editing.path).find((item) => item.id === editing.id)
      : undefined;
  const editingEvaluation =
    editing?.kind === "evaluation" && editing.id
      ? data.avaliacoes.find((item) => item.id === editing.id)
      : undefined;
  const editingInsurance =
    editing?.kind === "insurance"
      ? editing.id
        ? data.seguros.find((item) => item.id === editing.id)
        : editing.copyFrom
      : undefined;

  return (
    <>
      <Tabs variant="nested" items={tabs} value={tab} onChange={setTab} />

      {editing?.kind === "operation" && (
        <OperationModal
          kind={editing.operation}
          item={
            (editing.operation === "aquisicao"
              ? data.aquisicao
              : data.venda) ?? undefined
          }
          forms={forms}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(body, method) => save(editing.operation, method, body)}
        />
      )}

      {editing?.kind === "document" && (
        <FinancialModal
          title={`${editingDocument ? "Editar" : "Adicionar"} documento`}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={(form) =>
            save(
              editingDocument
                ? `${editing.path}/${editingDocument.id}`
                : editing.path,
              editingDocument ? "PATCH" : "POST",
              plainPayload(form),
            )
          }
        >
          <Input
            name="imagemUrl"
            label="URL da imagem"
            type="url"
            span={2}
            defaultValue={editingDocument?.imagemUrl ?? ""}
          />
          {editing.numbered && (
            <Input
              name="numero"
              label="Número da nota"
              defaultValue={editingDocument?.numero ?? ""}
            />
          )}
          <Input
            name="data"
            label="Data"
            type="date"
            defaultValue={dateInput(editingDocument?.data)}
          />
          <MoneyFields
            currency={editingDocument?.moeda}
            amount={editingDocument?.valor}
          />
          <Textarea
            name="comentarios"
            label="Comentários"
            span={2}
            rows={3}
            defaultValue={editingDocument?.comentarios ?? ""}
          />
        </FinancialModal>
      )}

      {editing?.kind === "evaluation" && (
        <FinancialModal
          title={`${editingEvaluation ? "Editar" : "Adicionar"} avaliação`}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={(form) =>
            save(
              editingEvaluation
                ? `avaliacoes/${editingEvaluation.id}`
                : "avaliacoes",
              editingEvaluation ? "PATCH" : "POST",
              plainPayload(form),
            )
          }
        >
          <Input
            name="data"
            label="Data"
            type="date"
            defaultValue={dateInput(editingEvaluation?.data)}
          />
          <Input
            name="avaliador"
            label="Avaliador"
            defaultValue={editingEvaluation?.avaliador ?? ""}
          />
          <MoneyFields
            currency={editingEvaluation?.moeda}
            amount={editingEvaluation?.valor}
          />
          <Textarea
            name="comentarios"
            label="Comentários"
            span={2}
            rows={3}
            defaultValue={editingEvaluation?.comentarios ?? ""}
          />
        </FinancialModal>
      )}

      {editing?.kind === "insurance" && (
        <FinancialModal
          title={
            editing.copyFrom
              ? "Duplicar seguro"
              : `${editing.id ? "Editar" : "Adicionar"} seguro`
          }
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={(form) =>
            save(
              editing.id ? `seguros/${editing.id}` : "seguros",
              editing.id ? "PATCH" : "POST",
              plainPayload(form),
            )
          }
        >
          <Input
            name="vigencia"
            label="Vigência"
            defaultValue={editingInsurance?.vigencia ?? ""}
          />
          <Select
            name="modalidadeSeguroId"
            label="Modalidade"
            placeholder="Não informada"
            defaultValue={editingInsurance?.modalidadeSeguroId ?? ""}
            options={types.map((item) => ({
              value: item.id,
              label: item.nome,
            }))}
          />
          <MoneyFields
            currency={editingInsurance?.moeda}
            amount={editingInsurance?.valor}
          />
          <Textarea
            name="observacoes"
            label="Observações"
            span={2}
            rows={3}
            defaultValue={editingInsurance?.observacoes ?? ""}
          />
        </FinancialModal>
      )}
    </>
  );
}

/** Campos vazios viram null, como a API espera. */
function plainPayload(form: FormData) {
  const result: Record<string, unknown> = {};
  form.forEach((raw, key) => {
    const value = typeof raw === "string" ? raw.trim() : raw;
    result[key] = value || null;
  });
  return result;
}

function MoneyFields({
  currency,
  amount,
}: {
  currency?: string | null;
  amount?: string | null;
}) {
  return (
    <>
      <Select
        name="moeda"
        label="Moeda"
        placeholder="Não informada"
        defaultValue={currency ?? ""}
        options={CURRENCIES.map((item) => ({ value: item, label: item }))}
      />
      <Input
        name="valor"
        label="Valor"
        type="number"
        min="0"
        step="0.01"
        defaultValue={amount ?? ""}
      />
    </>
  );
}

function FinancialModal({
  title,
  busy,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      title={title}
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
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        {children}
      </form>
    </Modal>
  );
}

function OperationModal({
  kind,
  item,
  forms,
  busy,
  onClose,
  onSave,
}: {
  kind: OperationKind;
  item?: FinancialOperation;
  forms: NamedReference[];
  busy: boolean;
  onClose: () => void;
  onSave: (body: unknown, method: "POST" | "PATCH") => void;
}) {
  const [amount, setAmount] = useState(item?.valor ?? "");
  const [discount, setDiscount] = useState(item?.desconto ?? "");
  const [discountType, setDiscountType] = useState(item?.tipoDesconto ?? "");
  const preview = calculate(amount, discountType, discount);

  return (
    <Modal
      title={`${item ? "Editar" : "Registrar"} ${kind === "aquisicao" ? "aquisição" : "venda"}`}
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
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const body = plainPayload(new FormData(event.currentTarget));
          // O valor final é calculado no servidor.
          delete body.valorFinal;
          onSave(body, item ? "PATCH" : "POST");
        }}
      >
        <Select
          name="formaNegociacaoId"
          label="Forma de negociação"
          placeholder="Não informada"
          defaultValue={item?.formaNegociacaoId ?? ""}
          options={forms.map((form) => ({
            value: form.id,
            label: form.nome,
          }))}
        />
        <Input name="data" label="Data" defaultValue={item?.data ?? ""} />
        <Input
          name="contraparte"
          label={kind === "aquisicao" ? "Adquirido de" : "Vendido para"}
          span={2}
          defaultValue={
            (kind === "aquisicao" ? item?.adquiridoDe : item?.vendidoPara) ?? ""
          }
        />
        <Select
          name="moeda"
          label="Moeda"
          placeholder="Não informada"
          defaultValue={item?.moeda ?? ""}
          options={CURRENCIES.map((code) => ({ value: code, label: code }))}
        />
        <Input
          name="valor"
          label="Valor"
          type="number"
          min="0"
          step="0.01"
          defaultValue={item?.valor ?? ""}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Select
          name="tipoDesconto"
          label="Tipo de desconto"
          placeholder="Sem desconto"
          value={discountType}
          onChange={(event) => setDiscountType(event.target.value as never)}
          options={[
            { value: "VALOR_FIXO", label: "Valor fixo" },
            { value: "PERCENTUAL", label: "Percentual" },
          ]}
        />
        <Input
          name="desconto"
          label="Desconto"
          type="number"
          min="0"
          step="0.0001"
          defaultValue={item?.desconto ?? ""}
          onChange={(event) => setDiscount(event.target.value)}
          hint={preview !== null ? `Valor final: ${preview}` : undefined}
        />
      </form>
    </Modal>
  );
}
