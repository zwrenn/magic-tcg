import { describe, it, expect } from "vitest";
import {
  cleanCommanderName,
  edhrecSlug,
  parseEdhrecCards,
  type EdhrecData,
} from "@/lib/edhrec-parse";

describe("cleanCommanderName", () => {
  it("strips the EDHREC role suffix", () => {
    expect(cleanCommanderName("Atraxa, Praetors' Voice (Commander)")).toBe(
      "Atraxa, Praetors' Voice",
    );
    expect(cleanCommanderName("Faceless One (Background)")).toBe("Faceless One");
  });
  it("leaves a normal name untouched", () => {
    expect(cleanCommanderName("Krenko, Mob Boss")).toBe("Krenko, Mob Boss");
  });
});

describe("edhrecSlug", () => {
  it("hyphenates and drops punctuation", () => {
    expect(edhrecSlug("Atraxa, Praetors' Voice")).toBe("atraxa-praetors-voice");
  });
  it("handles 'the' and commas", () => {
    expect(edhrecSlug("Kenrith, the Returned King")).toBe(
      "kenrith-the-returned-king",
    );
  });
  it("strips diacritics", () => {
    expect(edhrecSlug("Jodah, the Unifier")).toBe("jodah-the-unifier");
    expect(edhrecSlug("Márton Stromgald")).toBe("marton-stromgald");
  });
  it("uses the front face for DFC commanders", () => {
    expect(edhrecSlug("Esika, God of the Tree // The Prismatic Bridge")).toBe(
      "esika-god-of-the-tree",
    );
  });
});

const fixture: EdhrecData = {
  header: "Atraxa, Praetors' Voice",
  container: {
    json_dict: {
      cardlists: [
        {
          header: "Top Cards",
          cardviews: [
            { name: "Sol Ring", num_decks: 30000 },
            { name: "Arcane Signet", num_decks: 25000 },
          ],
        },
        {
          header: "Creatures",
          cardviews: [
            { name: "Sol Ring", num_decks: 30000 }, // dup across lists
            { name: "Birds of Paradise", num_decks: 9000 },
            { name: "Atraxa, Praetors' Voice", num_decks: 99999 }, // the commander itself
          ],
        },
      ],
    },
  },
};

describe("parseEdhrecCards", () => {
  const cards = parseEdhrecCards(fixture, "Atraxa, Praetors' Voice");

  it("puts the commander first and flags it", () => {
    expect(cards[0]).toMatchObject({
      normalizedName: "atraxa, praetors' voice",
      isCommander: true,
    });
  });

  it("excludes the commander from the recommended list", () => {
    const nonCmdr = cards.filter((c) => !c.isCommander);
    expect(nonCmdr.some((c) => c.normalizedName === "atraxa, praetors' voice")).toBe(
      false,
    );
  });

  it("dedupes cards appearing in multiple categories", () => {
    const solRings = cards.filter((c) => c.normalizedName === "sol ring");
    expect(solRings).toHaveLength(1);
  });

  it("ranks recommendations by deck count", () => {
    const rec = cards.filter((c) => !c.isCommander).map((c) => c.name);
    expect(rec).toEqual(["Sol Ring", "Arcane Signet", "Birds of Paradise"]);
  });

  it("respects the limit", () => {
    const limited = parseEdhrecCards(fixture, "Atraxa, Praetors' Voice", 1);
    expect(limited.filter((c) => !c.isCommander)).toHaveLength(1);
  });

  it("cleans a '(Commander)'-suffixed header and still excludes the card", () => {
    // header has the suffix; the commander ALSO appears bare in a category list
    const cards2 = parseEdhrecCards(fixture, "Atraxa, Praetors' Voice (Commander)");
    expect(cards2[0].name).toBe("Atraxa, Praetors' Voice");
    expect(cards2[0].normalizedName).toBe("atraxa, praetors' voice");
    expect(
      cards2.slice(1).some((c) => c.normalizedName === "atraxa, praetors' voice"),
    ).toBe(false);
  });
});
