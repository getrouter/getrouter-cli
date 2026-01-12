import { readAuth, writeAuth } from "../config";
import { buildApiUrl } from "../http/url";
import { isTokenExpired } from "./index";

type AuthToken = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  expiresAt: string | undefined;
};

const EXPIRY_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry

type RefreshOptions = {
  fetchImpl?: typeof fetch;
};

export function isTokenExpiringSoon(expiresAt: string): boolean {
  return isTokenExpired(expiresAt, EXPIRY_BUFFER_MS);
}

export async function refreshAccessToken(
  options: RefreshOptions,
): Promise<AuthToken | null> {
  const { fetchImpl } = options;
  const auth = readAuth();

  if (!auth.refreshToken) {
    return null;
  }

  const res = await (fetchImpl ?? fetch)(
    buildApiUrl("v1/dashboard/auth/token"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    },
  );

  if (!res.ok) {
    return null;
  }

  const token = (await res.json()) as AuthToken;
  if (token.accessToken && token.refreshToken) {
    writeAuth({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt ?? "",
      tokenType: "Bearer",
    });
  }

  return token;
}

export async function ensureValidToken(
  options: RefreshOptions,
): Promise<boolean> {
  const { fetchImpl } = options;
  const auth = readAuth();

  if (!auth.accessToken || !auth.refreshToken) {
    return false;
  }

  if (!isTokenExpiringSoon(auth.expiresAt)) {
    return true;
  }

  const refreshed = await refreshAccessToken({ fetchImpl });
  return refreshed !== null && Boolean(refreshed.accessToken);
}
