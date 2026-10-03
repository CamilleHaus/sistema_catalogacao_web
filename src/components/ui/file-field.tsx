"use client";

import { FileUp, ImageUp, Paperclip, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { buttonClasses } from "./button";
import { FieldShell, useFieldIds, type FieldMeta } from "./field";
import {
  ACCEPTS,
  FILES_PREFIX,
  FILE_PREFIX,
  MAX_UPLOAD_MB,
  fileNameFromUrl,
  fileProblem,
  formatFileSize,
  isImageUrl,
  type AcceptKind,
} from "@/lib/uploads";

/** Cria e descarta os object URLs de pré-visualização junto com a lista. */
function usePreviews(files: File[]) {
  const previews = useMemo(
    () =>
      files.map((file) =>
        file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      ),
    [files],
  );

  useEffect(
    () => () => {
      for (const url of previews) if (url) URL.revokeObjectURL(url);
    },
    [previews],
  );

  return previews;
}

/**
 * Reflete a lista escolhida no próprio `input`, que é o que o FormData lê.
 * Só assim descartar um arquivo e acumular vários chegam ao envio.
 */
function useSyncedInput(files: File[]) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input || typeof DataTransfer === "undefined") return;
    const data = new DataTransfer();
    for (const file of files) data.items.add(file);
    input.files = data.files;
  }, [files]);

  return ref;
}

/**
 * Escolha de arquivos fora de um formulário — para as seções que têm endpoint
 * próprio e agem na hora, sem passar por um submit.
 */
export function useFilePick(accept: AcceptKind) {
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  /** Devolve `false` quando algum arquivo não serve. */
  function choose(chosen: File[]) {
    const bad = chosen.map((file) => fileProblem(file, accept)).find(Boolean);
    setProblem(bad ?? null);
    if (bad) return false;
    setFiles(chosen);
    return true;
  }

  function clear() {
    setFiles([]);
    setProblem(null);
  }

  return { accept, files, problem, choose, clear, setProblem };
}

export type FilePickerProps = {
  accept: AcceptKind;
  files: File[];
  /** Devolver `false` recusa a escolha e limpa o seletor. */
  onFiles: (files: File[]) => boolean | void;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Arquivo que já está salvo no registro, exibido quando não há escolha nova. */
  currentUrl?: string | null;
  onRemoveCurrent?: () => void;
  /** Presente só quando a área vive dentro de um `form`. */
  input?: {
    name: string;
    id?: string;
    required?: boolean;
    describedBy?: string;
    onInvalid?: () => void;
  };
};

/**
 * Área de arrastar e soltar com botão de escolha. É só a interface: quem usa
 * decide quando o arquivo sobe para o storage.
 */
export function FilePicker({
  accept,
  files,
  onFiles,
  multiple = false,
  disabled = false,
  invalid = false,
  currentUrl,
  onRemoveCurrent,
  input,
}: FilePickerProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useSyncedInput(files);
  const previews = usePreviews(files);
  const spec = ACCEPTS[accept];

  function pick(list: FileList | null) {
    const chosen = [...(list ?? [])];
    if (chosen.length === 0) return true;
    return onFiles(multiple ? [...files, ...chosen] : chosen.slice(0, 1));
  }

  const preview =
    previews[0] || (currentUrl && isImageUrl(currentUrl) ? currentUrl : "");
  const hasFiles = files.length > 0;
  const Icon = accept === "imagem" ? ImageUp : FileUp;

  return (
    <div
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) pick(event.dataTransfer.files);
      }}
      className={`grid justify-items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
        dragging
          ? "border-primary-700 bg-primary-50"
          : invalid
            ? "border-danger-600 bg-surface"
            : "border-border-strong bg-surface-muted"
      }`}
    >
      {preview ? (
        // Fundo em vez de <img>: evita o otimizador de imagem, que não serve
        // para object URLs.
        <div
          role="img"
          aria-label="Pré-visualização do arquivo"
          className="h-36 w-full rounded-lg bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${JSON.stringify(preview)})` }}
        />
      ) : (
        <Icon aria-hidden className="size-8 text-ink-400" />
      )}

      <div className="grid justify-items-center gap-1">
        <label
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: disabled ? "pointer-events-none opacity-50" : undefined,
          })}
        >
          <Icon aria-hidden className="size-4" />
          {multiple
            ? hasFiles
              ? "Adicionar mais"
              : "Escolher arquivos"
            : hasFiles || currentUrl
              ? "Trocar arquivo"
              : "Escolher arquivo"}
          <input
            ref={inputRef}
            id={input?.id}
            type="file"
            name={input?.name}
            accept={spec.types}
            multiple={multiple}
            disabled={disabled}
            required={input?.required}
            aria-describedby={input?.describedBy}
            className="sr-only"
            onInvalid={(event) => {
              // A mensagem nativa não tem onde aparecer num campo escondido.
              event.preventDefault();
              input?.onInvalid?.();
            }}
            onChange={(event) => {
              // Recusado pelo pai: o seletor precisa esquecer o arquivo, senão
              // é ele que o FormData leva no envio.
              if (pick(event.target.files) === false) event.target.value = "";
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          ou arraste {multiple ? "os arquivos" : "o arquivo"} aqui — até{" "}
          {MAX_UPLOAD_MB} MB
        </p>
      </div>

      {hasFiles ? (
        <ul className="grid w-full gap-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex max-w-full items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <Paperclip aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {file.name}
              </span>
              <span className="shrink-0">{formatFileSize(file.size)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onFiles(files.filter((_, position) => position !== index))
                }
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-ink-600 hover:bg-ink-100 hover:text-foreground"
              >
                <X aria-hidden className="size-3.5" />
                Descartar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        currentUrl && (
          <p className="flex max-w-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium text-primary-700 underline"
            >
              {fileNameFromUrl(currentUrl)}
            </a>
            {onRemoveCurrent && (
              <button
                type="button"
                disabled={disabled}
                onClick={onRemoveCurrent}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-ink-600 hover:bg-ink-100 hover:text-foreground"
              >
                <X aria-hidden className="size-3.5" />
                Remover
              </button>
            )}
          </p>
        )
      )}
    </div>
  );
}

