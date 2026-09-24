import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[20px] border border-dashed border-st-line-strong px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-st-surface text-st-muted">
          <Icon size={20} />
        </span>
      )}
      <p className="text-base font-semibold tracking-tight text-st-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-st-text-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
