---
name: LSAT Scheduler
description: A calm, professional weekly console for reviewing 7Sage analytics and confirming LSAT study schedules.
---

<!-- SEED: re-run /impeccable document once there's real code/components to scan. This file is a scaffold, not a finished spec. -->

# Design System: LSAT Scheduler

## Overview

**Creative North Star: "The Quiet Console"**

This is the light-mode sibling of a console-style interface: the same structural DNA as the Claude Console dashboard (colorful icon tiles anchoring cards, generous whitespace, small pill/tag badges for metadata, a flat simple sidebar) rebuilt on tinted-white surfaces instead of near-black ones. The system exists to make a weekly, low-friction task — review this week's extracted analytics, confirm a schedule — feel unhurried and legible, never like an ops dashboard to be waded through. Confidence comes from clarity and restraint, not decoration or density. It draws a secondary line from Linear and the Stripe Dashboard: precise, minimal, fast to scan, comfortable holding real data without feeling like a spreadsheet.

It explicitly rejects the dense spreadsheet/admin-panel look: cramped tables, tiny type, no hierarchy. This tool serves a small roster on a weekly cadence, not high-volume data ops, and should never look like it does.

**Key Characteristics:**
- Light surfaces only — this is deliberately the light counterpart to a dark reference, never a dark mode variant
- One quiet accent color, used sparingly and consistently for anything actionable
- Structure conveyed through whitespace and thin borders, not shadows or density
- Status and category conveyed through icon tiles and pill badges, not color alone

## Colors

Restrained strategy: tinted neutral surfaces carry the interface; a single accent appears on no more than ~10% of any given screen, reserved for what's actionable.

### Primary
- **Deep Blue-Teal** (exact value to be resolved during implementation): the one accent color. Primary buttons, links, the active sidebar item, and focus states. Nowhere else — its rarity is what keeps it meaningful.

### Neutral
- **Warm-tinted whites and grays** (exact values to be resolved during implementation): background, card surfaces, borders, and body text. Tint every neutral very slightly toward the blue-teal hue (never pure `#fff`/`#000`) so the palette reads as one family rather than accent-plus-generic-gray.

### Named Rules
**The Quiet Accent Rule.** The blue-teal accent is reserved for actionable and interactive elements only: primary buttons, links, active nav state, focus rings. It never appears as pure decoration.

## Typography

**Body/Display Font:** Single humanist sans (candidate: **Geist Sans**, already wired up in this codebase via `next/font` — a strong fit for this direction; confirm during implementation rather than introducing a new typeface).
**Label/Mono Font:** Geist Mono, already present in the codebase, available for data labels or timestamps if a monospace moment is needed.

**Character:** One typeface family carries the whole interface — headings and body differ by weight and size, not by a second face. Calm, highly legible, no ornamentation.

### Hierarchy
- **Title / Headline**: [weight and size to be resolved during implementation] — page and section titles.
- **Body**: [weight and size to be resolved during implementation] — primary reading text, capped around 65–75ch where it appears in paragraph form.
- **Label**: [weight, size, letter-spacing to be resolved during implementation] — pill badges, metadata, small caption text.

## Elevation

Flat by default, matching the restrained motion energy chosen for this system. Depth comes from whitespace and thin (1px) tinted-neutral borders between cards and sections, not from shadows. If a shadow is used at all, it should be a single soft, low-opacity ambient shadow reserved for transient overlays (menus, tooltips) — never resting under static cards.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow, if it appears, signals something temporary (open, floating, in-motion) — not permanent card structure.

## Do's and Don'ts

### Do:
- **Do** keep this light-mode only. The reference is explicitly the light counterpart of the Claude Console dashboard — no dark theme, even as an optional toggle, unless separately requested.
- **Do** reserve the blue-teal accent for actionable elements only, per the Quiet Accent Rule — ≤10% of any screen.
- **Do** use small icon tiles and pill badges as the primary way to convey category and status at a glance, echoing the reference's card language.
- **Do** pair any status color (extracted / confirmed / needs review) with an icon or label, never color alone.
- **Do** keep motion restrained: transitions only as direct feedback to a state change (hover, focus, toggle) — nothing animates just to animate.

### Don't:
- **Don't** replicate the reference screenshot's dark background — this system is the light variant, full stop.
- **Don't** build dense, spreadsheet-like tables with cramped rows and tiny text. This tool handles a small student roster on a weekly cadence, not high-volume data ops.
- **Don't** rely on color alone to signal data or schedule state.
- **Don't** add shadows under static, resting cards — flat by default per the Flat-By-Default Rule.
- **Don't** introduce choreographed animation, scroll-driven sequences, or orchestrated entrances — motion energy is restrained.
