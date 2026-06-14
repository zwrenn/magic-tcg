"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RequestActions({ id, role }: { id: number; role: "in" | "out" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(status: "given" | "declined" | "cancelled") {
    setBusy(true);
    await fetch("/api/requests/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }

  if (role === "in") {
    return (
      <div className="flex shrink-0 gap-2">
        <button disabled={busy} onClick={() => act("given")} className="gel gel-green !px-3 !py-1 !text-xs">
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
