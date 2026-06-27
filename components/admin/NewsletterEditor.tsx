"use client";

import { useActionState, useState, useMemo, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlignLeft, Heading1, Heading2, MousePointerClick, ImageIcon,
  Sparkles, Minus, ChevronUp, ChevronDown, Trash2, Plus,
  Send, Loader2, CheckCircle2, AlertCircle, Eye, BookMarked,
  Save, X, Pencil,
} from "lucide-react";
import {
  sendNewsletterBlocks, saveNewsletterTemplate, updateNewsletterTemplate,
  deleteNewsletterTemplate,
  type SendResult, type TemplateResult, type NewsletterTemplate,
} from "@/lib/actions/newsletter";
import { newsletterFromBlocksEmail, type NewsletterBlock } from "@/lib/email-templates";

// ─── Constantes ───────────────────────────────────────────────────────────────

const EMAIL_WIDTH = 592; // 560px content + marges emailBase

const BLOCK_META = [
  { type: "text"      as const, label: "Texte",      Icon: AlignLeft,          desc: "Paragraphe libre" },
  { type: "heading"   as const, label: "Titre",       Icon: Heading1,           desc: "H1 ou H2" },
  { type: "button"    as const, label: "Bouton",      Icon: MousePointerClick,  desc: "CTA doré + lien" },
  { type: "image"     as const, label: "Image",       Icon: ImageIcon,          desc: "Image par URL" },
  { type: "callout"   as const, label: "Encadré",     Icon: Sparkles,           desc: "Bloc gold" },
  { type: "separator" as const, label: "Séparateur",  Icon: Minus,              desc: "Ligne" },
] as const;

function newBlock(type: NewsletterBlock["type"]): NewsletterBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "text":      return { id, type, content: "" };
    case "heading":   return { id, type, level: 1, text: "" };
    case "button":    return { id, type, text: "Découvrir nos vols", url: "https://fly-horizons.com" };
    case "image":     return { id, type, url: "", alt: "", link: "" };
    case "callout":   return { id, type, text: "" };
    case "separator": return { id, type };
  }
}

const inp = "w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-all bg-background";
const lbl = "text-xs font-medium text-muted-foreground block mb-1";

// ─── Éditeurs de blocs ────────────────────────────────────────────────────────

