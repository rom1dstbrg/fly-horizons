import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendVoucherEmail } from "@/lib/email-service";
import { generateVoucherPDFBuffer } from "@/lib/pdf/voucher-pdf";
import { generateVoucherCode } from "@/lib/vouchers";
import type { VoucherEmailCode } from "@/lib/email-templates";
import { reservationPaymentConfirmationEmail, volSurMesureAcompteEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // ── Vol sur mesure (provision) ────────────────────────────
    if (session.metadata?.type === "reservation_perso") {
      const { reservationId, voucherId, voucherCode, couponCode, paymentToken } = session.metadata;
      if (reservationId) {
        const montantPayePerso = session.amount_total ? session.amount_total / 100 : 0;
        const { data: persoUpdated } = await adminSupabase.from("reservations")
          .update({ statut: "acompte_recu", payment_token: null, paye: montantPayePerso, payment_status: "paid" })
          .eq("id", reservationId)
          .in("statut", ["en_attente", "payment_pending"]) // Couvre les deux flux (public + admin)
          .select("id")
          .maybeSingle();

        if (!persoUpdated) {
          // 0 lignes mises à jour : déjà traité (RC-03) ou cron T-48h a annulé avant nous (RC-02)
          const { data: cur } = await adminSupabase.from("reservations").select("statut, payment_status").eq("id", reservationId).maybeSingle();
          if (cur?.payment_status === "paid") return NextResponse.json({ received: true }); // RC-03: idempotent
          if (cur?.statut === "annulee") {
            // RC-02: force-restaurer + alerte admin
            await adminSupabase.from("reservations")
              .update({ statut: "acompte_recu", payment_token: null, paye: montantPayePerso, payment_status: "paid" })
              .eq("id", reservationId);
            await resend.emails.send({
              from: EMAIL_FROM, to: [EMAIL_REPLY_TO],
              subject: "[URGENT] Paiement reçu sur réservation annulée — restaurée",
              html: `<p>La réservation <strong>${reservationId}</strong> avait été annulée par le cron T-48h mais un paiement Stripe vient d'être reçu. Elle a été automatiquement restaurée au statut <em>acompte_recu</em>. À vérifier manuellement.</p>`,
            });
          } else {
            return NextResponse.json({ received: true }); // état inattendu
          }
        }

        if (voucherId) {
          await adminSupabase.from("voucher_codes").update({ status: "used", used_at: new Date().toISOString() }).eq("id", voucherId);
        }
        if (couponCode) {
          const { data: incremented } = await adminSupabase.rpc("increment_coupon_usage", { coupon_code: couponCode });
          if (incremented === 0) {
            const event = {
              type: "COUPON_SATURATED",
              reservationId,
              couponCode,
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent as string ?? null,
              customerEmail: session.customer_details?.email ?? null,
              amountPaidEur: montantPayePerso,
              reservationType: "perso",
              timestamp: new Date().toISOString(),
            };
            console.error("[webhook/coupon-saturated]", JSON.stringify(event));
            await resend.emails.send({
              from: EMAIL_FROM, to: [EMAIL_REPLY_TO],
              subject: "[ACTION REQUISE] Coupon utilisé deux fois en simultané",
              html: `
                <h2>Coupon saturé — double usage concurrent</h2>
                <p>Le coupon <strong>${couponCode}</strong> a atteint sa limite d'utilisation lors d'un paiement simultané. Le paiement est valide et la réservation est active, mais <code>usage_count</code> n'a pas pu être incrémenté.</p>
                <table style="border-collapse:collapse;width:100%">
                  <tr><td style="padding:4px 8px;font-weight:bold">Réservation</td><td style="padding:4px 8px">${reservationId}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Coupon</td><td style="padding:4px 8px">${couponCode}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Session Stripe</td><td style="padding:4px 8px">${session.id}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Payment Intent</td><td style="padding:4px 8px">${session.payment_intent ?? "—"}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Email client</td><td style="padding:4px 8px">${session.customer_details?.email ?? "—"}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Montant payé</td><td style="padding:4px 8px">${montantPayePerso} €</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Type</td><td style="padding:4px 8px">Vol sur mesure</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Horodatage</td><td style="padding:4px 8px">${event.timestamp}</td></tr>
                </table>
                <p style="margin-top:16px">Action suggérée : vérifier si deux réservations différentes ont utilisé ce coupon et corriger <code>usage_count</code> manuellement si nécessaire.</p>
              `,
            });
          }
        }
        const { data: resa } = await adminSupabase.from("reservations").select("*, clients(*)").eq("id", reservationId).single();
        if (resa?.clients) {
          const c = resa.clients as { prenom: string; nom: string; email: string };
          const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          const montantPaye = session.amount_total ? session.amount_total / 100 : 0;
          await resend.emails.send({
            from: EMAIL_FROM, to: [c.email], replyTo: EMAIL_REPLY_TO,
            subject: "Confirmation de paiement · Vol sur mesure Fly Horizons",
            html: volSurMesureAcompteEmail({
              prenom: c.prenom,
              nom: c.nom,
              dateStr,
              heure: resa.heure_vol,
              dureeEstimee: resa.duree,
              voucherCode: voucherCode || null,
              montantPaye,
              reservationId: reservationId,
              dateISO: resa.date_vol,
            }),
          });
          await resend.emails.send({
            from: EMAIL_FROM, to: [EMAIL_REPLY_TO],
            subject: `[Vol sur mesure payé] ${c.prenom} ${c.nom} · ${resa.date_vol}`,
            html: `<p>${c.prenom} ${c.nom} (${c.email}) a réglé la provision pour un vol sur mesure le <strong>${resa.date_vol} à ${resa.heure_vol}</strong>, ~${resa.duree} min, ${resa.distance_km ?? "?"} km.</p><p>Waypoints : ${(resa.waypoints ?? []).length} points.</p>`,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    // ── Réservation standard ──────────────────────────────────
    if (session.metadata?.type === "reservation") {
      const { reservationId, voucherId, voucherCode, couponCode } = session.metadata;
      if (reservationId) {
        const montantPayeStd = session.amount_total ? session.amount_total / 100 : 0;
        const { data: stdUpdated } = await adminSupabase
          .from("reservations")
          .update({ statut: "en_attente", payment_token: null, paye: montantPayeStd, payment_status: "paid" })
          .eq("id", reservationId)
          .eq("statut", "payment_pending")
          .select("id")
          .maybeSingle();

        if (!stdUpdated) {
          // 0 lignes mises à jour : déjà traité (RC-03) ou cron T-48h a annulé avant nous (RC-02)
          const { data: cur } = await adminSupabase.from("reservations").select("statut, payment_status").eq("id", reservationId).maybeSingle();
          if (cur?.payment_status === "paid") return NextResponse.json({ received: true }); // RC-03: idempotent
          if (cur?.statut === "annulee") {
            // RC-02: force-restaurer + alerte admin
            await adminSupabase.from("reservations")
              .update({ statut: "en_attente", payment_token: null, paye: montantPayeStd, payment_status: "paid" })
              .eq("id", reservationId);
            // Le cron avait libéré le coupon (release_coupon) — le re-incrémenter
            if (couponCode) {
              await adminSupabase.rpc("increment_coupon_usage", { coupon_code: couponCode });
            }
            await resend.emails.send({
              from: EMAIL_FROM, to: [EMAIL_REPLY_TO],
              subject: "[URGENT] Paiement reçu sur réservation annulée — restaurée",
              html: `<p>La réservation <strong>${reservationId}</strong> avait été annulée par le cron T-48h mais un paiement Stripe vient d'être reçu. Elle a été automatiquement restaurée au statut <em>en_attente</em>. À vérifier manuellement.</p>`,
            });
          } else {
            return NextResponse.json({ received: true }); // état inattendu
          }
        }

        if (voucherId) {
          await adminSupabase
            .from("voucher_codes")
            .update({ status: "used", used_at: new Date().toISOString() })
            .eq("id", voucherId);
        }

        // Incrémenter le coupon maintenant que le paiement est confirmé.
        // Conditionnel (WHERE usage_count < max_uses) : plafonne à max_uses même en cas de race
        // entre deux webhooks concurrents. L'incrément différé (ici, pas au checkout) garantit
        // qu'aucun crash côté application ne crée d'incrément orphelin sans réservation.
        if (couponCode) {
          const { data: incremented } = await adminSupabase.rpc("increment_coupon_usage", { coupon_code: couponCode });
          if (incremented === 0) {
            const event = {
              type: "COUPON_SATURATED",
              reservationId,
              couponCode,
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent as string ?? null,
              customerEmail: session.customer_details?.email ?? null,
              amountPaidEur: montantPayeStd,
              reservationType: "standard",
              timestamp: new Date().toISOString(),
            };
            console.error("[webhook/coupon-saturated]", JSON.stringify(event));
            await resend.emails.send({
              from: EMAIL_FROM, to: [EMAIL_REPLY_TO],
              subject: "[ACTION REQUISE] Coupon utilisé deux fois en simultané",
              html: `
                <h2>Coupon saturé — double usage concurrent</h2>
                <p>Le coupon <strong>${couponCode}</strong> a atteint sa limite d'utilisation lors d'un paiement simultané. Le paiement est valide et la réservation est active, mais <code>usage_count</code> n'a pas pu être incrémenté.</p>
                <table style="border-collapse:collapse;width:100%">
                  <tr><td style="padding:4px 8px;font-weight:bold">Réservation</td><td style="padding:4px 8px">${reservationId}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Coupon</td><td style="padding:4px 8px">${couponCode}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Session Stripe</td><td style="padding:4px 8px">${session.id}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Payment Intent</td><td style="padding:4px 8px">${session.payment_intent ?? "—"}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Email client</td><td style="padding:4px 8px">${session.customer_details?.email ?? "—"}</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Montant payé</td><td style="padding:4px 8px">${montantPayeStd} €</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Type</td><td style="padding:4px 8px">Standard</td></tr>
                  <tr><td style="padding:4px 8px;font-weight:bold">Horodatage</td><td style="padding:4px 8px">${event.timestamp}</td></tr>
                </table>
                <p style="margin-top:16px">Action suggérée : vérifier si deux réservations différentes ont utilisé ce coupon et corriger <code>usage_count</code> manuellement si nécessaire.</p>
              `,
            });
          }
        }

        // Récupérer la réservation + client pour l'email
        const { data: resa } = await adminSupabase
          .from("reservations")
          .select("*, clients(*)")
          .eq("id", reservationId)
          .single();

        if (resa?.clients) {
          const c = resa.clients as { prenom: string; nom: string; email: string };
          const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });
          const montantPaye = session.amount_total ? session.amount_total / 100 : 0;
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [c.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Confirmation de paiement · Fly Horizons",
            html: reservationPaymentConfirmationEmail({
              prenom: c.prenom,
              nom: c.nom,
              dateStr,
              heure: resa.heure_vol,
              duree: resa.duree,
              passengers: resa.passagers ?? undefined,
              poids_total: resa.poids_total ?? null,
              voucherCode: voucherCode || null,
              montantPaye,
              reservationId: reservationId,
              dateISO: resa.date_vol,
            }),
          });

          await resend.emails.send({
            from: EMAIL_FROM,
            to: [EMAIL_REPLY_TO],
            subject: `[Réservation payée] ${c.prenom} ${c.nom} · ${resa.date_vol} à ${resa.heure_vol}`,
            html: `<p>${c.prenom} ${c.nom} (${c.email}) a payé et réservé le <strong>${resa.date_vol} à ${resa.heure_vol}</strong> pour ${resa.duree} min.</p>${voucherCode ? `<p>Voucher : ${voucherCode}</p>` : ""}`,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    // ── Commande shop ────────────────────────────────────────
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const { data: order } = await adminSupabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Idempotence : si la commande est déjà payée, ignorer le webhook
    if (order.status === "paid") {
      return NextResponse.json({ received: true });
    }

    // Récupère la session fraîche — shipping_details est dans collected_information (API 2026-04-22)
    const fullSession = await stripe.checkout.sessions.retrieve(session.id) as Stripe.Checkout.Session;

    const shippingDetails = fullSession.collected_information?.shipping_details ?? null;
    const customerEmail = fullSession.customer_details?.email ?? fullSession.customer_email ?? "";
    const customerName = shippingDetails?.name || fullSession.customer_details?.name || undefined;

    const shippingAddress = shippingDetails?.address
      ? {
          full_name: shippingDetails.name ?? "",
          email: customerEmail,
          line1: shippingDetails.address.line1 ?? "",
          line2: shippingDetails.address.line2 ?? "",
          city: shippingDetails.address.city ?? "",
          postal_code: shippingDetails.address.postal_code ?? "",
          country: shippingDetails.address.country ?? "",
        }
      : { ...order.shipping_address, email: customerEmail };

    await adminSupabase
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent: fullSession.payment_intent as string,
        shipping_address: shippingAddress,
      })
      .eq("id", orderId);

    // Traitement par article : stock physique OU génération de codes voucher
    const voucherCodes: VoucherEmailCode[] = [];

    for (const item of order.items ?? []) {
      if (!item.product_id) continue;

      const { data: product } = await adminSupabase
        .from("products")
        .select("stock, product_type, voucher_duration_minutes")
        .eq("id", item.product_id)
        .single();

      if (!product) continue;

      const isVoucher = product.product_type === "voucher" ||
        (product.voucher_duration_minutes != null && product.voucher_duration_minutes > 0);

      if (isVoucher) {
        // Générer un code par quantité
        for (let i = 0; i < item.quantity; i++) {
          const code = generateVoucherCode();
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          await adminSupabase.from("voucher_codes").insert({
            code,
            order_id: orderId,
            order_item_id: item.id,
            product_id: item.product_id,
            duration_minutes: product.voucher_duration_minutes ?? 60,
            product_title: item.title,
            recipient_email: customerEmail || null,
            recipient_name: customerName ?? null,
            status: "unused",
            expires_at: expiresAt.toISOString(),
          });
          voucherCodes.push({
            code,
            duration_minutes: product.voucher_duration_minutes ?? 60,
            product_title: item.title,
            expires_at: expiresAt,
          });
        }
      } else {
        // Décrémentation atomique côté DB pour éviter les race conditions entre webhooks parallèles.
        // SQL requis dans Supabase (à exécuter une seule fois) :
        // CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_qty int)
        // RETURNS void LANGUAGE sql AS $$
        //   UPDATE products SET stock = GREATEST(0, stock - p_qty) WHERE id = p_product_id;
        // $$;
        await adminSupabase.rpc("decrement_product_stock", {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        });
      }
    }

    if (order.coupon_code) {
      await adminSupabase.rpc("increment_coupon_usage", {
        coupon_code: order.coupon_code,
      });
    }

    if (customerEmail) {
      await sendOrderConfirmation({
        to: customerEmail,
        orderRef: orderId.slice(0, 8).toUpperCase(),
        customerName,
        items: order.items?.map((i: {
          title: string;
          quantity: number;
          unit_price: number;
          image_url?: string | null;
        }) => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          image_url: i.image_url ?? null,
        })) ?? [],
        subtotal: order.subtotal,
        shippingCost: order.shipping_cost,
        discountAmount: order.discount_amount,
        total: order.total,
        couponCode: order.coupon_code,
        shippingAddress,
        orderDate: order.created_at,
      });

      if (voucherCodes.length > 0) {
        const pdfAttachments: Array<{ filename: string; content: Buffer }> = [];
        for (const vc of voucherCodes) {
          try {
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            const pdfBuffer = await generateVoucherPDFBuffer({
              code: vc.code,
              duration_minutes: vc.duration_minutes,
              product_title: vc.product_title,
              expiresAt,
            });
            pdfAttachments.push({
              filename: `bon-vol-${vc.code.slice(0, 8).toLowerCase()}.pdf`,
              content: pdfBuffer,
            });
          } catch (err) {
            console.error("PDF generation failed for voucher", vc.code, err);
          }
        }
        await sendVoucherEmail({
          to: customerEmail,
          orderRef: orderId.slice(0, 8).toUpperCase(),
          customerName,
          codes: voucherCodes,
          ...(pdfAttachments.length > 0 ? { attachments: pdfAttachments } : {}),
        });
      }
    }

    console.log(`Commande ${orderId} payée — ${voucherCodes.length} code(s) voucher générés`);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, voucherId, reservationId, type, paymentToken, couponCode } = session.metadata ?? {};

    // Release any voucher that was atomically reserved for this session.
    // Exception : réservations perso — le voucher est réservé dès la création de la
    // réservation (pas à la session Stripe), donc on ne le libère pas ici.
    // Pour tous les autres cas (shop, standard, type absent), on libère toujours.
    if (voucherId && type !== "reservation_perso") {
      await adminSupabase
        .from("voucher_codes")
        .update({ status: "unused" })
        .eq("id", voucherId)
        .eq("status", "reserved");
    }

    // Cancel pending shop order
    if (orderId) {
      await adminSupabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending");
    }

    // Cancel pending reservation — conditions séparées par type et par flux :
    // - standard, checkout direct (pas de paymentToken) : annuler immédiatement à l'expiration
    //   (le client avait 30 min devant lui au moment du checkout)
    // - standard, pay-later (paymentToken présent) : NE PAS annuler ici — le cron gère la
    //   deadline à T-48h avant le vol ; le client peut recliquer son lien autant de fois qu'il veut
    // - perso : NE PAS annuler — le payment_token reste valide jusqu'à J-4, chaque clic sur le
    //   lien crée une nouvelle session Stripe. L'annulation se fait manuellement par l'admin.
    if (reservationId && type === "reservation" && !paymentToken) {
      await adminSupabase
        .from("reservations")
        .update({ statut: "annulee" })
        .eq("id", reservationId)
        .eq("statut", "payment_pending");
    }

    // Pas de release_coupon ici : l'incrément coupon n'a jamais lieu avant le paiement Stripe.
    // Si la session expire sans paiement, usage_count n'a jamais été touché.
  }

  return NextResponse.json({ received: true });
}
