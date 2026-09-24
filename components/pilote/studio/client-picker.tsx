"use client";

import { useMemo } from "react";
import { Check, Search } from "lucide-react";
import { Segmented } from "./segmented";
import { FormField, Input } from "./field";

export interface PickerClient {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
}

// État du choix de client : un client existant (selectedId) ou un nouveau
// (prénom, nom, email, téléphone). Une seule source pour tous les formulaires
// de création de vol de l'espace pilote.
export interface ClientDraft {
  mode: "existing" | "new";
  search: string;
  selectedId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
}

export const emptyClientDraft = (mode: ClientDraft["mode"] = "existing"): ClientDraft => ({
  mode, search: "", selectedId: "", prenom: "", nom: "", email: "", telephone: "",
});

/** Message d'erreur si le choix est incomplet, sinon null. */
export function clientDraftError(d: ClientDraft, emailRequired: boolean): string | null {
  if (d.mode === "existing") return d.selectedId ? null : "Sélectionnez un client existant.";
  if (!d.prenom.trim() || !d.nom.trim()) return "Prénom et nom du nouveau client sont obligatoires.";
  if (emailRequired && !d.email.trim()) return "L'email du nouveau client est obligatoire.";
  return null;
}

export function ClientPicker({ clients, value: d, onChange, emailRequired = true, newFirst = false }: {
  clients: PickerClient[];
  value: ClientDraft;
  onChange: (d: ClientDraft) => void;
  emailRequired?: boolean;
  /** « Nouveau client » en premier (vols hors site : souvent un inconnu). */
  newFirst?: boolean;
}) {
  const set = (p: Partial<ClientDraft>) => onChange({ ...d, ...p });

  const matches = useMemo(() => {
    const q = d.search.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter(c => `${c.prenom} ${c.nom} ${c.email ?? ""} ${c.telephone ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [clients, d.search]);

  const selected = clients.find(c => c.id === d.selectedId);
  const modes = [
    { key: "existing" as const, label: "Client existant" },
    { key: "new" as const, label: "Nouveau client" },
  ];

  return (
    <div className="space-y-3">
      <Segmented fill value={d.mode} onChange={(mode) => set({ mode })} items={newFirst ? [modes[1], modes[0]] : modes} />

      {d.mode === "existing" ? (
        selected ? (
          <div className="flex items-center gap-3 rounded-[12px] bg-st-ok-soft px-3.5 py-2.5">
            <Check size={16} className="shrink-0 text-st-ok" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-st-text">{selected.prenom} {selected.nom}</p>
              <p className="truncate text-xs text-st-text-2">{[selected.email, selected.telephone].filter(Boolean).join(" · ") || "Pas de coordonnées"}</p>
            </div>
            <button type="button" onClick={() => set({ selectedId: "", search: "" })} className="shrink-0 cursor-pointer text-[12.5px] font-[550] text-st-text-2 hover:text-st-text">
              Changer
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-st-muted" />
              <Input
                value={d.search}
                onChange={e => set({ search: e.target.value, selectedId: "" })}
                placeholder="Nom, email ou téléphone…"
                aria-label="Rechercher un client"
                className="pl-10"
              />
            </div>
            {d.search.trim() && (
              <div className="max-h-60 divide-y divide-st-line-soft overflow-y-auto rounded-[12px] border border-st-line">
                {matches.length === 0 ? (
                  <p className="p-3 text-center text-sm text-st-muted">Aucun client trouvé</p>
                ) : (
                  matches.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => set({ selectedId: c.id, search: `${c.prenom} ${c.nom}` })}
                      className="block w-full cursor-pointer bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-st-surface"
                    >
                      <p className="text-sm font-[550] text-st-text">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-st-muted">{c.email ?? "—"}{c.telephone ? ` · ${c.telephone}` : ""}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2">
          <FormField id="cp-prenom" label="Prénom">
            <Input id="cp-prenom" value={d.prenom} onChange={e => set({ prenom: e.target.value })} autoComplete="off" />
          </FormField>
          <FormField id="cp-nom" label="Nom">
            <Input id="cp-nom" value={d.nom} onChange={e => set({ nom: e.target.value })} autoComplete="off" />
          </FormField>
          <FormField id="cp-email" label={emailRequired ? "Email" : "Email (facultatif)"}>
            <Input id="cp-email" type="email" value={d.email} onChange={e => set({ email: e.target.value })} autoComplete="off" />
          </FormField>
          <FormField id="cp-tel" label="Téléphone">
            <Input id="cp-tel" type="tel" value={d.telephone} onChange={e => set({ telephone: e.target.value })} autoComplete="off" />
          </FormField>
        </div>
      )}
    </div>
  );
}
