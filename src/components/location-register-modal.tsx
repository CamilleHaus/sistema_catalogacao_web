"use client";

import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageMessage } from "@/components/page-message";
import { Button, Input, Modal } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { errorMessage } from "@/lib/work";
import type { LocationNode } from "@/types/domain";

const FORM_ID = "cadastro-localizacao";

export function LocationRegisterModal({
  projetoId,
  item,
  parent = null,
  onClose,
  onSaved,
}: {
  projetoId: string;
  item: LocationNode | null;
  /** Ao criar: a localização raiz que vai receber a nova. Sem ela, cria na raiz. */
  parent?: LocationNode | null;
  onClose: () => void;
  onSaved: (message?: string) => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocker = !item
    ? null
    : item.filhos.length > 0
      ? "Para excluir, remova antes as sublocalizações."
      : item.vinculos > 0
        ? `Não pode ser excluída: tem ${item.vinculos} ${item.vinculos === 1 ? "vínculo" : "vínculos"} com obras ou movimentações.`
        : null;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/projetos/${projetoId}/localizacoes/${item!.id}`, {
        method: "DELETE",
      });
      await onSaved("Localização excluída.");
      onClose();
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nome = data.get("nome");
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/projetos/${projetoId}/localizacoes/${item!.id}`, {
          method: "PATCH",
          body: JSON.stringify({ nome }),
        });
      } else {
        await apiFetch(`/projetos/${projetoId}/localizacoes`, {
          method: "POST",
          // O pai vem fixo de onde o usuário clicou: raiz ou sublocalização dela.
          body: JSON.stringify({ nome, paiId: parent?.id }),
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
      title={
        editing ? "Editar localização" : parent ? "Nova sublocalização" : "Nova localização"
      }
      description={!editing && parent ? `Dentro de ${parent.nome}.` : undefined}
      onClose={onClose}
      footer={
        <>
          {editing && !blocker && (
            <Button
              variant="dangerGhost"
              disabled={busy}
              icon={<Trash2 className="size-4" />}
              onClick={remove}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
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
        <Input
          name="nome"
          label="Nome"
          required
          minLength={1}
          maxLength={150}
          defaultValue={item?.nome ?? ""}
          autoFocus
        />
        {blocker && <p className="text-xs text-muted-foreground">{blocker}</p>}
      </form>
    </Modal>
  );
}
