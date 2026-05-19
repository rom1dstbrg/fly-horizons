import { DomainBadge } from "./DomainBadge";

interface PageHeaderProps {
  domain?: "vols" | "boutique" | "clients";
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ domain, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {domain && (
          <div className="mb-1.5">
            <DomainBadge domain={domain} />
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-0.5 max-w-prose">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
