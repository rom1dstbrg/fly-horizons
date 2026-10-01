"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import { saveNotifPrefs, sendTestPush } from "@/lib/actions/push";
import { disableThisDevice, enableThisDevice, readDeviceState, type DeviceState } from "@/lib/push-client";
import { NOTIF_GROUPS, NOTIF_KEYS, notifEnabled, type NotifPrefs, type PiloteNotifKey } from "@/lib/pilote/notif-prefs";
import { Badge, Button } from "@/components/pilote/studio";
import { SettingRow } from "@/components/pilote/SettingRow";
import { cn } from "@/lib/utils";

// Profil > Notifications (01/10) : activer les notifications sur cet appareil, et choisir
// celles qu'on veut recevoir. Les types se règlent par compte (valables sur tous les
// appareils) et chaque changement s'enregistre tout de suite.

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn("relative h-[26px] w-[44px] shrink-0 cursor-pointer rounded-full transition-colors", on ? "bg-st-ink" : "bg-st-line-strong")}
    >
      <span className={cn("absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-[18px]")} />
    </button>
  );
}

function DeviceStatus() {
  const [state, setState] = useState<DeviceState>("checking");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    readDeviceState().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  async function enable() {
    setBusy(true); setNote("");
    const r = await enableThisDevice();
    if (r === "ok") {
      await sendTestPush().catch(() => {});
      setNote("Notifications activées. Une notification d'essai vient de partir.");
    } else if (r === "error") {
      setNote("Impossible d'activer les notifications pour l'instant. Réessayez dans un instant.");
    }
    setState(await readDeviceState());
    setBusy(false);
  }

  async function disable() {
    setBusy(true); setNote("");
    await disableThisDevice();
    setState(await readDeviceState());
    setBusy(false);
  }

  async function test() {
    setBusy(true); setNote("");
    const { sent } = await sendTestPush().catch(() => ({ sent: 0 }));
    setNote(sent > 0 ? "Notification d'essai envoyée. Elle doit arriver dans quelques secondes." : "Aucune notification n'a pu partir. Coupez puis réactivez les notifications sur cet appareil.");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {state === "checking" && <p className="text-[13px] text-st-muted">Vérification…</p>}

      {state === "on" && (
        <>
          <div className="flex items-center gap-2.5"><Badge tone="success" dot>Activées sur cet appareil</Badge></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={test} loading={busy}>Envoyer un essai</Button>
            <Button variant="ghost" onClick={disable} disabled={busy}>Désactiver sur cet appareil</Button>
          </div>
        </>
      )}

      {state === "off" && (
        <>
          <div className="flex items-center gap-2.5"><Badge dot>Coupées sur cet appareil</Badge></div>
          <Button onClick={enable} loading={busy}><Bell /> Réactiver</Button>
        </>
      )}

      {state === "default" && (
        <>
          <p className="text-[13px] leading-relaxed text-st-text-2">Pas encore activées sur cet appareil : vous ne recevez rien tant que ce n&apos;est pas fait.</p>
          <Button onClick={enable} loading={busy}><Bell /> Activer les notifications</Button>
        </>
      )}

      {state === "denied" && (
        <>
          <div className="flex items-center gap-2.5"><Badge tone="danger" dot>Bloquées</Badge></div>
          <p className="text-[13px] leading-relaxed text-st-text-2">
            Votre appareil bloque les notifications de ce site. Sur iPhone : Réglages, Notifications, FH Pilote, puis « Autoriser les notifications ».
            Sur ordinateur : cliquez sur le cadenas à gauche de l&apos;adresse et autorisez les notifications, puis rechargez la page.
          </p>
        </>
      )}

      {state === "ios-install" && (
        <div className="space-y-2 rounded-[14px] bg-st-surface px-4 py-3.5 text-[13px] leading-relaxed text-st-text-2">
          <p className="font-semibold text-st-text">Sur iPhone, les notifications marchent dans l&apos;app.</p>
          <ol className="list-decimal space-y-0.5 pl-4">
            <li>Ouvrez cette page dans Safari.</li>
            <li>Touchez le bouton Partager, puis « Sur l&apos;écran d&apos;accueil ».</li>
            <li>Ouvrez FH Pilote depuis l&apos;écran d&apos;accueil et revenez ici.</li>
          </ol>
        </div>
      )}

      {state === "unsupported" && (
        <p className="text-[13px] leading-relaxed text-st-text-2">Ce navigateur ne gère pas les notifications. Essayez avec l&apos;app FH Pilote sur votre téléphone, ou avec un autre navigateur.</p>
      )}

      {note && <p className="text-[12.5px] leading-snug text-st-text-2">{note}</p>}
    </div>
  );
}

export function PiloteNotifications({ initialPrefs }: { initialPrefs: NotifPrefs | null | undefined }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(initialPrefs ?? {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(next: NotifPrefs, previous: NotifPrefs) {
    setPrefs(next);
    setStatus("saving");
    start(async () => {
      const r = await saveNotifPrefs(next);
      if ("error" in r) {
        setPrefs(previous);
        setStatus("error");
        return;
      }
      setStatus("saved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2200);
    });
  }

  const toggle = (key: PiloteNotifKey) => persist({ ...prefs, [key]: !notifEnabled(prefs, key) }, prefs);
  const setAll = (value: boolean) => persist(Object.fromEntries(NOTIF_KEYS.map((k) => [k, value])) as NotifPrefs, prefs);
  const activeCount = NOTIF_KEYS.filter((k) => notifEnabled(prefs, k)).length;

  return (
    <div className="divide-y divide-st-line-soft">
      <SettingRow title="Cet appareil" desc="Les notifications arrivent sur l'appareil où vous les activez : téléphone, tablette ou ordinateur.">
        <DeviceStatus />
      </SettingRow>

      <SettingRow title="Ce que vous recevez" desc="Choisissez les notifications que vous voulez. Chaque changement est enregistré tout de suite, pour tous vos appareils.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-st-text-2"><b className="font-semibold text-st-text">{activeCount}</b> sur {NOTIF_KEYS.length} activées</span>
          <span className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setAll(true)} disabled={activeCount === NOTIF_KEYS.length}>Tout activer</Button>
            <Button variant="ghost" size="sm" onClick={() => setAll(false)} disabled={activeCount === 0}>Tout désactiver</Button>
          </span>
        </div>
        <p className="mt-1.5 min-h-[18px] text-[12.5px]" role="status" aria-live="polite">
          {status === "saving" && <span className="text-st-muted">Enregistrement…</span>}
          {status === "saved" && <span className="inline-flex items-center gap-1 text-st-ok"><Check size={13} /> Enregistré</span>}
          {status === "error" && <span className="text-st-bad">Enregistrement impossible. Votre réglage n&apos;a pas changé.</span>}
        </p>
      </SettingRow>

      {NOTIF_GROUPS.map((g) => (
        <SettingRow key={g.title} title={g.title} desc={g.desc}>
          <ul className="divide-y divide-st-line-soft rounded-[14px] border border-st-line">
            {g.items.map((it) => {
              const on = notifEnabled(prefs, it.key);
              return (
                <li key={it.key} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-st-text">{it.label}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-st-muted">{it.desc}</p>
                  </div>
                  <Switch on={on} onChange={() => toggle(it.key)} label={it.label} />
                </li>
              );
            })}
          </ul>
        </SettingRow>
      ))}
    </div>
  );
}
