"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bot, Download } from "lucide-react";
import { deleteChatSession, type ChatSession } from "@/lib/actions/chat";
import {
  Button, ButtonLabel, EmptyState, PageHeader, Segmented, Sheet, SheetBody, SheetFooter, SheetHeader,
  Table, TableCell, TableHeaderCell, TableRow, TableSearch,
} from "@/components/pilote/studio";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { cn } from "@/lib/utils";

// Page Conversations assistant de l'admin (01/10, maquette validée) : les échanges
// des visiteurs avec le chatbot. Un tableau, la conversation entière dans un tiroir.

type Vue = "toutes" | "longues";

const TZ = "Europe/Brussels";
const jourKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

function fmtDernier(iso: string) {
  const d = new Date(iso);
  const jour = jourKey(iso) === jourKey(new Date().toISOString())
    ? "Aujourd'hui"
    : d.toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: TZ });
  const heure = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return { jour, heure };
}

const fmtHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

const nbQuestions = (s: ChatSession) => s.messages.filter((m) => m.role === "user").length;

function BotAvatar({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-st-ink-soft text-st-ink",
        size === "lg" ? "h-[52px] w-[52px]" : "h-9 w-9",
      )}
    >
      <Bot className={size === "lg" ? "size-6" : "size-[18px]"} />
    </span>
  );
}

// ── Contenu du tiroir ─────────────────────────────────────────
function ChatSheetContent({ session: s, onClose, onDeleted }: {
  session: ChatSession;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isPending, startTransition] = useTransition();
  const finRef = useRef<HTMLDivElement>(null);

  // Ouvre le tiroir sur le dernier message.
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [s.id]);

  function askDelete() {
    setPendingAction({
      title: "Supprimer cette conversation ?",
      consequences: [`Les ${s.messages.length} messages sont supprimés.`, "Cette action est définitive."],
      confirmLabel: "Supprimer la conversation",
      danger: true,
      run: () => {
        startTransition(async () => {
          await deleteChatSession(s.id);
          setPendingAction(null);
          onDeleted(s.id);
        });
      },
    });
  }

  const n = nbQuestions(s);
  const dernier = fmtDernier(s.last_message_at);

  return (
    <>
      <SheetHeader
        leading={<BotAvatar size="lg" />}
        title={`Conversation du ${new Date(s.last_message_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", timeZone: TZ })}`}
        subtitle={`${n} question${n > 1 ? "s" : ""} · dernier message à ${dernier.heure}`}
        onClose={onClose}
      />

      <SheetBody>
        <div className="space-y-2.5">
          {s.messages.map((m) => {
            const assistant = m.role === "assistant";
            return (
              <div key={m.id} className={cn("flex flex-col", assistant ? "items-end" : "items-start")}>
                <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px]", assistant ? "bg-st-ink text-white" : "bg-st-surface text-st-text")}>
                  {m.content}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-st-muted">
                  {assistant ? "Assistant" : "Visiteur"}
                  {m.created_at ? ` · ${fmtHeure(m.created_at)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div ref={finRef} />
      </SheetBody>

      <SheetFooter>
        <button
          type="button"
          onClick={askDelete}
          className="mx-auto block cursor-pointer text-[12.5px] font-semibold text-st-bad hover:underline"
        >
          Supprimer cette conversation
        </button>
      </SheetFooter>

      <ConfirmActionDialog
        action={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.run()}
      />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────
export function ChatClient({ sessions: initial }: { sessions: ChatSession[] }) {
  const [sessions, setSessions] = useState<ChatSession[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>("toutes");
  const [query, setQuery] = useState("");

  const longues = useMemo(() => sessions.filter((s) => nbQuestions(s) >= 3).length, [sessions]);

  const needle = query.trim().toLowerCase();
  const filtered = sessions
    .filter((s) => vue === "toutes" || nbQuestions(s) >= 3)
    .filter((s) => !needle || s.messages.some((m) => m.content.toLowerCase().includes(needle)));

  const open = sessions.find((s) => s.id === openId) ?? null;

  function removeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setOpenId(null);
  }

  function exportJson() {
    const data = sessions.map((s) => ({
      session_id: s.id,
      date: s.last_message_at,
      messages: s.messages.map((m) => ({ role: m.role, content: m.content })),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Conversations assistant"
        actions={
          sessions.length > 0 && (
            <Button variant="secondary" onClick={exportJson}>
              <Download /> <ButtonLabel full="Exporter JSON" short="Exporter" />
            </Button>
          )
        }
      />

      {sessions.length === 0 ? (
        <EmptyState icon={Bot} title="Aucune conversation" description="Les conversations des visiteurs apparaîtront ici." />
      ) : (
        <Table
          toolbar={
            <>
              <Segmented
                value={vue}
                onChange={setVue}
                items={[
                  { key: "toutes", label: "Toutes", count: sessions.length },
                  { key: "longues", label: "3 questions ou plus", count: longues },
                ]}
              />
              <TableSearch value={query} onChange={setQuery} placeholder="Rechercher dans les messages…" className="max-sm:w-full" />
            </>
          }
        >
          <thead>
            <tr>
              <TableHeaderCell>Première question</TableHeaderCell>
              <TableHeaderCell align="right">Questions</TableHeaderCell>
              <TableHeaderCell>Dernier message</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-st-muted">
                  {needle ? "Aucune conversation ne correspond." : "Aucune conversation dans cette vue."}
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const question = s.messages.find((m) => m.role === "user");
                const reponse = s.messages.find((m) => m.role === "assistant");
                const dernier = fmtDernier(s.last_message_at);
                return (
                  <TableRow key={s.id} onClick={() => setOpenId(s.id)} selected={openId === s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <BotAvatar />
                        <div className="min-w-0">
                          <p className="max-w-[520px] truncate font-[550] max-sm:max-w-none">{question?.content ?? "—"}</p>
                          {reponse && <p className="max-w-[520px] truncate text-xs text-st-muted max-sm:max-w-none">{reponse.content}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell align="right">{nbQuestions(s)}</TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap">{dernier.jour}</p>
                      <p className="text-xs text-st-muted">{dernier.heure}</p>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </tbody>
        </Table>
      )}

      <Sheet value={open} onClose={() => setOpenId(null)}>
        {(s) => <ChatSheetContent key={s.id} session={s} onClose={() => setOpenId(null)} onDeleted={removeSession} />}
      </Sheet>
    </>
  );
}
