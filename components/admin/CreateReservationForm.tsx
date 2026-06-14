"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createAdminReservation } from "@/lib/actions/reservations";
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

const DUREES = [30, 60, 90, 120];

export function CreateReservationForm({ clients, prixHeure }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Client mode
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // New client fields
  const [newPrenom, setNewPrenom] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelephone, setNewTelephone] = useState("");

  // Reservation fields
  const [dateVol, setDateVol] = useState("");
  const [heureVol, setHeureVol] = useState("10:00");
  const [duree, setDuree] = useState(60);
  const [passagers, setPassagers] = useState(1);
  const [poidsTotal, setPoidsTotal] = useState("");
  const [voucherCode, setVoucherCode] = useState("");

  // Payment
  const [envoyerPaiement, setEnvoyerPaiement] = useState(true);
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
    return Math.round((prixHeure / 60) * duree);
  }, [prixHeure, duree, montantOverride]);

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
      const result = await createAdminReservation({
        client_id: clientMode === "existing" ? selectedClientId : undefined,
        prenom: clientMode === "new" ? newPrenom : undefined,
        nom: clientMode === "new" ? newNom : undefined,
        email: clientMode === "new" ? newEmail : undefined,
        telephone: clientMode === "new" ? newTelephone : undefined,
        date_vol: dateVol,
        heure_vol: heureVol,
        duree,
        passagers,
        poids_total: poidsTotal ? parseInt(poidsTotal) : null,
        voucher_code: voucherCode || undefined,
        envoyer_paiement: envoyerPaiement,
        montant_override: !isNaN(override) && override >= 0 ? override : null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (envoyerPaiement && prixEstime > 0) {
        setSuccess("Réservation créée et email de paiement envoyé au client ✓");
      } else {
        setSuccess("Réservation créée et marquée comme confirmée ✓");
      }
      setTimeout(() => router.push("/admin/vols"), 1500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* Client */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Client</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setClientMode("existing")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              clientMode === "existing"
                ? "bg-navy text-white border-navy"
                : "border-border text-muted-foreground hover:bg-secondary"
            } cursor-pointer`}
          >
            <Users size={14} /> Client existant
          </button>
          <button
            type="button"
            onClick={() => setClientMode("new")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              clientMode === "new"
                ? "bg-navy text-white border-navy"
                : "border-border text-muted-foreground hover:bg-secondary"
            } cursor-pointer`}
          >
            <UserPlus size={14} /> Nouveau client
          </button>
        </div>

        {clientMode === "existing" && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClientId(""); }}
                placeholder="Rechercher par nom ou email…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {clientSearch && (
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">Aucun client trouvé</p>
                ) : (
                  filteredClients.slice(0, 8).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedClientId(c.id); setClientSearch(`${c.prenom} ${c.nom}`); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0"
                    >
                      <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-muted-foreground">{c.email}{c.telephone ? ` · ${c.telephone}` : ""}</p>
                    </button>
                  ))
                )}
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
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prénom *</label>
              <input value={newPrenom} onChange={e => setNewPrenom(e.target.value)} required
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom *</label>
              <input value={newNom} onChange={e => setNewNom(e.target.value)} required
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
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

      {/* Vol */}
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

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durée du vol *</label>
          <div className="flex gap-2 flex-wrap">
            {DUREES.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDuree(d)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                  duree === d
                    ? "bg-navy text-white border-navy"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {d} min
              </button>
            ))}
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
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Code voucher (optionnel)</label>
          <input
            value={voucherCode}
            onChange={e => setVoucherCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Paiement */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Paiement</h2>

        <div className="bg-secondary rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Prix calculé ({duree} min à {prixHeure} €/h)
          </p>
          <p className="text-lg font-bold text-foreground">{prixEstime} €</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Montant personnalisé (laissez vide pour utiliser le prix calculé)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={montantOverride}
              onChange={e => setMontantOverride(e.target.value)}
              placeholder={String(Math.round((prixHeure / 60) * duree))}
              className="w-40 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              checked={envoyerPaiement}
              onChange={() => setEnvoyerPaiement(true)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Envoyer un lien de paiement par email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Le client reçoit un email avec un lien Stripe sécurisé pour payer ({prixEstime} €).
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              checked={!envoyerPaiement}
              onChange={() => setEnvoyerPaiement(false)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Marquer comme confirmé (pas de paiement en ligne)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                La réservation est directement en statut &quot;En attente&quot;, à utiliser si le client paie en espèces ou par virement.
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
          <Check size={14} className="shrink-0" />
          {success}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-black hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all shadow-gold cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          {envoyerPaiement ? "Créer et envoyer le lien de paiement" : "Créer la réservation"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/vols")}
          className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
