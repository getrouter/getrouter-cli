import prompts from "prompts";

export type FuzzyChoice<T> = {
  title: string;
  value: T;
  keywords?: string[];
  description?: string;
};

const normalize = (value: string) => value.toLowerCase();

const fuzzyScore = (query: string, target: string): number | null => {
  if (!query) return 0;
  let score = 0;
  let lastIndex = -1;
  for (const ch of query) {
    const index = target.indexOf(ch, lastIndex + 1);
    if (index === -1) return null;
    score += index;
    lastIndex = index;
  }
  return score;
};

const toSearchText = <T>(choice: FuzzyChoice<T>) =>
  normalize([choice.title, ...(choice.keywords ?? [])].join(" ").trim());

export const rankFuzzyChoices = <T>(
  choices: FuzzyChoice<T>[],
  input: string,
  limit = 50,
) => {
  const query = normalize(input.trim());
  if (!query) return choices.slice(0, limit);
  const ranked = choices
    .map((choice) => {
      const score = fuzzyScore(query, toSearchText(choice));
      return score == null ? null : { choice, score };
    })
    .filter(Boolean) as { choice: FuzzyChoice<T>; score: number }[];
  ranked.sort(
    (a, b) => a.score - b.score || a.choice.title.localeCompare(b.choice.title),
  );
  return ranked.slice(0, limit).map((entry) => entry.choice);
};

export const fuzzySelect = async <T>({
  message,
  choices,
}: {
  message: string;
  choices: FuzzyChoice<T>[];
}): Promise<T | null> => {
  const response = await prompts({
    type: "autocomplete",
    name: "value",
    message,
    choices,
    suggest: async (input, items) =>
      rankFuzzyChoices(items as FuzzyChoice<T>[], String(input)),
  });
  if (response.value == null || response.value === "") return null;
  return response.value as T;
};
