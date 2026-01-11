import { refreshAccessToken } from "../auth/refresh";
import { readAuth } from "../config";
import { createApiError } from "./errors";
import { isRetryableError, withRetry } from "./retry";
import { buildApiUrl } from "./url";

type RequestInput = {
  path: string;
  method: string;
  body?: unknown;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  includeAuth?: boolean;
  /** For testing: override the sleep function used for retry delays */
  _retrySleep?: (ms: number) => Promise<void>;
};

function getAuthCookieName(): string {
  const routerCookieName = process.env.GETROUTER_AUTH_COOKIE;
  if (routerCookieName) {
    return routerCookieName;
  }

  const kratosCookieName = process.env.KRATOS_AUTH_COOKIE;
  if (kratosCookieName) {
    return kratosCookieName;
  }

  return "access_token";
}

function buildHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    headers.Cookie = `${getAuthCookieName()}=${accessToken}`;
  }

  return headers;
}

async function doFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  fetchImpl?: typeof fetch,
): Promise<Response> {
  return (fetchImpl ?? fetch)(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
}

export async function requestJson<T = unknown>({
  path,
  method,
  body,
  fetchImpl,
  maxRetries = 3,
  includeAuth = true,
  _retrySleep,
}: RequestInput): Promise<T> {
  return withRetry(
    async () => {
      const url = buildApiUrl(path);
      const auth = includeAuth ? readAuth() : undefined;
      const headers = buildHeaders(auth?.accessToken);

      let res = await doFetch(url, method, headers, body, fetchImpl);

      // On 401, attempt token refresh and retry once
      if (includeAuth && res.status === 401 && auth?.refreshToken) {
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
      shouldRetry: isRetryableError,
      sleep: _retrySleep,
    },
  );
}
