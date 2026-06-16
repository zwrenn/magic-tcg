interface ToggleProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function Toggle({ active, onClick, children }: ToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 font-medium transition ${active ? 'bg-accent text-black' : 'text-muted hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
