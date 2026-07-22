interface FilterChipProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

export function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer",
        active
          ? "bg-navy text-white border-navy"
          : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
      ].join(" ")}
    >
      {label}
      {count != null && (
        <span className={`ml-1.5 ${active ? "opacity-70" : "opacity-50"}`}>{count}</span>
      )}
    </button>
  );
}
