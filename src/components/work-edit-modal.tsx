"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Modal, MultiSelect, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import {
  DIMENSION_LABEL,
  errorMessage,
  flattenLocations,
  formatDimension,
  optionalNumber,
} from "@/lib/work";
import type {
  Artist,
  LocationNode,
  Technique,
  Work,
  WorkDimension,
  WorkStatus,
} from "@/types/domain";

const FORM_ID = "editar-ficha-tecnica";
type Tipo = WorkDimension["tipo"];
const TIPOS: Tipo[] = ["SEM_MOLDURA", "COM_MOLDURA"];

/** "none" apaga a dimensão; os outros dois definem o formato enviado. */
type Mode = "none" | "NUMERICA" | "VARIAVEL";

const MODE_OPTIONS = [
  { value: "none", label: "Não informada" },
  { value: "NUMERICA", label: "Numérica" },
  { value: "VARIAVEL", label: "Variável" },
];

function nullable(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function WorkEditModal({
  projetoId,
  work,
  artists,
  statuses,
  techniques,
  locationTree,
  onClose,
  onSaved,
}: {
  projetoId: string;
  work: Work;
  artists: Artist[];
  statuses: WorkStatus[];
  techniques: Technique[];
  locationTree: LocationNode[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Tipo>("SEM_MOLDURA");
  const [modes, setModes] = useState<Record<Tipo, Mode>>(() => ({
    SEM_MOLDURA:
      work.dimensoes.find((item) => item.tipo === "SEM_MOLDURA")?.formato ??
      "none",
    COM_MOLDURA:
      work.dimensoes.find((item) => item.tipo === "COM_MOLDURA")?.formato ??
      "none",
  }));

  const locations = flattenLocations(locationTree);

  /**
   * Os dois blocos ficam montados (só um é visível), então o `required` do
   * HTML não pode ser usado no bloco escondido — o navegador se recusa a
   * submeter apontando para um campo que ninguém vê. A checagem é feita aqui.
   */
  function findIncomplete(form: FormData) {
    for (const tipo of TIPOS) {
      const mode = modes[tipo];
      if (mode === "VARIAVEL" && !nullable(form, `${tipo}-descricaoVariavel`)) {
        return { tipo, message: "informe a descrição da dimensão variável" };
      }
      if (
        mode === "NUMERICA" &&
        (!nullable(form, `${tipo}-altura`) || !nullable(form, `${tipo}-largura`))
      ) {
        return { tipo, message: "altura e largura são obrigatórias" };
      }
    }
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const incomplete = findIncomplete(form);
    if (incomplete) {
      setShown(incomplete.tipo);
      setError(
        `Dimensão ${DIMENSION_LABEL[incomplete.tipo].toLowerCase()}: ${incomplete.message}.`,
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/projetos/${projetoId}/obras/${work.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          numeroManual: String(form.get("numeroManual") ?? "").trim(),
          titulo: nullable(form, "titulo"),
          edicao: nullable(form, "edicao"),
          data: nullable(form, "data"),
          statusId: nullable(form, "statusId"),
          tecnicaId: nullable(form, "tecnicaId"),
          localizacaoId: nullable(form, "localizacaoId"),
          artistaIds: form.getAll("artistaIds").map(String),
        }),
      });

      // Em sequência para que o erro apontado seja o da primeira dimensão
      // inválida, e não o de uma corrida entre chamadas.
      for (const tipo of TIPOS) {
        const path = `/projetos/${projetoId}/obras/${work.id}/dimensoes/${tipo}`;
        const existed = work.dimensoes.some((item) => item.tipo === tipo);
        const mode = modes[tipo];

        if (mode === "none") {
          if (existed) await apiFetch(path, { method: "DELETE" });
          continue;
        }

        // A API rejeita medidas numéricas e descrição variável no mesmo envio.
        const body =
          mode === "VARIAVEL"
            ? { descricaoVariavel: nullable(form, `${tipo}-descricaoVariavel`) }
            : {
                altura: optionalNumber(form, `${tipo}-altura`),
                largura: optionalNumber(form, `${tipo}-largura`),
                profundidade: optionalNumber(form, `${tipo}-profundidade`),
                unidade: form.get(`${tipo}-unidade`),
              };

        await apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
      }

      await onSaved();
      onClose();
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const other = TIPOS.find((tipo) => tipo !== shown)!;
  const otherCurrent = work.dimensoes.find((item) => item.tipo === other);

  return (
    <Modal
      title="Editar ficha técnica"
      description="Identificação e dimensões da obra."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={busy}>
            {busy ? "Salvando..." : "Salvar alterações"}
          </Button>
        </>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {error}
        </div>
      )}

      <form id={FORM_ID} onSubmit={submit} className="grid gap-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            Identificação
          </legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              name="numeroManual"
              label="Número manual"
              required
              maxLength={100}
              defaultValue={work.numeroManual}
            />
            <Input
              name="titulo"
              label="Título"
              maxLength={300}
              defaultValue={work.titulo ?? ""}
            />
            <Input
              name="edicao"
              label="Edição"
              maxLength={150}
              defaultValue={work.edicao ?? ""}
            />
            <Input
              name="data"
              label="Data"
              maxLength={150}
              defaultValue={work.data ?? ""}
            />
            <Select
              name="statusId"
              label="Status"
              placeholder="Não informado"
              defaultValue={work.status?.id ?? ""}
              options={statuses.map((item) => ({
                value: item.id,
                label: item.nome,
              }))}
            />
            <Select
              name="tecnicaId"
              label="Técnica"
              placeholder="Não informada"
              defaultValue={work.tecnica?.id ?? ""}
              options={techniques.map((item) => ({
                value: item.id,
                label: item.nome,
              }))}
            />
            <Select
              name="localizacaoId"
              label="Localização"
              span={2}
              placeholder="Não informada"
              defaultValue={work.localizacao?.id ?? ""}
              options={locations.map(({ node, depth }) => ({
                value: node.id,
                label: `${"— ".repeat(depth)}${node.nome}`,
              }))}
            />
            <MultiSelect
              name="artistaIds"
              label="Artistas"
              searchPlaceholder="Buscar artista..."
              emptyLabel="Nenhum artista cadastrado."
              defaultValue={work.artistas.map((artist) => artist.id)}
              options={artists.map((item) => ({
                value: item.id,
                label: item.nome,
              }))}
            />
          </div>
        </fieldset>

        <fieldset className="border-t border-border pt-5">
          <legend className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            Dimensões
          </legend>

          <div className="grid gap-4 sm:max-w-md">
            <Select
              label="Dimensão"
              value={shown}
              onChange={(event) => setShown(event.target.value as Tipo)}
              placeholder={null}
              hint={
                otherCurrent
                  ? `${DIMENSION_LABEL[other]}: ${formatDimension(otherCurrent)}`
                  : `${DIMENSION_LABEL[other]}: não informada`
              }
              options={TIPOS.map((tipo) => ({
                value: tipo,
                label: DIMENSION_LABEL[tipo],
              }))}
            />
          </div>

          {/* Os dois ficam no DOM para que a troca no dropdown não descarte o
              que já foi digitado; só a visibilidade muda. */}
          {TIPOS.map((tipo) => (
            <div key={tipo} className={tipo === shown ? "mt-4" : "hidden"}>
              <DimensionFields
                tipo={tipo}
                mode={modes[tipo]}
                onModeChange={(mode) =>
                  setModes((current) => ({ ...current, [tipo]: mode }))
                }
                current={work.dimensoes.find((item) => item.tipo === tipo)}
              />
            </div>
          ))}
        </fieldset>
      </form>
    </Modal>
  );
}

function DimensionFields({
  tipo,
  mode,
  onModeChange,
  current,
}: {
  tipo: Tipo;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  current?: WorkDimension;
}) {
  return (
    <div className="grid content-start gap-4 rounded-xl border border-border bg-surface-muted p-4 sm:max-w-md">
      <Select
        label="Formato"
        value={mode}
        onChange={(event) => onModeChange(event.target.value as Mode)}
        placeholder={null}
        options={MODE_OPTIONS}
      />

      {mode === "VARIAVEL" && (
        <Input
          name={`${tipo}-descricaoVariavel`}
          label="Descrição"
          maxLength={500}
          defaultValue={current?.descricaoVariavel ?? ""}
          placeholder="Ex.: dimensões variáveis conforme montagem"
        />
      )}

      {mode === "NUMERICA" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Input
              name={`${tipo}-altura`}
              label="Altura"
              type="number"
              step="0.001"
              min="0.001"
              defaultValue={current?.altura ?? ""}
            />
            <Input
              name={`${tipo}-largura`}
              label="Largura"
              type="number"
              step="0.001"
              min="0.001"
              defaultValue={current?.largura ?? ""}
            />
            <Input
              name={`${tipo}-profundidade`}
              label="Prof."
              type="number"
              step="0.001"
              min="0.001"
              defaultValue={current?.profundidade ?? ""}
            />
          </div>
          <Select
            name={`${tipo}-unidade`}
            label="Unidade"
            placeholder={null}
            defaultValue={current?.unidade ?? "CM"}
            options={[
              { value: "CM", label: "Centímetros" },
              { value: "IN", label: "Polegadas" },
            ]}
          />
        </>
      )}
    </div>
  );
}
