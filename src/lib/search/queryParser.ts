// Parses and serializes Scryfall-style query strings into structured filter values.
//
// Syntax overview:
//   bare words        → name (joined as a phrase)
//   t: / type:        → type line (word-by-word match)
//   id: / c: / ci:    → color identity; operator controls mode:
//                          id:wu  → including (has at least W and U)
//                          id=wu  → exact (exactly W and U)
//                          id<=wu → atmost (subset of W/U)
//                          id:c   → colorless only
//   r: / rarity:      → rarity; c/u/r/m abbreviations accepted
//   mv: / cmc:        → mana value; supports <=, >=, : (eq)
//   owner:            → ownership filter (search page only)
//   sort:             → sort order (search page only)
//
// Example: urza t:legendary id<=uw r:rare mv<=4

export interface AdvancedSearchValues {
  name: string;
  typeLine: string;
  colors: string[];
  colorMode: 'including' | 'exact' | 'atmost';
  colorless: boolean;
  rarity: string;
  cmc: string;
  cmcOp: 'eq' | 'lte' | 'gte';
  // Optional — only present when those fields are relevant (search page)
  sort?: string;
  owner?: string;
}

export const EMPTY_SEARCH_VALUES: AdvancedSearchValues = {
  name: '',
  typeLine: '',
  colors: [],
  colorMode: 'including',
  colorless: false,
  rarity: '',
  cmc: '',
  cmcOp: 'eq',
};

const WUBRG = new Set(['W', 'U', 'B', 'R', 'G']);

// Single-letter shorthands for rarity (mirrors Scryfall convention)
const RARITY_MAP: Record<string, string> = {
  c: 'common',
  u: 'uncommon',
  r: 'rare',
  m: 'mythic',
};

// Split on whitespace but keep quoted strings as single tokens.
// e.g. `urza t:"legendary creature"` → ['urza', 't:"legendary creature"']
function tokenize(query: string): string[] {
  const tokens: string[] = [];
  const re = /"(?:[^"\\]|\\.)*"|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query)) !== null) tokens.push(m[0]);
  return tokens;
}

// Matches `key op value` tokens, e.g. `mv<=3`, `t:legendary`, `id=wu`
const KEY_OP_VAL = /^([a-zA-Z]+)([:<>=!]+)(.+)$/;

// Maps the operator string from a color token to the colorMode enum.
// `:` and `>=` both mean "including" — the card must contain these colors.
function colorMode(op: string): AdvancedSearchValues['colorMode'] {
  if (op === '=' || op === '==') return 'exact';
  if (op.includes('<=')) return 'atmost';
  return 'including';
}

// Maps the operator string from an mv/cmc token to the cmcOp enum.
function cmcOp(op: string): AdvancedSearchValues['cmcOp'] {
  if (op.includes('<=')) return 'lte';
  if (op.includes('>=')) return 'gte';
  return 'eq';
}

// Converts a raw query string into a structured filter object.
// Tokens that don't match any keyword are accumulated as the name search phrase.
// Unknown keywords are also treated as name terms rather than silently dropped.
export function parseQuery(query: string): AdvancedSearchValues {
  const tokens = tokenize(query.trim());
  const nameTerms: string[] = [];
  const result: AdvancedSearchValues = { ...EMPTY_SEARCH_VALUES };

  for (const token of tokens) {
    const m = token.match(KEY_OP_VAL);
    if (!m) {
      // Bare word or quoted phrase — part of the name search
      nameTerms.push(token.replace(/^"|"$/g, ''));
      continue;
    }

    const [, key, op, rawVal] = m;
    const val = rawVal.replace(/^"|"$/g, ''); // strip surrounding quotes

    switch (key.toLowerCase()) {
      case 't':
      case 'type':
        result.typeLine = val;
        break;
      case 'id':
      case 'c':
      case 'ci':
      case 'color':
        result.colorMode = colorMode(op);
        if (val.toLowerCase() === 'c') {
          // `id:c` is the conventional way to filter for colorless
          result.colorless = true;
          result.colors = [];
        } else {
          result.colorless = false;
          // Deduplicate and filter to valid WUBRG letters
          result.colors = [
            ...new Set(
              val
                .toUpperCase()
                .split('')
                .filter((c) => WUBRG.has(c))
            ),
          ];
        }
        break;
      case 'r':
      case 'rarity':
        result.rarity = RARITY_MAP[val.toLowerCase()] ?? val.toLowerCase();
        break;
      case 'mv':
      case 'cmc':
        result.cmc = val;
        result.cmcOp = cmcOp(op);
        break;
      case 'owner':
        result.owner = val;
        break;
      case 'sort':
        result.sort = val;
        break;
      default:
        // Unrecognised keyword — treat the whole token as a name term
        nameTerms.push(token.replace(/^"|"$/g, ''));
    }
  }

  result.name = nameTerms.join(' ');
  return result;
}

// Converts a structured filter object back into a query string.
// Round-trips cleanly with parseQuery, which lets chip clears update the
// search input by serializing the cleared state and re-mounting the form.
export function serializeQuery(values: AdvancedSearchValues): string {
  const parts: string[] = [];

  if (values.name) {
    // Quote multi-word names so they parse back as a single phrase
    parts.push(values.name.includes(' ') ? `"${values.name}"` : values.name);
  }
  if (values.typeLine) {
    const v = values.typeLine.includes(' ')
      ? `"${values.typeLine}"`
      : values.typeLine;
    parts.push(`t:${v}`);
  }
  if (values.colorless) {
    parts.push('id:c');
  } else if (values.colors.length > 0) {
    const op =
      values.colorMode === 'exact'
        ? '='
        : values.colorMode === 'atmost'
          ? '<='
          : ':';
    parts.push(`id${op}${values.colors.join('').toLowerCase()}`);
  }
  if (values.rarity) parts.push(`r:${values.rarity}`);
  if (values.cmc) {
    const op =
      values.cmcOp === 'lte' ? '<=' : values.cmcOp === 'gte' ? '>=' : ':';
    parts.push(`mv${op}${values.cmc}`);
  }
  if (values.owner && values.owner !== 'anyone')
    parts.push(`owner:${values.owner}`);
  if (values.sort && values.sort !== 'name') parts.push(`sort:${values.sort}`);

  return parts.join(' ');
}
