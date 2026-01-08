export type ApiError = {
  code?: string;
  message: string;
  details?: unknown;
  status?: number;
};

export const createApiError = (
  payload: unknown,
  fallbackMessage: string,
  status?: number,
) => {
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : undefined;
  const message =
    payloadObject && typeof payloadObject.message === "string"
      ? payloadObject.message
      : fallbackMessage;
  const err = new Error(message) as Error & ApiError;
  if (payloadObject && typeof payloadObject.code === "string") {
    err.code = payloadObject.code;
  }
  if (payloadObject && payloadObject.details != null) {
    err.details = payloadObject.details;
  }
  if (typeof status === "number") {
    err.status = status;
  }
  return err;
};
