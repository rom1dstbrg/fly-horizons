"use client";

export function VerdictBox({
  status,
  message,
  className = "",
}: {
  status: "ok" | "ko" | "pending";
  message: string;
  className?: string;
}) {
  const tone =
    status === "ok"
      ? "text-green-700 border-green-300 bg-green-50"
      : status === "ko"
        ? "text-red-700 border-red-300 bg-red-50"
        : "text-muted-foreground border-border bg-secondary";
  return (
    <p className={`rounded-lg border px-3 py-2 text-xs font-semibold ${tone} ${className}`}>{message}</p>
  );
}
