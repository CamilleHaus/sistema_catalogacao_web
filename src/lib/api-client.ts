"use client";

import { ApiError, parseApiError } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
let refreshPromise: Promise<string | null> | null = null;

async function request<T>(
  path: string,
  init: RequestInit,
  allowRefresh: boolean,
) {
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

    if (nextToken) return request<T>(path, init, false);
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

  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body.trim()) return undefined as T;
  return JSON.parse(body) as T;
}

export function apiFetch<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, true);
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
