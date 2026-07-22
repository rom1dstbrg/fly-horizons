"use client";

import { MessageCircle, ArrowRight } from "lucide-react";

export function ChatSidebarRow() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("fh:open-chat"))}
      className="group w-full flex items-center gap-4 p-5 hover:bg-secondary transition-colors cursor-pointer text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-[#0b2238] shrink-0 group-hover:bg-primary group-hover:border-primary group-hover:shadow-gold-sm transition-all">
        <MessageCircle size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-foreground text-sm">Chat IA</p>
        <p className="text-muted-foreground text-xs mt-0.5">Réponse instantanée</p>
      </div>
      <ArrowRight size={15} className="shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}
