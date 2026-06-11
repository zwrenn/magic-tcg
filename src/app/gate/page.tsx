import { POD_MEMBERS } from "@/lib/pod";
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
          <h1 className="text-3xl font-semibold tracking-tight">The Pod</h1>
          <p className="mt-2 text-sm text-muted">
            Who owns what, across the playgroup.
          </p>
        </div>
        <GateForm members={[...POD_MEMBERS]} next={safeNext} />
      </div>
    </main>
  );
}
