/** Real MTG set symbol (Keyrune font), tinted by rarity. */
function rarityClass(rarity: string | null): string {
  switch ((rarity ?? "").toLowerCase()) {
    case "mythic":
      return "ss-mythic";
    case "rare":
      return "ss-rare";
    case "uncommon":
      return "ss-uncommon";
    default:
      return "ss-common";
  }
}

export function SetSymbol({
  setCode,
  rarity,
  className = "",
}: {
  setCode: string | null;
  rarity: string | null;
  className?: string;
}) {
  if (!setCode) return null;
  return (
    <i
      className={`ss ss-fw ${rarityClass(rarity)} ss-${setCode.toLowerCase()} ${className}`}
      title={`${setCode.toUpperCase()}${rarity ? ` · ${rarity}` : ""}`}
    />
  );
}
