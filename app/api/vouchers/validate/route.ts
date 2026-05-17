import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";

const VOUCHER_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

export async function GET(request: NextRequest) {
  const { allowed } = rateLimit(`voucher-validate:${getIp(request)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  if (!VOUCHER_CODE_RE.test(code.trim())) {
    return NextResponse.json({ valid: false, error: "Code invalide" }, { status: 404 });
  }

  const adminSupabase = createAdminClient();

  const { data: voucher, error } = await adminSupabase
    .from("voucher_codes")
    .select("id, code, duration_minutes, product_title, status, used_at, expires_at, created_at, products(price)")
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

  const productsJoin = voucher.products as { price: number } | { price: number }[] | null;
  const product_price = Array.isArray(productsJoin)
    ? (productsJoin[0]?.price ?? 0)
    : (productsJoin?.price ?? 0);

  return NextResponse.json({
    valid: voucher.status === "unused",
    id: voucher.id,
    code: voucher.code,
    duration_minutes: voucher.duration_minutes,
    product_price,
    product_title: voucher.product_title,
    status: voucher.status,
    used_at: voucher.used_at,
    expires_at: voucher.expires_at,
  });
}
