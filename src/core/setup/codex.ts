type CodexConfigInput = {
  model: string;
  reasoning: string;
};

export type CodexTomlRootValues = {
  model?: string;
  reasoning?: string;
  provider?: string;
};

const CODEX_PROVIDER = "getrouter";
const CODEX_BASE_URL = "https://api.getrouter.dev/codex";

const LEGACY_TOML_ROOT_MARKERS = [
  "_getrouter_codex_backup_model",
  "_getrouter_codex_backup_model_reasoning_effort",
  "_getrouter_codex_backup_model_provider",
  "_getrouter_codex_installed_model",
  "_getrouter_codex_installed_model_reasoning_effort",
  "_getrouter_codex_installed_model_provider",
] as const;

const LEGACY_AUTH_MARKERS = [
  "_getrouter_codex_backup_openai_api_key",
  "_getrouter_codex_installed_openai_api_key",
] as const;

const ROOT_KEYS = [
  "model",
  "model_reasoning_effort",
  "model_provider",
] as const;
const PROVIDER_SECTION = `model_providers.${CODEX_PROVIDER}`;
const PROVIDER_KEYS = [
  "name",
  "base_url",
  "wire_api",
  "requires_openai_auth",
] as const;

const rootValues = (input: CodexConfigInput) => ({
  model: `"${input.model}"`,
  model_reasoning_effort: `"${input.reasoning}"`,
  model_provider: `"${CODEX_PROVIDER}"`,
});

const providerValues = () => ({
  name: `"${CODEX_PROVIDER}"`,
  base_url: `"${CODEX_BASE_URL}"`,
  wire_api: `"responses"`,
  requires_openai_auth: "true",
});

const matchHeader = (line: string) => line.match(/^\s*\[([^\]]+)\]\s*$/);
const matchKey = (line: string) => line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);

const parseTomlRhsValue = (rhs: string) => {
  const trimmed = rhs.trim();
  if (!trimmed) return "";
  const first = trimmed[0];
  if (first === '"' || first === "'") {
    const end = trimmed.indexOf(first, 1);
    return end === -1 ? trimmed : trimmed.slice(0, end + 1);
  }
  const hashIndex = trimmed.indexOf("#");
  return (hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex)).trim();
};

const readRootValue = (lines: string[], key: string) => {
  for (const line of lines) {
    if (matchHeader(line)) break;
    const keyMatch = matchKey(line);
    if (keyMatch?.[1] === key) {
      const parts = line.split("=");
      parts.shift();
      return parseTomlRhsValue(parts.join("="));
    }
  }
  return undefined;
};

export const readCodexTomlRootValues = (
  content: string,
): CodexTomlRootValues => {
  const lines = content.length ? content.split(/\r?\n/) : [];
  return {
    model: readRootValue(lines, "model"),
    reasoning: readRootValue(lines, "model_reasoning_effort"),
    provider: readRootValue(lines, "model_provider"),
  };
};

const normalizeTomlString = (value?: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim().toLowerCase();
  }
  return trimmed.replace(/['"]/g, "").trim().toLowerCase();
};

const stripLegacyRootMarkers = (lines: string[]) => {
  const updated: string[] = [];
  let inRoot = true;

  for (const line of lines) {
    if (matchHeader(line)) {
      inRoot = false;
    }
    if (inRoot) {
      const keyMatch = matchKey(line);
      const key = keyMatch?.[1];
      if (key && LEGACY_TOML_ROOT_MARKERS.includes(key as never)) continue;
    }
    updated.push(line);
  }

  return updated;
};

export const mergeCodexToml = (content: string, input: CodexConfigInput) => {
  const lines = content.length ? content.split(/\r?\n/) : [];
  const updated = [...stripLegacyRootMarkers(lines)];
  const rootValueMap = rootValues(input);
  const providerValueMap = providerValues();

  let currentSection: string | null = null;
  let firstHeaderIndex: number | null = null;
  const rootFound = new Set<string>();

  // Update root keys that appear before any section headers.
  for (let i = 0; i < updated.length; i += 1) {
    const headerMatch = matchHeader(updated[i] ?? "");
    if (headerMatch) {
      currentSection = headerMatch[1]?.trim() ?? null;
      if (firstHeaderIndex === null) {
        firstHeaderIndex = i;
      }
      continue;
    }
    if (currentSection !== null) {
      continue;
    }
    const keyMatch = matchKey(updated[i] ?? "");
    if (!keyMatch) continue;
    const key = keyMatch[1] as keyof typeof rootValueMap;
    if (ROOT_KEYS.includes(key)) {
      updated[i] = `${key} = ${rootValueMap[key]}`;
      rootFound.add(key);
    }
  }

  // Insert missing root keys before the first section header (or at EOF).
  const insertIndex = firstHeaderIndex ?? updated.length;
  const missingRoot = ROOT_KEYS.filter((key) => !rootFound.has(key)).map(
    (key) => `${key} = ${rootValueMap[key]}`,
  );
  if (missingRoot.length > 0) {
    const needsBlank =
      insertIndex < updated.length && updated[insertIndex]?.trim() !== "";
    updated.splice(insertIndex, 0, ...missingRoot, ...(needsBlank ? [""] : []));
  }

  // Ensure the provider section exists and keep its keys in sync.
  const providerHeader = `[${PROVIDER_SECTION}]`;
  const providerHeaderIndex = updated.findIndex(
    (line) => line.trim() === providerHeader,
  );
  if (providerHeaderIndex === -1) {
    if (updated.length > 0 && updated[updated.length - 1]?.trim() !== "") {
      updated.push("");
    }
    updated.push(providerHeader);
    for (const key of PROVIDER_KEYS) {
      updated.push(`${key} = ${providerValueMap[key]}`);
    }
    return updated.join("\n");
  }

  // Find the provider section bounds for in-place updates.
  let providerEnd = updated.length;
  for (let i = providerHeaderIndex + 1; i < updated.length; i += 1) {
    if (matchHeader(updated[i] ?? "")) {
      providerEnd = i;
      break;
    }
  }

  const providerFound = new Set<string>();
  for (let i = providerHeaderIndex + 1; i < providerEnd; i += 1) {
    const keyMatch = matchKey(updated[i] ?? "");
    if (!keyMatch) continue;
    const key = keyMatch[1] as keyof typeof providerValueMap;
    if (PROVIDER_KEYS.includes(key)) {
      updated[i] = `${key} = ${providerValueMap[key]}`;
      providerFound.add(key);
    }
  }

  const missingProvider = PROVIDER_KEYS.filter(
    (key) => !providerFound.has(key),
  ).map((key) => `${key} = ${providerValueMap[key]}`);
  if (missingProvider.length > 0) {
    updated.splice(providerEnd, 0, ...missingProvider);
  }

  return updated.join("\n");
};

export const mergeAuthJson = (
  data: Record<string, unknown>,
  apiKey: string,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...data };
  for (const key of LEGACY_AUTH_MARKERS) {
    if (key in next) {
      delete next[key];
    }
  }
  next.OPENAI_API_KEY = apiKey;
  return next;
};

