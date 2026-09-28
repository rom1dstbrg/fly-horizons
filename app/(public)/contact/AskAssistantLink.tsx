"use client";

// Lien texte qui ouvre l'assistant (ChatWidget écoute « fh:open-chat »).
export function AskAssistantLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("fh:open-chat"))}
      className={`cursor-pointer ${className ?? ""}`}
    >
      Demandez à l&apos;assistant
    </button>
  );
}
