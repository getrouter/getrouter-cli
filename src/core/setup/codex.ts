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

function splitLines(content: string): string[] {
  if (content.length === 0) return [];
  return content.split(/\r?\n/);
}

function isLegacyTomlRootMarker(key: string): boolean {
  return (LEGACY_TOML_ROOT_MARKERS as readonly string[]).includes(key);
}

function rootValues(
  input: CodexConfigInput,
): Record<(typeof ROOT_KEYS)[number], string> {
  return {
    model: `"${input.model}"`,
    model_reasoning_effort: `"${input.reasoning}"`,
    model_provider: `"${CODEX_PROVIDER}"`,
  };
}

function providerValues(): Record<(typeof PROVIDER_KEYS)[number], string> {
  return {
    name: `"${CODEX_PROVIDER}"`,
    base_url: `"${CODEX_BASE_URL}"`,
    wire_api: `"responses"`,
    requires_openai_auth: "true",
  };
}

const HEADER_RE = /^\s*\[([^\]]+)\]\s*$/;
const KEY_RE = /^\s*([A-Za-z0-9_.-]+)\s*=/;

function matchHeader(line: string): RegExpMatchArray | null {
  return line.match(HEADER_RE);
}

function matchKey(line: string): RegExpMatchArray | null {
  return line.match(KEY_RE);
}

function readKeyFromLine(line: string): string | undefined {
  const match = matchKey(line);
  return match?.[1];
}

function readStringValue(
  data: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

function findSectionEnd(lines: string[], startIndex: number): number {
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== undefined && matchHeader(line)) {
      return i;
    }
  }
  return lines.length;
}

function upsertKeyLines<K extends string>(
  lines: string[],
  startIndex: number,
  endIndex: number,
  keys: readonly K[],
  valueMap: Record<K, string>,
): Set<K> {
  const found = new Set<K>();

  for (let i = startIndex; i < endIndex; i += 1) {
    const line = lines[i];
    if (line === undefined) continue;

    const keyMatch = matchKey(line);
    if (!keyMatch) continue;

    const key = keyMatch[1] as K;
    if (!keys.includes(key)) continue;

    lines[i] = `${key} = ${valueMap[key]}`;
    found.add(key);
  }

  return found;
}

function missingKeyLines<K extends string>(
  keys: readonly K[],
  found: ReadonlySet<K>,
  valueMap: Record<K, string>,
): string[] {
  return keys
    .filter((key) => !found.has(key))
    .map((key) => `${key} = ${valueMap[key]}`);
}

function parseTomlRhsValue(rhs: string): string {
  const trimmed = rhs.trim();
  if (!trimmed) return "";
  const first = trimmed[0];
  if (first === '"' || first === "'") {
    const end = trimmed.indexOf(first, 1);
    return end === -1 ? trimmed : trimmed.slice(0, end + 1);
  }
  const hashIndex = trimmed.indexOf("#");
  return (hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex)).trim();
}

function readRootValue(lines: string[], key: string): string | undefined {
  for (const line of lines) {
    if (matchHeader(line)) break;

    const lineKey = readKeyFromLine(line);
    if (lineKey === key) {
      const rhs = line.slice(line.indexOf("=") + 1);
      return parseTomlRhsValue(rhs);
    }
  }
  return undefined;
}

export function readCodexTomlRootValues(content: string): CodexTomlRootValues {
  const lines = splitLines(content);
  return {
    model: readRootValue(lines, "model"),
    reasoning: readRootValue(lines, "model_reasoning_effort"),
    provider: readRootValue(lines, "model_provider"),
  };
}

