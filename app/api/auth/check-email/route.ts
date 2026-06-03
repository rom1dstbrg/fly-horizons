import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
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
