"use client";

import { BookMarked, GraduationCap, Landmark, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { EmptyState } from "@/components/empty-state";
import {
  Button,
  FileField,
  FilePicker,
  Input,
  Modal,
  RecordCard,
  SectionHeader,
  Tabs,
  Textarea,
  useFilePick,
  type FactRow,
  type TabItem,
} from "@/components/ui";
import { apiFetch, uploadProjectFile } from "@/lib/api-client";
import { resolveUploads } from "@/lib/uploads";
import { errorMessage } from "@/lib/work";
import type {
  MuseumResearch,
  WorkCurriculum,
  WorkPublication,
  WorkResearch,
} from "@/types/domain";

type Kind = "curriculos" | "publicacoes" | "museologicas";
type Record_ = WorkCurriculum | WorkPublication | MuseumResearch;

type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "number" | "url" | "textarea";
  span?: 1 | 2;
};

const KINDS: Record<
  Kind,
  { label: string; singular: string; fields: FieldSpec[] }
> = {
  curriculos: {
    label: "Currículo",
    singular: "currículo",
    fields: [
      { name: "nomeExposicao", label: "Nome da exposição", span: 2 },
      { name: "instituicao", label: "Instituição" },
      { name: "cidade", label: "Cidade" },
      { name: "pais", label: "País" },
      { name: "data", label: "Data" },
    ],
  },
  publicacoes: {
    label: "Publicações",
    singular: "publicação",
    fields: [
      { name: "titulo", label: "Título", span: 2 },
      { name: "ano", label: "Ano", type: "number" },
      { name: "autor", label: "Autor" },
      { name: "editora", label: "Editora" },
      { name: "pagina", label: "Página" },
    ],
  },
  museologicas: {
    label: "Pesquisa museológica",
    singular: "pesquisa museológica",
    fields: [
      { name: "titulo", label: "Título", span: 2 },
      { name: "descricao", label: "Descrição", type: "textarea", span: 2 },
      { name: "url", label: "URL", type: "url", span: 2 },
    ],
  },
};

const ICONS = {
  curriculos: GraduationCap,
  publicacoes: BookMarked,
  museologicas: Landmark,
};

function text(item: Record_ | undefined, key: string) {
  const value = (item as unknown as Record<string, unknown>)?.[key];
  return value === null || value === undefined ? "" : String(value);
}