function normalizeTomlString(value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim().toLowerCase();
  }
  return trimmed.replace(/['"]/g, "").trim().toLowerCase();
}

function stripLegacyRootMarkers(lines: string[]): string[] {
  const updated: string[] = [];
  let inRoot = true;

  for (const line of lines) {
    if (matchHeader(line)) {
      inRoot = false;
    }
    if (inRoot) {
      const key = readKeyFromLine(line);
      if (key !== undefined && isLegacyTomlRootMarker(key)) continue;
    }
    updated.push(line);
  }

  return updated;
}

export function mergeCodexToml(
  content: string,
  input: CodexConfigInput,
): string {
  const lines = splitLines(content);
  const updated = stripLegacyRootMarkers(lines);
  const rootValueMap = rootValues(input);
  const providerValueMap = providerValues();

  const firstHeaderIndex = updated.findIndex(
    (line) => matchHeader(line) !== null,
  );
  const rootEnd = firstHeaderIndex === -1 ? updated.length : firstHeaderIndex;

  const rootFound = upsertKeyLines(
    updated,
    0,
    rootEnd,
    ROOT_KEYS,
    rootValueMap,
  );

  const missingRoot = missingKeyLines(ROOT_KEYS, rootFound, rootValueMap);
  if (missingRoot.length > 0) {
    const insertIndex = rootEnd;
    const needsBlank =
      insertIndex < updated.length && updated[insertIndex]?.trim() !== "";

    updated.splice(insertIndex, 0, ...missingRoot, ...(needsBlank ? [""] : []));
  }

  const providerHeader = `[${PROVIDER_SECTION}]`;
  const providerHeaderIndex = updated.findIndex(
    (line) => line.trim() === providerHeader,
  );
  if (providerHeaderIndex === -1) {
    if (updated.length > 0 && updated[updated.length - 1]?.trim() !== "") {
      updated.push("");
    }
    updated.push(
      providerHeader,
      ...PROVIDER_KEYS.map((key) => `${key} = ${providerValueMap[key]}`),
    );
    return updated.join("\n");
  }

  const providerStart = providerHeaderIndex + 1;
  const providerEnd = findSectionEnd(updated, providerStart);

  const providerFound = upsertKeyLines(
    updated,
    providerStart,
    providerEnd,
    PROVIDER_KEYS,
    providerValueMap,
  );

  const missingProvider = missingKeyLines(
    PROVIDER_KEYS,
    providerFound,
    providerValueMap,
  );
  if (missingProvider.length > 0) {
    updated.splice(providerEnd, 0, ...missingProvider);
  }

  return updated.join("\n");
}

export function mergeAuthJson(
  data: Record<string, unknown>,
  apiKey: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...data };
  for (const key of LEGACY_AUTH_MARKERS) {
    if (key in next) {
      delete next[key];
    }
  }
  next.OPENAI_API_KEY = apiKey;
  return next;
}

function stripGetrouterProviderSection(lines: string[]): string[] {
  const updated: string[] = [];
  let skipSection = false;

  for (const line of lines) {
    const headerMatch = matchHeader(line);
    if (headerMatch) {
      const section = headerMatch[1]?.trim();
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
}

function stripLegacyMarkersFromRoot(rootLines: string[]): string[] {
  return rootLines.filter((line) => {
    const key = readKeyFromLine(line);
    return !(key !== undefined && isLegacyTomlRootMarker(key));
  });
}

function setOrDeleteRootKey(
  rootLines: string[],
  key: string,
  value: string | undefined,
): void {
  const idx = rootLines.findIndex((line) => readKeyFromLine(line) === key);
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
}

function deleteRootKey(rootLines: string[], key: string): void {
  setOrDeleteRootKey(rootLines, key, undefined);
}

function hasLegacyRootMarkers(lines: string[]): boolean {
  return lines.some((line) => {
    const key = readKeyFromLine(line);
    return key !== undefined && isLegacyTomlRootMarker(key);
  });
}

export function removeCodexConfig(
  content: string,
  options?: {
    restoreRoot?: CodexTomlRootValues;
    allowRootRemoval?: boolean;
  },
): { content: string; changed: boolean } {
  const { restoreRoot, allowRootRemoval = true } = options ?? {};
  const lines = splitLines(content);
  const providerIsGetrouter =
    normalizeTomlString(readRootValue(lines, "model_provider")) ===
    CODEX_PROVIDER;
  const canRemoveRoot = allowRootRemoval || hasLegacyRootMarkers(lines);

  const stripped = stripGetrouterProviderSection(lines);
  const firstHeaderIndex = stripped.findIndex((line) => matchHeader(line));
  const rootEnd = firstHeaderIndex === -1 ? stripped.length : firstHeaderIndex;
  const rootLines = stripLegacyMarkersFromRoot(stripped.slice(0, rootEnd));
  const restLines = stripped.slice(rootEnd);

  if (providerIsGetrouter && canRemoveRoot) {
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
}

export function removeAuthJson(
  data: Record<string, unknown>,
  options?: {
    installed?: string;
    restore?: string;
  },
): { data: Record<string, unknown>; changed: boolean } {
  const { installed, restore } = options ?? {};
  const next: Record<string, unknown> = { ...data };
  let changed = false;

  const legacyInstalled = readStringValue(
    next,
    "_getrouter_codex_installed_openai_api_key",
  );
  const legacyRestore = readStringValue(
    next,
    "_getrouter_codex_backup_openai_api_key",
  );

  const effectiveInstalled = installed ?? legacyInstalled;
  const effectiveRestore = restore ?? legacyRestore;

  for (const key of LEGACY_AUTH_MARKERS) {
    if (key in next) {
      delete next[key];
      changed = true;
    }
  }

  const current = readStringValue(next, "OPENAI_API_KEY");
  const restoreValue = effectiveRestore?.trim() ? effectiveRestore : undefined;

  if (effectiveInstalled && current && current === effectiveInstalled) {
    if (restoreValue) {
      next.OPENAI_API_KEY = restoreValue;
    } else {
      delete next.OPENAI_API_KEY;
    }
    changed = true;
    return { data: next, changed };
  }

  return { data: next, changed };
}
