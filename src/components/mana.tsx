/**
 * Authentic MTG mana / color rendering via mana-font (the official-looking
 * symbol set). Pure presentational — usable from server or client components.
 */

// Map a cost token ("2", "U", "W/U", "X", "T") to its mana-font key.
function manaKey(symbol: string): string {
  const s = symbol.trim().toLowerCase();
  if (s === "t") return "tap";
  if (s === "q") return "untap";
  return s.replace(/\//g, ""); // hybrids: "w/u" -> "wu", "2/w" -> "2w"
}

/** Render a mana cost string like "{2}{U}{U}" as real mana symbols. */
export function ManaCost({
  cost,
  className = "",
}: {
  cost: string | null;
  className?: string;
}) {
  if (!cost) return null;
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  if (symbols.length === 0) return null;
  return (
    <span className={`inline-flex items-center gap-[3px] align-middle ${className}`}>
      {symbols.map((s, i) => (
        <i key={i} className={`ms ms-${manaKey(s)} ms-cost ms-shadow`} title={s} />
      ))}
    </span>
  );
}

/** Color identity as a row of real mana symbols ("U,B"; "" = colorless). */
export function ColorDots({
  identity,
  className = "",
}: {
  identity: string | null;
  className?: string;
}) {
  const parts = (identity ?? "").split(",").filter(Boolean);
  const colors = parts.length > 0 ? parts : ["c"];
  return (
    <span className={`inline-flex items-center gap-[2px] align-middle text-[0.9em] ${className}`}>
      {colors.map((c, i) => (
        <i key={i} className={`ms ms-${c.toLowerCase()} ms-cost ms-shadow`} title={c} />
      ))}
    </span>
  );
}