function BlockContent({
  block,
  onChange,
}: {
  block: NewsletterBlock;
  onChange: (u: Partial<NewsletterBlock>) => void;
}) {
  switch (block.type) {
    case "text":
      return (
        <textarea
          value={block.content}
          onChange={e => onChange({ content: e.target.value })}
          rows={4}
          placeholder="Votre texte ici…"
          className={inp + " resize-y"}
        />
      );
    case "heading":
      return (
        <div className="space-y-2">
          <input
            value={block.text}
            onChange={e => onChange({ text: e.target.value })}
            placeholder="Titre…"
            className={inp}
          />
          <div className="flex gap-2">
            {([1, 2] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => onChange({ level: lvl })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  block.level === lvl
                    ? "bg-navy text-white border-navy"
                    : "bg-background border-border text-muted-foreground hover:border-navy/30"
                }`}
              >
                {lvl === 1 ? <Heading1 size={12} /> : <Heading2 size={12} />}
                {lvl === 1 ? "Grand" : "Moyen"}
              </button>
            ))}
          </div>
        </div>
      );
    case "button":
      return (
        <div className="space-y-2">
          <div>
            <label className={lbl}>Texte du bouton</label>
            <input value={block.text} onChange={e => onChange({ text: e.target.value })} placeholder="Réserver mon vol" className={inp} />
          </div>
          <div>
            <label className={lbl}>URL</label>
            <input value={block.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://…" className={inp} />
          </div>
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <div>
            <label className={lbl}>URL de l'image</label>
            <input value={block.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://fly-horizons.com/photo.jpg" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Texte alternatif</label>
              <input value={block.alt ?? ""} onChange={e => onChange({ alt: e.target.value })} placeholder="Description…" className={inp} />
            </div>
            <div>
              <label className={lbl}>Lien au clic (optionnel)</label>
              <input value={block.link ?? ""} onChange={e => onChange({ link: e.target.value })} placeholder="https://…" className={inp} />
            </div>
          </div>
        </div>
      );
    case "callout":
      return (
        <textarea
          value={block.text}
          onChange={e => onChange({ text: e.target.value })}
          rows={3}
          placeholder="Texte encadré (annonce, info importante…)"
          className={inp + " resize-y"}
        />
      );
    case "separator":
      return (
        <div className="flex items-center gap-2 py-1">
          <hr className="flex-1 border-dashed border-border" />
          <span className="text-[10px] text-muted-foreground/50 select-none">séparateur</span>
          <hr className="flex-1 border-dashed border-border" />
        </div>
      );
  }
}

function BlockItem({
  block, idx, total, onUpdate, onRemove, onMove,
}: {
  block: NewsletterBlock; idx: number; total: number;
  onUpdate: (u: Partial<NewsletterBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const meta = BLOCK_META.find(m => m.type === block.type)!;
  const Icon = meta.Icon;
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border">
        <Icon size={12} className="text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground flex-1">{meta.label}</span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={idx === 0}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed">
            <ChevronUp size={13} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={idx === total - 1}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed">
            <ChevronDown size={13} />
          </button>
          <button type="button" onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer ml-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="p-3">
        <BlockContent block={block} onChange={onUpdate} />
      </div>
    </div>
  );
}

function AddBlockPanel({ onAdd, onClose }: { onAdd: (t: NewsletterBlock["type"]) => void; onClose: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground">Type de bloc</p>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
          Annuler
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BLOCK_META.map(({ type, label, Icon, desc }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-navy/30 hover:bg-secondary/60 transition-colors text-center cursor-pointer group"
          >
            <Icon size={16} className="text-muted-foreground group-hover:text-navy transition-colors" />
            <span className="text-xs font-semibold text-foreground">{label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Panneau templates ────────────────────────────────────────────────────────

function TemplatesPanel({
  templates,
  subject,
  blocks,
  onLoad,
  onDeleted,
}: {
  templates: NewsletterTemplate[];
  subject: string;
  blocks: NewsletterBlock[];
  onLoad: (t: NewsletterTemplate) => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [saveResult, saveAction, saving] = useActionState<TemplateResult, FormData>(saveNewsletterTemplate, null);
  const [updateResult, updateAction, updating] = useActionState<TemplateResult, FormData>(updateNewsletterTemplate, null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  useEffect(() => {
    if (saveResult?.id) { setShowSaveForm(false); router.refresh(); }
  }, [saveResult, router]);

  useEffect(() => {
    if (updateResult?.id) { setEditingId(null); router.refresh(); }
  }, [updateResult, router]);

  function handleDelete(id: string) {
    setDeletingId(id);
    startDelete(async () => {
      await deleteNewsletterTemplate(id);
      onDeleted(id);
      setDeletingId(null);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <BookMarked size={12} className="text-muted-foreground" />
          Templates enregistrés
        </h3>
        {!showSaveForm && (
          <button
            type="button"
            onClick={() => setShowSaveForm(true)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors cursor-pointer"
          >
            <Save size={11} />
            Enregistrer le contenu actuel
          </button>
        )}
      </div>

      {/* Formulaire de sauvegarde */}
      {showSaveForm && (
        <form action={saveAction} className="flex items-center gap-2 mb-3">
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="blocks"  value={JSON.stringify(blocks)} />
          <input
            name="name"
            required
            autoFocus
            placeholder="Nom du template…"
            className={inp + " flex-1"}
          />
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white rounded-lg text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 cursor-pointer shrink-0">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Sauver
          </button>
          <button type="button" onClick={() => setShowSaveForm(false)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer">
            <X size={13} />
          </button>
        </form>
      )}
      {saveResult?.error && (
        <p className="text-xs text-red-600 mb-2">{saveResult.error}</p>
      )}

      {/* Liste des templates */}
      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun template pour l'instant.</p>
      ) : (
        <div className="space-y-1">
          {templates.map(t => (
            <div key={t.id} className="group flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              {editingId === t.id ? (
                <form action={updateAction} className="flex items-center gap-2 flex-1">
                  <input type="hidden" name="id"      value={t.id} />
                  <input type="hidden" name="subject" value={t.subject} />
                  <input type="hidden" name="blocks"  value={JSON.stringify(t.blocks)} />
                  <input
                    name="name"
                    required
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className={inp + " flex-1 py-1 text-xs"}
                  />
                  <button type="submit" disabled={updating}
                    className="p-1.5 bg-navy text-white rounded-lg cursor-pointer hover:bg-navy/90 transition-colors">
                    {updating ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                    <X size={11} />
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                    {t.subject && (
                      <p className="text-[10px] text-muted-foreground truncate">{t.subject}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoad(t)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-navy bg-navy/8 hover:bg-navy/15 rounded-lg transition-colors cursor-pointer"
                    >
                      Charger
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(t.id); setEditingName(t.name); }}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {deletingId === t.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Trash2 size={11} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Éditeur principal ────────────────────────────────────────────────────────

export function NewsletterEditor({
  activeCount,
  initialTemplates,
}: {
  activeCount: number;
  initialTemplates: NewsletterTemplate[];
}) {
  const [sendResult, sendAction, sending] = useActionState<SendResult, FormData>(sendNewsletterBlocks, null);

  const [subject, setSubject]   = useState("");
  const [blocks, setBlocks]     = useState<NewsletterBlock[]>([newBlock("text")]);
  const [confirmSend, setConfirmSend] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Templates (optimistic delete)
  const [templates, setTemplates] = useState<NewsletterTemplate[]>(initialTemplates);
  useEffect(() => setTemplates(initialTemplates), [initialTemplates]);

  // Preview sizing
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(460);
  const [iframeHeight, setIframeHeight]     = useState(700);

  useEffect(() => {
    if (sendResult) setConfirmSend(false);
  }, [sendResult]);

  // Measure preview column width
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    obs.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => obs.disconnect();
  }, []);

  // Receive auto-height from iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "fh-preview-height") {
        setIframeHeight((e.data.height as number) + 48);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Inject height-reporter script into preview HTML
  const previewHtml = useMemo(() => {
    const html = newsletterFromBlocksEmail(subject || "(Sujet)", blocks, "Prénom", "#");
    const script = `<script>
      function r(){window.parent.postMessage({type:"fh-preview-height",height:document.documentElement.scrollHeight},"*")}
      window.addEventListener("load",r);
      new MutationObserver(r).observe(document.documentElement,{childList:true,subtree:true});
    <\/script>`;
    return html.replace("</body>", script + "\n</body>");
  }, [subject, blocks]);

  const scale = Math.min(1, containerWidth / EMAIL_WIDTH);
  const scaledHeight = Math.ceil(iframeHeight * scale);

  // Block manipulation
  function addBlock(type: NewsletterBlock["type"]) {
    setBlocks(b => [...b, newBlock(type)]);
    setShowAddPanel(false);
  }
  function updateBlock(id: string, updates: Partial<NewsletterBlock>) {
    setBlocks(b => b.map(bl => bl.id === id ? { ...bl, ...updates } as NewsletterBlock : bl));
  }
  function removeBlock(id: string) {
    setBlocks(b => b.filter(bl => bl.id !== id));
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks(b => {
      const idx = b.findIndex(bl => bl.id === id);
      if (idx < 0) return b;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= b.length) return b;
      const arr = [...b];
      [arr[idx], arr[newIdx]] = [arr[newIdx]!, arr[idx]!];
      return arr;
    });
  }
  function loadTemplate(t: NewsletterTemplate) {
    setSubject(t.subject);
    setBlocks(t.blocks.map(b => ({ ...b, id: crypto.randomUUID() })));
  }

  const canSend = subject.trim().length > 0 && blocks.length > 0 && activeCount > 0;

  return (
    <div className="grid lg:grid-cols-[1fr_620px] gap-6 items-start">

      {/* ── Colonne gauche : éditeur ───────────────────────────────── */}
      <div className="space-y-3">

        {/* Alertes envoi */}
        {sendResult?.sent !== undefined && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${sendResult.failed === 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            <CheckCircle2 size={15} className="shrink-0" />
            {sendResult.sent} email{sendResult.sent !== 1 ? "s" : ""} envoyé{sendResult.sent !== 1 ? "s" : ""}
            {(sendResult.failed ?? 0) > 0 && ` · ${sendResult.failed} échec${sendResult.failed! > 1 ? "s" : ""}`}
          </div>
        )}
        {sendResult?.error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            <AlertCircle size={15} className="shrink-0" />{sendResult.error}
          </div>
        )}

        {/* Templates */}
        <TemplatesPanel
          templates={templates}
          subject={subject}
          blocks={blocks}
          onLoad={loadTemplate}
          onDeleted={id => setTemplates(ts => ts.filter(t => t.id !== id))}
        />

        {/* Sujet */}
        <div className="bg-white rounded-xl border border-border p-4">
          <label className={lbl}>Sujet de l'email</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Ex : Nouveauté Fly Horizons — Disponibilités été 2026"
            className={inp}
          />
        </div>

        {/* Blocs */}
        {blocks.map((block, idx) => (
          <BlockItem
            key={block.id}
            block={block}
            idx={idx}
            total={blocks.length}
            onUpdate={u => updateBlock(block.id, u)}
            onRemove={() => removeBlock(block.id)}
            onMove={dir => moveBlock(block.id, dir)}
          />
        ))}

        {/* Ajouter un bloc */}
        {showAddPanel
          ? <AddBlockPanel onAdd={addBlock} onClose={() => setShowAddPanel(false)} />
          : (
            <button
              type="button"
              onClick={() => setShowAddPanel(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-navy/30 hover:bg-secondary/40 transition-all cursor-pointer"
            >
              <Plus size={14} />
              Ajouter un bloc
            </button>
          )
        }

        {/* Envoi */}
        {activeCount === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Aucun abonné actif pour le moment.
          </p>
        )}

        {!confirmSend ? (
          <button
            type="button"
            disabled={!canSend}
            onClick={() => setConfirmSend(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={14} />
            Envoyer à {activeCount} abonné{activeCount !== 1 ? "s" : ""}
          </button>
        ) : (
          <form action={sendAction}>
            <input type="hidden" name="subject" value={subject} />
            <input type="hidden" name="blocks"  value={JSON.stringify(blocks)} />
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex-1">
                Confirmer l'envoi à <strong>{activeCount} abonné{activeCount !== 1 ? "s" : ""}</strong> ?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmSend(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg bg-white hover:text-foreground transition-colors cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-navy text-white rounded-lg font-semibold hover:bg-navy/90 transition-colors disabled:opacity-60 cursor-pointer">
                  {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Confirmer
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── Colonne droite : aperçu ─────────────────────────────────── */}
      <div className="lg:sticky lg:top-24" ref={previewContainerRef}>
        <div className="bg-secondary rounded-xl border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Eye size={12} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Aperçu — tel que reçu
              {scale < 1 && (
                <span className="ml-1.5 text-muted-foreground/50">
                  ({Math.round(scale * 100)}%)
                </span>
              )}
            </span>
          </div>

          {/* Conteneur scalé */}
          <div
            className="rounded-lg overflow-hidden bg-white shadow-sm relative"
            style={{ height: scaledHeight || 400 }}
          >
            <iframe
              key={previewHtml}
              srcDoc={previewHtml}
              title="Aperçu newsletter"
              sandbox="allow-scripts"
              style={{
                border: 0,
                display: "block",
                width: EMAIL_WIDTH,
                height: iframeHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
