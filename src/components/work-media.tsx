"use client";

import type { LucideIcon } from "lucide-react";
import {
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  ImageOff,
  Images,
  Paperclip,
  Pencil,
  Presentation,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  FileField,
  IconButton,
  Input,
  Modal,
  RecordCard,
  RecordSection,
  Select,
  Tabs,
  Textarea,
  type TabItem,
} from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { resolveUploads } from "@/lib/uploads";
import { errorMessage } from "@/lib/work";
import type {
  AttachmentType,
  WorkAttachment,
  WorkGallery,
  WorkImage,
} from "@/types/domain";

const TYPES: AttachmentType[] = [
  "IMAGEM",
  "PDF",
  "DOCUMENTO",
  "PLANILHA",
  "APRESENTACAO",
  "AUDIO",
  "VIDEO",
  "OUTRO",
];

const TYPE_LABEL: Record<AttachmentType, string> = {
  IMAGEM: "Imagem",
  PDF: "PDF",
  DOCUMENTO: "Documento",
  PLANILHA: "Planilha",
  APRESENTACAO: "Apresentação",
  AUDIO: "Áudio",
  VIDEO: "Vídeo",
  OUTRO: "Outro",
};

const TYPE_ICON: Record<AttachmentType, LucideIcon> = {
  IMAGEM: FileImage,
  PDF: FileText,
  DOCUMENTO: FileText,
  PLANILHA: FileSpreadsheet,
  APRESENTACAO: Presentation,
  AUDIO: FileAudio,
  VIDEO: FileVideo,
  OUTRO: Paperclip,
};

const IMAGE_FORM_ID = "editar-imagem-obra";
const ATTACHMENT_FORM_ID = "editar-anexo-obra";

type GalleryItem = WorkImage & { origem: "OBRA" | "ASSINATURA" };
type Editing =
  | { kind: "imagem"; id: string | null }
  | { kind: "anexo"; id: string | null }
  | null;

// Mídias da mais antiga para a mais recente: a ordem em que foram enviadas.
function byCreatedAsc(a: { criadoEm: string }, b: { criadoEm: string }) {
  return Date.parse(a.criadoEm) - Date.parse(b.criadoEm);
}

