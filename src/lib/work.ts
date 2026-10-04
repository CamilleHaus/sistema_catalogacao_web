import type { LocationNode, Work, WorkDimension } from "@/types/domain";

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

export function optionalText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function optionalNumber(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" && value ? Number(value) : undefined;
}

/**
 * Lê um número digitado no formato brasileiro e devolve a string decimal que a
 * API espera ("1234567.89"), ou null se não for um número.
 *
 * Aceita "1.000.000,50", "1000000,50", "1.000.000" e o formato da API
 * ("1000000.50"). Com vírgula, ela é o decimal e os pontos são milhar. Sem
 * vírgula, o ponto só é decimal quando aparece uma vez e não seguido de
 * exatamente três dígitos ("1.5" é 1,5; "1.500" é mil e quinhentos).
 */
export function parseDecimal(raw: string): string | null {
  const text = raw.replace(/\s/g, "");
  if (!text) return null;
  let normalized: string;
  if (text.includes(",")) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = text.split(".").length - 1;
    normalized = dots > 1 || /^\d+\.\d{3}$/.test(text) ? text.replace(/\./g, "") : text;
  }
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

/** Mostra um decimal da API no formato brasileiro ("1234.5" → "1.234,50"). */
export function formatDecimal(value: string | null | undefined, minFraction = 2) {
  if (!value) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: 4,
  }).format(parsed);
}

/** Achata a árvore de localizações preservando a profundidade para indentação. */
export function flattenLocations(
  nodes: LocationNode[],
  depth = 0,
): { node: LocationNode; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenLocations(node.filhos, depth + 1),
  ]);
}

export function formatDimension(
  dimension: Pick<
    WorkDimension,
    | "formato"
    | "altura"
    | "largura"
    | "profundidade"
    | "unidade"
    | "descricaoVariavel"
  >,
) {
  if (dimension.formato === "VARIAVEL")
    return dimension.descricaoVariavel ?? "";
  const depth =
    dimension.profundidade === null ? "" : ` × ${dimension.profundidade}`;
  return `${dimension.altura} × ${dimension.largura}${depth} ${dimension.unidade?.toLowerCase() ?? ""}`.trim();
}

/** Título como aparece no cabeçalho e nos cards: com a série, quando houver. */
export function workTitle(
  work: Pick<Work, "tituloExibicao" | "serie" | "tituloSerie">,
) {
  return work.serie
    ? `${work.tituloExibicao}, série ${work.tituloSerie}`
    : work.tituloExibicao;
}

export const DIMENSION_LABEL = {
  SEM_MOLDURA: "Sem moldura",
  COM_MOLDURA: "Com moldura",
} as const;

/** Texto único usado pela busca da listagem. */
export function workSearchIndex(work: Work) {
  return [
    work.codigoAcervo,
    work.numeroManual,
    work.tituloExibicao,
    work.edicao,
    work.data,
    work.status?.nome,
    work.tecnica?.nome,
    work.localizacao?.nome,
    ...work.artistas.map((artist) => artist.nome),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
