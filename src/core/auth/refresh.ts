import { readAuth, writeAuth } from "../config";
import { buildApiUrl } from "../http/url";

type AuthToken = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  expiresAt: string | undefined;
};

const EXPIRY_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry

export const isTokenExpiringSoon = (expiresAt: string): boolean => {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= Date.now() + EXPIRY_BUFFER_MS;
};

export const refreshAccessToken = async ({
  fetchImpl,
}: {
  fetchImpl?: typeof fetch;
}): Promise<AuthToken | null> => {
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
};

export const ensureValidToken = async ({
  fetchImpl,
}: {
  fetchImpl?: typeof fetch;
}): Promise<boolean> => {
  const auth = readAuth();
  if (!auth.accessToken || !auth.refreshToken) {
    return false;
  }
  if (!isTokenExpiringSoon(auth.expiresAt)) {
    return true;
  }
  const refreshed = await refreshAccessToken({ fetchImpl });
  return refreshed !== null && Boolean(refreshed.accessToken);
};
