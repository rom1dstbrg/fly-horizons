"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { savePushSubscription, sendTestPush } from "@/lib/actions/push";
import { Button } from "@/components/pilote/studio";

// Notifications push de l'espace pilote (27/09). Seulement dans l'app ajoutée
// à l'écran d'accueil (iPhone : obligatoire pour le push). À l'ouverture, si le
// pilote n'a encore ni accepté ni refusé, une feuille le lui propose : iOS
// n'autorise la vraie demande qu'après un tap. « Plus tard » la repousse de
// 7 jours. Déjà accepté : l'abonnement est renouvelé en silence.

const SNOOZE_KEY = "fh-push-snooze";
const SNOOZE_MS = 7 * 24 * 3600 * 1000;

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function subscribe(): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return false;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, app: "pilote", userAgent: navigator.userAgent });
  return "success" in res;
}

export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!pushSupported() || !isStandalone()) return;
    if (Notification.permission === "granted") {
      // Renouvelle / réenregistre l'abonnement de cet appareil sans rien demander.
      subscribe().catch(() => {});
      return;
    }
    if (Notification.permission !== "default") return;
    let snoozed = false;
    try { snoozed = Date.now() - Number(localStorage.getItem(SNOOZE_KEY) ?? 0) < SNOOZE_MS; } catch { /* stockage indisponible */ }
    // Laisse la page s'afficher avant de proposer.
    if (!snoozed) {
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  function later() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setRefused(true); return; }
      if (await subscribe()) {
        await sendTestPush().catch(() => {});
        setShow(false);
      } else {
        setRefused(true);
      }
    } catch {
      setRefused(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pilote-studio fixed inset-0 z-[2100] flex items-end justify-center bg-st-ink/30 font-sans backdrop-blur-[1.5px] motion-safe:animate-in motion-safe:fade-in" onClick={later}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[26px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2.5 text-st-text shadow-st-panel motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:mb-4 sm:max-w-[420px] sm:rounded-[20px]"
      >
        <div className="mx-auto mb-5 h-1 w-[38px] rounded-full bg-st-line-strong" />
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-st-gold-soft text-st-gold-text"><Bell size={26} /></span>
          <h2 id="push-title" className="mt-3.5 text-[17px] font-semibold tracking-tight">Activer les notifications</h2>
          {refused ? (
            <p className="mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-st-text-2">
              Les notifications sont bloquées. Pour les autoriser : Réglages de l&apos;iPhone, Notifications, FH Pilote.
            </p>
          ) : (
            <p className="mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-st-text-2">
              Soyez prévenu d&apos;une nouvelle demande, d&apos;un message d&apos;un client, d&apos;un vol dans 48 h ou d&apos;un paiement à noter.
            </p>
          )}
        </div>
        <div className="mt-5 space-y-2">
          {refused ? (
            <Button fullWidth size="lg" variant="secondary" onClick={() => setShow(false)}>Compris</Button>
          ) : (
            <>
              <Button fullWidth size="lg" onClick={enable} loading={busy}><Bell /> Activer</Button>
              <Button fullWidth size="lg" variant="ghost" onClick={later} disabled={busy} className="text-st-text-2">Plus tard</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
