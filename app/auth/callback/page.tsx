"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Les liens de confirmation Supabase déclenchés côté serveur (invitation pilote,
// magic link, reset) redirigent avec les tokens dans le FRAGMENT de l'URL
// (#access_token=...&refresh_token=...) — un Route Handler ne peut structurellement
// pas les lire, le fragment n'est jamais envoyé au serveur. D'où ce composant
// client : seul le navigateur peut lire window.location.hash et établir la
// session (supabase.auth.setSession écrit les cookies via @supabase/ssr, donc
// le middleware/serveur voient ensuite la session normalement).
// Le cas ?code= (PKCE) reste géré en repli, au cas où.
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const nextRaw = searchParams.get("next") ?? "/account";
    const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/account";
    const supabase = createClient();

    async function run() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) { router.replace(next); return; }
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { router.replace(next); return; }
      }

      setFailed(true);
    }
    run();
  }, [router, searchParams]);

  useEffect(() => {
    if (failed) router.replace("/login?error=confirmation_failed");
  }, [failed, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <p className="text-sm text-muted-foreground">Connexion en cours…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackInner />
    </Suspense>
  );
}
