"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Clic sur une notification push alors que l'app est déjà ouverte : le service
// worker ne peut pas naviguer de façon fiable sur iPhone (client.navigate échoue
// souvent), il envoie donc l'adresse ici et c'est le routeur de l'app qui y va.
export function PushNavigator() {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const url = e.data?.type === "navigate" ? e.data.url : null;
      if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) router.push(url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);
  return null;
}
