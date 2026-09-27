import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { RETOUR_BUCKET, type PiloteRetour } from "@/lib/pilote-retours";
import { RetourDetail } from "@/components/admin/RetourDetail";

export const metadata = { title: "Retour pilote — Admin" };

export default async function RetourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("pilote_retours").select("*, pilotes(nom, email, photo_url)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as PiloteRetour;

  // Captures privées : URL signées d'une heure.
  const captures: string[] = [];
  if (r.captures.length) {
    const { data: signed } = await admin.storage.from(RETOUR_BUCKET).createSignedUrls(r.captures, 3600);
    for (const s of signed ?? []) if (s.signedUrl) captures.push(s.signedUrl);
  }

  return <RetourDetail retour={r} captures={captures} />;
}
