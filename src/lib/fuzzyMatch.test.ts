import { describe, it, expect } from "vitest";
import { levenshtein, similarity, rankMatches } from "./fuzzyMatch";

describe("levenshtein", () => {
  it("is 0 for identical strings and length for empty", () => {
    expect(levenshtein("burger", "burger")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("counts single edits", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("cheeseburger", "cheesburger")).toBe(1); // one deletion
  });
});

describe("similarity", () => {
  it("is case- and whitespace-insensitive", () => {
    expect(similarity("Cheeseburger", "  cheeseburger ")).toBe(1);
  });

  it("ranks near-misses high and unrelated low", () => {
    expect(similarity("Cheeseburger", "Cheesburger")).toBeGreaterThan(0.85);
    expect(similarity("Cheeseburger", "House Salad")).toBeLessThan(0.4);
  });
});

describe("rankMatches", () => {
  it("returns the closest recipe name first", () => {
    const recipes = [
      { id: "1", name: "Classic Cheeseburger" },
      { id: "2", name: "Caesar Salad" },
      { id: "3", name: "Cheeseburger Deluxe" },
    ];
    const ranked = rankMatches("Cheesburger", recipes, (r) => r.name, 3);
    expect(ranked[0].item.name).toMatch(/Cheeseburger/);
    expect(ranked[0].score).toBeGreaterThan(ranked[2].score);
  });

  it("orders ties deterministically by name", () => {
    const items = [{ name: "Beta" }, { name: "Alpha" }];
    const ranked = rankMatches("zzzzz", items, (i) => i.name, 2);
    // equal (low) scores -> alphabetical
    expect(ranked[0].item.name).toBe("Alpha");
  });
});
