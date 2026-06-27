import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { pathname, referrer, screen_width, visitor_id } = await req.json();

    if (!pathname || pathname.startsWith("/admin")) {
      return NextResponse.json({ ok: true });
    }

    const device =
      (screen_width as number) < 768 ? "mobile"
      : (screen_width as number) < 1024 ? "tablet"
      : "desktop";

    const supabase = createAdminClient();
    await supabase.from("page_views").insert({
      pathname,
      referrer: referrer || null,
      device,
      visitor_id: visitor_id || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
