import { formatDecimal, parseDecimal } from "@/lib/work";
import type {
  AdvancedFilter,
  SearchCondition,
  SearchFieldDef,
} from "@/types/domain";

/**
 * Valor de um campo no formulário da busca, no formato em que o usuário edita:
 * texto e sim/não como string, faixa "de/até" como par (números como digitados,
 * "1.000,50"), opções como lista de ids.
 */
export type FormValue = string | string[];
export type FormValues = Record<string, FormValue>;

const isRange = (field: SearchFieldDef) =>
  field.tipo === "numero" || field.tipo === "valor" || field.tipo === "data";
const isOptions = (field: SearchFieldDef) =>
  field.tipo === "opcao" || field.tipo === "multipla";
const isNumeric = (field: SearchFieldDef) =>
  field.tipo === "numero" || field.tipo === "valor";

export function emptyValue(field: SearchFieldDef): FormValue {
  if (isOptions(field)) return [];
  return isRange(field) ? ["", ""] : "";
}

export function isFilled(field: SearchFieldDef, value: FormValue | undefined) {
  if (value === undefined) return false;
  if (isOptions(field)) return value.length > 0;
  if (isRange(field)) return (value as string[]).some((side) => side.trim());
  return (value as string).trim() !== "";
}

/**
 * Formulário → condições da API. Campo vazio é ignorado. Devolve a mensagem
 * do primeiro problema em vez das condições, para o modal mostrar.
 */
export function toConditions(
  values: FormValues,
  fields: SearchFieldDef[],
): SearchCondition[] | string {
  const conditions: SearchCondition[] = [];
  for (const field of fields) {
    const value = values[field.id];
    if (!isFilled(field, value)) continue;
    const campo = field.id;

    if (isOptions(field)) {
      conditions.push({ campo, operador: "em", valor: value as string[] });
    } else if (field.tipo === "existe") {
      conditions.push({ campo, operador: value as string });
    } else if (field.tipo === "texto") {
      conditions.push({ campo, operador: "contem", valor: (value as string).trim() });
    } else {
      const convert = (raw: string) =>
        isNumeric(field) ? parseDecimal(raw) : raw.trim() || null;
      const [rawFrom, rawTo] = value as string[];
      const from = rawFrom.trim() ? convert(rawFrom) : null;
      const to = rawTo.trim() ? convert(rawTo) : null;
      if ((rawFrom.trim() && !from) || (rawTo.trim() && !to))
        return `Digite um número válido em "${field.label}", como 1.000.000,00.`;
      if (from && to) conditions.push({ campo, operador: "entre", valor: [from, to] });
      else if (from) conditions.push({ campo, operador: "minimo", valor: from });
      else conditions.push({ campo, operador: "maximo", valor: to! });
    }
  }
  return conditions;
}

/** Condições da API (URL ou filtro salvo) → formulário. */
export function toFormValues(
  conditions: SearchCondition[],
  fields: Map<string, SearchFieldDef>,
) {
  const values: FormValues = {};
  let ignored = 0;
  for (const condition of conditions) {
    const field = fields.get(condition.campo);
    if (!field || !field.operadores.includes(condition.operador)) {
      ignored += 1;
      continue;
    }
    const show = (raw: string) => (isNumeric(field) ? formatDecimal(raw, 0) : raw);
    const value = condition.valor;
    if (field.tipo === "existe") values[field.id] = condition.operador;
    else if (isOptions(field)) values[field.id] = (value as string[]) ?? [];
    else if (field.tipo === "texto") values[field.id] = value as string;
    else if (condition.operador === "entre")
      values[field.id] = (value as string[]).map(show);
    else if (condition.operador === "minimo") values[field.id] = [show(value as string), ""];
    else values[field.id] = ["", show(value as string)];
  }
  return { values, ignored };
}

/** Campo e valor da condição, separados para o resumo acima do acervo. */
export function describeParts(condition: SearchCondition, field: SearchFieldDef) {
  const value = condition.valor;
  const parts = (text: string) => ({ label: field.label, value: text });
  if (field.tipo === "existe") return parts(condition.operador === "sim" ? "sim" : "não");
  const show = (raw: string) =>
    isNumeric(field)
      ? formatDecimal(raw, 0)
      : new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(raw));
  if (isOptions(field)) {
    const labels = (value as string[]).map(
      // Localizações vêm com recuo ("— Sala"); no resumo o recuo só atrapalha.
      (id) => field.opcoes?.find((option) => option.value === id)?.label.replace(/^(— )+/, "") ?? "?",
    );
    return parts(
      labels.length > 3 ? `${labels.slice(0, 3).join(", ")} +${labels.length - 3}` : labels.join(", "),
    );
  }
  if (field.tipo === "texto") return parts(`“${value as string}”`);
  if (condition.operador === "entre") {
    const [from, to] = value as string[];
    return parts(`${show(from)} – ${show(to)}`);
  }
  return parts(`${condition.operador === "minimo" ? "a partir de" : "até"} ${show(value as string)}`);
}

/* ---------- Filtro na URL: ?busca=<base64url do JSON> ---------- */

const URL_PARAM = "busca";

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function readFilterFromUrl(): AdvancedFilter | null {
  try {
    const raw = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (!raw) return null;
    const parsed = JSON.parse(fromBase64Url(raw)) as Partial<AdvancedFilter>;
    if (!Array.isArray(parsed.condicoes) || parsed.condicoes.length === 0) return null;
    return {
      combinar: parsed.combinar === "QUALQUER" ? "QUALQUER" : "TODAS",
      condicoes: parsed.condicoes,
    };
  } catch {
    // Link adulterado ou truncado: abre o acervo sem filtro em vez de quebrar.
    return null;
  }
}

/** Grava (ou remove) o filtro na URL sem recarregar nem empilhar histórico. */
export function writeFilterToUrl(filter: AdvancedFilter | null) {
  const url = new URL(window.location.href);
  if (filter) url.searchParams.set(URL_PARAM, toBase64Url(JSON.stringify(filter)));
  else url.searchParams.delete(URL_PARAM);
  window.history.replaceState(window.history.state, "", url);
}
