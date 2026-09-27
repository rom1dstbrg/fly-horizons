import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteTransactionsClient } from "@/components/pilote/PiloteTransactionsClient";
import { getPiloteTransactions } from "@/lib/pilote/transactions";
import { todayBrussels } from "@/lib/pilote/transactions-shared";

export const metadata = { title: "Transactions — Espace pilote" };

export default async function PiloteTransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).single();
  const rows = pilote ? await getPiloteTransactions(pilote.id) : [];
  const today = todayBrussels();

  return (
    <div className="space-y-5">
      <PiloteTransactionsClient rows={rows} today={today} />
    </div>
  );
}
