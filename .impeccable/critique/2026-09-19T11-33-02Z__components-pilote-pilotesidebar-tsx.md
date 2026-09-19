---
target: pilote sidebar (components/pilote/PiloteSidebar.tsx)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\romai\\Documents\\Projects\\fly_horizons\\components\\pilote\\PiloteSidebar.tsx"
target_fingerprint: "sha256:26c001511cdd04318a0bccc7f3388089aa465feb79131fa39b70d951782c601c"
target_path: "C:\\Users\\romai\\Documents\\Projects\\fly_horizons\\components\\pilote\\PiloteSidebar.tsx"
timestamp: 2026-09-19T11-33-02Z
slug: components-pilote-pilotesidebar-tsx
---
Method: dual-agent (Assessment A — design review; Assessment B — detector + browser evidence). Same environment limit as the previous two critiques: Chrome extension not connected, no screenshots. Assessment A read source only (5 files). Assessment B's CLI scan clean and complete; browser step unavailable. Grounded in code, not verified in pixels.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2/4 | Active-page state barely distinct from hover; badges don't reach the mobile bottom bar at all. |
| 2 | Match Between System & Real World | 3/4 | Plain GA/ops vocabulary fits a working pilot's mental model. |
| 3 | User Control and Freedom | 3/4 | Drawer dismisses cleanly; standard navigation, no traps. |
| 4 | Consistency and Standards | 2/4 | Softer active-state than the admin sidebar it claims to mirror; two unreconciled "needs attention" color systems in one file. |
| 5 | Error Prevention | 2/4 | One-click unconfirmed logout, reachable by a stray Enter after tabbing the nav. |
| 6 | Recognition Rather Than Recall | 2/4 | Good icon+label pairing undercut by 9-11px text throughout the one element visible on every page. |
| 7 | Flexibility and Efficiency of Use | 2/4 | Zero accelerators; plaque disclosure is mouse/tap-only. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Genuinely restrained, on-brief flat/bordered execution. |
| 9 | Help Recognize/Diagnose/Recover from Errors | 3/4 | Legal issue labels are specific and dated, one clear recovery CTA. |
| 10 | Help and Documentation | 2/4 | None, none expected for a single-user tool — neutral. |

**Total: 24/40 — Acceptable**, the best of the three pages critiqued so far.

## Design Specificity Verdict

**LLM assessment:** Mostly a generic admin-tool sidebar template with labels swapped, not authored around a solo GA pilot's actual workflow. The one place it clearly was authored for THIS specific person (Romain, admin+pilot merged into one account) — "Vue admin" — gets buried at the same low visual weight as "Déconnexion," when for this account it's probably one of the most-used links in the whole shell. The pilot-plaque disclosure (already shipped) is the one genuinely bespoke interaction; everything else is a structural copy of the admin sidebar with a shorter nav array.

**Deterministic scan:** Clean — 0 findings across both files. Same pattern as the previous two pages: an information/interaction-design gap invisible to a linter.

**Visual overlays:** Not available — Chrome extension not connected, third run in a row.

## Overall Impression

The best-executed of the three pages reviewed on pure visual restraint — but the persistent element every page depends on for status signaling carries none of that signal on mobile, where the pilot will actually check it most.

## What's Working

1. **Plaque progressive disclosure** — click-to-expand issue list with one specific, dated call to action. Real, well-executed pattern.
2. **Section chunking discipline** — nav groups never exceed 3 items, cleaner than the admin sidebar's own denser grouping.
3. **Mobile drawer physics actually considered** — "Plus" tab sits at the far right, drawer slides in from the right (same-side thumb travel), deliberate safe-area padding.

## Priority Issues

