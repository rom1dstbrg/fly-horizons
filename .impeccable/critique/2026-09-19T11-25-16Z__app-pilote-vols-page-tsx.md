---
target: pilote Mes vols (app/pilote/vols/page.tsx)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\romai\\Documents\\Projects\\fly_horizons\\app\\pilote\\vols\\page.tsx"
target_fingerprint: "sha256:f117a2674408fe7a0fffc6a1a11de7bd728edfc1ee9ecc90a9dd6d385b34e6d0"
target_path: "C:\\Users\\romai\\Documents\\Projects\\fly_horizons\\app\\pilote\\vols\\page.tsx"
timestamp: 2026-09-19T11-25-16Z
slug: app-pilote-vols-page-tsx
---
Method: dual-agent (Assessment A — design review; Assessment B — detector + browser evidence). Same environment limit as the dashboard critique: Claude-in-Chrome not connected, no screenshots. Assessment A read source only (7 files). Assessment B's CLI scan is clean and complete; browser step unavailable. Grounded in code, not verified in pixels.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2/4 | No "needs your action" signal — a demande_recue row looks as weighted as a confirmed one. |
| 2 | Match Between System & Real World | 3/4 | Good domain vocabulary, correct locale formatting. |
| 3 | User Control and Freedom | 2/4 | No search/sort/filter — only lever is the À venir/Passés tab split. |
| 4 | Consistency and Standards | 3/4 | Reuses AdminBadge/getResaBadge/EmptyState correctly; one inconsistency (row click + duplicate "Voir" button). |
| 5 | Error Prevention | 3/4 | All actions here are safe navigations, nothing to prevent. |
| 6 | Recognition Rather Than Recall | 1/4 | No relative date labels; annonce_id exists in the data model but never renders — must open each drawer to know. |
| 7 | Flexibility and Efficiency of Use | 1/4 | No search, sort, shortcuts, or bulk view — 40 rows means manual scrolling. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Correctly flat/bordered per the approved direction; undercut by two stacked badge/color systems per row and 9px headers. |
| 9 | Help Recognize/Diagnose/Recover from Errors | 2/4 | Silent failure path: a failed pilote lookup renders the same empty state as "genuinely no flights." |
| 10 | Help and Documentation | 2/4 | HelpTip primitive exists and is used elsewhere in the pilot space, but nothing here glosses status/route jargon. |

**Total: 22/40 — Acceptable.**

## Design Specificity Verdict

**LLM assessment:** This reads as the admin reservations table (same AdminBadge/getResaBadge machinery, date/client/route/durée/statut/actions columns) with pilot copy pasted onto the header and empty states. Nothing in the list mechanics is shaped around what a solo GA pilot needs from this specific page — no urgency treatment for "what am I flying this week," and no surfacing of the one distinction that matters most here: telling apart a flight generated through the pilot's own marketplace "annonce" from a standard booking. The dashboard fix proved the team can build pilot-specific hierarchy when it decides to; that treatment hasn't reached this page.

**Deterministic scan:** Clean — 0 findings across all 3 files, confirmed twice. Same pattern as the dashboard: this isn't a rule-violation problem, it's an information-design problem invisible to a linter.

**Visual overlays:** Not available — Chrome extension not connected, no [Human] tab this run either.

## Overall Impression

The visual language (flat/bordered, correct tokens) is executed properly — better than the dashboard was, actually. The gap is entirely in information design: the table treats every row as equivalent when they aren't (urgent vs. routine, annonce vs. standard, today vs. in 4 months), and it duplicates the same click action twice per row while offering no way to search or filter at volume.

## What's Working

1. **À venir / Passés tabs with live counts** — clean 2-choice split matching real pilot priority, respects "minimal choices" properly.
2. **Two-level empty-state copy** — page-level and per-tab empty states say genuinely different, specific things instead of copy-pasted placeholder text.
3. **Correct flat/bordered execution** — bg-card, border-navy/15, no shadow, subtle hover — nails the mandated visual language better than the information design underneath it.

## Priority Issues

**[P1] "Annonce" bookings are invisible on the one page whose job includes distinguishing them.**
Why it matters: annonce_id is fetched but never rendered anywhere in the table — no column, badge, or icon — so the pilot must open every single drawer to know if a booking came from their own marketplace listing.
Fix: add a small tag next to the client name or route cell whenever annonce_id is set (same pattern already used on the dashboard's "Prochain vol" hero card).
Suggested command: /impeccable clarify

**[P1] No temporal urgency hierarchy — today's flight and one in 4 months render identically.**
Why it matters: this is the exact flat-hierarchy problem already diagnosed and fixed on the dashboard — it simply migrated to this page instead of being resolved here too.
Fix: relative-date labeling for the next 7 days and/or a visual marker for the single next flight, echoing the dashboard's hero treatment for consistency across the pilot space.
Suggested command: /impeccable layout

**[P2] Redundant and inaccessible click affordance on every row.**
Why it matters: the whole row is clickable via onClick on 5 of 6 cells, then the Actions column repeats the identical action as a "Voir" button — confusing which is "the" way in, and the row-click has no role/tabIndex/keyboard handler, so a keyboard-only user cannot open a row except via the one real button.
Fix: pick one — drop "Voir" and make the row a real interactive element with keyboard support, or keep "Voir" as the only click target and make the row background purely a hover cue.
Suggested command: /impeccable audit

**[P2] No search, sort, or filter — no answer for volume.**
Why it matters: beyond the binary tab split there's no way to search by client or filter by status/annonce; this degrades hard as flight count grows.
Fix: a lightweight text-search input above the table (client name / route) is enough at this scale.
Suggested command: /impeccable layout

**[P3] 9px table headers repeat the dashboard's typography problem verbatim.**
Why it matters: same tiny-type issue already flagged once; now reproduced on a second page.
Fix: bump to 10-11px minimum, recheck contrast.
Suggested command: /impeccable typeset

Bonus minor: the "M&B" action button renders even on cancelled flights in the Passés tab — a dead action. Gate it on statut !== "annulee".

## Persona Red Flags

**Alex (impatient power user):** No "Aujourd'hui"/"Demain" label — has to read raw dates and do proximity math every glance. No grouping for "this week" vs "later." Two click targets per row cost a half-beat of hesitation. 9px headers force a squint on a fast scan.

**Riley (stress tester, many flights):** Zero search/sort — finding a specific past flight among 40+ means manual scroll with no filter. annonce_id absent from row markup — cannot tell marketplace bookings from standard ones without opening each drawer. Two independent badge/color systems stacked per row is noise at high density. "M&B" button present even on irrelevant (cancelled/past) rows.

## Minor Observations

- Silent failure path: a failed pilote lookup renders the same generic empty state as "genuinely no flights yet" — indistinguishable to the user.
- HelpTip primitive already exists in the pilot space (built this session) but isn't used anywhere on this page despite real jargon (route status, "annonce").

## Questions to Consider

1. What if the list defaulted to grouping by urgency — Aujourd'hui / Cette semaine / Plus tard — instead of one flat ascending table, mirroring the dashboard's hero-card fix?
2. What if "annonce" bookings got an explicit, always-visible marker, given the business is actively building this as a revenue stream — right now the one field that encodes "this came from my own listing" is invisible on the one page whose job is showing a pilot their flights?
3. What if the row-click-vs-button redundancy were resolved by dropping "Voir" and using the freed Actions-column space for something the row currently hides — an annonce tag, an "action needed" flag, or a same-day badge?
