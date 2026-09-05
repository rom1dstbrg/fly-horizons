"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, ThumbsDown, ImageIcon, X, User, Download, Trash2, Loader2, Compass } from "lucide-react";
import { deleteSatisfactionSurvey, deleteSurveyPhotos } from "@/lib/actions/satisfaction";
import { fmtDuration } from "@/lib/email-templates";
import { recoLabel, sourceLabel } from "@/lib/satisfaction";
import { AdminSheet, SheetSection, SheetRow } from "@/components/admin/ui/AdminSheet";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { PageToolbar, FilterChip, EmptyState } from "@/components/admin/ui";

interface Survey {
  id: string;
  notePreparation: number;
  notePilote: number;
  noteVol: number;
  noteQualitePrix: number;
  moyenne: number;
  recommandation: string | null;
  sourceDecouverte: string | null;
  commentaire: string | null;
  photos: string[];
  photoUrls: string[];
  createdAt: string;
  dateVol: string;
  duree: number;
  client: { id: string; prenom: string; nom: string; email: string } | null;
}

const FILTERS = ["Tous", "Excellents", "En retrait", "Ne recommande pas", "Avec photos"] as const;

const isTiede = (s: Survey) => s.recommandation === "non" || s.recommandation === "pas_sur";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          fill={i <= n ? "#F2B705" : "transparent"}
          stroke={i <= n ? "#F2B705" : "#d1d8e4"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function RecoBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const tone =
    value === "non"
      ? "text-red-700"
      : value === "pas_sur"
      ? "text-amber-700"
      : "text-emerald-700";
  return <span className={`text-xs font-semibold ${tone}`}>{recoLabel(value)}</span>;
}

