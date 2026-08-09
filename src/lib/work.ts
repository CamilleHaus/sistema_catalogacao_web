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

export function formatDimension(dimension: WorkDimension) {
  if (dimension.formato === "VARIAVEL") return dimension.descricaoVariavel ?? "";
  const depth =
    dimension.profundidade === null ? "" : ` × ${dimension.profundidade}`;
  return `${dimension.altura} × ${dimension.largura}${depth} ${dimension.unidade?.toLowerCase() ?? ""}`.trim();
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
