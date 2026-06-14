"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createHorSiteReservation } from "@/lib/actions/reservations";
import { Loader2, UserPlus, Users, Search, Check, TrendingUp, TrendingDown } from "lucide-react";

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
}

interface Props {
  clients: Client[];
  prixHeure: number;
}

export function CreateHorSiteForm({ clients, prixHeure }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clientMode, setClientMode] = useState<"existing" | "new">("new");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [newPrenom, setNewPrenom] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelephone, setNewTelephone] = useState("");

  const [typeResa, setTypeResa] = useState<"standard" | "perso">("standard");
  const [dateVol, setDateVol] = useState("");
  const [heureVol, setHeureVol] = useState("");
  const [duree, setDuree] = useState<string>("60");
  const [passagers, setPassagers] = useState(1);
  const [poidsTotal, setPoidsTotal] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const [prixDuOverride, setPrixDuOverride] = useState<string>("");
  const [montantRecu, setMontantRecu] = useState<string>("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const dureeNum = parseFloat(duree) || 0;

  const prixCalcule = useMemo(() => {
    if (dureeNum <= 0) return 0;
    return Math.round((prixHeure / 60) * dureeNum * 100) / 100;
  }, [prixHeure, dureeNum]);

  const prixDu = useMemo(() => {
    const override = parseFloat(prixDuOverride);
    if (!isNaN(override) && override >= 0) return override;
    return prixCalcule;
  }, [prixDuOverride, prixCalcule]);

  const montantRecuNum = parseFloat(montantRecu) || 0;
  const surplus = montantRecuNum - prixDu;
  const hasSurplus = montantRecu !== "" && prixDu > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!dateVol) { setError("La date est obligatoire."); return; }
    if (dureeNum <= 0) { setError("La durée doit être supérieure à 0."); return; }
    if (clientMode === "existing" && !selectedClientId) {
      setError("Sélectionnez un client existant."); return;
    }
    if (clientMode === "new" && (!newPrenom || !newNom)) {
      setError("Prénom et nom obligatoires."); return;
    }
    if (montantRecu === "") { setError("Renseignez le montant reçu."); return; }

    startTransition(async () => {
      const result = await createHorSiteReservation({
        client_id: clientMode === "existing" ? selectedClientId : undefined,
        prenom: clientMode === "new" ? newPrenom : undefined,
        nom: clientMode === "new" ? newNom : undefined,
        email: clientMode === "new" ? (newEmail || undefined) : undefined,
        telephone: clientMode === "new" ? (newTelephone || undefined) : undefined,
        type_resa: typeResa,
        date_vol: dateVol,
        heure_vol: heureVol || undefined,
        duree: Math.round(dureeNum),
        passagers,
        poids_total: poidsTotal ? parseInt(poidsTotal) : null,
        commentaire: commentaire || undefined,
        prix_du: prixDu,
        montant_recu: montantRecuNum,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
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
            onClick={() => { setClientMode("new"); setSelectedClientId(""); setClientSearch(""); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              clientMode === "new"
                ? "bg-navy text-white border-navy"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <UserPlus size={14} /> Nouveau client
          </button>
          <button
            type="button"
            onClick={() => { setClientMode("existing"); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              clientMode === "existing"
                ? "bg-navy text-white border-navy"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Users size={14} /> Client existant
          </button>
        </div>

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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email <span className="text-muted-foreground/60 font-normal">(optionnel)</span></label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="Pour les emails futurs"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Téléphone</label>
              <input type="tel" value={newTelephone} onChange={e => setNewTelephone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        )}

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
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0 cursor-pointer"
                    >
                      <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-muted-foreground">{c.email ?? "—"}{c.telephone ? ` · ${c.telephone}` : ""}</p>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedClient && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <Check size={14} className="text-emerald-600 shrink-0" />
                <span className="font-medium text-emerald-700">{selectedClient.prenom} {selectedClient.nom}</span>
                {selectedClient.email && <span className="text-emerald-600 text-xs">{selectedClient.email}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vol */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Détails du vol</h2>

        <div className="flex gap-2">
          {(["standard", "perso"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeResa(t)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                typeResa === t
                  ? "bg-navy text-white border-navy"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t === "standard" ? "Standard" : "Sur mesure"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date du vol *</label>
            <input type="date" value={dateVol} onChange={e => setDateVol(e.target.value)} required
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Heure de départ <span className="text-muted-foreground/60 font-normal">(optionnel)</span></label>
            <input type="time" value={heureVol} onChange={e => setHeureVol(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durée réelle du vol (minutes) *</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              value={duree}
              onChange={e => setDuree(e.target.value)}
              placeholder="Ex : 55"
              className="w-32 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">min</span>
            {dureeNum > 0 && (
              <span className="text-xs text-muted-foreground">
                = {Math.floor(dureeNum / 60) > 0 ? `${Math.floor(dureeNum / 60)}h` : ""}{dureeNum % 60 > 0 ? `${dureeNum % 60}` : ""}
                {Math.floor(dureeNum / 60) > 0 && dureeNum % 60 > 0 ? "min" : Math.floor(dureeNum / 60) === 0 ? "min" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Passagers</label>
            <select value={passagers} onChange={e => setPassagers(parseInt(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
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
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Commentaire / notes</label>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            rows={2}
            placeholder="Route, conditions, remarques…"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>

      {/* Finance */}
      <div className="card-premium p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Finances</h2>

        {dureeNum > 0 && (
          <div className="bg-secondary rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Prix calculé ({dureeNum} min × {prixHeure} €/h)
            </p>
            <p className="text-lg font-bold text-foreground">{prixCalcule.toFixed(2)} €</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Prix dû <span className="text-muted-foreground/60 font-normal">(calculé auto, modifiable)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={prixDuOverride}
                onChange={e => setPrixDuOverride(e.target.value)}
                placeholder={prixCalcule.toFixed(2)}
                className="w-36 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Montant reçu *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={montantRecu}
                onChange={e => setMontantRecu(e.target.value)}
                placeholder="Ex : 250.00"
                className="w-36 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
          </div>
        </div>

        {hasSurplus && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium ${
            surplus >= 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {surplus >= 0
              ? <TrendingUp size={14} className="shrink-0" />
              : <TrendingDown size={14} className="shrink-0" />
            }
            <span>
              {surplus >= 0 ? "Surplus" : "Déficit"} :{" "}
              <span className="font-bold">{surplus >= 0 ? "+" : ""}{surplus.toFixed(2)} €</span>
              <span className="ml-2 font-normal text-xs opacity-75">
                ({montantRecuNum.toFixed(2)} reçu − {prixDu.toFixed(2)} dû)
              </span>
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          La réservation sera enregistrée comme <strong>vol effectué / payé</strong>. Aucun email ne sera envoyé.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <Check size={14} className="shrink-0" />
          Réservation hors-site enregistrée. Redirection…
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-black hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all shadow-gold cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Enregistrer le vol
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
