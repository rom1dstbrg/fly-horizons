import { schedule } from "@netlify/functions";

/**
 * Netlify Scheduled Function — appelée toutes les heures automatiquement.
 * Appelle le endpoint Next.js /api/cron/flight-reminder qui envoie
 * l'email de rappel J-2 aux clients dont le vol a lieu dans 47-48h.
 */
const handler = schedule("0 * * * *", async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!secret || !siteUrl) {
    console.error("[flight-reminder] CRON_SECRET ou NEXT_PUBLIC_SITE_URL manquant");
    return { statusCode: 500 };
  }

  try {
    const response = await fetch(`${siteUrl}/api/cron/flight-reminder`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    const result = await response.json() as { sent?: number; errors?: string[] };
    console.log(`[flight-reminder] rappels envoyés=${result.sent ?? 0}`);

    if (result.errors?.length) {
      console.warn("[flight-reminder] Erreurs:", result.errors);
    }
  } catch (err) {
    console.error("[flight-reminder] Erreur réseau:", err);
    return { statusCode: 500 };
  }

  return { statusCode: 200 };
});

export { handler };
