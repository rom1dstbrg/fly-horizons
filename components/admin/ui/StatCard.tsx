import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatVariant =
  | "primary"   // navy
  | "gold"      // gold / amber
  | "success"   // green
  | "warning"   // yellow
  | "danger"    // red
  | "info"      // blue
  | "neutral"   // gray
  | "orange"    // orange
  | "emerald"   // emerald
  | "purple";   // purple

const VARIANT_CLASSES: Record<StatVariant, { icon: string; value: string }> = {
  primary: { icon: "bg-navy/8  text-navy",          value: "text-navy"          },
  gold:    { icon: "bg-gold/10 text-[#b88c00]",     value: "text-[#b88c00]"    },
  success: { icon: "bg-green-500/10 text-green-600", value: "text-green-600"   },
  warning: { icon: "bg-yellow-500/10 text-yellow-600", value: "text-yellow-600" },
  danger:  { icon: "bg-red-500/10 text-red-600",    value: "text-red-600"       },
  info:    { icon: "bg-blue-500/10 text-blue-600",  value: "text-blue-600"      },
  neutral: { icon: "bg-gray-500/10 text-gray-500",  value: "text-gray-500"      },
  orange:  { icon: "bg-orange-500/10 text-orange-600", value: "text-orange-600" },
  emerald: { icon: "bg-emerald-500/10 text-emerald-600", value: "text-emerald-600" },
  purple:  { icon: "bg-purple-500/10 text-purple-600", value: "text-purple-600" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: StatVariant;
  icon?: LucideIcon;
  subtitle?: string;
  href?: string;
}

export function StatCard({ label, value, variant = "neutral", icon: Icon, subtitle, href }: StatCardProps) {
  const c = VARIANT_CLASSES[variant];
  const interactive = !!href;

  const content = Icon ? (
    <div className={`bg-card rounded-xl border border-border p-4 flex items-center gap-3 ${interactive ? "hover:shadow-sm transition-all group cursor-pointer" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">{label}</p>
        <p className={`text-xl font-black tracking-tight mt-1 ${c.value}`}>{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {interactive && <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />}
    </div>
  ) : (
    <div className={`bg-card rounded-xl border border-border p-4 text-center ${interactive ? "hover:shadow-sm transition-all cursor-pointer" : ""}`}>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );

  return interactive ? <Link href={href!} className="block">{content}</Link> : content;
}
