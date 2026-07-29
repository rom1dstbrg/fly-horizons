import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { MAX_PHOTOS } from "@/lib/satisfaction";
import sharp from "sharp";

const MAX_PHOTO_SIZE = 12 * 1024 * 1024; // 12 Mo avant compression

async function assertUploadable(supabase: ReturnType<typeof createAdminClient>, reservationId: string) {
  const { data: resa, error } = await supabase
    .from("reservations")
    .select("id, statut")
    .eq("id", reservationId)
    .single();

  if (error || !resa) return { ok: false as const, error: "Réservation introuvable.", status: 404 };
  if (resa.statut !== "vol_effectue") {
    return { ok: false as const, error: "Le vol n'est pas encore marqué comme effectué.", status: 403 };
  }

  const { data: existing } = await supabase
    .from("satisfaction_surveys")
    .select("id")
    .eq("reservation_id", reservationId)
    .maybeSingle();

  if (existing) return { ok: false as const, error: "Un avis a déjà été envoyé pour ce vol.", status: 409 };

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  const { allowed } = await rateLimit(`satisfaction-photo:${getIp(request)}`, 40, 5 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const reservationId = formData.get("reservation_id") as string;
    const file = formData.get("file");

    if (!reservationId || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ error: "Cette photo dépasse 12 Mo." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Fichier non pris en charge." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const check = await assertUploadable(supabase, reservationId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { data: existingFiles } = await supabase.storage
      .from("satisfaction-photos")
      .list(reservationId, { limit: 1000 });
    if (existingFiles && existingFiles.length >= MAX_PHOTOS) {
      return NextResponse.json({ error: `${MAX_PHOTOS} photos maximum.` }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const path = `${reservationId}/${crypto.randomUUID()}.webp`;
    const { error: uploadErr } = await supabase.storage
      .from("satisfaction-photos")
      .upload(path, optimized, { contentType: "image/webp", upsert: false });

    if (uploadErr) {
      console.error("satisfaction photo upload error:", uploadErr);
      return NextResponse.json({ error: "Erreur lors de l'envoi de la photo." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("satisfaction-photos").getPublicUrl(path);
    return NextResponse.json({ path, url: urlData.publicUrl });
  } catch (err) {
    console.error("satisfaction photo error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { allowed } = await rateLimit(`satisfaction-photo-delete:${getIp(request)}`, 40, 5 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  try {
    const { reservation_id, path } = await request.json();
    if (!reservation_id || !path || typeof path !== "string" || !path.startsWith(`${reservation_id}/`)) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const check = await assertUploadable(supabase, reservation_id);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    await supabase.storage.from("satisfaction-photos").remove([path]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("satisfaction photo delete error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
