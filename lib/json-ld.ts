// JSON.stringify n'échappe pas < > — un champ texte contenant "</script>" (ex. la
// description d'une annonce pilote, potentiellement éditable par un tiers un jour)
// fermerait la balise <script type="application/ld+json"> et permettrait d'injecter
// du HTML/JS après. Échapper ces caractères en séquences \u unicode les neutralise
// sans changer la valeur JSON (JSON.parse les restitue identiques).
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
