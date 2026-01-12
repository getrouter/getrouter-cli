export type ConfigFile = {
  apiBase: string;
  json: boolean;
};

export type AuthState = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
};

export function defaultConfig(): ConfigFile {
  return {
    apiBase: "https://getrouter.dev",
    json: false,
  };
}

export function defaultAuthState(): AuthState {
  return {
    accessToken: "",
    refreshToken: "",
    expiresAt: "",
    tokenType: "Bearer",
  };
}
