import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// User-agents de bots/crawlers/monitoring à exclure du comptage
const BOT_UA_RE =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegrambot|preview|headless|phantomjs|puppeteer|playwright|curl|wget|python-requests|axios|go-http-client|monitoring|pingdom|uptimerobot|gptbot|ccbot|bytespider|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|yandexbot|baiduspider/i;

// Événements de parcours acceptés (voir lib/track-event.ts).
const EVENTS = new Set(["creneau_choisi", "etape_infos"]);

// Pages des espaces internes (admin, pilote) : hors mesure d'audience.
const INTERNAL_PATH_RE = /^\/(admin|pilote)(\/|$)/;

// Comptes internes à exclure du comptage, peu importe leur rôle
const EXCLUDED_EMAILS = new Set(["info@fly-horizons.com", "romainpilot2003@gmail.com"]);

export async function POST(req: NextRequest) {
  try {
    const { pathname, referrer, screen_width, visitor_id, event } = await req.json();

    // Espaces internes : jamais comptés (admin et espace pilote).
    if (!pathname || typeof pathname !== "string" || INTERNAL_PATH_RE.test(pathname)) {
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

    // Exclut les vues d'un compte interne connecté (admin ou pilote) qui navigue sur le
    // site public. On le dit au navigateur (`internal`) : il cesse alors d'envoyer quoi
    // que ce soit, même déconnecté ensuite.
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const email = user.email?.toLowerCase();
      if (email && EXCLUDED_EMAILS.has(email)) {
        return NextResponse.json({ ok: true, internal: true });
      }
      const { data: profile } = await authClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin" || profile?.role === "pilote") {
        return NextResponse.json({ ok: true, internal: true });
      }
    }

    // Événement de parcours (étape du formulaire de demande) : table à part.
    if (event !== undefined) {
      if (typeof event !== "string" || !EVENTS.has(event)) return NextResponse.json({ ok: true });
      const { error } = await createAdminClient().from("site_events").insert({
        name: event,
        pathname,
        visitor_id: visitor_id || null,
      });
      if (error) console.error("[/api/track] insert site_events failed:", error.message);
      return NextResponse.json({ ok: true });
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
