import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;

export async function GET() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await db.from("crm_settings").select("key, value")
    .in("key", ["calendar_closed", "calendar_closed_message", "chat_enabled"]);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  return NextResponse.json({
    calendar_closed:         map["calendar_closed"]         ?? "false",
    calendar_closed_message: map["calendar_closed_message"] ?? "",
    chat_enabled:            map["chat_enabled"]            ?? "true",
  });
}
