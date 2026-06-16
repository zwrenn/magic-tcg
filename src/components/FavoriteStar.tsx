'use client';

import { useState } from 'react';

/**
 * A star toggle for favoriting a card (by name). Optimistic; persists via the
 * favorites API. Stops click propagation so it works on top of clickable cards.
 */
export function FavoriteStar({
  name,
  initial,
  onChange,
  className = '',
}: {
  name: string;
  initial: boolean;
  onChange?: (favorited: boolean) => void;
  className?: string;
}) {
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !fav;
    setFav(next); // optimistic
    setBusy(true);
    onChange?.(next);
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (typeof data.favorited === 'boolean' && data.favorited !== next) {
        setFav(data.favorited);
        onChange?.(data.favorited);
      }
    } catch {
      setFav(!next); // revert on failure
      onChange?.(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={fav}
      aria-label={fav ? 'Unfavorite' : 'Favorite'}
      title={fav ? 'Favorited' : 'Favorite'}
      className={`cursor-pointer leading-none transition ${fav ? 'text-warn' : 'text-muted hover:text-warn'} ${className}`}
    >
      {fav ? '★' : '☆'}
    </button>
  );
}
