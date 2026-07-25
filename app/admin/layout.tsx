import type { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CommandPalette } from "@/components/admin/CommandPalette";

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

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <CommandPalette />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen">
        <div className="px-4 pt-16 pb-[calc(76px+env(safe-area-inset-bottom))] sm:px-6 sm:pt-16 lg:p-8 lg:pt-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}