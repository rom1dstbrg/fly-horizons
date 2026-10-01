// Onglets de /pilote/profil. Dans un module neutre (ni client ni serveur) : la
// page serveur lit ?onglet= et le formulaire client affiche les onglets. Une
// valeur exportée d'un fichier "use client" n'est qu'une référence côté serveur.
export type ProfilTab = "licence" | "profil" | "emails" | "notifications" | "compte";
export const PROFIL_TABS: ProfilTab[] = ["licence", "profil", "emails", "notifications", "compte"];