const stripGetrouterProviderSection = (lines: string[]) => {
  const updated: string[] = [];
  let skipSection = false;

  for (const line of lines) {
    const headerMatch = matchHeader(line);
    if (headerMatch) {
      const section = headerMatch[1]?.trim() ?? "";
      if (section === PROVIDER_SECTION) {
        skipSection = true;
        continue;
      }
      skipSection = false;
    }

    if (skipSection) continue;
    updated.push(line);
  }

  return updated;
};

const stripLegacyMarkersFromRoot = (rootLines: string[]) =>
  rootLines.filter((line) => {
    const keyMatch = matchKey(line);
    const key = keyMatch?.[1];
    return !(key && LEGACY_TOML_ROOT_MARKERS.includes(key as never));
  });

const setOrDeleteRootKey = (
  rootLines: string[],
  key: string,
  value: string | undefined,
) => {
  const idx = rootLines.findIndex((line) => matchKey(line)?.[1] === key);
  if (value === undefined) {
    if (idx !== -1) {
      rootLines.splice(idx, 1);
    }
    return;
  }
  if (idx !== -1) {
    rootLines[idx] = `${key} = ${value}`;
  } else {
    rootLines.push(`${key} = ${value}`);
  }
};

const deleteRootKey = (rootLines: string[], key: string) => {
  setOrDeleteRootKey(rootLines, key, undefined);
};

export const removeCodexConfig = (
  content: string,
  options?: { restoreRoot?: CodexTomlRootValues },
) => {
  const { restoreRoot } = options ?? {};
  const lines = content.length ? content.split(/\r?\n/) : [];
  const providerIsGetrouter =
    normalizeTomlString(readRootValue(lines, "model_provider")) ===
    CODEX_PROVIDER;

  const stripped = stripGetrouterProviderSection(lines);
  const firstHeaderIndex = stripped.findIndex((line) => matchHeader(line));
  const rootEnd = firstHeaderIndex === -1 ? stripped.length : firstHeaderIndex;
  const rootLines = stripLegacyMarkersFromRoot(stripped.slice(0, rootEnd));
  const restLines = stripped.slice(rootEnd);

  if (providerIsGetrouter) {
    if (restoreRoot) {
      setOrDeleteRootKey(rootLines, "model", restoreRoot.model);
      setOrDeleteRootKey(
        rootLines,
        "model_reasoning_effort",
        restoreRoot.reasoning,
      );
      setOrDeleteRootKey(rootLines, "model_provider", restoreRoot.provider);
    } else {
      deleteRootKey(rootLines, "model");
      deleteRootKey(rootLines, "model_reasoning_effort");
      deleteRootKey(rootLines, "model_provider");
    }
  }

  const recombined: string[] = [...rootLines];
  if (
    recombined.length > 0 &&
    restLines.length > 0 &&
    recombined[recombined.length - 1]?.trim() !== ""
  ) {
    recombined.push("");
  }
  recombined.push(...restLines);

  const nextContent = recombined.join("\n");
  return { content: nextContent, changed: nextContent !== content };
};

export const removeAuthJson = (
  data: Record<string, unknown>,
  options?: {
    force?: boolean;
    installed?: string;
    restore?: string;
  },
) => {
  const { force = false, installed, restore } = options ?? {};
  const next: Record<string, unknown> = { ...data };
  let changed = false;

  for (const key of LEGACY_AUTH_MARKERS) {
    if (key in next) {
      delete next[key];
      changed = true;
    }
  }

  const current =
    typeof next.OPENAI_API_KEY === "string"
      ? (next.OPENAI_API_KEY as string)
      : undefined;
  const restoreValue =
    typeof restore === "string" && restore.trim().length > 0
      ? restore
      : undefined;

  if (installed && current && current === installed) {
    if (restoreValue) {
      next.OPENAI_API_KEY = restoreValue;
    } else {
      delete next.OPENAI_API_KEY;
    }
    changed = true;
    return { data: next, changed };
  }

  if (force && current) {
    delete next.OPENAI_API_KEY;
    changed = true;
  }

  return { data: next, changed };
};
