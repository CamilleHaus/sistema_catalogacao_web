"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageMessage } from "@/components/page-message";
import { Button, Checkbox, Input, Modal, MultiSelect, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { errorMessage } from "@/lib/work";
import type { BulkEditField, BulkEditResult } from "@/types/domain";

const FORM_ID = "edicao-em-massa";
/** Valor do select de opção que significa "tirar o valor de todas". */
const CLEAR = "__limpar";

type ListMode = "adicionar" | "remover" | "substituir";

/**
 * Altera um único campo de todas as obras listadas no acervo (o resultado da
 * busca e dos filtros). Ao trocar a localização, registra por padrão uma
 * movimentação em cada obra que muda de lugar.
 */
export function BulkEditModal({
  projetoId,
  obraIds,
  onClose,
  onDone,
}: {
  projetoId: string;
  obraIds: string[];
  onClose: () => void;
  onDone: (result: BulkEditResult) => Promise<void>;
}) {
  const [fields, setFields] = useState<BulkEditField[] | null>(null);
  const [fieldId, setFieldId] = useState("");
  const [text, setText] = useState("");
  const [option, setOption] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [mode, setMode] = useState<ListMode>("adicionar");
  const [registerMove, setRegisterMove] = useState(true);
  const [moveDate, setMoveDate] = useState("");
  const [moveBy, setMoveBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<BulkEditField[]>(`/projetos/${projetoId}/edicao-em-massa/campos`)
      .then((result) => active && setFields(result))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [projetoId]);

  const field = useMemo(() => fields?.find((item) => item.id === fieldId) ?? null, [fields, fieldId]);
  const count = obraIds.length;
  const plural = count === 1 ? "obra" : "obras";

  function chooseField(id: string) {
    setFieldId(id);
    setText("");
    setOption("");
    setItems([]);
    setMode("adicionar");
    setError(null);
  }

  /** Frase do que vai acontecer, logo acima do botão de aplicar. */
  function summary() {
    if (!field) return null;
    const label = (value: string) =>
      field.opcoes?.find((item) => item.value === value)?.label.replace(/^(— )+/, "") ?? value;
    if (field.tipo === "lista") {
      if (items.length === 0)
        return mode === "substituir" ? `Remove todos os itens de "${field.label}".` : null;
      const names = items.map(label).join(", ");
      return mode === "adicionar"
        ? `Adiciona ${names} em "${field.label}".`
        : mode === "remover"
          ? `Remove ${names} de "${field.label}".`
          : `Deixa só ${names} em "${field.label}".`;
    }
    if (field.tipo === "opcao") {
      if (!option) return null;
      return option === CLEAR
        ? `Remove "${field.label}".`
        : `Define "${field.label}" como ${label(option)}.`;
    }
    return text.trim()
      ? `Define "${field.label}" como "${text.trim()}".`
      : `Apaga "${field.label}".`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field) {
      setError("Escolha o campo que vai mudar.");
      return;
    }
    let valor: unknown;
    if (field.tipo === "lista") valor = items;
    else if (field.tipo === "opcao") {
      if (!option) {
        setError(`Escolha o novo valor de "${field.label}".`);
        return;
      }
      valor = option === CLEAR ? null : option;
    } else if (field.tipo === "inteiro") valor = text.trim() ? Number(text) : null;
    else valor = text.trim() || null;

    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<BulkEditResult>(`/projetos/${projetoId}/edicao-em-massa`, {
        method: "POST",
        body: JSON.stringify({
          obraIds,
          campo: field.id,
          valor,
          ...(field.tipo === "lista" ? { modo: mode } : {}),
          ...(field.id === "localizacao"
            ? {
                movimentacao: {
                  registrar: registerMove,
                  data: moveDate || null,
                  realizadoPor: moveBy || null,
                },
              }
            : {}),
        }),
      });
      await onDone(result);
    } catch (caught: unknown) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  const sentence = summary();

  return (
    <Modal
      title="Editar em massa"
      description={`A alteração vale para as ${count} ${plural} listadas agora no acervo. Um campo por vez.`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={busy || !field}>
            {busy ? "Aplicando..." : `Aplicar em ${count} ${plural}`}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="grid gap-4">
        {error && <PageMessage message={error} />}

        <Select
          label="Campo"
          placeholder={fields ? "Escolha o campo que vai mudar" : "Carregando..."}
          disabled={!fields}
          value={fieldId}
          onChange={(event) => chooseField(event.target.value)}
          options={(fields ?? []).map((item) => ({
            value: item.id,
            label: item.label,
            group: item.grupo,
          }))}
        />

        {field?.tipo === "texto" && (
          <Input
            label="Novo valor"
            value={text}
            maxLength={500}
            onChange={(event) => setText(event.target.value)}
            hint="Deixe em branco para apagar este campo de todas as obras."
          />
        )}

        {field?.tipo === "inteiro" && (
          <Input
            label="Novo valor"
            type="number"
            min={2}
            max={9999}
            step={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            hint="Deixe em branco para apagar este campo de todas as obras."
          />
        )}

        {field?.tipo === "opcao" && (
          <Select
            label="Novo valor"
            placeholder="Escolha..."
            value={option}
            onChange={(event) => setOption(event.target.value)}
            options={[
              { value: CLEAR, label: "Nenhum — remover de todas as obras" },
              ...(field.opcoes ?? []),
            ]}
          />
        )}

        {field?.tipo === "lista" && (
          <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <Select
              label="O que fazer"
              placeholder={null}
              value={mode}
              onChange={(event) => setMode(event.target.value as ListMode)}
              options={[
                { value: "adicionar", label: "Adicionar" },
                { value: "remover", label: "Remover" },
                { value: "substituir", label: "Substituir por" },
              ]}
            />
            <MultiSelect
              label={field.label}
              name="itens"
              value={items}
              onChange={setItems}
              options={field.opcoes ?? []}
              placeholder="Escolha..."
              searchPlaceholder={`Buscar em ${field.label}...`}
              emptyLabel="Nenhuma opção cadastrada."
            />
          </div>
        )}

        {field?.id === "localizacao" && option && (
          <div className="grid gap-3 rounded-xl border border-border bg-surface-muted p-3">
            <Checkbox
              label="Registrar uma movimentação em cada obra que mudar de lugar"
              checked={registerMove}
              onChange={(event) => setRegisterMove(event.target.checked)}
            />
            {registerMove && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Data da movimentação"
                  value={moveDate}
                  maxLength={200}
                  placeholder="Opcional"
                  onChange={(event) => setMoveDate(event.target.value)}
                />
                <Input
                  label="Realizada por"
                  value={moveBy}
                  maxLength={300}
                  placeholder="Opcional"
                  onChange={(event) => setMoveBy(event.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {(field?.grupo === "Aquisição" || field?.grupo === "Venda") && (
          <p className="text-xs text-muted-foreground">
            Só muda as obras que já têm {field.grupo === "Aquisição" ? "aquisição" : "venda"} registrada;
            as demais ficam como estão.
          </p>
        )}

        {sentence && (
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-900">
            {sentence} Vale para {count} {plural}.
          </p>
        )}
      </form>
    </Modal>
  );
}
