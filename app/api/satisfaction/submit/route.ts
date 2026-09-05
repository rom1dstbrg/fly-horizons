import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { satisfactionResultEmail, fmtDuration } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { MAX_PHOTOS, RECO_VALUES, SOURCE_VALUES } from "@/lib/satisfaction";

export async function POST(request: NextRequest) {
  const { allowed } = await rateLimit(`satisfaction:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      reservation_id,
      note_preparation,
      note_pilote,
      note_vol,
      note_qualite_prix,
      recommandation,
      source_decouverte,
      commentaire,
      photos,
    } = body;

    const notes = [note_preparation, note_pilote, note_vol, note_qualite_prix];
    const notesValid = notes.every((n) => typeof n === "number" && n >= 1 && n <= 5);

    if (
      !reservation_id ||
      !notesValid ||
      !RECO_VALUES.includes(recommandation) ||
      !SOURCE_VALUES.includes(source_decouverte)
    ) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const photoPaths: string[] = Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string") : [];
    if (
      photoPaths.length > MAX_PHOTOS ||
      photoPaths.some((p) => !p.startsWith(`${reservation_id}/`))
    ) {
      return NextResponse.json({ error: "Photos invalides." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .select("id, date_vol, duree, statut, clients(prenom, nom, email)")
      .eq("id", reservation_id)
      .single();

    if (resaErr || !resa) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }

    if (resa.statut !== "vol_effectue") {
      return NextResponse.json({ error: "Le vol n'est pas encore marqué comme effectué." }, { status: 403 });
    }

    const { error: insertErr } = await supabase.from("satisfaction_surveys").insert({
      reservation_id,
      note_preparation,
      note_pilote,
      note_vol,
      note_qualite_prix,
      recommandation,
      source_decouverte,
      commentaire: commentaire?.trim() || null,
      photos: photoPaths,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "Vous avez déjà soumis votre avis pour ce vol." }, { status: 409 });
      }
      console.error("satisfaction insert error:", insertErr);
      return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }

    const client = resa.clients as unknown as { prenom: string; nom: string; email: string };
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      replyTo: EMAIL_REPLY_TO,
      subject: `[Satisfaction] ${client.prenom} ${client.nom} · ${fmtDuration(resa.duree)} le ${resa.date_vol}`,
      html: satisfactionResultEmail({
        prenom: client.prenom,
        nom: client.nom,
        dateStr,
        duree: resa.duree,
        notePreparation: note_preparation,
        notePilote: note_pilote,
        noteVol: note_vol,
        noteQualitePrix: note_qualite_prix,
        recommandation,
        sourceDecouverte: source_decouverte,
        commentaire: commentaire?.trim() || null,
        nbPhotos: photoPaths.length,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("satisfaction submit error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
