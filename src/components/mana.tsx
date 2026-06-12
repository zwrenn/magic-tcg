/**
 * Magic mana-symbol and color rendering. Pure presentational — usable from
 * server or client components.
 */

const PIP_STYLE: Record<string, { bg: string; fg: string }> = {
  W: { bg: "#f5f0d8", fg: "#1a1a1a" },
  U: { bg: "#9ed0ec", fg: "#0b2b40" },
  B: { bg: "#5a5550", fg: "#efeae4" },
  R: { bg: "#f0a18a", fg: "#3a0f06" },
  G: { bg: "#9bd3ae", fg: "#0c2a16" },
  C: { bg: "#cdc6c0", fg: "#2a2622" },
};

function pipStyle(symbol: string) {
  // Generic numbers / X / hybrid all fall back to the colorless look.
  return PIP_STYLE[symbol] ?? PIP_STYLE.C;
}

function Pip({ symbol }: { symbol: string }) {
  const { bg, fg } = pipStyle(symbol);
  // hybrid symbols like "W/U" — show just the first letter to stay compact
  const label = symbol.includes("/") ? symbol.split("/")[0] : symbol;
  return (
    <span
      className="inline-grid h-[1.15em] w-[1.15em] place-items-center rounded-full text-[0.7em] font-bold leading-none"
      style={{ backgroundColor: bg, color: fg }}
      title={symbol}
    >
      {label}
    </span>
  );
}

/** Render a mana cost string like "{2}{U}{U}" as colored pips. */
export function ManaCost({ cost, className = "" }: { cost: string | null; className?: string }) {
  if (!cost) return null;
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  if (symbols.length === 0) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className}`}>
      {symbols.map((s, i) => (
        <Pip key={i} symbol={s} />
      ))}
    </span>
  );
}

/** Small dots for a comma-joined WUBRG color identity ("U,B"; "" = colorless). */
export function ColorDots({
  identity,
  className = "",
}: {
  identity: string | null;
  className?: string;
}) {
  const parts = (identity ?? "").split(",").filter(Boolean);
  const colors = parts.length > 0 ? parts : ["C"];
  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className}`}>
      {colors.map((c, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full ring-1 ring-black/30"
          style={{ backgroundColor: pipStyle(c).bg }}
          title={c}
        />
      ))}
    </span>
  );
}
