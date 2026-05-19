import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CommandPalette } from "@/components/admin/CommandPalette";

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
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}