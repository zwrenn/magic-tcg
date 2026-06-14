import { POD_MEMBERS } from "@/lib/pod";
import { passphraseRequired } from "@/lib/auth-shared";
import { GateForm } from "./gate-form";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only allow same-origin relative redirects back into the app.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="t-wordart text-4xl tracking-[0.06em]">THE&nbsp;POD</h1>
          <div className="mt-3 flex justify-center gap-1.5 text-xl">
            <i className="ms ms-w ms-cost ms-shadow" />
            <i className="ms ms-u ms-cost ms-shadow" />
            <i className="ms ms-b ms-cost ms-shadow" />
            <i className="ms ms-r ms-cost ms-shadow" />
            <i className="ms ms-g ms-cost ms-shadow" />
          </div>
          <p className="mt-3 text-sm text-muted">
            Who owns what, across the playgroup.
          </p>
        </div>
        <GateForm
          members={[...POD_MEMBERS]}
          next={safeNext}
          requirePass={passphraseRequired()}
        />
      </div>
    </main>
  );
}
