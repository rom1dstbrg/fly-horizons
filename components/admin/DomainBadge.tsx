import { Plane, ShoppingBag, Users } from "lucide-react";

const CONFIG = {
  vols: {
    label: "Vols",
    icon: Plane,
    className: "border-[#0b2238]/25 bg-[#0b2238]/10 text-[#0b2238]",
  },
  boutique: {
    label: "Boutique",
    icon: ShoppingBag,
    className: "border-[#F2B705]/40 bg-[#F2B705]/10 text-amber-700",
  },
  clients: {
    label: "Clients",
    icon: Users,
    className: "border-border bg-secondary text-muted-foreground",
  },
};

export function DomainBadge({ domain }: { domain: "vols" | "boutique" | "clients" }) {
  const { label, icon: Icon, className } = CONFIG[domain];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-[2px] ${className}`}>
      <Icon size={9} />
      {label}
    </span>
  );
}
