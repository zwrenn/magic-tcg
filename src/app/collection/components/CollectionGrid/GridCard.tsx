'use client';

import type { CollectionRow } from '@/lib/search';
import { FavoriteStar } from '@/components/FavoriteStar';
import { SetSymbol } from '@/components/set-symbol';

// ── Sub-components ────────────────────────────────────────────────────────────

interface CardInfoBarProps {
  name: string;
  normalized: string;
  isFav: boolean;
  quantity: number;
  foil: boolean;
  setCode: string;
  rarity: string;
  onFavChange: (normalized: string, favorited: boolean) => void;
}

function CardInfoBar({
  name,
  normalized,
  isFav,
  quantity,
  foil,
  setCode,
  rarity,
  onFavChange,
}: CardInfoBarProps) {
  return (
    <div className="flex items-center gap-1 px-1 pt-1 pb-0.5 text-xs">
      <FavoriteStar
        name={name}
        initial={isFav}
        onChange={(f) => onFavChange(normalized, f)}
        className="shrink-0 text-base"
      />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <span className="ml-auto flex shrink-0 items-center gap-0.5 text-muted">
        <SetSymbol setCode={setCode} rarity={rarity} />×{quantity}
        {foil && <span className="text-accent">✦</span>}
      </span>
    </div>
  );
}

interface CardImageProps {
  image: string | null;
  name: string;
}

function CardImage({ image, name }: CardImageProps) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={name}
      loading="lazy"
      className="aspect-[488/680] w-full object-cover"
    />
  ) : (
    <span className="flex aspect-[488/680] w-full items-center justify-center p-2 text-center text-xs text-muted">
      {name}
    </span>
  );
}

interface DeckBadgeProps {
  decks: { id: number; name: string; owner?: string }[];
}

function DeckBadge({ decks }: DeckBadgeProps) {
  return (
    <span
      className="mx-1 mb-1 block rounded-md bg-[var(--purple)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--purple-deep)]"
      title={`In: ${decks.map((d) => d.name).join(', ')}`}
    >
      🃏 {decks.length} deck{decks.length === 1 ? '' : 's'}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GridCardProps {
  item: CollectionRow;
  index: number;
  isFav: boolean;
  decks: { id: number; name: string; owner?: string }[];
  onFavChange: (normalized: string, favorited: boolean) => void;
  onZoom: (index: number) => void;
}

export function GridCard({
  item,
  index,
  isFav,
  decks,
  onFavChange,
  onZoom,
}: GridCardProps) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-2">
      <CardInfoBar
        name={item.name}
        normalized={item.normalizedName}
        isFav={isFav}
        quantity={item.quantity}
        foil={item.foil}
        setCode={item.setCode || ''}
        rarity={item.rarity || ''}
        onFavChange={onFavChange}
      />
      <button
        onClick={() => onZoom(index)}
        title={`View ${item.name}`}
        className={`relative block w-full cursor-pointer overflow-hidden transition hover:opacity-90 ${item.foil ? 'foil-frame' : ''}`}
      >
        <CardImage image={item.image} name={item.name} />
      </button>
      {decks.length > 0 && <DeckBadge decks={decks} />}
    </li>
  );
}