**[P1] Every status signal is invisible on the surface pilots will check most on mobile.**
Why it matters: BOTTOM_NAV/BottomNavInner take no counts prop and render no dot ever; the mobile top bar is logo-only. The legal dot and both nav badges only exist inside the desktop/drawer NavContent — a pilot glancing at their phone gets zero signal until they tap "Plus" and open the full drawer.
Fix: surface a single small dot (not a numeral, to stay uncluttered) on the "Plus" tab whenever legal isn't ok or there are pending alerts; echo it on the mobile top-bar logo too.
Suggested command: /impeccable adapt

**[P1] Active nav state is too soft, and sits next to a second, unreconciled color-for-attention system.**
Why it matters: active row is a 2px border + light tint, barely distinct from hover. Separately, badges use gold (the site's reserved CTA color) to mean "pending," while the plaque dot uses red/amber/emerald for essentially the same concept — two color grammars for one idea, the same pattern already flagged twice on the other pages.
Fix: pick one attention-color convention; strengthen the active-page signal closer to the admin sidebar's unambiguous solid treatment, adapted to the flat palette.
Suggested command: /impeccable colorize

**[P2] The profil badge and the plaque dot can visibly contradict each other.**
Why it matters: the sidebar badge only counts error-severity issues; a licence/medical expiring within 30 days is warn-severity, correctly shown as an amber dot on the plaque but invisible to the "Mon profil" badge — and a 30-day window is the pilot's routine state, not an edge case.
Fix: either count warn-severity issues in the badge too (visually distinct from error-count), or stop implying urgency via the amber dot if the nav intentionally won't echo it.
Suggested command: /impeccable clarify

**[P2] Chronic micro-typography, worst here because this is the one element on every page.**
Why it matters: section labels 9px, licence/medical dates 10px (operationally important data, smaller than the disclosed issue rows below it), bottom-nav labels 10px — the same pattern already flagged on the dashboard and vols list, but it compounds every single page view here instead of once per visit.
Fix: raise the floor to 11-12px, prioritize the licence/medical date line.
Suggested command: /impeccable typeset

**[P3] Plaque button is inert-but-focusable when there's nothing to show; logout has zero confirmation.**
Why it matters: with no issues, the plaque still renders as a real focusable button that does nothing on Enter, with no aria attributes describing it either way; logout is a single unconfirmed Enter-press after tabbing through the nav.
Fix: render a plain div instead of a button when there's nothing to disclose; add aria-expanded/aria-label when it is interactive.
Suggested command: /impeccable audit

## Persona Red Flags

**Casey (distracted mobile, checking for anything urgent):** top bar is logo-only, bottom bar's 5 icons carry zero badges even though the counts are computed and passed down server-side — they just never reach the mobile component. Must tap "Plus," wait for the drawer, then spot a 6px dot next to 13px name text. One thing that does work: the plaque's full-width clickable row is a comfortable thumb target once inside the drawer.

**Sam (accessibility/keyboard user):** no focus-visible styling anywhere in the file. Tabs onto the plaque button even when it does nothing, with no way for assistive tech to tell. Reaches "Déconnexion" near the end of tab order with zero confirmation — one stray Enter ends the session.

## Minor Observations

- "Masse & centrage" (a per-flight tool) sits under a section literally labeled "Réglages" (Settings) — a category mismatch.
- 9 interactive destinations (6 nav links + Vue admin + Déconnexion + plaque) live in one persistent shell — borderline on the "≤4 choices" guideline in aggregate, though each individual group stays within it.

## Questions to Consider

1. What if the active-state treatment used the admin sidebar's own solid pill instead of the softened border+tint — would the flat/bordered direction actually break, or was softening it a stylistic reflex that quietly cost "where am I" clarity?
2. Given a 30-day expiry window means "medical expiring soon" is the pilot's normal steady state, what if "Mon profil" counted warn-severity issues too — is a badge that stays silent through that whole window protecting the pilot, or just deferring the problem?
3. Given this account currently wears both admin and pilot hats, what if "Vue admin" lived at the top next to the logo as a role switch, instead of buried at the same weight as "Déconnexion" — is mirroring the admin sidebar's structure serving Romain, or avoiding a decision his actual usage pattern is asking for?
