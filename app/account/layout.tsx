import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { AccountShell } from "@/components/account/AccountShell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const userData = {
    email: user.email!,
    full_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
    is_admin: profile?.role === "admin",
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <div className="flex-1">
        <AccountShell user={userData}>
          {children}
        </AccountShell>
      </div>
    </div>
  );
}
