import { RefObject } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  /** Element to scroll to the top of on page change. Defaults to the window. */
  scrollTargetRef?: RefObject<HTMLElement | null>;
}

export function Pagination({
  page,
  totalPages,
  disabled = false,
  onPageChange,
  scrollTargetRef,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function go(next: number) {
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    onPageChange(next);
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1 || disabled}
        className="cursor-pointer rounded px-3 py-1 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="text-muted">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages || disabled}
        className="cursor-pointer rounded px-3 py-1 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}
