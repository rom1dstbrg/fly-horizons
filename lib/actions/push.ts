"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";

// Abonnements push de l'appareil courant (27/09).

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  return user.id;
}

export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  app: "pilote" | "admin";
  userAgent: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await currentUserId();
    if (!sub.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Abonnement invalide" };
    // Même appareil réabonné (ou passé à un autre compte) : on remplace.
    const { error } = await createAdminClient().from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        app: sub.app,
        user_agent: sub.userAgent.slice(0, 400),
      },
      { onConflict: "endpoint" },
    );
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const userId = await currentUserId();
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
}

/** Notification d'essai sur les appareils du compte courant. */
export async function sendTestPush(): Promise<{ sent: number }> {
  const userId = await currentUserId();
  const sent = await sendPushToUser(userId, {
    title: "Notifications activées",
    body: "Vous serez prévenu ici des demandes, messages et rappels de vos vols.",
    url: "/pilote",
    tag: "test",
  });
  return { sent };
}
