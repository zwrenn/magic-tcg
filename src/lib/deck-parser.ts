import { normalizeName } from "./normalize";

export type ParsedCard = {
  /** Display name as written, with set/collector/foil cruft stripped. */
  name: string;
  /** Match key — see normalizeName. */
  normalizedName: string;
  quantity: number;
  isCommander: boolean;
  isProxy?: boolean;
};

export type ParseResult = {
  cards: ParsedCard[];
  /** Lines we couldn't make sense of, surfaced to the user so nothing is silently dropped. */
  ignored: string[];
};

type Section = "normal" | "commander" | "skip";

// Header lines that switch which section following cards belong to.
const SECTION_KEYWORDS: Record<string, Section> = {
  commander: "commander",
  commanders: "commander",
  deck: "normal",
  mainboard: "normal",
  main: "normal",
  sideboard: "normal",
  companion: "normal",
  maybeboard: "skip",
  maybe: "skip",
  considering: "skip",
  tokens: "skip",
  token: "skip",
};

/**
 * Strip the "(SET) 123 *F* #tag" trailing metadata Moxfield/Arena/Archidekt
 * append after a card name. Runs to a fixed point so order doesn't matter.
 */
function stripCardMeta(rest: string): string {
  let name = rest.trim();
  let prev: string;
  do {
    prev = name;
    name = name
      .replace(/\s*\*[^*]*\*\s*$/, "") // *F*, *E* foil/etched markers
      .replace(/\s*#\S+\s*$/, "") // #category tags
      .replace(/\s*\([^)]*\)(\s+[\w-]+)?\s*$/, "") // (SET) optional-collector
      .trim();
  } while (name !== prev);
  return name;
}

/** Returns the section a header line switches to, or null if it isn't a header. */
function sectionHeader(line: string): Section | null {
  // e.g. "Commander", "Commander:", "Commander (1)"
  const cleaned = line
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/:/g, "")
    .trim()
    .toLowerCase();
  if (cleaned in SECTION_KEYWORDS) return SECTION_KEYWORDS[cleaned];
  return null;
}

export function parseDecklist(input: string): ParseResult {
  const byKey = new Map<string, ParsedCard>();
  const ignored: string[] = [];
  let section: Section = "normal";

  for (const rawLine of input.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    // Drop common comment / divider lines.
    if (line.startsWith("//") || /^[-=*]{2,}$/.test(line)) continue;

    // Arena "SB:" sideboard prefix — keep the card, just drop the marker.
    line = line.replace(/^sb:\s*/i, "");

    // Quantity: "1 Card", "1x Card", or "1xCard" (no space after x).
    let quantity = 1;
    let rest = line;
    const spaced = line.match(/^(\d+)\s+(.+)$/);
    const xform = line.match(/^(\d+)x\s*(.+)$/i);
    if (spaced) {
      quantity = parseInt(spaced[1], 10);
      rest = spaced[2];
    } else if (xform) {
      quantity = parseInt(xform[1], 10);
      rest = xform[2];
    } else {
      // No leading quantity. Could be a section header, a "Creatures (33)"
      // category header, or a bare card name in a no-quantity paste.
      const header = sectionHeader(line);
      if (header) {
        section = header;
        continue;
      }
      // Category header like "Creatures (33)" / "Lands (38)" — type group, skip.
      if (/\(\s*\d+\s*\)\s*$/.test(line)) continue;
      // Otherwise treat the whole line as a single-copy card.
    }

    if (section === "skip") continue;

    const name = stripCardMeta(rest);
    if (!name) {
      ignored.push(rawLine.trim());
      continue;
    }
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      ignored.push(rawLine.trim());
      continue;
    }

    const existing = byKey.get(normalizedName);
    if (existing) {
      existing.quantity += quantity;
      existing.isCommander = existing.isCommander || section === "commander";
    } else {
      byKey.set(normalizedName, {
        name,
        normalizedName,
        quantity,
        isCommander: section === "commander",
      });
    }
  }

  return { cards: [...byKey.values()], ignored };
}
