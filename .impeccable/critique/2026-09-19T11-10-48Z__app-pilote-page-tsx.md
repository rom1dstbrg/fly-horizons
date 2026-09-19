---
target: pilote dashboard (app/pilote/page.tsx)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\romai\\Documents\\Projects\\fly_horizons\\app\\pilote\\page.tsx"
target_fingerprint: "sha256:319353c2502ef70521dcdc16a97cf268bc7b75bc3f232482c726e7bbcbb9b3ca"
target_path: "C:\\Users\\romai\\Documents\\Projects\\fly_horizons\\app\\pilote\\page.tsx"
timestamp: 2026-09-19T11-10-48Z
slug: app-pilote-page-tsx
---
Method: dual-agent (Assessment A — design review; Assessment B — detector + browser evidence). Both were blocked from live browser inspection: the Claude-in-Chrome extension isn't connected in this environment, so no screenshots exist for this run. Assessment A fell back to full source-code reading (7 files). Assessment B's CLI scan ran clean and complete, but its browser overlay step is entirely missing. This critique is grounded in code, not verified in pixels.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2/4 | No data-freshness signal beyond the weather fallback; no distinction between "0 = nothing due" and "not loaded yet." |
| 2 | Match Between System & Real World | 3/4 | Strongest score: real aviation vocabulary, plain-language consequences ("vous ne pouvez pas recevoir de vols"). |
| 3 | User Control and Freedom | 2/4 | Every element is a one-way Link — no inline action, dismiss, or snooze; only escape is browser back. |
| 4 | Consistency and Standards | 3/4 | Reuses shared StatCard/AdminBadge/StatGrid consistently with the rest of the app. |
| 5 | Error Prevention | 2/4 | Low destructive surface, but no visible handling if a data fetch fails. |
| 6 | Recognition Rather Than Recall | 2/4 | Sidebar "Mes vols" badge and dashboard "Vols à venir" use different filters — two numbers that look like they should match but can diverge. |
| 7 | Flexibility and Efficiency of Use | 1/4 | No shortcuts, no inline action — every task routes through /pilote/vols regardless of how small. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Every block shares the same border/radius treatment with no weight differentiation; 9-11px type throughout flattens hierarchy. |
| 9 | Help Recognize/Diagnose/Recover from Errors | 2/4 | "À traiter" states consequences in plain language, but severity (red vs amber) relies on color alone, no legend. |
| 10 | Help and Documentation | 1/4 | No help affordance anywhere despite real legal/compliance stakes on this page. |

**Total: 20/40 — Acceptable** (significant improvement needed; not broken, not ready to ship as-is).

## Design Specificity Verdict

**LLM assessment:** This is a generic SaaS admin-dashboard shape — greeting header, 4-tile stat row, numbered to-do list, data table, sidebar widget — with aviation content poured into it, not a dashboard authored for a solo GA pilot. Swap the labels and nothing about the composition or icon choices would need to change. The one element that couldn't be reskinned — the METAR/TAF widget with real VFR/MVFR/IFR/LIFR color coding — is also the most de-prioritized: third column, bottom-right, below the fold on mobile. The single most aviation-specific question a pilot asks each morning ("can I fly today?") is visually the least prominent thing on their own dashboard.

**Deterministic scan:** Assessment B's CLI detector came back completely clean — zero findings across the 5 core files (page, sidebar, layout, StatCard, StatGrid). That's not a contradiction, it confirms the diagnosis: this isn't "AI slop" tells (side-tab borders, undersized text, gradient text) that a rule scanner catches — it's an information-architecture and hierarchy problem, which is structurally invisible to a linter. Both assessments agree from different angles: nothing is broken, nothing stands out.

**Visual overlays:** Not available this run — Chrome extension not connected, no [Human] tab exists to point you to.

## Overall Impression

Functionally solid, visually inert. The guidance pass (stats, to-do list, contextual help) added real substance without changing how the eye moves across the page — which is exactly why it still reads as "the same" to you. The fix isn't more sections, it's picking one thing to be the loudest thing on the screen and making everything else visibly quieter.

## What's Working

