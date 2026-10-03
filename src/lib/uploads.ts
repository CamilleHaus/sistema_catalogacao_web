import { uploadProjectFile } from "@/lib/api-client";

/** Espelha STORAGE_MAX_FILE_SIZE_MB da API. */
export const MAX_UPLOAD_MB = 10;

const IMAGE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/tiff",
];
const TEXT_DOC = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/plain",
];
const SHEET = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
];
const SLIDES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.presentation",
];
const MEDIA = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

/**
 * Conjuntos de formatos aceitos por campo. O rótulo aparece na dica embaixo do
 * campo e na mensagem de erro, então descreve os mesmos tipos da lista.
 */
export const ACCEPTS = {
  imagem: {
    types: IMAGE.join(","),
    label: "JPG, PNG, WEBP, AVIF, GIF ou TIFF",
  },
  documento: {
    types: [...IMAGE, ...TEXT_DOC].join(","),
    label: "imagem ou PDF",
  },
  relatorio: {
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].join(","),
    label: "PDF, DOC ou DOCX",
  },
  anexo: {
    types: [
      ...IMAGE,
      ...TEXT_DOC,
      ...SHEET,
      ...SLIDES,
      ...MEDIA,
      "application/zip",
    ].join(","),
    label: "imagem, PDF, documento, planilha, apresentação, áudio, vídeo ou ZIP",
  },
} as const;

export type AcceptKind = keyof typeof ACCEPTS;

/** Motivo pelo qual o arquivo não serve, ou `null` quando está tudo certo. */
export function fileProblem(file: File, accept: AcceptKind) {
  const { types, label } = ACCEPTS[accept];
  if (!types.split(",").includes(file.type))
    return `Formato não aceito. Envie ${label}.`;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    return `O arquivo passa de ${MAX_UPLOAD_MB} MB.`;
  return null;
}

export function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "tif", "tiff"];

/** Só dá para pré-visualizar o que o navegador desenha como imagem. */
export function isImageUrl(url: string) {
  const path = url.split(/[?#]/)[0];
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return IMAGE_EXTENSIONS.includes(extension);
}

/** Nome legível do arquivo apontado por uma URL já hospedada. */
export function fileNameFromUrl(url: string) {
  const path = url.split(/[?#]/)[0];
  return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1)) || url;
}

/** Um arquivo por campo. */
export const FILE_PREFIX = "arquivo:";
/** Vários arquivos no mesmo campo. */
export const FILES_PREFIX = "arquivos:";

/**
 * Sobe os arquivos escolhidos no formulário e troca cada um pela URL hospedada,
 * no próprio FormData. Depois disso o formulário volta a ser só texto e o envio
 * segue igual ao de antes, lendo a URL pelo nome do campo.
 *
 * Chame no começo do submit, antes de montar o corpo da requisição.
 */
export async function resolveUploads(projetoId: string, form: FormData) {
  const keys = [...new Set(form.keys())];

  for (const key of keys) {
    const multiple = key.startsWith(FILES_PREFIX);
    if (!multiple && !key.startsWith(FILE_PREFIX)) continue;

    const field = key.slice((multiple ? FILES_PREFIX : FILE_PREFIX).length);
    // Um seletor sem escolha ainda manda um File vazio; ele não vira upload.
    const files = form
      .getAll(key)
      .filter((value): value is File => value instanceof File && value.size > 0);
    form.delete(key);
    if (files.length === 0) continue;

    const uploaded = await Promise.all(
      files.map((file) => uploadProjectFile(projetoId, file)),
    );

    if (multiple) {
      // Os campos ocultos já trouxeram as URLs que ficam; as novas entram junto.
      for (const { url } of uploaded) form.append(field, url);
    } else {
      form.set(field, uploaded[0].url);
    }
  }
}
