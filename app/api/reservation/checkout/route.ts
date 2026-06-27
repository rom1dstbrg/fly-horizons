import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { optInNewsletter } from "@/lib/newsletter";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`reservation-checkout:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, duree, date, heure, voucher_code, voucher_id, poids_total, passengers, coupon_code, commentaire, newsletter_opt_in } = body;

    if (!prenom || !nom || !email || !duree || !date || !heure) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const dureeMins = parseInt(duree);
    if (isNaN(dureeMins) || dureeMins <= 0) {
      return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
    }

    // Règle J-2 : minimum 48h d'avance
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const minBookable = new Date(todayMidnight);
    minBookable.setDate(minBookable.getDate() + 2);
    if (new Date(date + "T12:00:00Z") < minBookable) {
      return NextResponse.json(
        { error: "Les réservations sont possibles uniquement 48h à l'avance minimum (J-2)." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Récupérer le prix depuis la DB — jamais depuis le client
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["prix_heure"]);

    const prixHeure = parseFloat(
      settings?.find((s) => s.key === "prix_heure")?.value ?? "254"
    );

    // Prix du pack depuis les produits (priorité sur le taux horaire)
    const { data: packProduct } = await supabase
      .from("products")
      .select("price")
      .eq("active", true)
      .eq("product_type", "voucher")
      .eq("voucher_duration_minutes", dureeMins)
      .maybeSingle();

    const prixPlein = packProduct?.price ?? Math.round((prixHeure / 60) * dureeMins);

    // Valider et récupérer le voucher côté serveur
    let voucherDuration = 0;
    let resolvedVoucherId: string | null = null;

    if (voucher_code || voucher_id) {
      // Atomic claim — marks as "reserved" only if currently "unused"
      // Prevents two concurrent checkouts from using the same voucher
      const updateQuery = supabase
        .from("voucher_codes")
        .update({ status: "reserved" })
        .eq("status", "unused")
        .select("id, duration_minutes, expires_at");

      const { data: claimed } = voucher_id
        ? await updateQuery.eq("id", voucher_id).maybeSingle()
        : await updateQuery.eq("code", (voucher_code as string).toUpperCase().trim()).maybeSingle();

      if (!claimed) {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      if (claimed.expires_at && new Date(claimed.expires_at) < new Date()) {
        // Release immediately if already expired
        await supabase.from("voucher_codes").update({ status: "expired" }).eq("id", claimed.id);
        return NextResponse.json({ error: "Ce voucher a expiré" }, { status: 400 });
      }

      voucherDuration = claimed.duration_minutes ?? 0;
      resolvedVoucherId = claimed.id;
    }

    const billableMins = Math.max(0, dureeMins - voucherDuration);
    const price = billableMins === 0
      ? 0
      : Math.round((prixHeure / 60) * billableMins);

    let amountCents = Math.round(price * 100);

    // Prix 0 : ne devrait pas arriver ici (le client appelle /submit), mais on couvre le cas
    if (amountCents <= 0) {
      return NextResponse.json({ error: "Montant invalide pour un paiement Stripe" }, { status: 400 });
    }

    // Appliquer le code promo s'il y en a un
    // NB: increment_coupon_usage est différé au webhook checkout.session.completed
    let appliedCouponCode: string | null = null;
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", (coupon_code as string).toUpperCase().trim())
        .eq("active", true)
        .maybeSingle();

      if (coupon &&
          !(coupon.expires_at && new Date(coupon.expires_at) < new Date()) &&
          !(coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses)) {
        const discountCents = coupon.type === "percentage"
          ? Math.round(amountCents * coupon.value / 100)
          : Math.min(Math.round(coupon.value * 100), amountCents);
        amountCents = Math.max(0, amountCents - discountCents);
        appliedCouponCode = coupon.code;
      }
    }

    if (amountCents <= 0) {
      return NextResponse.json({ error: "Le montant après réduction est nul — utilisez le formulaire de réservation gratuit." }, { status: 400 });
    }

    // Find or create client by email
    const { data: existingClients } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .limit(1);
    const existingClient = existingClients?.[0] ?? null;

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newId } = await supabase.rpc("next_client_id");
      if (!newId) return NextResponse.json({ error: "Erreur génération ID client" }, { status: 500 });
      clientId = newId;
      await supabase.from("clients").insert({
        id: clientId, nom, prenom, email, telephone: telephone || null,
      });
    }

    if (newsletter_opt_in) await optInNewsletter(email, prenom);

    // ── Vérification finale de disponibilité du créneau ─────────────────
    // Recheck serveur-side juste avant d'insérer : évite la race condition
    // si deux utilisateurs soumettent le même créneau en même temps.
    const { data: conflicts } = await supabase
      .from("reservations")
      .select("id, heure_vol, duree")
      .eq("date_vol", date)
      .neq("statut", "annulee");

    const newStart = parseInt(heure.replace(":", "").slice(0, 2)) * 60 + parseInt(heure.slice(3, 5));
    const newEnd   = newStart + dureeMins;

    const taken = (conflicts ?? []).some(r => {
      if (!r.heure_vol) return false;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd   = rStart + r.duree + 30; // +30 min de tampon (identique à calcSlots)
      return newEnd + 30 > rStart && newStart < rEnd;
    });

    if (taken) {
      if (resolvedVoucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", resolvedVoucherId).eq("status", "reserved");
      }
      return NextResponse.json({ error: "Ce créneau vient d'être réservé. Veuillez en choisir un autre." }, { status: 409 });
    }

    // Créer la réservation en attente de paiement
    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: dureeMins,
        passagers: passengers ? parseInt(passengers) : 1,
        statut: "payment_pending",
        type_resa: "standard",
        voucher_code: voucher_code || null,
        coupon_code: appliedCouponCode,
        poids_total: poids_total ? parseInt(poids_total) : null,
        commentaire: commentaire || null,
      })
      .select()
      .single();

    if (resaErr) {
      // Rollback voucher claim if reservation creation failed
      if (resolvedVoucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", resolvedVoucherId).eq("status", "reserved");
      }
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      day: "numeric", month: "long", year: "numeric",
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        locale: "fr",
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min — libère le voucher plus vite
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Vol Fly Horizons — ${dureeMins} min`,
                description: `${dateStr} à ${heure} · ${prenom} ${nom}`,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: "reservation",
          reservationId: resa.id,
          clientId,
          voucherId: resolvedVoucherId ?? "",
          voucherCode: voucher_code || "",
          couponCode: appliedCouponCode ?? "",
        },
        success_url: `${siteUrl}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/reservation?cancelled=1`,
      });
    } catch (stripeError) {
      // Rollback: release voucher and delete orphan reservation
      if (resolvedVoucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", resolvedVoucherId).eq("status", "reserved");
      }
      await supabase.from("reservations").delete().eq("id", resa.id).eq("statut", "payment_pending");
      console.error("Stripe session creation error:", stripeError);
      return NextResponse.json({ error: "Erreur création session paiement" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Reservation checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
