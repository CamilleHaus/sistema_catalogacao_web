"use client";

import { Award, ClipboardList, PenLine } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  FileField,
  Modal,
  MultiSelect,
  RecordCard,
  RecordSection,
  Select,
  Tabs,
  Textarea,
  type FactRow,
  type TabItem,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { resolveUploads } from "@/lib/uploads";
import { errorMessage } from "@/lib/work";
import type {
  CatalogCategory,
  Cataloging,
  CatalogTag,
  SignatureLocation,
} from "@/types/domain";

type Refs = {
  categories: CatalogCategory[];
  tags: CatalogTag[];
  locations: SignatureLocation[];
};

type Editing =
  | { kind: "geral" }
  | { kind: "assinatura"; id: string | null }
  | { kind: "certificado"; id: string | null }
  | null;

const FORM_ID = "editar-catalogacao";

function optional(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function CatalogingForm({
  projetoId,
  obraId,
  canEdit,
  onError,
}: {
  projetoId: string;
  obraId: string;
  canEdit: boolean;
  onError: (value: string) => void;
}) {
  const base = `/projetos/${projetoId}/obras/${obraId}/catalogacao`;
  const [catalog, setCatalog] = useState<Cataloging | null>(null);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("geral");
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<Cataloging | null>(base),
        apiFetch<CatalogCategory[]>("/categorias-catalogacao"),
        apiFetch<CatalogTag[]>("/tags"),
        apiFetch<SignatureLocation[]>("/locais-assinatura"),
      ]).then(([value, categories, tags, locations]) => {
        setCatalog(value);
        setRefs({ categories, tags, locations });
      }),
    [base],
  );

  useEffect(() => {
    let active = true;
    load().catch((error: unknown) => {
      if (active) onError(errorMessage(error));
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
    } catch (error: unknown) {
      onError(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    await action(() => apiFetch(`${base}/${path}`, { method: "DELETE" }));
  }

  if (!refs) {
    return (
      <p className="text-sm text-muted-foreground">Carregando catalogação...</p>
    );
  }

  const signatures = catalog?.assinaturas ?? [];
  const certificates = catalog?.certificados ?? [];

  const generalRows: FactRow[] = [
    ["Categoria", catalog?.categoria?.nome],
    [
      "Tags",
      catalog && catalog.tags.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {catalog.tags.map((tag) => (
            <Badge key={tag.id} color={tag.cor}>
              {tag.nome}
            </Badge>
          ))}
        </span>
      ) : null,
    ],
    ["Proveniência", catalog?.proveniencia],
    ["Observações", catalog?.observacoes],
  ];

  const editingSignature =
    editing?.kind === "assinatura" && editing.id
      ? signatures.find((item) => item.id === editing.id)
      : undefined;
  const editingCertificate =
    editing?.kind === "certificado" && editing.id
      ? certificates.find((item) => item.id === editing.id)
      : undefined;

  const tabs: TabItem[] = [
    {
      id: "geral",
      label: "Geral",
      icon: ClipboardList,
      content: (
        <RecordCard
          title="Catalogação"
          meta={
            catalog ? undefined : "Ainda não preenchida para esta obra."
          }
          rows={generalRows}
          columns={2}
          onEdit={canEdit ? () => setEditing({ kind: "geral" }) : undefined}
          busy={busy}
        />
      ),
    },
    {
      id: "assinaturas",
      label: "Assinaturas",
      icon: PenLine,
      count: signatures.length,
      content: (
        <RecordSection
          title="Assinaturas"
          icon={PenLine}
          addLabel="Adicionar assinatura"
          canAdd={canEdit && Boolean(catalog)}
          onAdd={() => setEditing({ kind: "assinatura", id: null })}
          isEmpty={signatures.length === 0}
          emptyText={
            catalog
              ? "Nenhuma assinatura registrada nesta obra."
              : "Preencha a aba Geral antes de registrar assinaturas."
          }
        >
          {signatures.map((item) => (
            <RecordCard
              key={item.id}
              title={item.localAssinatura.nome}
              rows={[
                [
                  "Imagem",
                  item.imagemUrl ? (
                    <a
                      href={item.imagemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary-700 underline wrap-break-word"
                    >
                      Abrir imagem
                    </a>
                  ) : null,
                ],
              ]}
              columns={1}
              busy={busy}
              onEdit={
                canEdit
                  ? () => setEditing({ kind: "assinatura", id: item.id })
                  : undefined
              }
              onDelete={
                canEdit ? () => remove(`assinaturas/${item.id}`) : undefined
              }
            />
          ))}
        </RecordSection>
      ),
    },
    {
      id: "certificados",
      label: "Certificados",
      icon: Award,
      count: certificates.length,
      content: (
        <RecordSection
          title="Certificados"
          icon={Award}
          addLabel="Adicionar certificado"
          canAdd={canEdit && Boolean(catalog)}
          onAdd={() => setEditing({ kind: "certificado", id: null })}
          isEmpty={certificates.length === 0}
          emptyText={
            catalog
              ? "Nenhum certificado registrado nesta obra."
              : "Preencha a aba Geral antes de registrar certificados."
          }
        >
          {certificates.map((item) => (
            <RecordCard
              key={item.id}
              title="Certificado"
              rows={[
                [
                  "Imagem",
                  <a
                    key="url"
                    href={item.imagemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-700 underline wrap-break-word"
                  >
                    Abrir certificado
                  </a>,
                ],
                ["Observações", item.observacoes],
              ]}
              columns={2}
              busy={busy}
              onEdit={
                canEdit
                  ? () => setEditing({ kind: "certificado", id: item.id })
                  : undefined
              }
              onDelete={
                canEdit ? () => remove(`certificados/${item.id}`) : undefined
              }
            />
          ))}
        </RecordSection>
      ),
    },
  ];

  return (
    <>
      <Tabs variant="nested" items={tabs} value={tab} onChange={setTab} />

      {editing?.kind === "geral" && (
        <CatalogModal
          title="Editar catalogação"
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={async (form) => {
            const ok = await action(() =>
              apiFetch(base, {
                method: "PUT",
                body: JSON.stringify({
                  categoriaId: optional(form, "categoriaId"),
                  proveniencia: optional(form, "proveniencia"),
                  observacoes: optional(form, "observacoes"),
                  tagIds: form.getAll("tagIds").map(String),
                }),
              }),
            );
            if (ok) setEditing(null);
          }}
        >
          <Select
            name="categoriaId"
            label="Categoria"
            span={2}
            placeholder="Não informada"
            defaultValue={catalog?.categoria?.id ?? ""}
            options={refs.categories.map((item) => ({
              value: item.id,
              label: item.nome,
            }))}
          />
          <MultiSelect
            name="tagIds"
            label="Tags"
            className="sm:col-span-2"
            searchPlaceholder="Buscar tag..."
            emptyLabel="Nenhuma tag cadastrada."
            defaultValue={catalog?.tags.map((tag) => tag.id) ?? []}
            options={refs.tags.map((tag) => ({
              value: tag.id,
              label: tag.nome,
            }))}
          />
          <Textarea
            name="proveniencia"
            label="Proveniência"
            span={2}
            rows={4}
            maxLength={10000}
            defaultValue={catalog?.proveniencia ?? ""}
          />
          <Textarea
            name="observacoes"
            label="Observações"
            span={2}
            rows={4}
            maxLength={10000}
            defaultValue={catalog?.observacoes ?? ""}
          />
        </CatalogModal>
      )}

      {editing?.kind === "assinatura" && (
        <CatalogModal
          title={editingSignature ? "Editar assinatura" : "Adicionar assinatura"}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={async (form) => {
            const ok = await action(async () => {
              await resolveUploads(projetoId, form);
              const body = {
                localAssinaturaId: form.get("localAssinaturaId"),
                imagemUrl: optional(form, "imagemUrl"),
              };
              return editingSignature
                ? apiFetch(`${base}/assinaturas/${editingSignature.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(body),
                  })
                : apiFetch(`${base}/assinaturas`, {
                    method: "POST",
                    body: JSON.stringify(body),
                  });
            });
            if (ok) setEditing(null);
          }}
        >
          <Select
            name="localAssinaturaId"
            label="Local da assinatura"
            span={2}
            required
            placeholder="Selecione o local"
            defaultValue={editingSignature?.localAssinatura.id ?? ""}
            options={refs.locations.map((item) => ({
              value: item.id,
              label: item.nome,
            }))}
          />
          <FileField
            name="imagemUrl"
            label="Imagem da assinatura"
            span={2}
            currentUrl={editingSignature?.imagemUrl}
          />
        </CatalogModal>
      )}

      {editing?.kind === "certificado" && (
        <CatalogModal
          title={
            editingCertificate ? "Editar certificado" : "Adicionar certificado"
          }
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={async (form) => {
            const ok = await action(async () => {
              await resolveUploads(projetoId, form);
              const body = {
                imagemUrl: form.get("imagemUrl"),
                observacoes: optional(form, "observacoes"),
              };
              return editingCertificate
                ? apiFetch(`${base}/certificados/${editingCertificate.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(body),
                  })
                : apiFetch(`${base}/certificados`, {
                    method: "POST",
                    body: JSON.stringify(body),
                  });
            });
            if (ok) setEditing(null);
          }}
        >
          <FileField
            name="imagemUrl"
            label="Arquivo do certificado"
            accept="documento"
            span={2}
            required
            currentUrl={editingCertificate?.imagemUrl}
          />
          <Textarea
            name="observacoes"
            label="Observações"
            span={2}
            rows={3}
            maxLength={10000}
            defaultValue={editingCertificate?.observacoes ?? ""}
          />
        </CatalogModal>
      )}
    </>
  );
}

function CatalogModal({
  title,
  busy,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void | Promise<void>;
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
          void onSubmit(new FormData(event.currentTarget));
        }}
      >
        {children}
      </form>
    </Modal>
  );
}
