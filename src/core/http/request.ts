import { refreshAccessToken } from "../auth/refresh";
import { readAuth } from "../config";
import { createApiError } from "./errors";
import { isServerError, withRetry } from "./retry";
import { buildApiUrl } from "./url";

type RequestInput = {
  path: string;
  method: string;
  body?: unknown;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  /** For testing: override the sleep function used for retry delays */
  _retrySleep?: (ms: number) => Promise<void>;
};

const getAuthCookieName = () =>
  process.env.GETROUTER_AUTH_COOKIE ||
  process.env.KRATOS_AUTH_COOKIE ||
  "access_token";

const buildHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    headers.Cookie = `${getAuthCookieName()}=${accessToken}`;
  }
  return headers;
};

const doFetch = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  fetchImpl?: typeof fetch,
): Promise<Response> => {
  return (fetchImpl ?? fetch)(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
};

const shouldRetryResponse = (error: unknown): boolean => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return isServerError((error as { status: number }).status);
  }
  // Retry on network errors (TypeError from fetch)
  return error instanceof TypeError;
};

export const requestJson = async <T = unknown>({
  path,
  method,
  body,
  fetchImpl,
  maxRetries = 3,
  _retrySleep,
}: RequestInput): Promise<T> => {
  return withRetry(
    async () => {
      const auth = readAuth();
      const url = buildApiUrl(path);
      const headers = buildHeaders(auth.accessToken);

      let res = await doFetch(url, method, headers, body, fetchImpl);

      // On 401, attempt token refresh and retry once
      if (res.status === 401 && auth.refreshToken) {
        const refreshed = await refreshAccessToken({ fetchImpl });
        if (refreshed?.accessToken) {
          const newHeaders = buildHeaders(refreshed.accessToken);
          res = await doFetch(url, method, newHeaders, body, fetchImpl);
        }
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw createApiError(payload, res.statusText, res.status);
      }
      return (await res.json()) as T;
    },
    {
      maxRetries,
      shouldRetry: shouldRetryResponse,
      sleep: _retrySleep,
    },
  );
};