1. **Sidebar pilot plaque** — name + license/medical dates + a status dot that expands on click to list exactly what's wrong. Genuine progressive disclosure, and the one spot that feels authored for a licensed pilot specifically.
2. **METAR/TAF widget** — correctly implements real flight-rule categories with the right color convention and shows the raw METAR/TAF string verbatim (pilots trust that over a paraphrase). Could not have been copy-pasted from a generic template.
3. **"À traiter" copy** — states real consequences in plain language instead of abstract status codes.

## Priority Issues

**[P0] Visual hierarchy collapse — everything is the same weight.**
Why it matters: almost certainly why it still reads as unchanged — structure was added without changing what the eye is drawn to first.
Fix: pick one hero element (today's next flight, or the weather/flight-rule badge), render it distinctly larger/bolder above the fold, demote the StatGrid to a slim secondary strip, reserve strong red/amber exclusively for true blockers.
Suggested command: /impeccable layout, then /impeccable bolder

**[P0] Conflicting flight counts between sidebar and dashboard.**
Why it matters: sidebar "Mes vols" badge and dashboard "Vols à venir" StatCard use different filters (one has no date cutoff, one requires date_vol >= today) — they can show different numbers for what looks like the same concept, eroding trust in the numbers that matter most.
Fix: either share one query/definition, or visually/verbally differentiate what each counts.
Suggested command: /impeccable clarify

**[P1] No "today" focal point.**
Why it matters: the highest-value question each morning — "what do I have today" — never gets a distinct answer; today's flight and one three weeks out render identically.
Fix: group by Aujourd'hui / Demain / Plus tard, or surface today's flight as its own hero card.
Suggested command: /impeccable layout

**[P1] Color/status language overload.**
Why it matters: at least 6 independent color-meaning systems compete on one screen (StatCard's 10 variants, AdminBadge's 8, urgency dots, left-border accents, numbered navy circles, METAR's flight-rule colors) — red means "legal blocker," "urgent to-do," and "IFR weather" in three unrelated places on the same screen, so color stops carrying meaning.
Fix: reserve red site-wide for "cannot fly," converge secondary states to one amber, keep gold exclusively as the CTA color.
Suggested command: /impeccable colorize

**[P2] Disconnected top-right CTA.**
Why it matters: "Publier un vol" (header) and the "Annonces actives" StatCard two rows below carry near-identical nudges at different visual weights — noise, not reinforcement.
Fix: drop the header CTA and let the StatCard subtitle carry it, or make the header CTA conditional on zero active annonces.
Suggested command: /impeccable distill

**[P3] Typography is uniformly tiny.**
Why it matters: 9-11px uppercase labels throughout hurt glanceability, especially for a distracted mobile pilot checking between tasks.
Fix: raise the minimum label size to 11-12px, cut the count of competing uppercase micro-labels.
Suggested command: /impeccable typeset

## Persona Red Flags

**Alex (impatient power user):** Must pass through the greeting/CTA row, the full StatGrid, and the "À traiter" card before reaching the actual flight list — no way to jump straight there. On narrower viewports the StatGrid becomes a swipeable strip where the danger-variant "Profil" tile can sit off-screen unless he scrolls sideways. No dashboard link carries a filter into /pilote/vols — every click re-lands on the unfiltered full list.

**Casey (distracted mobile user):** Mobile top bar shows only the logo, no page title. The StatGrid's snap-scroll means a quick thumb-swipe can skip the danger "Profil" tile before it registers. "À traiter" severity relies on a thin 3px border + pale background tint — low-contrast at a glance on a small screen. The weather widget — the single most time-critical GA question — sits last in the DOM, below the to-do list and the full flight table.

## Minor Observations

- No visible handling for a failed Supabase fetch on this page (would just throw) — untested edge case, not proven either way.
- The numbered 1/2/3 section badges imply a reading order that the (unnumbered) StatGrid sits outside of, which is a small internal inconsistency.

## Questions to Consider

1. What if the weather widget were the actual hero of the page — full-width, top of layout — since "can I fly today" is the one question a generic SaaS template could never ask, and it's currently the most buried element on the page?
2. What if "Prochains vols" collapsed to a single "next flight" card instead of a 6-row generic admin table — "here's your next flight" instead of "here's a list of records"?
3. What if the "Profil" legal-status tile were pulled out of the equal-weight StatGrid entirely and given a banner treatment, since a legal/medical block carries existential stakes while "Annonces actives" is just a metric — yet today they read as four visual peers?
