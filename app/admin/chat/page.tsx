"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChevronDown, Download, Bot, User, Loader2 } from "lucide-react";
import { getChatSessions, type ChatSession } from "@/lib/actions/chat";

export default function AdminChatPage() {
  const [sessions, setSessions]   = useState<ChatSession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [openId, setOpenId]       = useState<string | null>(null);

  useEffect(() => {
    getChatSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  function exportJson() {
    const data = sessions.map(s => ({
      session_id: s.id,
      date: s.last_message_at,
      messages: s.messages.map(m => ({ role: m.role, content: m.content })),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `chat-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalMessages = sessions.reduce((s, sess) => s + sess.messages.filter(m => m.role === "user").length, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Conversations assistant"
          subtitle={loading ? "Chargement…" : `${sessions.length} conversation${sessions.length > 1 ? "s" : ""} · ${totalMessages} question${totalMessages > 1 ? "s" : ""} clients`}
        />
        {!loading && sessions.length > 0 && (
          <button
            onClick={exportJson}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Download size={14} />
            Exporter JSON
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Chargement des conversations…</span>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Aucune conversation pour l&apos;instant.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const firstUserMsg = session.messages.find(m => m.role === "user");
            const userMsgCount = session.messages.filter(m => m.role === "user").length;
            const isOpen       = openId === session.id;
            const date         = new Date(session.last_message_at).toLocaleDateString("fr-BE", {
              day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            });

            return (
              <div key={session.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : session.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {firstUserMsg?.content ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {date} · {userMsgCount} question{userMsgCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <div className="border-t border-border px-4 py-4 space-y-3 bg-[#f5f5f7]">
                      {session.messages.map(msg => (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="w-6 h-6 rounded-full bg-[#0b2238] flex items-center justify-center shrink-0 mt-0.5">
                              <Bot size={11} className="text-[#F2B705]" />
                            </div>
                          )}
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-[#0b2238] text-white"
                              : "bg-white border border-border text-foreground shadow-sm"
                          }`}>
                            {msg.content}
                          </div>
                          {msg.role === "user" && (
                            <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                              <User size={11} className="text-foreground/60" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
