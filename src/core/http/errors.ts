export interface ApiError {
  code?: string;
  message: string;
  details?: unknown;
  status?: number;
}

export function createApiError(
  payload: unknown,
  fallbackMessage: string,
  status?: number,
): Error & ApiError {
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : undefined;

  const message =
    typeof payloadObject?.message === "string"
      ? payloadObject.message
      : fallbackMessage;

  const err = new Error(message) as Error & ApiError;

  const code = payloadObject?.code;
  if (typeof code === "string") {
    err.code = code;
  }

  const details = payloadObject?.details;
  if (details != null) {
    err.details = details;
  }

  if (typeof status === "number") {
    err.status = status;
  }

  return err;
}
