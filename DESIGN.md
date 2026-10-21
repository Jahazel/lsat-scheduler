# Design System: DrillMap

DrillMap uses the Paper design system from the Paper file "DrillMap · Design". The exported boards in `docs/design/`
are the source. Start at `docs/design/README.md`.

| Source | Holds |
| --- | --- |
| `docs/design/design-system/tokens.css` | Every token: color, text size, leading, tracking, weight, spacing, radius, opacity, breakpoint, container |
| `docs/design/design-system/05-foundations` | Color roles, type ramp, spacing, grid, elevation, icons, motion |
| `docs/design/design-system/06-component-states` | Buttons, text inputs, nav bar, page header band, progress bar, component specs |
| `docs/design/design-system/07-this-week-patterns` | Reminder strip, day card, activity row, status icons, footer, copy rules |
| `docs/design/<area>/` | Screen boards. A screen board wins over a Design System board. |

`src/app/globals.css` holds the same tokens as the app's Tailwind theme, plus the elevation shadows. Tailwind's default
color palette is removed, so only Paper colors exist. `src/app/designTokens.test.ts` fails when application code uses an
old token name, a Tailwind palette color, or a raw hex, rgb, hsl, or oklch value.

## Color roles

One light ground: Vellum page, Paper cards, Ink text, one Accent blue.

| Role | Class | Use |
| --- | --- | --- |
| Page ground | `bg-vellum` | Every page background; inset controls and active rows |
| Surface | `bg-paper` | Cards, panels, inputs, menus |
| Border | `border-vellum-line` | Card edges, dividers, outline buttons |
| Text, primary | `text-ink` | Headings, body, button labels |
| Text, secondary | `text-smoke` | All secondary text under 18 px |
| Text, muted | `text-fog` | Placeholders, disabled labels, icons, text at 18 px and up |
| Primary action | `bg-ink text-chalk`, hover `bg-graphite-raised` | Primary buttons and selected segments |
| Accent | `text-accent`, `outline-accent`, `bg-accent` | Links, focus rings, progress fills. Never a button or card fill. |
| Accent tint | `bg-accent/tint`, `bg-accent/faint` | Tinted backgrounds (14% and 8%) |
| Status | `text-success-ink`, `text-warning-ink`, `text-danger-ink` | Status text; the base color (`bg-success`, …) is for dots and icons |
| Dark surface | `bg-ink`, `bg-graphite-raised`, `border-graphite-line` | The landing page's sample-week panel |

**Never color alone.** Every status pairs its color with an icon or a word.

## Type

Geist and Geist Mono load through `next/font`; `font-sans` and `font-mono` point at them. Hierarchy comes from size and
weight in one family. Paper's type ramp exists as `text-caption`, `text-small`, `text-body`, `text-lead`, `text-h6` …
`text-h1`, `text-display`, with matching `leading-*` and `tracking-*` tokens. New and restyled screens use those names.
Screens without boards still use Tailwind's size names where the values match Paper's ramp.

## Spacing, radius, and breakpoints

- Spacing is a 4 px grid; Paper's `spacing-*` tokens equal Tailwind's numbered steps.
- Radius: `rounded-sm` 6 px, `rounded-xs` 8 px, `rounded-md` 12 px, `rounded-lg` 20 px, `rounded-pill`.
- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1440. Containers: `max-w-content` 1120, `max-w-wide` 1296, and
  `max-w-(--container-prose)` 640 (Tailwind's own `max-w-prose` is 65ch).

## Elevation

Flat by default. Depth comes from a 1 px Vellum Line border.

| Level | Class | Use |
| --- | --- | --- |
| e0 | border only | Sidebars, inputs, cards in a panel |
| e1 | `shadow-e1` | A card that floats over its panel; the phone tab bar |
| e2 | `shadow-e2` | Hero product panels on Vellum, including the landing page's sample week |
| e3 | `shadow-e3` | Menus, popovers, the admin workspace dropdown, toasts |

`shadow-control` is the selected segment of the segmented switch (Onboarding · States).

## Product rules

- **Two registers.** The landing page is a brand surface: proof numbers (178, Stanford Law, 200+ students) get their own
  visual step, never body size. The signed-in app is a calm weekly tool: flat, bordered, Accent only for links, focus,
  and progress.
- **Focus.** Every control shows a 2 px Accent focus ring with a 2 px offset.
- **Motion.** 120 ms for hover, 200 ms for press and focus, 320 ms for overlays; honor `prefers-reduced-motion`.
- **Admin controls.** Admins get a workspace dropdown next to the wordmark and, on their student side, a test-controls
  dock for the simulated date. Past dates show a "Past" label; the current date shows "Today" and `aria-current="date"`.
- **Don't** build a generic SaaS landing page or a legacy test-prep look (see PRODUCT.md).
