---
name: meritly-comp-admin-ux
description: >-
  Meritly compensation-planning UX and product conventions. Use when designing or
  critiquing Controls, Policy guide, Merit review, sidebar chrome, setup flows,
  or any admin-facing UI in this repo.
---

# Meritly Comp Admin UX

## Product context

Meritly is a **physician compensation planning** app for comp administrators — not a generic SaaS dashboard. Users think in **merit cycles, policies, rosters, and market position**, not in framework jargon.

## Design language

- **Palette:** slate neutrals + **indigo** for actions, active states, links, focus rings.
- **Avoid** loud one-off accents (e.g. green avatars) unless they match existing brand tokens in `index.css`.
- **Typography:** `text-sm` body; bold section rules for doc-style pages; uppercase `text-xs` labels for nav sections.
- **Components:** Tailwind + shadcn/Radix patterns already in `src/components/ui/`.

## Navigation mental model

### Controls (`parameters-page`)

- **Primary nav:** the five segmented tabs (Cycle & budget, Mappings, Experience & equity, Base increases, Policies).
- **Secondary:** sub-tabs inside a group (e.g. Review cycles / Budget targets).
- **Merit setup strip:** quiet one-line progress (`Merit setup 3/5 · Import · Cycle · …`) — **not** a second wizard. Click to jump; always visible including on Policies.
- **Default landing:** Review cycles, not Policy library.

Do **not** reintroduce a numbered stepper that competes with tabs.

### Policy guide (`#help`)

- Long-form **documentation** beside optional right-rail TOC.
- Match editorial tone: indigo title stripe, slate section headers, diagrams lighter than heavy blueprint styling.
- Cross-link from Policy library → guide; guide → Controls.

### Global shell

- Sidebar account: avatar left, name beside, chevron trailing — standard row, not stacked under chevron.
- Footer chrome should stay **muted** on reading-heavy screens.

## Content patterns for admin users

- Lead with **quick start** or “do these 4 steps” on long help pages.
- Prefer **tables** over bullet dumps for policy types, conflict strategies, comparisons.
- Name consistently: **Policy guide** (nav label = page title).
- Enterprise tone: name + email + sign out is enough for account menus; optional second line for email in sidebar.

## Code conventions (UI work)

- Feature code under `src/features/`; shared UI in `src/components/`.
- Reuse existing hooks (`use-app-state`, `use-parameters-state`, navigation context) — no new state libraries.
- **Minimal diff:** fix the UX issue cited; don't refactor adjacent screens.
- **Tests:** only when requested or when covering real engine/parse behavior — not for visual-only tweaks.

## Critique checklist

When reviewing a screen, ask:

1. Is there **one** obvious primary navigation?
2. Does progress/status **support** navigation instead of duplicating it?
3. Does the screen match **slate + indigo** and the rest of the app?
4. Would a comp admin understand labels without internal terms (Matrix, Policies, Cycle)?
5. Is help **discoverable** from the workflow where they get stuck?

## Merit setup areas (for copy and IA)

| Area | User-facing label | Typical tab |
|------|-------------------|-------------|
| Roster imported | Import | Import data (leaves Controls) |
| Cycle defined | Cycle | Cycle & budget → Review cycles |
| Merit matrix | Matrix | Base increases → Merit matrix |
| Type → market | Mappings | Mappings → Type → Market |
| Policy rules | Policies | Policies → Policy library |

Experience & equity is a **Controls tab**, not part of the five-item merit setup strip.
