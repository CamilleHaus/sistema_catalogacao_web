"use client";

import { ApiError, parseApiError } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Envia a requisição com o token e, num 401, renova a sessão uma vez e tenta
 * de novo. Erros viram ApiError; a resposta OK volta crua para quem chamou.
 */
async function send(path: string, init: RequestInit, allowRefresh: boolean): Promise<Response> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não foi configurada.");

  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Em FormData o boundary faz parte do Content-Type — só o navegador sabe
  // montá-lo, então o cabeçalho não pode ser definido aqui.
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && allowRefresh) {
    refreshPromise ??= useAuthStore.getState().refreshSession();
    const nextToken = await refreshPromise.finally(() => {
      refreshPromise = null;
    });

    if (nextToken) return send(path, init, false);
  }

  if (!response.ok) {
    const error = await parseApiError(response);
    if (error.status === 401) {
      useAuthStore.setState({
        accessToken: null,
        user: null,
        status: "anonymous",
      });
    }
    throw error;
  }
  return response;
}

async function request<T>(path: string, init: RequestInit) {
  const response = await send(path, init, true);
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body.trim()) return undefined as T;
  return JSON.parse(body) as T;
}

export function apiFetch<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init);
}

/**
 * Pede um arquivo à API (ex.: exportação) e dispara o download no navegador,
 * com o nome que a API mandou em Content-Disposition.
 */
export async function apiDownload(path: string, init: RequestInit, fallbackName: string) {
  const response = await send(path, init, true);
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Dá tempo do navegador começar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type UploadedFile = {
  key: string;
  url: string;
  tamanho: number;
  tipo: string;
  nomeOriginal: string;
};

/** Sobe o arquivo para o storage do projeto e devolve a URL já hospedada. */
export function uploadProjectFile(projetoId: string, file: File) {
  const body = new FormData();
  body.append("arquivo", file);
  return apiFetch<UploadedFile>(`/projetos/${projetoId}/arquivos`, {
    method: "POST",
    body,
  });
}

export { ApiError };
