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

export const defaultConfig = (): ConfigFile => ({
  apiBase: "https://getrouter.dev",
  json: false,
});

export const defaultAuthState = (): AuthState => ({
  accessToken: "",
  refreshToken: "",
  expiresAt: "",
  tokenType: "Bearer",
});
