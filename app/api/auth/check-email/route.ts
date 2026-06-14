import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`check-email:${getIp(request)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ exists: false }, { status: 429 });
  }

  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ exists: false });
    }
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.rpc("check_email_exists", {
      email_input: email.toLowerCase().trim(),
    });
    if (error) return NextResponse.json({ exists: false });
    return NextResponse.json({ exists: !!data });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
