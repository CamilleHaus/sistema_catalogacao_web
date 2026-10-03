"use client";

import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, FilePicker, Input, Modal, useFilePick } from "@/components/ui";
import { apiFetch, uploadProjectFile } from "@/lib/api-client";
import { errorMessage, optionalText } from "@/lib/work";
import type { Work } from "@/types/domain";

const EDIT_FORM_ID = "editar-foto-principal";

export function WorkPhoto({
  projetoId,
  work,
  canEdit,
  onSaved,
  onError,
}: {
  projetoId: string;
  work: Work;
  canEdit: boolean;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const pick = useFilePick("imagem");
  const base = `/projetos/${projetoId}/obras/${work.id}/foto-principal`;

  function closeModal() {
    pick.clear();
    setEditing(false);
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    onError("");
    try {
      await action();
      await onSaved();
      closeModal();
    } catch (caught: unknown) {
      onError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const choice = pick.files[0];
    if (!choice && !work.fotoPrincipalUrl) {
      pick.setProblem("Escolha uma imagem.");
      return;
    }
    await run(async () => {
      // Sobe o arquivo primeiro: a obra só passa a apontar para a nova imagem
      // depois que ela existe no storage.
      const url = choice
        ? (await uploadProjectFile(projetoId, choice)).url
        : work.fotoPrincipalUrl;
      await apiFetch(base, {
        method: "PUT",
        body: JSON.stringify({ url, creditos: optionalText(data, "creditos") }),
      });
    });
  }

  const image = work.fotoPrincipalUrl ? (
    <div
      role="img"
      aria-label={`Foto principal de ${work.tituloExibicao}`}
      className="size-full bg-cover bg-center"
      style={{
        backgroundImage: `url(${JSON.stringify(work.fotoPrincipalUrl)})`,
      }}
    />
  ) : (
    <div className="grid size-full place-content-center justify-items-center gap-2 text-ink-400">
      <ImageOff aria-hidden className="size-7" />
      <span className="text-xs font-medium">Sem foto principal</span>
    </div>
  );

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* min-h-0 + flex-1: a foto acompanha a altura do card ao lado em vez de
          impor a própria proporção. */}
      <div className="relative min-h-56 flex-1 bg-ink-100">
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group size-full cursor-pointer"
          >
            {image}
            <span className="absolute inset-0 flex items-end justify-end bg-ink-950/0 p-3 opacity-0 transition-all group-hover:bg-ink-950/25 group-hover:opacity-100 group-focus-visible:bg-ink-950/25 group-focus-visible:opacity-100">
              <span className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                <Pencil aria-hidden className="size-3.5" />
                Editar foto
              </span>
            </span>
            <span className="sr-only">Editar foto principal e créditos</span>
          </button>
        ) : (
          image
        )}
      </div>

      {work.fotoPrincipalCreditos && (
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {work.fotoPrincipalCreditos}
        </p>
      )}

      {editing && (
        <Modal
          title="Foto principal"
          description="A imagem de capa exibida na listagem do acervo."
          onClose={closeModal}
          footer={
            <>
              {work.fotoPrincipalUrl && (
                <Button
                  variant="dangerGhost"
                  disabled={busy}
                  icon={<Trash2 className="size-4" />}
                  onClick={() =>
                    run(() => apiFetch(base, { method: "DELETE" }))
                  }
                  className="mr-auto"
                >
                  Remover foto
                </Button>
              )}
              <Button variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" form={EDIT_FORM_ID} disabled={busy}>
                {busy ? "Enviando..." : "Salvar"}
              </Button>
            </>
          }
        >
          <form id={EDIT_FORM_ID} onSubmit={save} className="grid gap-4">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-ink-700">Imagem</span>

              <FilePicker
                accept="imagem"
                files={pick.files}
                onFiles={pick.choose}
                disabled={busy}
                invalid={Boolean(pick.problem)}
                currentUrl={work.fotoPrincipalUrl}
              />

              {pick.problem && (
                <p className="text-xs font-medium text-danger-700">
                  {pick.problem}
                </p>
              )}
            </div>

            <Input
              label="Créditos"
              name="creditos"
              maxLength={500}
              defaultValue={work.fotoPrincipalCreditos ?? ""}
              placeholder="Opcional"
              hint="Autoria da imagem, fonte ou fotógrafo."
            />
          </form>
        </Modal>
      )}
    </section>
  );
}
