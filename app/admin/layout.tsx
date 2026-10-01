import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_NAV_COOKIE } from "@/components/admin/admin-nav";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { SignalConfigProvider } from "@/components/admin/SignalConfigProvider";
import { getAppSettings } from "@/lib/app-settings-server";
import { signalConfigFrom } from "@/lib/reservation-signals";

export const metadata: Metadata = {
  title: "Fly Horizons Admin",
  manifest: "/admin-manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FH Admin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b2238",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const signalConfig = signalConfigFrom(await getAppSettings());

  const initialCollapsed = (await cookies()).get(ADMIN_NAV_COOKIE)?.value === "collapsed";

  return (
    <AdminShell initialCollapsed={initialCollapsed}>
      <CommandPalette />
      {/* Même largeur plafonnée que l'espace pilote : sur un grand écran, le contenu ne s'étire pas. */}
      <div className="mx-auto w-full max-w-[1320px]">
        <SignalConfigProvider value={signalConfig}>{children}</SignalConfigProvider>
      </div>
    </AdminShell>
  );
}
