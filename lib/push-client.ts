"use client";

import { deletePushSubscription, savePushSubscription } from "@/lib/actions/push";

// Notifications push côté navigateur (partagé par la feuille d'invitation de
// l'espace pilote et la page Profil > Notifications).

// Notifications coupées volontairement sur cet appareil : on ne se réabonne plus en silence.
const OFF_KEY = "fh-push-off";

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isOptedOut(): boolean {
  try { return localStorage.getItem(OFF_KEY) === "1"; } catch { return false; }
}
function setOptedOut(v: boolean) {
  try { if (v) localStorage.setItem(OFF_KEY, "1"); else localStorage.removeItem(OFF_KEY); } catch { /* ignore */ }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Abonne (ou réabonne) cet appareil et l'enregistre sur le compte. */
export async function subscribeThisDevice(app: "pilote" | "admin" = "pilote"): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return false;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, app, userAgent: navigator.userAgent });
  return "success" in res;
}

/** Active les notifications sur cet appareil : demande la permission puis abonne. */
export async function enableThisDevice(): Promise<"ok" | "refused" | "error"> {
  try {
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return "refused";
    setOptedOut(false);
    return (await subscribeThisDevice()) ? "ok" : "error";
  } catch {
    return "error";
  }
}

/** Coupe les notifications sur cet appareil (la permission du navigateur reste accordée). */
export async function disableThisDevice(): Promise<void> {
  setOptedOut(true);
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint).catch(() => {});
      await sub.unsubscribe();
    }
  } catch { /* l'appareil est de toute façon marqué comme coupé */ }
}

export type DeviceState =
  | "checking"
  | "ios-install"   // iPhone / iPad hors de l'app : le push n'existe que dans l'app ajoutée à l'écran d'accueil
  | "unsupported"
  | "denied"        // bloquées dans les réglages
  | "default"       // jamais demandé
  | "off"           // coupées volontairement sur cet appareil
  | "on";

export async function readDeviceState(): Promise<DeviceState> {
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") return "default";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (isOptedOut()) return "off";
    // Autorisées par le navigateur mais jamais abonnées : à activer, pas « coupées ».
    return sub ? "on" : "default";
  } catch {
    return "off";
  }
}
