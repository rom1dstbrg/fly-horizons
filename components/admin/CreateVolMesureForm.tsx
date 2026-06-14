"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createAdminVolMesure } from "@/lib/actions/reservations";
import { Loader2, UserPlus, Users, Search, Check } from "lucide-react";

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
}

interface Props {
  clients: Client[];
  prixHeure: number;
}

const STYLES = ["balade", "sportif", "panoramique", "découverte"];

export function CreateVolMesureForm({ clients, prixHeure }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Client
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newPrenom, setNewPrenom] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelephone, setNewTelephone] = useState("");

  // Vol
  const [dateVol, setDateVol] = useState("");
  const [heureVol, setHeureVol] = useState("10:00");
  const [duree, setDuree] = useState(60);
  const [passagers, setPassagers] = useState(1);
  const [poidsTotal, setPoidsTotal] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [styleVol, setStyleVol] = useState("");
  const [taxesEscales, setTaxesEscales] = useState("");

  // Paiement
  const [envoyerPaiement, setEnvoyerPaiement] = useState(false);
  const [montantOverride, setMontantOverride] = useState("");

  // Feedback
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const prixEstime = useMemo(() => {
    const override = parseFloat(montantOverride);
    if (!isNaN(override) && override >= 0) return override;
    const taxes = parseFloat(taxesEscales) || 0;
    return Math.round((prixHeure / 60) * duree) + taxes;
  }, [prixHeure, duree, montantOverride, taxesEscales]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!dateVol) { setError("La date est obligatoire."); return; }
    if (!heureVol) { setError("L'heure est obligatoire."); return; }
    if (clientMode === "existing" && !selectedClientId) {
      setError("Sélectionnez un client existant."); return;
    }
    if (clientMode === "new" && (!newPrenom || !newNom || !newEmail)) {
      setError("Prénom, nom et email du nouveau client sont obligatoires."); return;
    }

    startTransition(async () => {
      const override = parseFloat(montantOverride);
      const result = await createAdminVolMesure({
        client_id:        clientMode === "existing" ? selectedClientId : undefined,
        prenom:           clientMode === "new" ? newPrenom : undefined,
        nom:              clientMode === "new" ? newNom : undefined,
        email:            clientMode === "new" ? newEmail : undefined,
        telephone:        clientMode === "new" ? newTelephone : undefined,
        date_vol:         dateVol,
        heure_vol:        heureVol,
        duree,
        passagers,
        poids_total:      poidsTotal ? parseInt(poidsTotal) : null,
        distance_km:      distanceKm ? parseFloat(distanceKm) : null,
        commentaire:      commentaire || undefined,
        taxes_escales:    taxesEscales ? parseFloat(taxesEscales) : null,
        envoyer_paiement: false,
        send_email:       envoyerPaiement,
        montant_override: !isNaN(override) && override >= 0 ? override : null,
      });

      if (result.error) { setError(result.error); return; }

      setSuccess(
        envoyerPaiement && prixEstime > 0
          ? "Vol sur mesure créé et lien de paiement envoyé ✓"
          : "Vol sur mesure créé et enregistré ✓"
      );
      setTimeout(() => router.push("/admin/vols"), 1500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* Client */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Client</h2>
        <div className="flex gap-2">
          {(["existing", "new"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setClientMode(mode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                clientMode === mode ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:bg-secondary"
              }`}>
              {mode === "existing" ? <><Users size={14} /> Client existant</> : <><UserPlus size={14} /> Nouveau client</>}
            </button>
          ))}
        </div>

        {clientMode === "existing" && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClientId(""); }}
                placeholder="Rechercher par nom ou email…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {clientSearch && (
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredClients.length === 0
                  ? <p className="p-3 text-sm text-muted-foreground text-center">Aucun client trouvé</p>
                  : filteredClients.slice(0, 8).map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setSelectedClientId(c.id); setClientSearch(`${c.prenom} ${c.nom}`); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0">
                      <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-muted-foreground">{c.email}{c.telephone ? ` · ${c.telephone}` : ""}</p>
                    </button>
                  ))
                }
              </div>
            )}
            {selectedClient && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <Check size={14} className="text-emerald-600 shrink-0" />
                <span className="font-medium text-emerald-700">{selectedClient.prenom} {selectedClient.nom}</span>
                <span className="text-emerald-600 text-xs">{selectedClient.email}</span>
              </div>
            )}
          </div>
        )}

        {clientMode === "new" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Prénom *", value: newPrenom, set: setNewPrenom },
              { label: "Nom *",    value: newNom,    set: setNewNom },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                <input value={value} onChange={e => set(e.target.value)} required
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Téléphone</label>
              <input type="tel" value={newTelephone} onChange={e => setNewTelephone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        )}
      </div>

      {/* Détails vol */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Détails du vol</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date du vol *</label>
            <input type="date" value={dateVol} onChange={e => setDateVol(e.target.value)} required
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Heure de départ *</label>
            <input type="time" value={heureVol} onChange={e => setHeureVol(e.target.value)} required
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durée estimée (min) *</label>
            <input type="number" min="15" max="480" value={duree}
              onChange={e => setDuree(parseInt(e.target.value) || 60)} required
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Distance (km)</label>
            <input type="number" min="0" step="0.1" value={distanceKm}
              onChange={e => setDistanceKm(e.target.value)} placeholder="Ex : 85"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Passagers</label>
            <select value={passagers} onChange={e => setPassagers(parseInt(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Poids total (kg)</label>
            <input type="number" min="0" value={poidsTotal} onChange={e => setPoidsTotal(e.target.value)}
              placeholder="Ex : 180"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Style de vol</label>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setStyleVol("")}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                !styleVol ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:bg-secondary"
              }`}>
              Non défini
            </button>
            {STYLES.map(s => (
              <button key={s} type="button" onClick={() => setStyleVol(s)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors cursor-pointer ${
                  styleVol === s ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:bg-secondary"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Commentaire / itinéraire</label>
          <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
            rows={3} placeholder="Décrivez l'itinéraire, les waypoints, les souhaits du client…"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
      </div>

      {/* Paiement */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Paiement</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Vol ({duree} min)</p>
            <p className="text-base font-bold text-foreground">{Math.round((prixHeure / 60) * duree)} €</p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <label className="block text-xs text-muted-foreground mb-1">Taxes d'escales (€)</label>
            <input type="number" min="0" step="1" value={taxesEscales}
              onChange={e => setTaxesEscales(e.target.value)} placeholder="0"
              className="w-full bg-transparent text-base font-bold text-foreground focus:outline-none" />
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Total estimé</p>
          <p className="text-lg font-black text-foreground">{prixEstime} €</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Montant personnalisé (laissez vide pour le total calculé)
          </label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" step="1" value={montantOverride}
              onChange={e => setMontantOverride(e.target.value)}
              placeholder={String(prixEstime)}
              className="w-40 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name="paymentMode" checked={envoyerPaiement}
              onChange={() => setEnvoyerPaiement(true)} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Envoyer un lien de paiement par email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Le client reçoit un lien Stripe sécurisé pour payer ({prixEstime} €).
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name="paymentMode" checked={!envoyerPaiement}
              onChange={() => setEnvoyerPaiement(false)} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Enregistrer sans lien de paiement</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paiement espèces, virement ou déjà réglé.
              </p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <Check size={14} className="shrink-0" /> {success}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-black hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all shadow-gold cursor-pointer">
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {envoyerPaiement ? "Créer et envoyer le lien de paiement" : "Créer le vol sur mesure"}
        </button>
        <button type="button" onClick={() => router.push("/admin/vols")}
          className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
          Annuler
        </button>
      </div>
    </form>
  );
}
