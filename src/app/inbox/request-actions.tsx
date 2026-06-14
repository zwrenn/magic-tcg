"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireConfetti } from "@/components/confetti";

const TONE: Record<string, string> = {
  pending: "text-warn",
  given: "text-good",
  declined: "text-bad",
  cancelled: "text-muted",
};

/** Status badge + actions for one request, with optimistic updates. */
export function RequestStatus({
  id,
  role,
  initialStatus,
}: {
  id: number;
  role: "in" | "out";
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  async function act(next: "given" | "declined" | "cancelled") {
    setBusy(true);
    setStatus(next); // optimistic — update immediately
    try {
      await fetch("/api/requests/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
    } catch {
      /* keep optimistic value */
    }
    router.refresh(); // sync the nav badge + counts
  }

  if (status !== "pending") {
    return <span className={`shrink-0 text-sm font-semibold ${TONE[status] ?? "text-muted"}`}>{status}</span>;
  }

  if (role === "in") {
    return (
      <div className="flex shrink-0 gap-2">
        <button
          disabled={busy}
          onClick={(e) => {
            fireConfetti(e.clientX, e.clientY);
            act("given");
          }}
          className="gel gel-green !px-3 !py-1 !text-xs"
        >
          ✓ Gave it
        </button>
        <button disabled={busy} onClick={() => act("declined")} className="gel gel-pink !px-3 !py-1 !text-xs">
          Decline
        </button>
      </div>
    );
  }
  return (
    <button
      disabled={busy}
      onClick={() => act("cancelled")}
      className="shrink-0 rounded-full border-2 border-border px-3 py-1 text-xs hover:border-bad/60 hover:text-bad"
    >
      Cancel
    </button>
  );
}