function DrawerBody({
  survey,
  onPhotosCleared,
}: {
  survey: Survey;
  onPhotosCleared: () => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");

  async function handleDownloadAll() {
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        survey.photoUrls.map(async (url, i) => {
          const res = await fetch(url);
          const blob = await res.blob();
          zip.file(`photo-${i + 1}.webp`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `photos-${survey.client ? `${survey.client.prenom}-${survey.client.nom}` : survey.id}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setClearError("Échec du téléchargement des photos.");
    } finally {
      setDownloading(false);
    }
  }

  function handleClearPhotos() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setClearing(true);
    setClearError("");
    deleteSurveyPhotos(survey.id, survey.photos).then((result) => {
      setClearing(false);
      setConfirmClear(false);
      if (result?.error) setClearError(result.error);
      else onPhotosCleared();
    });
  }

  return (
    <>
      <SheetSection title="Notes">
        <SheetRow label="Préparation de la venue" value={<Stars n={survey.notePreparation} />} />
        <SheetRow label="Le pilote en vol" value={<Stars n={survey.notePilote} />} />
        <SheetRow label="Le vol en lui-même" value={<Stars n={survey.noteVol} />} />
        <SheetRow label="Rapport qualité / prix" value={<Stars n={survey.noteQualitePrix} />} />
        <SheetRow label="Moyenne" value={<span className="text-sm font-semibold text-foreground">{survey.moyenne}/5</span>} />
      </SheetSection>

      <SheetSection title="Recommandation & découverte">
        <SheetRow label="Recommanderait Fly Horizons" value={<RecoBadge value={survey.recommandation} />} />
        <SheetRow label="Nous a connus par" value={<span className="text-sm text-foreground">{sourceLabel(survey.sourceDecouverte)}</span>} />
      </SheetSection>

      {survey.commentaire && (
        <SheetSection title="Un mot du client">
          <p className="text-sm text-foreground leading-relaxed bg-secondary rounded-lg px-4 py-3 whitespace-pre-wrap">
            {survey.commentaire}
          </p>
        </SheetSection>
      )}

      {survey.photoUrls.length > 0 && (
        <SheetSection title={`Photos (${survey.photoUrls.length})`}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {survey.photoUrls.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(url)}
                className="aspect-square rounded-lg overflow-hidden border border-border cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer disabled:opacity-50"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {downloading ? "Préparation du zip…" : "Télécharger tout"}
            </button>
            <button
              type="button"
              onClick={handleClearPhotos}
              disabled={clearing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                confirmClear ? "bg-red-500 text-white" : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
              }`}
            >
              {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {clearing ? "Suppression…" : confirmClear ? "Confirmer ?" : "Supprimer les photos"}
            </button>
          </div>
          {clearError && <p className="text-xs text-red-600 mt-1.5">{clearError}</p>}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Supprime les photos du stockage pour libérer de l&apos;espace ; l&apos;avis et les notes sont conservés.
          </p>
        </SheetSection>
      )}

      {survey.client && (
        <SheetSection title="Client">
          <Link
            href={`/admin/clients/${survey.client.id}`}
            className="flex items-center gap-2 text-sm text-navy font-semibold hover:underline"
          >
            <User size={13} />
            {survey.client.prenom} {survey.client.nom}
          </Link>
        </SheetSection>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer"
            onClick={() => setLightbox(null)}
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Photo agrandie" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}

function SurveyCard({
  survey,
  onOpen,
  onDelete,
}: {
  survey: Survey;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const dateStr = survey.dateVol
    ? new Date(survey.dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {survey.client ? `${survey.client.prenom} ${survey.client.nom}` : "Client inconnu"}
            </p>
            <Stars n={Math.round(survey.moyenne)} />
            <span className="text-xs text-muted-foreground">{survey.moyenne}/5</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vol du {dateStr} · {fmtDuration(survey.duree)}
          </p>
          {survey.commentaire && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {survey.commentaire}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {isTiede(survey) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                <ThumbsDown size={11} /> {recoLabel(survey.recommandation)}
              </span>
            )}
            {survey.sourceDecouverte && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <Compass size={11} /> {sourceLabel(survey.sourceDecouverte)}
              </span>
            )}
            {survey.photos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <ImageIcon size={11} /> {survey.photos.length} photo{survey.photos.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <AdminRowActions onView={onOpen} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

export function SatisfactionClient({ surveys: initial }: { surveys: Survey[] }) {
  const [surveys, setSurveys] = useState<Survey[]>(initial);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous");
  const [drawer, setDrawer] = useState<Survey | null>(null);

  async function handleDelete(survey: Survey) {
    const result = await deleteSatisfactionSurvey(survey.id, survey.photos);
    if (!result?.error) {
      setSurveys((prev) => prev.filter((s) => s.id !== survey.id));
      if (drawer?.id === survey.id) setDrawer(null);
    }
    return result;
  }

  function handlePhotosCleared(id: string) {
    const cleared = { photos: [] as string[], photoUrls: [] as string[] };
    setSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, ...cleared } : s)));
    setDrawer((prev) => (prev?.id === id ? { ...prev, ...cleared } : prev));
  }

  const matches = (s: Survey) => {
    switch (filter) {
      case "Excellents": return s.moyenne >= 4.5;
      case "En retrait": return s.moyenne > 0 && s.moyenne <= 3;
      case "Ne recommande pas": return isTiede(s);
      case "Avec photos": return s.photos.length > 0;
      default: return true;
    }
  };

  const filtered = surveys.filter(matches);

  const counts: Record<typeof FILTERS[number], number> = {
    "Tous": surveys.length,
    "Excellents": surveys.filter((s) => s.moyenne >= 4.5).length,
    "En retrait": surveys.filter((s) => s.moyenne > 0 && s.moyenne <= 3).length,
    "Ne recommande pas": surveys.filter(isTiede).length,
    "Avec photos": surveys.filter((s) => s.photos.length > 0).length,
  };

  return (
    <>
      <div className="space-y-4">
        <PageToolbar
          filters={
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  active={filter === f}
                  count={counts[f]}
                  onClick={() => setFilter(f)}
                />
              ))}
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Star}
            title={filter !== "Tous" ? `Aucun avis "${filter.toLowerCase()}"` : "Aucun avis reçu"}
            description="Les avis envoyés par vos clients après leur vol apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                onOpen={() => setDrawer(s)}
                onDelete={() => handleDelete(s)}
              />
            ))}
          </div>
        )}
      </div>

      <AdminSheet
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.client ? `${drawer.client.prenom} ${drawer.client.nom}` : "Avis client"}
        subtitle={drawer ? `Vol du ${new Date(drawer.dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}` : undefined}
        width="w-[520px]"
      >
        {drawer && (
          <DrawerBody
            key={drawer.id}
            survey={drawer}
            onPhotosCleared={() => handlePhotosCleared(drawer.id)}
          />
        )}
      </AdminSheet>
    </>
  );
}
