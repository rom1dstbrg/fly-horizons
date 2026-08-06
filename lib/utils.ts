import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(
  amount: number,
  currency: string = "EUR",
  locale: string = "fr-BE"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Converts a Brussels local date+time string to a UTC timestamp (ms). Handles CET/CEST correctly. */
export function brusselsTimestamp(dateVol: string, heureVol: string | null): number {
  const heure = (heureVol ?? "00:00").slice(0, 5);
  const probe = new Date(`${dateVol}T${heure}:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(probe);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
  const brusselsAsUtcMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = brusselsAsUtcMs - probe.getTime();
  return probe.getTime() - offsetMs;
}