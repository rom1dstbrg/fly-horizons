"use client";

import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

export function AnnonceBookingForm({ annonceId, places }: { annonceId: string; places: number }) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [passagers, setPassagers] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/vol-annonce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annonce_id: annonceId, prenom, nom, email, telephone, passagers }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Erreur réseau, veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          required value={prenom} onChange={e => setPrenom(e.target.value)}
          placeholder="Prénom"
          className="h-11 px-3.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
        <input
          required value={nom} onChange={e => setNom(e.target.value)}
          placeholder="Nom"
          className="h-11 px-3.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>
      <input
        required type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full h-11 px-3.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
      <input
        value={telephone} onChange={e => setTelephone(e.target.value)}
        placeholder="Téléphone (optionnel)"
        className="w-full h-11 px-3.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre de passagers</label>
        <select
          value={passagers}
          onChange={e => setPassagers(Number(e.target.value))}
          className="w-full h-11 px-3.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          {Array.from({ length: places }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n} passager{n > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors disabled:opacity-60 cursor-pointer"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <>Réserver et payer <ArrowRight size={15} /></>}
      </button>
    </form>
  );
}
