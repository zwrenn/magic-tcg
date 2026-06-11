import { describe, it, expect } from "vitest";
import { normalizeName } from "@/lib/normalize";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Sol Ring  ")).toBe("sol ring");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeName("Rhystic    Study")).toBe("rhystic study");
  });

  it("strips diacritics", () => {
    expect(normalizeName("Lim-Dûl's Vault")).toBe("lim-dul's vault");
    expect(normalizeName("Juzám Djinn")).toBe("juzam djinn");
    expect(normalizeName("Márton Stromgald")).toBe("marton stromgald");
  });

  it("expands Æ / Œ ligatures", () => {
    expect(normalizeName("Æther Vial")).toBe("aether vial");
    expect(normalizeName("Æthersnipe")).toBe("aethersnipe");
  });

  it("uses front face only for split / DFC names", () => {
    expect(normalizeName("Fire // Ice")).toBe("fire");
    expect(normalizeName("Wear // Tear")).toBe("wear");
    expect(normalizeName("Brutal Cathar // Moonrage Brute")).toBe(
      "brutal cathar",
    );
  });

  it("is idempotent", () => {
    const once = normalizeName("Æther Vial // Whatever");
    expect(normalizeName(once)).toBe(once);
  });

  it("returns empty string for falsy input", () => {
    expect(normalizeName("")).toBe("");
  });

  it("matches a collection printing to a deck listing of the same card", () => {
    // collection import name vs. deck paste name with set info already stripped
    const collection = normalizeName("Smothering Tithe");
    const deck = normalizeName("smothering tithe");
    expect(collection).toBe(deck);
  });
});
