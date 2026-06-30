export function parseRescheduleToken(token: string): { t: string; exp: number } | null {
  try {
    const p = JSON.parse(Buffer.from(token, "base64url").toString());
    if (typeof p?.t !== "string" || typeof p?.exp !== "number") return null;
    return p;
  } catch { return null; }
}

export function makeRescheduleToken(uuid: string): string {
  const TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const exp = Date.now() + TTL_MS;
  return Buffer.from(JSON.stringify({ t: uuid, exp })).toString("base64url");
}
