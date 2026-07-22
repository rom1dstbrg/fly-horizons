interface StatGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
}

const COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-5",
};

export function StatGrid({ children, cols = 4 }: StatGridProps) {
  return (
    <div className={`grid ${COLS[cols]} gap-3`}>
      {children}
    </div>
  );
}
