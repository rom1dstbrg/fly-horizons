import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransactionsData } from "@/lib/transactions";
import { generateTransactionsPDFBuffer } from "@/lib/pdf/transactions-pdf";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const data = await getTransactionsData();
  const buffer = await generateTransactionsPDFBuffer(data);
  const filename = `transactions-fly-horizons-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
