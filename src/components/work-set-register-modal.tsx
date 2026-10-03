"use client";

import { useState, type FormEvent } from "react";
import {
  DimensionFields,
  dimensionBody,
  dimensionProblem,
  type DimensionMode,
} from "@/components/dimension-fields";
import { PageMessage } from "@/components/page-message";
import {
  Button,
  FileField,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { resolveUploads } from "@/lib/uploads";
import { errorMessage, optionalText } from "@/lib/work";
import type { Project, WorkSet } from "@/types/domain";

const FORM_ID = "cadastro-ficha-mae";

export function WorkSetRegisterModal({
  item,
  projects,
  onClose,
  onSaved,
}: {
  item: WorkSet | null;
  /** Só os projetos em que a pessoa pode editar. */
  projects: Project[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DimensionMode>(
    item?.dimensao?.formato ?? "none",
  );
  // As obras vinculadas são do projeto atual; a API recusa trocar com vínculos.
  const projectLocked = Boolean(item && item.totalObras > 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const projetoId = projectLocked
      ? item!.projetoId
      : String(form.get("projetoId") ?? "");

    const problem = dimensionProblem(form, "dimensao", mode);
    if (problem) {
      setError(`Dimensão: ${problem}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await resolveUploads(projetoId, form);
      await apiFetch(item ? `/fichas-mae/${item.id}` : "/fichas-mae", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify({
          projetoId,
          codigo: String(form.get("codigo") ?? "").trim(),
          descricao: String(form.get("descricao") ?? "").trim(),
          imagemUrl: optionalText(form, "imagemUrl") ?? null,
          ...dimensionBody(form, "dimensao", mode),
        }),
      });
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
      title={item ? "Editar ficha mãe" : "Nova ficha mãe"}
      description="Informativo do conjunto. As obras do projeto escolhido poderão ser vinculadas a ela."
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
      {error && (
        <div className="mb-5">
          <PageMessage message={error} />
        </div>
      )}
      <form id={FORM_ID} onSubmit={submit} className="grid gap-4">
        {projectLocked ? (
          <Input
            label="Projeto"
            value={item!.projeto.nome}
            disabled
            hint={`O projeto não pode mudar enquanto houver ${item!.totalObras} ${item!.totalObras === 1 ? "obra vinculada" : "obras vinculadas"}.`}
          />
        ) : (
          <Select
            name="projetoId"
            label="Projeto"
            required
            defaultValue={item?.projetoId ?? ""}
            options={projects.map((project) => ({
              value: project.id,
              label: project.nome,
            }))}
          />
        )}
        <Input
          name="codigo"
          label="Código"
          required
          maxLength={100}
          defaultValue={item?.codigo ?? ""}
          autoFocus
        />
        <Textarea
          name="descricao"
          label="Descrição"
          required
          maxLength={5000}
          rows={5}
          defaultValue={item?.descricao ?? ""}
        />
        <FileField
          name="imagemUrl"
          label="Imagem"
          currentUrl={item?.imagemUrl}
        />
        <DimensionFields
          prefix="dimensao"
          label="Dimensão"
          mode={mode}
          onModeChange={setMode}
          current={item?.dimensao}
        />
      </form>
    </Modal>
  );
}
