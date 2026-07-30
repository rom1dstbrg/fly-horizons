import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Récupère la session courante
  const { data: { user } } = await supabase.auth.getUser();

  // Récupère le rôle une seule fois, réutilisé pour la maintenance et /admin
  let profileRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profileRole = profile?.role ?? null;
  }
  const isAdmin = profileRole === "admin";

  const pathname = request.nextUrl.pathname;

  // -------------------------------------------------
  // Site en reconstruction : quand le toggle admin
  // "maintenance_mode" est actif, tout le trafic public
  // est redirigé vers /maintenance, sauf l'admin (connecté
  // en tant qu'admin, il voit le site normalement), l'auth,
  // les API et les fichiers SEO/robots.
  // -------------------------------------------------
  const isMaintenanceExempt =
    pathname === "/maintenance" ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest";

  if (!isMaintenanceExempt && !isAdmin) {
    const { data: maintenanceSetting } = await supabase
      .from("crm_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle();

    // Pas de ligne en base = comportement par défaut = maintenance active
    const maintenanceEnabled = (maintenanceSetting?.value ?? "true") === "true";

    if (maintenanceEnabled) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // -------------------------------------------------
  // Protection routes /account/*, /orders, /checkout
  // Redirige vers /login si pas connecté
  // /orders/success est volontairement exclu : page de
  // confirmation accessible sans session (after Stripe redirect)
  // -------------------------------------------------
  const requiresAuth =
    pathname.startsWith("/account") ||
    pathname === "/orders" ||
    pathname.startsWith("/checkout");

  if (requiresAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // -------------------------------------------------
  // Protection routes /admin/*
  // Redirige vers /login si pas connecté
  // -------------------------------------------------
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // -------------------------------------------------
  // Redirige /login et /register si déjà connecté
  // Honore le paramètre redirectTo pour les flows comme /checkout
  // -------------------------------------------------
  if ((pathname === "/login" || pathname === "/register") && user) {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    url.pathname =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/account";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ico|webmanifest)$).*)",
  ],
};