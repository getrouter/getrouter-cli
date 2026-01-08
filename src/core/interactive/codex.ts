import { listProviderModels } from "../api/providerModels";
import type { FuzzyChoice } from "./fuzzy";

export type ReasoningChoice = {
  id: string;
  label: string;
  value: string;
  description: string;
};

export const MODEL_CHOICES: FuzzyChoice<string>[] = [
  {
    title: "gpt-5.2-codex",
    value: "gpt-5.2-codex",
    description: "Latest frontier agentic coding model.",
    keywords: ["gpt-5.2-codex", "codex"],
  },
  {
    title: "gpt-5.1-codex-max",
    value: "gpt-5.1-codex-max",
    description: "Codex-optimized flagship for deep and fast reasoning.",
    keywords: ["gpt-5.1-codex-max", "codex"],
  },
  {
    title: "gpt-5.1-codex-mini",
    value: "gpt-5.1-codex-mini",
    description: "Optimized for codex. Cheaper, faster, but less capable.",
    keywords: ["gpt-5.1-codex-mini", "codex"],
  },
  {
    title: "gpt-5.2",
    value: "gpt-5.2",
    description:
      "Latest frontier model with improvements across knowledge, reasoning and coding.",
    keywords: ["gpt-5.2"],
  },
];

export const getCodexModelChoices = async (): Promise<
  FuzzyChoice<string>[]
> => {
  try {
    const remoteModels = await listProviderModels({ tag: "codex" });
    const remoteChoices = remoteModels.map((model) => ({
      title: model,
      value: model,
      keywords: [model, "codex"],
    }));

    if (remoteChoices.length > 0) {
      return remoteChoices.reverse();
    }
  } catch {}

  return MODEL_CHOICES;
};

export const REASONING_CHOICES: ReasoningChoice[] = [
  {
    id: "extra_high",
    label: "Extra high",
    value: "xhigh",
    description:
      "Extra high reasoning depth for complex problems. Warning: Extra high reasoning effort can quickly consume Plus plan rate limits.",
  },
  {
    id: "high",
    label: "High",
    value: "high",
    description: "Greater reasoning depth for complex problems",
  },
  {
    id: "medium",
    label: "Medium (default)",
    value: "medium",
    description: "Balances speed and reasoning depth for everyday tasks",
  },
  {
    id: "low",
    label: "Low",
    value: "low",
    description: "Fast responses with lighter reasoning",
  },
];

export const REASONING_FUZZY_CHOICES: FuzzyChoice<string>[] =
  REASONING_CHOICES.map((choice) => ({
    title: choice.label,
    value: choice.id,
    description: choice.description,
    keywords: [choice.id, choice.value],
  }));

export const mapReasoningValue = (id: string) =>
  REASONING_CHOICES.find((choice) => choice.id === id)?.value ?? "medium";