export function ResearchForm({
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
  const base = `/projetos/${projetoId}/obras/${obraId}/pesquisa`;
  const [data, setData] = useState<WorkResearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Kind>("curriculos");
  /** `id: null` significa criar. */
  const [editing, setEditing] = useState<{ kind: Kind; id: string | null } | null>(
    null,
  );

  const load = useCallback(
    () => apiFetch<WorkResearch>(base).then(setData),
    [base],
  );

  useEffect(() => {
    load().catch((error: unknown) => onError(errorMessage(error)));
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

  async function remove(kind: Kind, id: string) {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    await action(() => apiFetch(`${base}/${kind}/${id}`, { method: "DELETE" }));
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Carregando pesquisa...</p>
    );
  }

  const listOf = (kind: Kind): Record_[] =>
    kind === "curriculos"
      ? data.curriculos
      : kind === "publicacoes"
        ? data.publicacoes
        : data.pesquisasMuseologicas;

  const editingItem =
    editing?.id != null
      ? listOf(editing.kind).find((item) => item.id === editing.id)
      : undefined;

  const tabs: TabItem[] = (Object.keys(KINDS) as Kind[]).map((kind) => ({
    id: kind,
    label: KINDS[kind].label,
    icon: ICONS[kind],
    count: listOf(kind).length,
    content: (
      <div>
        <SectionHeader
          title={KINDS[kind].label}
          actions={
            canEdit && (
              <Button
                size="sm"
                icon={<Plus className="size-4" />}
                onClick={() => setEditing({ kind, id: null })}
              >
                Adicionar
              </Button>
            )
          }
        />
        <div className="mt-4 grid gap-4">
          {listOf(kind).length === 0 ? (
            <EmptyState icon={ICONS[kind]} title="Nenhum registro">
              Ainda não há {KINDS[kind].singular} cadastrada nesta obra.
            </EmptyState>
          ) : (
            listOf(kind).map((item) => (
              <ResearchRecord
                key={item.id}
                kind={kind}
                item={item}
                canEdit={canEdit}
                busy={busy}
                onEdit={() => setEditing({ kind, id: item.id })}
                onDelete={() => remove(kind, item.id)}
              />
            ))
          )}
        </div>
      </div>
    ),
  }));

  return (
    <>
      <Tabs
        variant="nested"
        items={tabs}
        value={tab}
        onChange={(id) => setTab(id as Kind)}
      />

      {editing && (
        <ResearchModal
          base={base}
          projetoId={projetoId}
          kind={editing.kind}
          item={editingItem}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={async (body, method, path) => {
            const ok = await action(() =>
              apiFetch(path, { method, body: JSON.stringify(body) }),
            );
            if (ok) setEditing(null);
          }}
          onImageAdd={(publicationId, files) =>
            action(async () => {
              for (const file of files) {
                const { url } = await uploadProjectFile(projetoId, file);
                await apiFetch(`${base}/publicacoes/${publicationId}/imagens`, {
                  method: "POST",
                  body: JSON.stringify({ imagemUrl: url }),
                });
              }
            })
          }
          onImageRemove={(publicationId, imageId) =>
            action(() =>
              apiFetch(
                `${base}/publicacoes/${publicationId}/imagens/${imageId}`,
                { method: "DELETE" },
              ),
            )
          }
        />
      )}
    </>
  );
}

function ResearchRecord({
  kind,
  item,
  canEdit,
  busy,
  onEdit,
  onDelete,
}: {
  kind: Kind;
  item: Record_;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [titleField, ...rest] = KINDS[kind].fields;
  const publication = kind === "publicacoes" ? (item as WorkPublication) : null;

  // O primeiro campo vira o título do card, então sai da grade para não repetir.
  const rows: FactRow[] = rest
    .filter((field) => field.name !== "ano")
    .map((field) => [
      field.label,
      field.type === "url" && text(item, field.name) ? (
        <a
          href={text(item, field.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary-700 underline wrap-break-word"
        >
          Abrir referência
        </a>
      ) : (
        text(item, field.name)
      ),
    ]);

  return (
    <RecordCard
      title={text(item, titleField.name) || "Sem título"}
      meta={publication?.ano ? String(publication.ano) : undefined}
      rows={rows}
      onEdit={canEdit ? onEdit : undefined}
      onDelete={canEdit ? onDelete : undefined}
      busy={busy}
      extra={
        publication && publication.imagens.length > 0 ? (
          <>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Imagens
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
              {publication.imagens.map((image) => (
                <a
                  key={image.id}
                  href={image.imagemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir imagem da publicação"
                  className="block aspect-square rounded-sm border border-border bg-ink-100 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${JSON.stringify(image.imagemUrl)})`,
                  }}
                />
              ))}
            </div>
          </>
        ) : undefined
      }
    />
  );
}

const MODAL_FORM_ID = "editar-pesquisa";

function ResearchModal({
  base,
  projetoId,
  kind,
  item,
  busy,
  onClose,
  onSubmit,
  onImageAdd,
  onImageRemove,
}: {
  base: string;
  projetoId: string;
  kind: Kind;
  item?: Record_;
  busy: boolean;
  onClose: () => void;
  onSubmit: (
    body: unknown,
    method: "POST" | "PATCH",
    path: string,
  ) => Promise<void>;
  onImageAdd: (publicationId: string, files: File[]) => Promise<boolean>;
  onImageRemove: (publicationId: string, imageId: string) => Promise<boolean>;
}) {
  const spec = KINDS[kind];
  const publication = kind === "publicacoes" ? (item as WorkPublication) : null;
  const imagePick = useFilePick("imagem");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await resolveUploads(projetoId, form);

    const body: Record<string, unknown> = {};
    for (const field of spec.fields) {
      const raw = form.get(field.name);
      const value = typeof raw === "string" ? raw.trim() : "";
      body[field.name] =
        field.type === "number" ? (value ? Number(value) : null) : value || null;
    }

    // Só na criação a API aceita a lista de imagens junto do registro.
    if (kind === "publicacoes" && !item) {
      body.imagens = form
        .getAll("imagens")
        .filter((url): url is string => typeof url === "string" && !!url);
    }

    await onSubmit(
      body,
      item ? "PATCH" : "POST",
      item ? `${base}/${kind}/${item.id}` : `${base}/${kind}`,
    );
  }

  return (
    <Modal
      title={`${item ? "Editar" : "Adicionar"} ${spec.singular}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={MODAL_FORM_ID} disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <form
        id={MODAL_FORM_ID}
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        {spec.fields.map((field) =>
          field.type === "textarea" ? (
            <Textarea
              key={field.name}
              name={field.name}
              label={field.label}
              span={field.span}
              rows={3}
              defaultValue={text(item, field.name)}
            />
          ) : (
            <Input
              key={field.name}
              name={field.name}
              label={field.label}
              span={field.span}
              type={field.type === "number" ? "number" : field.type ?? "text"}
              {...(field.type === "number"
                ? { min: 0, max: 9999, step: 1 }
                : {})}
              defaultValue={text(item, field.name)}
            />
          ),
        )}

        {kind === "publicacoes" && !item && (
          <FileField
            name="imagens"
            label="Imagens"
            span={2}
            multiple
            hint="Depois de criar, dá para gerenciar as imagens aqui mesmo."
          />
        )}
      </form>

      {publication && (
        <ImageManager
          publication={publication}
          busy={busy}
          pick={imagePick}
          onAdd={async () => {
            if (imagePick.files.length === 0) return;
            const ok = await onImageAdd(publication.id, imagePick.files);
            if (ok) imagePick.clear();
          }}
          onRemove={(imageId) => onImageRemove(publication.id, imageId)}
        />
      )}
    </Modal>
  );
}

/** Fora do <form> do modal: HTML não permite formulário aninhado. */
function ImageManager({
  publication,
  busy,
  pick,
  onAdd,
  onRemove,
}: {
  publication: WorkPublication;
  busy: boolean;
  pick: ReturnType<typeof useFilePick>;
  onAdd: () => void;
  onRemove: (imageId: string) => void;
}): ReactNode {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="text-sm font-semibold tracking-tight">Imagens</h3>

      {publication.imagens.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma imagem nesta publicação.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {publication.imagens.map((image) => (
            <div key={image.id} className="relative">
              <a
                href={image.imagemUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir imagem"
                className="block aspect-square rounded-sm border border-border bg-ink-100 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${JSON.stringify(image.imagemUrl)})`,
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(image.id)}
                aria-label="Remover imagem"
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-sm border border-border bg-surface text-danger-700 shadow-sm hover:bg-danger-50"
              >
                <X aria-hidden className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-2">
        <FilePicker
          accept="imagem"
          multiple
          files={pick.files}
          onFiles={pick.choose}
          disabled={busy}
          invalid={Boolean(pick.problem)}
        />
        {pick.problem && (
          <p className="text-xs font-medium text-danger-700">{pick.problem}</p>
        )}
        <Button
          variant="secondary"
          className="justify-self-end"
          disabled={busy || pick.files.length === 0}
          icon={<Plus className="size-4" />}
          onClick={onAdd}
        >
          Adicionar
        </Button>
      </div>
    </section>
  );
}
