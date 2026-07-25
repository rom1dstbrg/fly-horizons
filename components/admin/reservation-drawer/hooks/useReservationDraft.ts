"use client";

import { useState, useTransition, useEffect } from "react";
import { updateReservationAllFields } from "@/lib/actions/reservation-edit";
import type { DrawerReservation } from "../types";

export function useReservationDraft(
  reservation: DrawerReservation | null,
  showFeedback: (msg: string, ok?: boolean) => void,
  onSaved?: (fields: Partial<DrawerReservation>) => void
) {
  const [isPending, startTransition] = useTransition();

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [duree, setDuree] = useState("");
  const [passagers, setPassagers] = useState("");
  const [poids, setPoids] = useState("");
  const [acompte, setAcompte] = useState("");
  const [paye, setPaye] = useState("");
  const [remboursement, setRemboursement] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [styleVol, setStyleVol] = useState<"rapide" | "vues" | "">("");

  useEffect(() => {
    if (!reservation) return;
    setPrenom(reservation.clients?.prenom ?? "");
    setNom(reservation.clients?.nom ?? "");
    setEmail(reservation.clients?.email ?? "");
    setTelephone(reservation.clients?.telephone ?? "");
    setDate(reservation.date_vol);
    setHeure(reservation.heure_vol?.slice(0, 5) ?? "");
    setDuree(String(reservation.duree));
    setPassagers(String(reservation.passagers));
    setPoids(reservation.poids_total != null ? String(reservation.poids_total) : "");
    setAcompte(reservation.acompte != null ? String(reservation.acompte) : "");
    setPaye(reservation.paye != null ? String(reservation.paye) : "");
    setRemboursement(reservation.remboursement != null && reservation.remboursement > 0 ? String(reservation.remboursement) : "");
    setVoucherCode(reservation.voucher_code ?? "");
    setCouponCode(reservation.coupon_code ?? "");
    setCommentaire(reservation.commentaire ?? "");
    setStyleVol(reservation.style_vol ?? "");
  }, [reservation?.id]);

  // Réservations avec voucher (paye=0) : pré-remplir le prix depuis le voucher
  useEffect(() => {
    if (!reservation?.voucher_code) return;
    if ((reservation.paye ?? 0) > 0 && reservation.acompte != null) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient()
        .from("voucher_codes")
        .select("prix, orders(total, status)")
        .eq("code", reservation.voucher_code!)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const orderRaw = data.orders as unknown;
          const order = Array.isArray(orderRaw)
            ? (orderRaw[0] as { total: number; status: string } | undefined) ?? null
            : orderRaw as { total: number; status: string } | null;
          const price = order?.status === "paid" ? order.total : (data.prix ?? null);
          if (price != null) {
            setPaye(p => (p === "" || p === "0") ? String(price) : p);
            setAcompte(a => (a === "" || a === "0") ? String(price) : a);
          }
        });
    });
  }, [reservation?.id, reservation?.voucher_code]);

  function save() {
    if (!reservation) return;
    startTransition(async () => {
      const clientFields = {
        prenom: prenom.trim() || reservation.clients?.prenom || "",
        nom: nom.trim() || reservation.clients?.nom || "",
        email: email.trim() || reservation.clients?.email || "",
        telephone: telephone.trim() || null,
      };
      const reservationFields = {
        date_vol: date || reservation.date_vol,
        heure_vol: heure || null,
        duree: parseInt(duree) || reservation.duree,
        passagers: parseInt(passagers) || reservation.passagers,
        poids_total: poids ? parseFloat(poids) : null,
        acompte: acompte ? parseFloat(acompte) : null,
        paye: paye ? parseFloat(paye) : null,
        remboursement: remboursement ? parseFloat(remboursement) : null,
        payment_status: (() => {
          const remb = parseFloat(remboursement) || 0;
          const p = parseFloat(paye) || 0;
          const a = parseFloat(acompte) || 0;
          if (remb > 0) return "refunded" as const;
          if (p > 0 && p >= a) return "paid" as const;
          if (p > 0) return "partial" as const;
          return "unpaid" as const;
        })(),
        voucher_code: voucherCode.trim() || null,
        coupon_code: couponCode.trim() || null,
        commentaire: commentaire.trim() || null,
        ...(reservation.type_resa === "perso" ? { style_vol: (styleVol || null) as "rapide" | "vues" | null } : {}),
      };
      const r = await updateReservationAllFields(reservation.id, clientFields, reservationFields);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Modifications sauvegardées ✓");
      // Le statut mis à jour en base ne se reflète pas tout seul dans la liste/le drawer déjà
      // ouverts (state React local) — sans ça il fallait un rechargement complet de la page.
      onSaved?.({
        ...reservationFields,
        clients: reservation.clients ? { ...reservation.clients, ...clientFields } : reservation.clients,
      });
    });
  }

  return {
    isPending,
    fields: { prenom, nom, email, telephone, date, heure, duree, passagers, poids, acompte, paye, remboursement, voucherCode, couponCode, commentaire, styleVol },
    setters: { setPrenom, setNom, setEmail, setTelephone, setDate, setHeure, setDuree, setPassagers, setPoids, setAcompte, setPaye, setRemboursement, setVoucherCode, setCouponCode, setCommentaire, setStyleVol },
    save,
  };
}
