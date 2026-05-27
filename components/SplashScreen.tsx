"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    if (sessionStorage.getItem("fh-splash")) return;

    setPhase("visible");
    const fadeTimer = setTimeout(() => setPhase("fading"), 400);
    const hideTimer = setTimeout(() => {
      setPhase("hidden");
      sessionStorage.setItem("fh-splash", "1");
    }, 700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <Image
        src="/logo-header.png"
        alt="Fly Horizons"
        width={260}
        height={70}
        priority
      />
      <div className="mt-10 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
