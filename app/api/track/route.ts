import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// User-agents de bots/crawlers/monitoring à exclure du comptage
const BOT_UA_RE =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegrambot|preview|headless|phantomjs|puppeteer|playwright|curl|wget|python-requests|axios|go-http-client|monitoring|pingdom|uptimerobot|gptbot|ccbot|bytespider|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|yandexbot|baiduspider/i;

// Comptes internes à exclure du comptage, peu importe leur rôle
const EXCLUDED_EMAILS = new Set(["info@fly-horizons.com", "romainpilot2003@gmail.com"]);

export async function POST(req: NextRequest) {
  try {
    const { pathname, referrer, screen_width, visitor_id } = await req.json();

    if (!pathname || typeof pathname !== "string" || pathname.startsWith("/admin")) {
      return NextResponse.json({ ok: true });
    }
    if (pathname.length > 500) return NextResponse.json({ ok: true });
    if (visitor_id && (typeof visitor_id !== "string" || visitor_id.length > 64)) {
      return NextResponse.json({ ok: true });
    }

    const ua = req.headers.get("user-agent") ?? "";
    if (BOT_UA_RE.test(ua)) {
      return NextResponse.json({ ok: true });
    }

    // Exclut les vues générées par un compte interne connecté qui navigue sur le site public
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const email = user.email?.toLowerCase();
      if (email && EXCLUDED_EMAILS.has(email)) {
        return NextResponse.json({ ok: true });
      }
      const { data: profile } = await authClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin") {
        return NextResponse.json({ ok: true });
      }
    }

    const device =
      (screen_width as number) < 768 ? "mobile"
      : (screen_width as number) < 1024 ? "tablet"
      : "desktop";

    const supabase = createAdminClient();
    const { error } = await supabase.from("page_views").insert({
      pathname,
      referrer: referrer || null,
      device,
      visitor_id: visitor_id || null,
    });
    if (error) {
      console.error("[/api/track] insert page_views failed:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/track] unexpected error:", err);
    return NextResponse.json({ ok: true });
  }
}