export type FileFieldProps = FieldMeta & {
  /** Nome do campo de URL no corpo enviado à API. */
  name: string;
  accept?: AcceptKind;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** URL já salva no registro. */
  currentUrl?: string | null;
  /** URLs já salvas, quando o campo aceita vários arquivos. */
  currentUrls?: string[];
  id?: string;
};

/**
 * Campo de arquivo de formulário. O que já estava salvo fica em campos ocultos
 * e o upload do que foi escolhido acontece em `resolveUploads`, no submit —
 * assim nada vai para o storage antes de o registro ser salvo de fato.
 */
export function FileField({
  name,
  label,
  hint,
  error,
  span,
  id,
  accept = "imagem",
  multiple = false,
  required = false,
  disabled = false,
  currentUrl = null,
  currentUrls,
}: FileFieldProps) {
  const pick = useFilePick(accept);
  const [kept, setKept] = useState<string[]>(
    currentUrls ?? (currentUrl ? [currentUrl] : []),
  );
  const ids = useFieldIds(id, true, error ?? pick.problem);
  const spec = ACCEPTS[accept];

  function choose(chosen: File[]) {
    const accepted = pick.choose(chosen);
    // Um arquivo novo substitui o que estava salvo; vários se somam a ele.
    if (accepted && !multiple && chosen.length > 0) setKept([]);
    return accepted;
  }

  return (
    <FieldShell
      label={label}
      hint={hint ?? `${spec.label} — até ${MAX_UPLOAD_MB} MB.`}
      error={error ?? pick.problem}
      span={span}
      htmlFor={ids.fieldId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <FilePicker
        accept={accept}
        files={pick.files}
        onFiles={choose}
        multiple={multiple}
        disabled={disabled}
        invalid={Boolean(error ?? pick.problem)}
        currentUrl={multiple ? null : (kept[0] ?? null)}
        onRemoveCurrent={() => setKept([])}
        input={{
          // `resolveUploads` reconhece o prefixo, sobe o arquivo e põe a URL
          // hospedada no lugar do campo `name`.
          name: `${multiple ? FILES_PREFIX : FILE_PREFIX}${name}`,
          id: ids.fieldId,
          required: required && pick.files.length === 0 && kept.length === 0,
          describedBy: ids.describedBy,
          onInvalid: () =>
            pick.setProblem(
              multiple ? "Escolha ao menos um arquivo." : "Escolha um arquivo.",
            ),
        }}
      />

      {/* Guarda o que já estava salvo: sem escolha nova, é isto que segue. O
          campo existe mesmo vazio para que remover o arquivo chegue à API. */}
      {multiple ? (
        kept.map((url) => (
          <input key={url} type="hidden" name={name} value={url} readOnly />
        ))
      ) : (
        <input type="hidden" name={name} value={kept[0] ?? ""} readOnly />
      )}

      {multiple && kept.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {kept.length} arquivo{kept.length > 1 ? "s" : ""} já salvo
          {kept.length > 1 ? "s" : ""} neste registro.
        </p>
      )}
    </FieldShell>
  );
}
