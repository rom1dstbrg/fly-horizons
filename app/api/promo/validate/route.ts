import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { allowed } = rateLimit(`promo-validate:${getIp(request)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ valid: false, error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  const code = request.nextUrl.searchParams.get("code")?.toUpperCase().trim();
  if (!code) {
    return NextResponse.json({ valid: false, error: "Code manquant" });
  }

  const supabase = createAdminClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("code, type, value, expires_at, max_uses, usage_count, active, applies_to")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Code invalide." });
  }
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return NextResponse.json({ valid: false, error: "Ce code promo a expiré." });
  }
  if (coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: "Ce code promo n'est plus disponible." });
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    applies_to: coupon.applies_to ?? null,
  });
}
