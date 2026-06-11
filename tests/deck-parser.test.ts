import { describe, it, expect } from "vitest";
import { parseDecklist } from "@/lib/deck-parser";

function find(input: string, normalized: string) {
  return parseDecklist(input).cards.find((c) => c.normalizedName === normalized);
}

describe("parseDecklist — quantity formats", () => {
  it("parses '1 Rhystic Study'", () => {
    const c = find("1 Rhystic Study", "rhystic study");
    expect(c).toMatchObject({ name: "Rhystic Study", quantity: 1 });
  });

  it("parses '1x Rhystic Study'", () => {
    expect(find("1x Rhystic Study", "rhystic study")?.quantity).toBe(1);
  });

  it("parses '4x Lightning Bolt'", () => {
    expect(find("4x Lightning Bolt", "lightning bolt")?.quantity).toBe(4);
  });

  it("parses double-digit quantities", () => {
    expect(find("10 Forest", "forest")?.quantity).toBe(10);
  });

  it("defaults to quantity 1 for a bare card name", () => {
    expect(find("Sol Ring", "sol ring")?.quantity).toBe(1);
  });

  it("does NOT eat the leading X of a card name like Xenagos", () => {
    const c = find("1 Xenagos, God of Revels", "xenagos, god of revels");
    expect(c?.name).toBe("Xenagos, God of Revels");
    expect(c?.quantity).toBe(1);
  });
});

describe("parseDecklist — set / collector / foil stripping", () => {
  it("strips '(SET) collector'", () => {
    const c = find("1 Rhystic Study (PCY) 23", "rhystic study");
    expect(c?.name).toBe("Rhystic Study");
  });

  it("strips set with no collector", () => {
    expect(find("1 Fire (M10)", "fire")?.name).toBe("Fire");
  });

  it("strips foil markers and tags", () => {
    const c = find("1 Sol Ring (C21) 263 *F* #ramp", "sol ring");
    expect(c?.name).toBe("Sol Ring");
  });

  it("handles Arena 'SB:' prefix", () => {
    expect(find("SB: 2 Negate (M19) 69", "negate")?.quantity).toBe(2);
  });
});

describe("parseDecklist — sections", () => {
  const list = `Commander
1 Atraxa, Praetors' Voice (CMR) 0

Deck
1 Sol Ring
1 Arcane Signet

Maybeboard
1 Cyclonic Rift`;

  it("flags commander-section cards", () => {
    expect(find(list, "atraxa, praetors' voice")?.isCommander).toBe(true);
  });

  it("does not flag non-commander cards", () => {
    expect(find(list, "sol ring")?.isCommander).toBe(false);
  });

  it("ignores the Maybeboard section", () => {
    expect(find(list, "cyclonic rift")).toBeUndefined();
  });

  it("handles 'Commander:' and 'Commander (1)' header styles", () => {
    expect(
      find("Commander:\n1 Kenrith, the Returned King", "kenrith, the returned king")
        ?.isCommander,
    ).toBe(true);
    expect(
      find("Commander (1)\n1 Kenrith, the Returned King", "kenrith, the returned king")
        ?.isCommander,
    ).toBe(true);
  });
});

describe("parseDecklist — category headers & noise", () => {
  it("skips 'Creatures (33)' style type-group headers", () => {
    const r = parseDecklist("Creatures (33)\n1 Llanowar Elves");
    expect(r.cards.find((c) => c.normalizedName === "creatures")).toBeUndefined();
    expect(r.cards.find((c) => c.normalizedName === "llanowar elves")).toBeDefined();
  });

  it("skips comment and divider lines", () => {
    const r = parseDecklist("// my deck\n----\n1 Sol Ring");
    expect(r.cards).toHaveLength(1);
  });

  it("merges duplicate lines by summing quantity", () => {
    const c = find("1 Forest\n9 Forest", "forest");
    expect(c?.quantity).toBe(10);
  });
});
