interface FormGridProps {
  children: React.ReactNode;
  cols?: 1 | 2;
  className?: string;
}

export function FormGrid({ children, cols = 1, className }: FormGridProps) {
  return (
    <div
      className={[
        "grid gap-4",
        cols === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
