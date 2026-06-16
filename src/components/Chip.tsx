interface ChipProps {
  label: string;
  onClear: () => void;
}

export function Chip({ label, onClear }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5">
      {label}
      <button
        onClick={onClear}
        aria-label={`Clear ${label}`}
        className="text-muted hover:text-bad"
      >
        ✕
      </button>
    </span>
  );
}
