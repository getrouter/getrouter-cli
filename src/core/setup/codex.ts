type CodexConfigInput = {
  model: string;
  reasoning: string;
};

const CODEX_PROVIDER = "getrouter";
const CODEX_BASE_URL = "https://api.getrouter.dev/codex";

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
const matchProviderValue = (line: string) =>
  line.match(/^\s*model_provider\s*=\s*(['"]?)([^'"]+)\1\s*(?:#.*)?$/);

export const mergeCodexToml = (content: string, input: CodexConfigInput) => {
  const lines = content.length ? content.split(/\r?\n/) : [];
  const updated = [...lines];
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
): Record<string, unknown> => ({
  ...data,
  OPENAI_API_KEY: apiKey,
});

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

const stripRootKeys = (lines: string[]) => {
  const updated: string[] = [];
  let currentSection: string | null = null;

  for (const line of lines) {
    const headerMatch = matchHeader(line);
    if (headerMatch) {
      currentSection = headerMatch[1]?.trim() ?? null;
      updated.push(line);
      continue;
    }

    if (currentSection === null) {
      if (/^\s*model\s*=/.test(line)) continue;
      if (/^\s*model_reasoning_effort\s*=/.test(line)) continue;
      if (/^\s*model_provider\s*=/.test(line)) continue;
    }

    updated.push(line);
  }

  return updated;
};

export const removeCodexConfig = (content: string) => {
  const lines = content.length ? content.split(/\r?\n/) : [];
  let providerIsGetrouter = false;
  let currentSection: string | null = null;

  for (const line of lines) {
    const headerMatch = matchHeader(line);
    if (headerMatch) {
      currentSection = headerMatch[1]?.trim() ?? null;
      continue;
    }

    if (currentSection !== null) continue;

    const providerMatch = matchProviderValue(line);
    const providerValue = providerMatch?.[2]?.trim();
    if (providerValue?.toLowerCase() === CODEX_PROVIDER) {
      providerIsGetrouter = true;
    }
  }

  let updated = stripGetrouterProviderSection(lines);
  if (providerIsGetrouter) {
    updated = stripRootKeys(updated);
  }

  const nextContent = updated.join("\n");
  return { content: nextContent, changed: nextContent !== content };
};

export const removeAuthJson = (data: Record<string, unknown>) => {
  if (!("OPENAI_API_KEY" in data)) return { data, changed: false };
  const { OPENAI_API_KEY: _ignored, ...rest } = data;
  return { data: rest, changed: true };
};
