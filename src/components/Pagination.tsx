'use client';

import Link from 'next/link';
import { RefObject } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  // Callback mode — used by client components (e.g. collection).
  onPageChange?: (page: number) => void;
  // URL mode — used by server components that can't pass function props.
  // Provide the base URL without a page param; component appends &page=N.
  baseUrl?: string;
  scrollTargetRef?: RefObject<HTMLElement | null>;
}

function pageUrl(base: string, p: number) {
  const sep = base.includes('?') ? '&' : '?';
  return p === 1 ? base : `${base}${sep}page=${p}`;
}

const btnClass =
  'cursor-pointer rounded px-3 py-1 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40';

export function Pagination({
  page,
  totalPages,
  disabled = false,
  onPageChange,
  baseUrl,
  scrollTargetRef,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function go(next: number) {
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    onPageChange?.(next);
  }

  const label = (
    <span className="text-muted">
      {page} / {totalPages}
    </span>
  );

  if (baseUrl) {
    return (
      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        {page > 1 ? (
          <Link href={pageUrl(baseUrl, page - 1)} className={btnClass}>
            ← Prev
          </Link>
        ) : (
          <span className="cursor-not-allowed px-3 py-1 opacity-40">
            ← Prev
          </span>
        )}
        {label}
        {page < totalPages ? (
          <Link href={pageUrl(baseUrl, page + 1)} className={btnClass}>
            Next →
          </Link>
        ) : (
          <span className="cursor-not-allowed px-3 py-1 opacity-40">
            Next →
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1 || disabled}
        className={btnClass}
      >
        ← Prev
      </button>
      {label}
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages || disabled}
        className={btnClass}
      >
        Next →
      </button>
    </div>
  );
}