function optional(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function WorkMedia({
  projetoId,
  obraId,
  canEdit,
  onChanged,
  onError,
}: {
  projetoId: string;
  obraId: string;
  canEdit: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const base = `/projetos/${projetoId}/obras/${obraId}`;
  const [gallery, setGallery] = useState<WorkGallery | null>(null);
  const [attachments, setAttachments] = useState<WorkAttachment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("imagens");
  const [editing, setEditing] = useState<Editing>(null);

  // Cadeia de promise em vez de async/await: o lint de hooks trata uma função
  // async chamada no efeito como setState síncrono.
  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<WorkGallery>(`${base}/galeria`),
        apiFetch<WorkAttachment[]>(`${base}/anexos`),
      ]).then(([galleryData, attachmentData]) => {
        setGallery(galleryData);
        setAttachments([...attachmentData].sort(byCreatedAsc));
      }),
    [base],
  );

  useEffect(() => {
    let active = true;
    load().catch((caught: unknown) => {
      if (active) onError(errorMessage(caught));
    });
    return () => {
      active = false;
    };
  }, [load, onError]);

  const items = useMemo<GalleryItem[]>(
    () =>
      [
        ...(gallery?.imagens.map((item) => ({
          ...item,
          origem: "OBRA" as const,
        })) ?? []),
        ...(gallery?.assinaturas.map((item) => ({
          ...item,
          creditos: null,
          observacoes: `Local: ${item.localAssinatura.nome}`,
          principal: false,
          atualizadoEm: item.criadoEm,
          origem: "ASSINATURA" as const,
        })) ?? []),
      ].sort(byCreatedAsc),
    [gallery],
  );

  async function action(run: () => Promise<unknown>, refreshWork = false) {
    setBusy(true);
    onError("");
    try {
      await run();
      await load();
      if (refreshWork) await onChanged();
      return true;
    } catch (caught: unknown) {
      onError(errorMessage(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(item: GalleryItem) {
    if (!window.confirm("Deseja realmente excluir esta imagem?")) return;
    await action(
      () => apiFetch(`${base}/imagens/${item.id}`, { method: "DELETE" }),
      item.principal,
    );
  }

  async function removeAttachment(id: string) {
    if (!window.confirm("Deseja realmente excluir este anexo?")) return;
    await action(() => apiFetch(`${base}/anexos/${id}`, { method: "DELETE" }));
  }

  const editingImage =
    editing?.kind === "imagem" && editing.id
      ? items.find((item) => item.id === editing.id)
      : undefined;
  const editingAttachment =
    editing?.kind === "anexo" && editing.id
      ? attachments?.find((item) => item.id === editing.id)
      : undefined;

  const loading = !gallery || !attachments;

  const tabs: TabItem[] = [
    {
      id: "imagens",
      label: "Imagens",
      icon: Images,
      count: items.length,
      content: (
        <RecordSection
          title="Imagens da obra"
          icon={ImageOff}
          addLabel="Adicionar imagem"
          canAdd={canEdit}
          onAdd={() => setEditing({ kind: "imagem", id: null })}
          isEmpty={items.length === 0}
          emptyText="Nenhuma imagem cadastrada nesta obra."
        >
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((item) => (
              <ImageCard
                key={`${item.origem}-${item.id}`}
                item={item}
                canEdit={canEdit}
                busy={busy}
                onEdit={() => setEditing({ kind: "imagem", id: item.id })}
                onDelete={() => removeImage(item)}
                onMakePrimary={() =>
                  action(
                    () =>
                      apiFetch(`${base}/imagens/${item.id}/principal`, {
                        method: "PATCH",
                      }),
                    true,
                  )
                }
              />
            ))}
          </div>
        </RecordSection>
      ),
    },
    {
      id: "anexos",
      label: "Anexos",
      icon: Paperclip,
      count: attachments?.length ?? 0,
      content: (
        <RecordSection
          title="Anexos"
          icon={Paperclip}
          addLabel="Adicionar anexo"
          canAdd={canEdit}
          onAdd={() => setEditing({ kind: "anexo", id: null })}
          isEmpty={(attachments?.length ?? 0) === 0}
          emptyText="Nenhum arquivo anexado a esta obra."
        >
          {attachments?.map((item) => {
            const Icon = TYPE_ICON[item.tipo] ?? Paperclip;
            return (
              <RecordCard
                key={item.id}
                title={
                  <span className="flex items-center gap-2">
                    <Icon aria-hidden className="size-4 shrink-0 text-ink-500" />
                    {TYPE_LABEL[item.tipo] ?? item.tipo}
                  </span>
                }
                rows={[
                  [
                    "Arquivo",
                    <a
                      key="url"
                      href={item.arquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary-700 underline wrap-break-word"
                    >
                      Abrir arquivo
                    </a>,
                  ],
                  ["Extensão", item.extensao],
                  ["Observações", item.observacoes],
                ]}
                busy={busy}
                onEdit={
                  canEdit
                    ? () => setEditing({ kind: "anexo", id: item.id })
                    : undefined
                }
                onDelete={canEdit ? () => removeAttachment(item.id) : undefined}
              />
            );
          })}
        </RecordSection>
      ),
    },
  ];

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando mídias...</p>;
  }

  return (
    <>
      <Tabs variant="nested" items={tabs} value={tab} onChange={setTab} />

      {editing?.kind === "imagem" && (
        <Modal
          title={editingImage ? "Editar imagem" : "Adicionar imagem"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" form={IMAGE_FORM_ID} disabled={busy}>
                {busy ? "Salvando..." : "Salvar"}
              </Button>
            </>
          }
        >
          <form
            id={IMAGE_FORM_ID}
            className="grid gap-4"
            onSubmit={async (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const ok = await action(async () => {
                await resolveUploads(projetoId, form);
                const body = {
                  imagemUrl: form.get("imagemUrl"),
                  creditos: optional(form, "creditos"),
                  observacoes: optional(form, "observacoes"),
                };
                return editingImage
                  ? apiFetch(`${base}/imagens/${editingImage.id}`, {
                      method: "PATCH",
                      body: JSON.stringify(body),
                    })
                  : apiFetch(`${base}/imagens`, {
                      method: "POST",
                      body: JSON.stringify(body),
                    });
              }, Boolean(editingImage?.principal));
              if (ok) setEditing(null);
            }}
          >
            <FileField
              name="imagemUrl"
              label="Imagem"
              required
              currentUrl={editingImage?.imagemUrl}
            />
            <Input
              name="creditos"
              label="Créditos"
              maxLength={500}
              defaultValue={editingImage?.creditos ?? ""}
              placeholder="Opcional"
            />
            <Textarea
              name="observacoes"
              label="Observações"
              maxLength={5000}
              rows={3}
              defaultValue={editingImage?.observacoes ?? ""}
            />
          </form>
        </Modal>
      )}

      {editing?.kind === "anexo" && (
        <Modal
          title={editingAttachment ? "Editar anexo" : "Adicionar anexo"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" form={ATTACHMENT_FORM_ID} disabled={busy}>
                {busy ? "Salvando..." : "Salvar"}
              </Button>
            </>
          }
        >
          <form
            id={ATTACHMENT_FORM_ID}
            className="grid gap-4"
            onSubmit={async (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const ok = await action(async () => {
                await resolveUploads(projetoId, form);
                const body = {
                  arquivoUrl: form.get("arquivoUrl"),
                  tipo: form.get("tipo"),
                  observacoes: optional(form, "observacoes"),
                };
                return editingAttachment
                  ? apiFetch(`${base}/anexos/${editingAttachment.id}`, {
                      method: "PATCH",
                      body: JSON.stringify(body),
                    })
                  : apiFetch(`${base}/anexos`, {
                      method: "POST",
                      body: JSON.stringify(body),
                    });
              });
              if (ok) setEditing(null);
            }}
          >
            <FileField
              name="arquivoUrl"
              label="Arquivo"
              accept="anexo"
              required
              currentUrl={editingAttachment?.arquivoUrl}
            />
            <Select
              name="tipo"
              label="Tipo"
              required
              placeholder={null}
              defaultValue={editingAttachment?.tipo ?? "OUTRO"}
              options={TYPES.map((type) => ({
                value: type,
                label: TYPE_LABEL[type],
              }))}
            />
            <Textarea
              name="observacoes"
              label="Observações"
              maxLength={5000}
              rows={3}
              defaultValue={editingAttachment?.observacoes ?? ""}
            />
          </form>
        </Modal>
      )}
    </>
  );
}

function ImageCard({
  item,
  canEdit,
  busy,
  onEdit,
  onDelete,
  onMakePrimary,
}: {
  item: GalleryItem;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMakePrimary: () => void;
}) {
  // Assinaturas vêm da catalogação; editá-las aqui sairia do lugar.
  const editable = canEdit && item.origem === "OBRA";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="relative">
        <a
          href={item.imagemUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            item.origem === "ASSINATURA" ? "Abrir assinatura" : "Abrir imagem"
          }
        >
          <span
            role="img"
            aria-label={
              item.origem === "ASSINATURA" ? "Assinatura" : "Imagem da obra"
            }
            className="block aspect-square bg-ink-100 bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(item.imagemUrl)})` }}
          />
        </a>

        {item.principal && (
          <Badge
            tone="brand"
            icon={<Star className="size-3" />}
            className="absolute top-2 left-2 bg-surface shadow-sm"
          >
            Principal
          </Badge>
        )}

        {editable && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <IconButton
              aria-label="Editar imagem"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onEdit}
              className="bg-surface shadow-sm"
            >
              <Pencil className="size-4" />
            </IconButton>
            <IconButton
              aria-label="Excluir imagem"
              size="sm"
              variant="dangerGhost"
              disabled={busy}
              onClick={onDelete}
              className="bg-surface shadow-sm"
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        )}
      </div>

      {(item.origem === "ASSINATURA" ||
        item.creditos ||
        item.observacoes ||
        (editable && !item.principal)) && (
        <div className="flex flex-1 flex-col gap-2 p-3">
          {item.origem === "ASSINATURA" && (
            <Badge tone="neutral" className="self-start">
              Assinatura
            </Badge>
          )}

          {item.creditos && (
            <p className="text-xs text-muted-foreground">{item.creditos}</p>
          )}
          {item.observacoes && (
            <p className="text-xs text-muted-foreground">{item.observacoes}</p>
          )}

          {editable && !item.principal && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              icon={<Star className="size-4" />}
              onClick={onMakePrimary}
              className="mt-auto self-start"
            >
              Tornar principal
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
