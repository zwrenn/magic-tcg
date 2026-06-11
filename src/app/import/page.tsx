import { requireUser } from "@/lib/auth";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Import collection</h1>
      <p className="mt-1 text-sm text-muted">
        Importing as <span className="font-medium text-foreground">{user.name}</span>.
        Each upload fully replaces your collection.
      </p>

      <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Exporting from ManaBox</p>
        <p className="mt-1">
          In the ManaBox app: <strong>Collection → ⋯ / Share → Export → CSV</strong>.
          Save the file, then upload it here.
        </p>
      </div>

      <div className="mt-6">
        <ImportClient />
      </div>
    </main>
  );
}
