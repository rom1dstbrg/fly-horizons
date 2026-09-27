import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/actions/auth-guards";
import { appareil, fmtDateBrussels, RETOUR_BUCKET, RETOUR_TYPES, routeProbable, type PiloteRetour } from "@/lib/pilote-retours";

// Export « pour Claude » (27/09) : un zip avec RETOURS.md (tout le contexte
// d'un retour, rédigé pour qu'un agent de code puisse reproduire et corriger)
// et les captures à côté. ?id=<uuid> pour un retour, ?statut=a_traiter|traite|tous.

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Non autorisé", { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const statut = url.searchParams.get("statut") ?? "a_traiter";

  const admin = createAdminClient();
  let q = admin.from("pilote_retours").select("*, pilotes(nom, email)").order("created_at", { ascending: true });
  if (id) q = q.eq("id", id);
  else if (statut !== "tous") q = q.eq("statut", statut);
  const { data, error } = await q;
  if (error) return new Response(error.message, { status: 500 });
  const retours = (data ?? []) as PiloteRetour[];
  if (retours.length === 0) return new Response("Aucun retour à exporter", { status: 404 });

  const zip = new JSZip();
  const md: string[] = [];
  const today = new Date().toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" });

  md.push(
    "# Retours pilotes Fly Horizons : export pour Claude Code",
    "",
    `Exporté le ${today} · ${retours.length} retour${retours.length > 1 ? "s" : ""}.`,
    "",
    "## Comment traiter cet export",
    "",
    "- Chaque retour vient de l'espace pilote (`/pilote/*`, style Studio). Le pilote décrit ce qu'il a vu ; le contexte technique a été joint automatiquement.",
    "- **Version déployée** : commit court au moment du retour. Si le code a bougé depuis, regarder `git log <commit>..HEAD -- <fichiers concernés>` : le bug est peut-être déjà corrigé.",
    "- **Route probable** : le fichier de page, avec les identifiants remplacés par `[id]` (le vrai nom du segment dynamique peut différer, ex. `[token]`).",
    "- **Erreurs du navigateur** : les dernières erreurs JavaScript de la session du pilote avant l'envoi (souvent la cause directe).",
    "- **Captures** : dans le dossier `captures/` à côté de ce fichier, à ouvrir avec l'outil de lecture d'images.",
    "- Pour les données (réservation, annonce…), l'identifiant est dans le chemin de la page. Diagnostic base : script Node ponctuel avec la clé service_role (voir la mémoire du projet).",
    "- Suivre `AGENTS.md` / `projet.html` (Changelog) ; ne pas pousser sur `main` sans l'accord de Romain.",
    "",
  );

  for (const [n, r] of retours.entries()) {
    const short = r.id.slice(0, 8);
    const captureNames: string[] = [];
    for (const [k, path] of r.captures.entries()) {
      const { data: blob } = await admin.storage.from(RETOUR_BUCKET).download(path);
      if (!blob) continue;
      const name = `captures/${short}-${k + 1}.webp`;
      zip.file(name, Buffer.from(await blob.arrayBuffer()));
      captureNames.push(name);
    }

    md.push(
      `## ${n + 1}. ${RETOUR_TYPES[r.type].label} · ${short} · ${r.statut === "traite" ? "traité" : "à traiter"}`,
      "",
      `- **Reçu** : ${fmtDateBrussels(r.created_at)} (heure de Bruxelles)`,
      `- **Pilote** : ${r.pilotes?.nom ?? "?"} (\`pilote_id\` ${r.pilote_id})`,
      `- **Page** : \`${r.page ?? "?"}\`${r.page_titre ? ` · titre « ${r.page_titre} »` : ""}`,
      `- **Route probable** : \`${routeProbable(r.page) ?? "?"}\``,
      `- **Version déployée** : \`${r.app_version ?? "?"}\``,
      `- **Appareil** : ${appareil(r.user_agent)} · fenêtre ${r.viewport ?? "?"}`,
      `- **User-agent** : \`${r.user_agent ?? "?"}\``,
      `- **Captures** : ${captureNames.length ? captureNames.map((c) => `\`${c}\``).join(", ") : "aucune"}`,
      `- **Identifiant du retour** : \`${r.id}\``,
      "",
      "### Message du pilote",
      "",
      ...r.message.split("\n").map((l) => `> ${l}`),
      "",
      `### Erreurs du navigateur (${r.erreurs.length})`,
      "",
    );
    if (r.erreurs.length === 0) {
      md.push("Aucune erreur JavaScript enregistrée pendant la session.", "");
    } else {
      md.push("```");
      for (const e of r.erreurs) {
        md.push(`[${e.at}] ${e.page} : ${e.message}`);
        if (e.stack) md.push(...e.stack.split("\n").map((l) => `    ${l}`));
      }
      md.push("```", "");
    }
  }

  zip.file("RETOURS.md", md.join("\n"));
  const body = await zip.generateAsync({ type: "uint8array" });
  const stamp = new Date().toISOString().slice(0, 10);
  const name = id ? `retour-${id.slice(0, 8)}-${stamp}.zip` : `retours-pilotes-${stamp}.zip`;
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
