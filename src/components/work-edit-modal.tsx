"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DimensionFields,
  dimensionBody,
  dimensionProblem,
  type DimensionMode,
} from "@/components/dimension-fields";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  MultiSelect,
  Select,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import {
  DIMENSION_LABEL,
  errorMessage,
  flattenLocations,
  optionalNumber,
} from "@/lib/work";
import type {
  Artist,
  LocationNode,
  Technique,
  Work,
  WorkDimension,
  WorkSet,
  WorkStatus,
} from "@/types/domain";

const FORM_ID = "editar-ficha-tecnica";
type Tipo = WorkDimension["tipo"];
const TIPOS: Tipo[] = ["SEM_MOLDURA", "COM_MOLDURA"];

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
  const [modes, setModes] = useState<Record<Tipo, DimensionMode>>(() => ({
    SEM_MOLDURA:
      work.dimensoes.find((item) => item.tipo === "SEM_MOLDURA")?.formato ??
      "none",
    COM_MOLDURA:
      work.dimensoes.find((item) => item.tipo === "COM_MOLDURA")?.formato ??
      "none",
  }));

  const [emConjunto, setEmConjunto] = useState(work.fichaMae !== null);
  const [fichaMaeId, setFichaMaeId] = useState(work.fichaMae?.id ?? "");
  const [fichasMae, setFichasMae] = useState<WorkSet[] | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<WorkSet[]>(`/fichas-mae?projetoId=${projetoId}`)
      .then((items) => active && setFichasMae(items))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [projetoId]);

  const locations = flattenLocations(locationTree);

  function findIncomplete(form: FormData) {
    for (const tipo of TIPOS) {
      const message = dimensionProblem(form, tipo, modes[tipo]);
      if (message) return { tipo, message };
    }
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const incomplete = findIncomplete(form);
    if (incomplete) {
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
          tituloSerie: nullable(form, "tituloSerie"),
          quantidadePartes: optionalNumber(form, "quantidadePartes") ?? null,
          fichaMaeId: emConjunto ? fichaMaeId || null : null,
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

        await apiFetch(path, {
          method: "PUT",
          body: JSON.stringify(dimensionBody(form, tipo, mode)),
        });
      }

      await onSaved();
      onClose();
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

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
              name="tituloSerie"
              label="Título da série"
              maxLength={300}
              defaultValue={work.tituloSerie ?? ""}
              placeholder="Deixe vazio se não fizer parte de uma série"
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
            <Input
              name="quantidadePartes"
              label="Quantidade de partes"
              type="number"
              min={2}
              max={9999}
              step={1}
              defaultValue={work.quantidadePartes ?? ""}
              placeholder="Deixe vazio se for peça única"
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
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              name="localizacaoId"
              label="Localização"
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

          <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
            <Checkbox
              label="Faz parte de um conjunto"
              checked={emConjunto}
              onChange={(event) => setEmConjunto(event.target.checked)}
              className="min-h-10"
            />
            {emConjunto && (
              <Select
                label="Ficha mãe"
                required
                placeholder={fichasMae === null ? "Carregando..." : "Selecione"}
                value={fichaMaeId}
                onChange={(event) => setFichaMaeId(event.target.value)}
                hint={
                  fichasMae?.length === 0
                    ? "Nenhuma ficha mãe cadastrada neste projeto. Cadastre em Configurações."
                    : undefined
                }
                options={(fichasMae ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.codigo} · ${item.descricao}`,
                }))}
              />
            )}
          </div>
        </fieldset>

        <fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            {TIPOS.map((tipo) => (
              <DimensionFields
                key={tipo}
                prefix={tipo}
                label={DIMENSION_LABEL[tipo]}
                mode={modes[tipo]}
                onModeChange={(mode) =>
                  setModes((current) => ({ ...current, [tipo]: mode }))
                }
                current={work.dimensoes.find((item) => item.tipo === tipo)}
              />
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
