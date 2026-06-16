"use client";

import { Sparkles } from "lucide-react";

export function OpenChatButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("fh:open-chat"))}
      className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-[#0b2238] rounded-lg font-black text-sm hover:bg-[#e6a800] transition-colors shadow-gold cursor-pointer"
    >
      <Sparkles size={14} />
      Poser une question maintenant
    </button>
  );
}
