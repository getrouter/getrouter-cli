import { describe, expect, it } from "vitest";
import { rankFuzzyChoices } from "../../../src/core/interactive/fuzzy";

const choices = [
  { title: "gpt-5", value: "gpt-5", keywords: ["openai"] },
  { title: "claude-3", value: "claude-3", keywords: ["anthropic"] },
  { title: "gpt-4o", value: "gpt-4o", keywords: ["openai"] },
];

describe("rankFuzzyChoices", () => {
  it("ranks by fuzzy match and uses keywords", () => {
    const ranked = rankFuzzyChoices(choices, "open");
    expect(ranked[0]?.value).toBe("gpt-5");
    expect(ranked[1]?.value).toBe("gpt-4o");
  });

  it("returns all when query is empty", () => {
    const ranked = rankFuzzyChoices(choices, "");
    expect(ranked.map((choice) => choice.value)).toEqual([
      "gpt-5",
      "claude-3",
      "gpt-4o",
    ]);
  });

  it("limits results", () => {
    const ranked = rankFuzzyChoices(choices, "g", 2);
    expect(ranked.length).toBe(2);
  });
});
