import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { data: voucher, error } = await adminSupabase
    .from("voucher_codes")
    .select("id, code, duration_minutes, product_title, status, used_at, expires_at, created_at")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !voucher) {
    return NextResponse.json({ valid: false, error: "Code invalide" }, { status: 404 });
  }

  const now = new Date();
  const isExpired = voucher.expires_at ? new Date(voucher.expires_at) < now : false;

  if (isExpired && voucher.status === "unused") {
    await adminSupabase
      .from("voucher_codes")
      .update({ status: "expired" })
      .eq("id", voucher.id);
    return NextResponse.json({ valid: false, status: "expired" });
  }

  return NextResponse.json({
    valid: voucher.status === "unused",
    code: voucher.code,
    duration_minutes: voucher.duration_minutes,
    product_title: voucher.product_title,
    status: voucher.status,
    used_at: voucher.used_at,
    expires_at: voucher.expires_at,
  });
}
