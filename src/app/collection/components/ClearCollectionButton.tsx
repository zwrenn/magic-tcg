'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClearCollectionButtonProps {
  count: number;
}

export function ClearCollectionButton({ count }: ClearCollectionButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function clear() {
    setBusy(true);
    try {
      await fetch('/api/collection/clear', { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-bad/60 hover:text-bad"
      >
        Clear collection
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-bad/50 bg-bad/10 px-3 py-2 text-sm">
      <span className="text-bad">
        Delete all {count.toLocaleString()} cards? Can&apos;t be undone.
      </span>
      <button
        onClick={clear}
        disabled={busy}
        className="rounded-md bg-bad px-3 py-1 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Clearing…' : 'Yes, clear'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-md border border-border px-3 py-1 hover:bg-surface-2"
      >
        Cancel
      </button>
    </div>
  );
}
