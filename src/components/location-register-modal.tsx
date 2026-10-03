"use client";

import { useState, type FormEvent } from "react";
import { PageMessage } from "@/components/page-message";
import { Button, Input, Modal, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { errorMessage, flattenLocations } from "@/lib/work";
import type { LocationNode } from "@/types/domain";

const FORM_ID = "cadastro-localizacao";

export function LocationRegisterModal({
  projetoId,
  tree,
  item,
  onClose,
  onSaved,
}: {
  projetoId: string;
  tree: LocationNode[];
  item: LocationNode | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excluded = new Set(item ? flattenLocations([item]).map(({ node }) => node.id) : []);
  const parentOptions = flattenLocations(tree)
    .filter(({ node }) => !excluded.has(node.id))
    .map(({ node, depth }) => ({
      value: node.id,
      label: `${"— ".repeat(depth)}${node.nome}`,
    }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nome = data.get("nome");
    const paiId = String(data.get("paiId") ?? "");
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/projetos/${projetoId}/localizacoes/${item!.id}`, {
          method: "PATCH",
          body: JSON.stringify({ nome, paiId: paiId || null }),
        });
      } else {
        await apiFetch(`/projetos/${projetoId}/localizacoes`, {
          method: "POST",
          body: JSON.stringify({ nome, paiId: paiId || undefined }),
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
      title={editing ? "Editar localização" : "Nova localização"}
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
        <Input
          name="nome"
          label="Nome"
          required
          minLength={1}
          maxLength={150}
          defaultValue={item?.nome ?? ""}
          autoFocus
        />
        <Select
          name="paiId"
          label="Dentro de"
          placeholder={null}
          defaultValue={item?.paiId ?? ""}
          options={[{ value: "", label: "Raiz do projeto" }, ...parentOptions]}
        />
      </form>
    </Modal>
  );
}
