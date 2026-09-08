<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pilotage du projet — lire `projet.html` en début de session

`projet.html` (racine du repo) est le point d'entrée unique : **Board** (où on en est), **Décisions**
(quoi / pourquoi / alternatives écartées — append-only, on ne réécrit pas le passé), **Plan actif**,
**Changelog**. À lire avant de reprendre le travail.

- Toute décision structurante → une nouvelle entrée dans l'onglet Décisions (jamais éditer une entrée passée).
- Tout changement de code livré → une ligne dans le Changelog.
- Le détail des gros chantiers reste dans les `plan-*.html` / `audit-*.html` dédiés ; `projet.html` les indexe.

**Ne jamais `git push` sur `main` sans le feu vert explicite de Romain** — Vercel auto-déploie `main`.
Commiter sur `main` : oui. Pousser : seulement sur demande. Signaler les commits locaux en attente.
