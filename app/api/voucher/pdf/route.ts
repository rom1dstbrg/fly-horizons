import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateVoucherPDFBuffer } from "@/lib/pdf/voucher-pdf";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code manquant" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const adminSupabase = createAdminClient();

  const { data: voucher } = await adminSupabase
    .from("voucher_codes")
    .select("code, duration_minutes, product_title, expires_at, order_id, recipient_email")
    .eq("code", code.toUpperCase())
    .single();

  if (!voucher) return NextResponse.json({ error: "Code introuvable" }, { status: 404 });

  // Vérification : le voucher appartient bien à une commande de cet utilisateur
  const { data: order } = await adminSupabase
    .from("orders")
    .select("user_id")
    .eq("id", voucher.order_id)
    .single();

  const isOwner = order?.user_id === user.id;
  const isRecipient = voucher.recipient_email === user.email;
  if (!isOwner && !isRecipient) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const expiresAt = voucher.expires_at ? new Date(voucher.expires_at) : (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  })();

  const pdfBuffer = await generateVoucherPDFBuffer({
    code: voucher.code,
    duration_minutes: voucher.duration_minutes,
    product_title: voucher.product_title ?? "",
    expiresAt,
  });

  const filename = `bon-vol-${voucher.code.slice(0, 8).toLowerCase()}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
