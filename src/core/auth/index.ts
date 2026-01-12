import { readAuth, writeAuth } from "../config";
import { defaultAuthState } from "../config/types";

type AuthStatus = {
  status: "logged_in" | "logged_out";
  note?: string;
  expiresAt?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
};

export function isTokenExpired(expiresAt: string, bufferMs = 0): boolean {
  if (!expiresAt) {
    return true;
  }

  const timestampMs = Date.parse(expiresAt);
  if (Number.isNaN(timestampMs)) {
    return true;
  }

  return timestampMs <= Date.now() + bufferMs;
}

export function getAuthStatus(): AuthStatus {
  const auth = readAuth();
  const hasTokens = Boolean(auth.accessToken && auth.refreshToken);

  if (!hasTokens || isTokenExpired(auth.expiresAt)) {
    return { status: "logged_out" };
  }

  return {
    status: "logged_in",
    expiresAt: auth.expiresAt,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    tokenType: auth.tokenType,
  };
}

export function clearAuth(): void {
  writeAuth(defaultAuthState());
}
