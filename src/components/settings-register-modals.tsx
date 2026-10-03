"use client";

import { useState, type FormEvent } from "react";
import { Button, ColorSwatchPicker, Input, Modal, Select } from "@/components/ui";
import { PageMessage } from "@/components/page-message";
import { apiFetch } from "@/lib/api-client";
import { errorMessage, optionalNumber, optionalText } from "@/lib/work";
import type {
  Artist,
  CatalogTag,
  Client,
  NamedReference,
  Project,
  Technique,
} from "@/types/domain";

const FORM_ID = "cadastro-configuracoes";

function Footer({
  onClose,
  busy,
}: {
  onClose: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit" form={FORM_ID} disabled={busy}>
        {busy ? "Salvando..." : "Salvar"}
      </Button>
    </>
  );
}

/**
 * Cadastro genérico de "só um nome" — status, categorias, locais de
 * assinatura, formas de negociação, modalidades de seguro, estados de
 * conservação e tipos de serviço compartilham o mesmo contrato de API
 * (`{ nome }` em POST/PATCH), então uma única forma atende todos.
 */
export function NameRegisterModal({
  path,
  createTitle,
  editTitle,
  fieldLabel = "Nome",
  item,
  onClose,
  onSaved,
}: {
  path: string;
  createTitle: string;
  editTitle: string;
  fieldLabel?: string;
  item: NamedReference | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = new FormData(event.currentTarget).get("nome");
    setBusy(true);
    setError(null);
    try {
      await apiFetch(editing ? `${path}/${item!.id}` : path, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ nome }),
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
      title={editing ? editTitle : createTitle}
      onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} />}
    >
      {error && (
        <div className="mb-5">
          <PageMessage message={error} />
        </div>
      )}
      <form id={FORM_ID} onSubmit={submit} className="grid gap-4">
        <Input
          name="nome"
          label={fieldLabel}
          required
          minLength={1}
          maxLength={150}
          defaultValue={item?.nome ?? ""}
          autoFocus
        />
      </form>
    </Modal>
  );
}

export function TagRegisterModal({
  item,
  onClose,
  onSaved,
}: {
  item: CatalogTag | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cor, setCor] = useState<string | null>(item?.cor ?? null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = new FormData(event.currentTarget).get("nome");
    setBusy(true);
    setError(null);
    try {
      await apiFetch(editing ? `/tags/${item!.id}` : "/tags", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ nome, cor }),
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
      title={editing ? "Editar tag" : "Nova tag"}
      onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} />}
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
          maxLength={150}
          defaultValue={item?.nome ?? ""}
          autoFocus
        />
        <ColorSwatchPicker label="Cor" value={cor} onChange={setCor} />
      </form>
    </Modal>
  );
}

export function ArtistRegisterModal({
  item,
  onClose,
  onSaved,
}: {
  item: Artist | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiFetch(editing ? `/artistas/${item!.id}` : "/artistas", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          nome: data.get("nome"),
          localNascimento: optionalText(data, "localNascimento"),
          anoNascimento: optionalNumber(data, "anoNascimento"),
          localFalecimento: optionalText(data, "localFalecimento"),
          anoFalecimento: optionalNumber(data, "anoFalecimento"),
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
      title={editing ? "Editar artista" : "Novo artista"}
      onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} />}
    >
      {error && (
        <div className="mb-5">
          <PageMessage message={error} />
        </div>
      )}
      <form id={FORM_ID} onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input
          name="nome"
          label="Nome"
          required
          minLength={2}
          maxLength={200}
          defaultValue={item?.nome ?? ""}
          autoFocus
          className="sm:col-span-2"
        />
        <Input
          name="localNascimento"
          label="Local de nascimento"
          maxLength={200}
          defaultValue={item?.localNascimento ?? ""}
        />
        <Input
          name="anoNascimento"
          label="Ano de nascimento"
          type="number"
          min={0}
          max={9999}
          defaultValue={item?.anoNascimento ?? ""}
        />
        <Input
          name="localFalecimento"
          label="Local de falecimento"
          maxLength={200}
          defaultValue={item?.localFalecimento ?? ""}
        />
        <Input
          name="anoFalecimento"
          label="Ano de falecimento"
          type="number"
          min={0}
          max={9999}
          defaultValue={item?.anoFalecimento ?? ""}
        />
      </form>
    </Modal>
  );
}

export function ClientRegisterModal({
  item,
  onClose,
  onSaved,
}: {
  item: Client | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiFetch(editing ? `/clientes/${item!.id}` : "/clientes", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(
          editing
            ? { nome: data.get("nome"), descricao: optionalText(data, "descricao") }
            : {
                nome: data.get("nome"),
                codigo: data.get("codigo"),
                descricao: optionalText(data, "descricao"),
              },
        ),
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
      title={editing ? "Editar cliente" : "Novo cliente"}
      onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} />}
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
          minLength={2}
          maxLength={150}
          defaultValue={item?.nome ?? ""}
          autoFocus
        />
        {editing ? (
          <Input
            label="Código"
            value={item!.codigo}
            disabled
            hint="O código não pode ser alterado após o cadastro."
          />
        ) : (
          <Input
            name="codigo"
            label="Código"
            required
            maxLength={50}
            placeholder="Ex.: MAR"
          />
        )}
        <label className="grid gap-1.5 text-sm font-medium text-ink-700">
          Descrição opcional
          <textarea
            name="descricao"
            maxLength={1000}
            defaultValue={item?.descricao ?? ""}
            className="min-h-24 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm shadow-xs outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-700/20"
          />
        </label>
      </form>
    </Modal>
  );
}

export function TechniqueRegisterModal({
  item,
  projects,
  onClose,
  onSaved,
}: {
  item: Technique | null;
  projects: Project[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiFetch(editing ? `/tecnicas/${item!.id}` : "/tecnicas", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(
          editing
            ? { nome: data.get("nome") }
            : { nome: data.get("nome"), projetoId: optionalText(data, "projetoId") },
        ),
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
      title={editing ? "Editar técnica" : "Nova técnica"}
      onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} />}
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
          minLength={2}
          maxLength={150}
          defaultValue={item?.nome ?? ""}
          autoFocus
        />
        {editing ? (
          <Input
            label="Escopo"
            value={item!.projeto ? `Projeto: ${item!.projeto.nome}` : "Geral da empresa"}
            disabled
            hint="O escopo não pode ser alterado após o cadastro."
          />
        ) : (
          <Select
            name="projetoId"
            label="Escopo"
            placeholder={null}
            options={[
              { value: "", label: "Geral da empresa" },
              ...projects.map((project) => ({
                value: project.id,
                label: `Projeto: ${project.nome}`,
              })),
            ]}
          />
        )}
      </form>
    </Modal>
  );
}
