/**
 * Rate limiter stub — l'implémentation Map en mémoire ne fonctionne pas en
 * production serverless (Netlify) où chaque requête peut toucher une instance
 * séparée avec son propre store vide.
 *
 * Protection actuelle : Netlify DDoS shield + validation des champs côté serveur.
 * Pour une protection distribucée, utiliser @upstash/ratelimit (Upstash Redis).
 */

export function rateLimit(
  _key: string,
  limit: number,
  _windowMs: number,
): { allowed: boolean; remaining: number } {
  return { allowed: true, remaining: limit };
}

/** Extracts the best available client IP from a Next.js Request. */
export function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
