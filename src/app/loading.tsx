export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-3 w-3 animate-ping rounded-full bg-accent" />
        <span className="t-label">Loading…</span>
      </div>
    </div>
  );
}
