"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSubscriber, unsubscribeSubscriber, resubscribeSubscriber, addSubscriberFromAdmin, type AddResult, type NewsletterTemplate } from "@/lib/actions/newsletter";
import { Users, Trash2, CheckCircle2, AlertCircle, Loader2, Mail, UserPlus, UserMinus, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatGrid, StatCard, FormSection, EmptyState, AdminBadge } from "@/components/admin/ui";
import { NewsletterEditor } from "@/components/admin/NewsletterEditor";

type Subscriber = {
  id: string;
  email: string;
  prenom: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  active: boolean;
};

type Props = {
  total: number;
  active: number;
  subscribers: Subscriber[];
  templates: NewsletterTemplate[];
};

export function NewsletterClient({ total, active, subscribers, templates }: Props) {
  const router = useRouter();
  const [addResult, addAction, addPending] = useActionState<AddResult, FormData>(addSubscriberFromAdmin, null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);
  const [resubscribingId, setResubscribingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteSubscriber(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUnsubscribe(id: string) {
    setUnsubscribingId(id);
    try {
      await unsubscribeSubscriber(id);
      router.refresh();
    } finally {
      setUnsubscribingId(null);
    }
  }

  async function handleResubscribe(id: string) {
    setResubscribingId(id);
    try {
      await resubscribeSubscriber(id);
      router.refresh();
    } finally {
      setResubscribingId(null);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6">

      <PageHeader title="Newsletter" subtitle="Gérez vos abonnés et envoyez des campagnes" />

      <StatGrid cols={2}>
        <StatCard label="Abonnés actifs" value={active} variant="emerald" icon={Users} />
        <StatCard label="Total inscrits"  value={total}  variant="info"   icon={Mail}  />
      </StatGrid>

      {/* Ajouter un abonné */}
      <div className="bg-white rounded-xl border border-border p-5">
        <FormSection title="Ajouter un abonné" />

        {addResult?.ok && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 size={15} className="shrink-0" />
            Abonné ajouté avec succès.
          </div>
        )}
        {addResult?.error && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm bg-red-50 text-red-700 border border-red-200">
            <AlertCircle size={15} className="shrink-0" />
            {addResult.error}
          </div>
        )}

        <form action={addAction} className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Prénom <span className="font-normal text-muted-foreground/60">(optionnel)</span></label>
            <input
              name="prenom"
              placeholder="Romain"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-all"
            />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="client@example.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={addPending}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
          >
            {addPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Ajouter
          </button>
        </form>
      </div>

      {/* Éditeur de newsletter */}
      <div className="bg-white rounded-xl border border-border p-5">
        <FormSection title="Créer et envoyer une newsletter" />
        <NewsletterEditor activeCount={active} initialTemplates={templates} />
      </div>

      {/* Liste abonnés */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Abonnés ({total})</h2>
        </div>

        {subscribers.length === 0 ? (
          <div className="py-4">
            <EmptyState icon={Users} title="Aucun abonné" description="Les abonnés à la newsletter apparaîtront ici." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {subscribers.map(sub => (
              <div key={sub.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {sub.prenom ? `${sub.prenom} — ` : ""}{sub.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inscrit le {new Date(sub.subscribed_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <AdminBadge variant={sub.active ? "success" : "secondary"} label={sub.active ? "Actif" : "Désinscrit"} />
                {sub.active ? (
                  <button
                    onClick={() => handleUnsubscribe(sub.id)}
                    disabled={unsubscribingId === sub.id}
                    className="p-1.5 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    title="Désabonner"
                  >
                    {unsubscribingId === sub.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <UserMinus size={14} />
                    }
                  </button>
                ) : (
                  <button
                    onClick={() => handleResubscribe(sub.id)}
                    disabled={resubscribingId === sub.id}
                    className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    title="Réabonner"
                  >
                    {resubscribingId === sub.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <UserCheck size={14} />
                    }
                  </button>
                )}
                <button
                  onClick={() => handleDelete(sub.id)}
                  disabled={deletingId === sub.id}
                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                  title="Supprimer"
                >
                  {deletingId === sub.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
