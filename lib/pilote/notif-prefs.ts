// Notifications push d'un pilote et leurs réglages (01/10). Module neutre (ni client ni
// serveur) : lu par la page de réglage, par l'envoi (lib/push.ts) et par le cron des
// relances. Une clé absente des préférences = notification activée.

export type PiloteNotifKey =
  | "nouvelle_demande" | "vol_assigne" | "annulation" | "report" | "vol_48h"
  | "message_client" | "route_validee" | "route_modif"
  | "client_dit_paye" | "paiement_avant_vol" | "paiement_apres_vol"
  | "bilan_vol" | "bilan_vol_relance"
  | "signaux";

export type NotifPrefs = Partial<Record<PiloteNotifKey, boolean>>;

export const NOTIF_GROUPS: { title: string; desc: string; items: { key: PiloteNotifKey; label: string; desc: string }[] }[] = [
  {
    title: "Demandes et vols",
    desc: "Ce qui arrive sur vos vols.",
    items: [
      { key: "nouvelle_demande", label: "Nouvelle demande", desc: "Un client demande à rejoindre un de vos vols." },
      { key: "vol_assigne", label: "Un vol vous est confié", desc: "Fly Horizons vous confie un vol, ou vous en prenez un mis en jeu." },
      { key: "annulation", label: "Vol annulé", desc: "Un vol est annulé." },
      { key: "report", label: "Vol reporté", desc: "Un client choisit une nouvelle date." },
      { key: "vol_48h", label: "Rappel 48 h avant le vol", desc: "Pour penser à la météo et à la masse et centrage." },
    ],
  },
  {
    title: "Messages et route",
    desc: "Les échanges avec vos passagers.",
    items: [
      { key: "message_client", label: "Message d'un client", desc: "Un passager vous écrit depuis la page de son vol." },
      { key: "route_validee", label: "Route validée", desc: "Le client valide la route que vous avez proposée." },
      { key: "route_modif", label: "Modification de route demandée", desc: "Le client demande de changer la route." },
    ],
  },
  {
    title: "Paiements",
    desc: "Les virements à noter.",
    items: [
      { key: "client_dit_paye", label: "Le client dit avoir payé", desc: "À vous de confirmer la réception du virement." },
      { key: "paiement_avant_vol", label: "Paiement pas encore noté", desc: "Rappel avant le vol si le paiement n'est pas noté." },
      { key: "paiement_apres_vol", label: "Paiement à vérifier", desc: "Rappel après le vol si le paiement n'est toujours pas noté." },
    ],
  },
  {
    title: "Après le vol",
    desc: "Clôturer chaque vol.",
    items: [
      { key: "bilan_vol", label: "Bilan de vol à faire", desc: "Notez les minutes volées et passez le vol en effectué." },
      { key: "bilan_vol_relance", label: "Relance du bilan", desc: "Rappel si le bilan n'est toujours pas fait." },
    ],
  },
  {
    title: "Suivi",
    desc: "Quand quelque chose traîne.",
    items: [
      { key: "signaux", label: "Relances de suivi", desc: "Demande sans réponse, paiement à confirmer, vol pas marqué effectué." },
    ],
  },
];

export const NOTIF_KEYS: PiloteNotifKey[] = NOTIF_GROUPS.flatMap((g) => g.items.map((i) => i.key));

/** Notification activée ? (absente = activée) */
export const notifEnabled = (prefs: NotifPrefs | null | undefined, key: PiloteNotifKey): boolean => prefs?.[key] !== false;

/** Ne garde que des clés connues avec une valeur booléenne. */
export function cleanPrefs(input: unknown): NotifPrefs {
  const out: NotifPrefs = {};
  if (input && typeof input === "object") {
    for (const k of NOTIF_KEYS) {
      const v = (input as Record<string, unknown>)[k];
      if (typeof v === "boolean") out[k] = v;
    }
  }
  return out;
}
