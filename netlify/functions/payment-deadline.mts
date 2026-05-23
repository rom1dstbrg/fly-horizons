import { schedule } from "@netlify/functions";

/**
 * Netlify Scheduled Function — appelée toutes les heures automatiquement.
 * Appelle le endpoint Next.js /api/cron/payment-deadline qui :
 *  - Annule les réservations payment_pending dont le vol est dans < 48h
 *  - Envoie un email de rappel quand le vol est dans 71-72h (24h avant la deadline)
 */
const handler = schedule("0 * * * *", async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!secret || !siteUrl) {
    console.error("[payment-deadline] CRON_SECRET ou NEXT_PUBLIC_SITE_URL manquant");
    return { statusCode: 500 };
  }

  try {
    const response = await fetch(`${siteUrl}/api/cron/payment-deadline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    const result = await response.json() as { cancelled?: number; reminded?: number; errors?: string[] };
    console.log(`[payment-deadline] annulées=${result.cancelled ?? 0} rappels=${result.reminded ?? 0}`);

    if (result.errors?.length) {
      console.warn("[payment-deadline] Erreurs:", result.errors);
    }
  } catch (err) {
    console.error("[payment-deadline] Erreur réseau:", err);
    return { statusCode: 500 };
  }

  return { statusCode: 200 };
});

export { handler };
