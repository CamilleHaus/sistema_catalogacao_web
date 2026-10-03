"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { optionalNumber } from "@/lib/work";
import type { WorkDimension } from "@/types/domain";

/** "none" apaga a dimensão; os outros dois definem o formato enviado. */
export type DimensionMode = "none" | "NUMERICA" | "VARIAVEL";

export type DimensionValue = Pick<
  WorkDimension,
  | "formato"
  | "altura"
  | "largura"
  | "profundidade"
  | "unidade"
  | "descricaoVariavel"
>;

const MODE_OPTIONS = [
  { value: "none", label: "Não informada" },
  { value: "NUMERICA", label: "Numérica" },
  { value: "VARIAVEL", label: "Variável" },
];

type Unidade = "CM" | "IN";

const CM_PER_INCH = 2.54;

function filled(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Checagem dos obrigatórios feita no submit, e não com `required`, para que a
 * mensagem diga qual das dimensões do formulário está incompleta.
 */
export function dimensionProblem(
  form: FormData,
  prefix: string,
  mode: DimensionMode,
) {
  if (mode === "VARIAVEL" && !filled(form, `${prefix}-descricaoVariavel`))
    return "informe a descrição da dimensão variável";
  if (
    mode === "NUMERICA" &&
    (!filled(form, `${prefix}-altura`) || !filled(form, `${prefix}-largura`))
  )
    return "altura e largura são obrigatórias";
  return null;
}

/** Corpo aceito pela API: medidas numéricas ou descrição variável, nunca ambas. */
export function dimensionBody(
  form: FormData,
  prefix: string,
  mode: DimensionMode,
) {
  if (mode === "none") return {};
  if (mode === "VARIAVEL")
    return { descricaoVariavel: filled(form, `${prefix}-descricaoVariavel`) };
  return {
    altura: optionalNumber(form, `${prefix}-altura`),
    largura: optionalNumber(form, `${prefix}-largura`),
    profundidade: optionalNumber(form, `${prefix}-profundidade`),
    unidade: form.get(`${prefix}-unidade`),
  };
}

/** Converte mantendo 3 casas decimais no máximo, sem cauda de ponto flutuante. */
function convertMeasurement(value: string, from: Unidade, to: Unidade) {
  if (!value || from === to) return value;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const converted = from === "CM" ? num / CM_PER_INCH : num * CM_PER_INCH;
  return String(Math.round(converted * 1000) / 1000);
}

export function DimensionFields({
  prefix,
  label,
  mode,
  onModeChange,
  current,
}: {
  /** Prefixo dos nomes no FormData, para caber mais de uma dimensão no form. */
  prefix: string;
  label: string;
  mode: DimensionMode;
  onModeChange: (mode: DimensionMode) => void;
  current?: DimensionValue | null;
}) {
  const [unidade, setUnidade] = useState<Unidade>(
    (current?.unidade as Unidade | null) ?? "CM",
  );
  const [altura, setAltura] = useState(current?.altura?.toString() ?? "");
  const [largura, setLargura] = useState(current?.largura?.toString() ?? "");
  const [profundidade, setProfundidade] = useState(
    current?.profundidade?.toString() ?? "",
  );

  function changeUnidade(next: Unidade) {
    setAltura((value) => convertMeasurement(value, unidade, next));
    setLargura((value) => convertMeasurement(value, unidade, next));
    setProfundidade((value) => convertMeasurement(value, unidade, next));
    setUnidade(next);
  }

  return (
    <div className="grid content-start gap-4 rounded-xl border border-border bg-surface-muted p-4">
      <p className="text-sm font-semibold text-foreground">{label}</p>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select
            label="Formato"
            value={mode}
            onChange={(event) =>
              onModeChange(event.target.value as DimensionMode)
            }
            placeholder={null}
            options={MODE_OPTIONS}
          />
        </div>
        {mode === "NUMERICA" && (
          <div className="w-20 shrink-0">
            <Select
              name={`${prefix}-unidade`}
              label="Unidade"
              placeholder={null}
              value={unidade}
              onChange={(event) => changeUnidade(event.target.value as Unidade)}
              options={[
                { value: "CM", label: "cm" },
                { value: "IN", label: "in" },
              ]}
            />
          </div>
        )}
      </div>

      {mode === "VARIAVEL" && (
        <Input
          name={`${prefix}-descricaoVariavel`}
          label="Descrição"
          maxLength={500}
          defaultValue={current?.descricaoVariavel ?? ""}
          placeholder="Ex.: dimensões variáveis conforme montagem"
        />
      )}

      {mode === "NUMERICA" && (
        <div className="grid grid-cols-3 gap-2">
          <Input
            name={`${prefix}-altura`}
            label="Altura"
            type="number"
            step="0.001"
            min="0.001"
            value={altura}
            onChange={(event) => setAltura(event.target.value)}
          />
          <Input
            name={`${prefix}-largura`}
            label="Largura"
            type="number"
            step="0.001"
            min="0.001"
            value={largura}
            onChange={(event) => setLargura(event.target.value)}
          />
          <Input
            name={`${prefix}-profundidade`}
            label="Prof."
            type="number"
            step="0.001"
            min="0.001"
            value={profundidade}
            onChange={(event) => setProfundidade(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
