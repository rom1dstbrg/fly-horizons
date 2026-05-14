import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/account/AccountForm";
import { AddressBook } from "@/components/account/AddressBook";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mon compte</h1>
            <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-sm text-primary hover:text-gold-400 transition-colors font-medium"
            >
              Mes commandes
            </Link>
            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-secondary text-xs"
              >
                Deconnexion
              </Button>
            </form>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="card-premium p-6">
          <h2 className="font-semibold text-foreground mb-5">
            Informations personnelles
          </h2>
          <AccountForm profile={profile} />
        </div>

        {/* Adresses */}
        <div className="card-premium p-6">
          <h2 className="font-semibold text-foreground mb-5">
            Mes adresses de livraison
          </h2>
          <AddressBook
            addresses={addresses ?? []}
            userId={user.id}
          />
        </div>

        {profile?.role === "admin" && (
          <div className="card-premium p-4">
            <Link
              href="/admin"
              className="text-sm text-primary hover:text-gold-400 font-medium transition-colors"
            >
              Acceder au dashboard admin
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}