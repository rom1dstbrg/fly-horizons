import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewsletterSection } from "./NewsletterSection";

export const metadata: Metadata = { title: "Newsletter — Fly Horizons" };

export default async function NewsletterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();
  const { data: sub } = await adminSupabase
    .from("newsletter_subscribers")
    .select("active")
    .eq("email", user.email!.toLowerCase())
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Actualités et offres Fly Horizons</p>
      </div>
      <NewsletterSection newsletterActive={sub?.active ?? null} />
    </div>
  );
}
