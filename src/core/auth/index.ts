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

export const isTokenExpired = (expiresAt: string, bufferMs = 0) => {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= Date.now() + bufferMs;
};

export const getAuthStatus = (): AuthStatus => {
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
};

export const clearAuth = () => {
  writeAuth(defaultAuthState());
};
