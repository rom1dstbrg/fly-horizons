const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomGroup(n: number): string {
  return Array.from({ length: n }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export function generateVoucherCode(): string {
  return `${randomGroup(4)}-${randomGroup(4)}-${randomGroup(4)}-${randomGroup(4)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h} heure${h > 1 ? "s" : ""}`;
}
