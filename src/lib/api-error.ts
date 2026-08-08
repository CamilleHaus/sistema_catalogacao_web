export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(
      Array.isArray(body.message)
        ? body.message.join(" ")
        : (body.message ?? "Não foi possível concluir a operação."),
    );
  }
}

export async function parseApiError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  return new ApiError(response.status, body);
}
