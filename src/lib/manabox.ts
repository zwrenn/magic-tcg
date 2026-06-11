import Papa from "papaparse";

/**
 * ManaBox CSV parsing. Map columns by NAME, not position — ManaBox has
 * reordered/renamed columns between app versions, so positional parsing
 * silently corrupts data on the next export. We tolerate missing optional
 * columns and surface anything we couldn't map as a warning.
 */

export type ManaboxEntry = {
  scryfallId: string;
  name: string;
  setCode: string | null;
  collectorNumber: string | null;
  foil: boolean;
  quantity: number;
  condition: string | null;
};

export type ManaboxParseResult = {
  /** Merged: one entry per (scryfallId, foil), quantities summed. */
  entries: ManaboxEntry[];
  rawRowCount: number;
  totalQuantity: number;
  warnings: string[];
};

// Candidate header spellings -> our field. Lowercased, trimmed comparison.
const COLUMN_ALIASES: Record<keyof Omit<ManaboxEntry, never>, string[]> = {
  scryfallId: ["scryfall id", "scryfallid"],
  name: ["name", "card name"],
  setCode: ["set code", "set", "setcode"],
  collectorNumber: ["collector number", "collector no", "collectornumber", "number"],
  foil: ["foil", "finish"],
  quantity: ["quantity", "qty", "count"],
  condition: ["condition"],
};

function buildHeaderMap(fields: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of fields) map.set(f.trim().toLowerCase(), f);
  return map;
}

function resolveField(
  headerMap: Map<string, string>,
  aliases: string[],
): string | null {
  for (const a of aliases) {
    const actual = headerMap.get(a);
    if (actual) return actual;
  }
  return null;
}

function isFoil(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  // ManaBox uses "normal" | "foil" | "etched". Anything non-normal counts as foil.
  return v !== "" && v !== "normal" && v !== "nonfoil" && v !== "false" && v !== "no";
}

export function parseManaboxCsv(text: string): ManaboxParseResult {
  const warnings: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const fields = parsed.meta.fields ?? [];
  if (fields.length === 0) {
    return {
      entries: [],
      rawRowCount: 0,
      totalQuantity: 0,
      warnings: ["No header row found — is this a ManaBox CSV export?"],
    };
  }

  const headerMap = buildHeaderMap(fields);
  const col = {
    scryfallId: resolveField(headerMap, COLUMN_ALIASES.scryfallId),
    name: resolveField(headerMap, COLUMN_ALIASES.name),
    setCode: resolveField(headerMap, COLUMN_ALIASES.setCode),
    collectorNumber: resolveField(headerMap, COLUMN_ALIASES.collectorNumber),
    foil: resolveField(headerMap, COLUMN_ALIASES.foil),
    quantity: resolveField(headerMap, COLUMN_ALIASES.quantity),
    condition: resolveField(headerMap, COLUMN_ALIASES.condition),
  };

  if (!col.scryfallId) {
    return {
      entries: [],
      rawRowCount: 0,
      totalQuantity: 0,
      warnings: [
        `Couldn't find a "Scryfall ID" column. Found: ${fields.join(", ")}`,
      ],
    };
  }
  if (!col.name) warnings.push('No "Name" column found — names will fill in from Scryfall.');
  if (!col.quantity) warnings.push('No "Quantity" column — assuming 1 per row.');

  // Merge duplicate rows by (scryfallId, foil), summing quantity.
  const merged = new Map<string, ManaboxEntry>();
  let rawRowCount = 0;
  let totalQuantity = 0;
  let skippedNoId = 0;

  for (const row of parsed.data) {
    const scryfallId = (row[col.scryfallId] ?? "").trim();
    if (!scryfallId) {
      skippedNoId++;
      continue;
    }
    rawRowCount++;

    const foil = col.foil ? isFoil(row[col.foil]) : false;
    const qtyRaw = col.quantity ? parseInt((row[col.quantity] ?? "").trim(), 10) : 1;
    const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    totalQuantity += quantity;

    const key = `${scryfallId}::${foil}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      merged.set(key, {
        scryfallId,
        name: col.name ? (row[col.name] ?? "").trim() : "",
        setCode: col.setCode ? (row[col.setCode] ?? "").trim() || null : null,
        collectorNumber: col.collectorNumber
          ? (row[col.collectorNumber] ?? "").trim() || null
          : null,
        foil,
        quantity,
        condition: col.condition ? (row[col.condition] ?? "").trim() || null : null,
      });
    }
  }

  if (skippedNoId > 0) {
    warnings.push(`Skipped ${skippedNoId} row(s) with no Scryfall ID.`);
  }
  if (parsed.errors.length > 0) {
    warnings.push(`${parsed.errors.length} CSV parse warning(s) (ignored).`);
  }

  return {
    entries: [...merged.values()],
    rawRowCount,
    totalQuantity,
    warnings,
  };
}
