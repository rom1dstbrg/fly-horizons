import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <Icon size={18} className="text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
