---
name: DrillMap
description: A dual-register system — a proof-driven, color-committed public landing page paired with a calm, restrained authenticated app.
colors:
  ink-25: "oklch(99% 0.003 205)"
  ink-50: "oklch(97.5% 0.005 205)"
  ink-100: "oklch(94% 0.006 205)"
  ink-200: "oklch(89% 0.008 205)"
  ink-400: "oklch(64% 0.01 205)"
  ink-500: "oklch(54% 0.011 205)"
  ink-700: "oklch(32% 0.012 205)"
  ink-900: "oklch(19% 0.013 205)"
  accent-100: "oklch(93% 0.035 205)"
  accent-500: "oklch(54% 0.105 205)"
  accent-600: "oklch(46% 0.1 205)"
  accent-700: "oklch(38% 0.09 205)"
typography:
  display:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-600}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-700}"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "24px"
  pill-badge:
    backgroundColor: "{colors.ink-100}"
    textColor: "{colors.ink-500}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: DrillMap

## 1. Overview

**Creative North Star: "The Proof Trail"**

DrillMap runs two registers under one roof. The public landing page is a **brand** surface — the thing paid Google Ads traffic hits, where a skeptical, stressed LSAT student has to be convinced fast. The authenticated app (onboarding, weekly dashboard, account, admin) is a **product** surface — a calm weekly tool a signed-up student returns to, not a page fighting for attention. Same tokens, same hue family, different energy.

The Proof Trail is the philosophy for the brand register: real evidence (a 178 score, Stanford Law, 200+ students coached, 3,000+ tutoring hours, an actual sample weekly plan) is the whole conversion argument, and design should make that evidence physically impossible to skim past. Numbers get scale, color, and space, not the same muted gray as filler copy. This explicitly rejects the **generic SaaS template** (interchangeable hero-plus-gradient-plus-feature-cards, could belong to any startup) and the **corporate/legacy test-prep look** (Kaplan/Princeton Review-style institutional, stock-photo energy) named in PRODUCT.md.

The product register keeps the system's original restraint: a weekly-cadence tool should never look like it's competing for attention. Confidence there still comes from clarity, not decoration.

**Key Characteristics:**
- One hue family (ink neutrals + accent blue-teal, both hued toward ~205) carries both registers — the app never looks like a different brand than the landing page
- Brand-register moments commit to the accent at real scale (large proof numerals, solid-fill blocks); product-register moments keep it to ≤10% of the screen, reserved for actionable elements
- Flat-by-default everywhere, with one exception: brand-register hero/proof moments may take a soft ambient shadow or solid-color block to read as a real, weighty object — the app stays strictly flat and bordered
- Status and category are always conveyed through icon, label, or shape, never color alone

## 2. Colors

One hue family, two intensities. Tinted-neutral "ink" and blue-teal "accent" are shared by both registers; what changes between brand and product is how much of the surface the accent is allowed to claim.

### Primary
- **Drill Teal** (`accent-600`, `oklch(46% 0.1 205)`): the one accent hue across all of DrillMap. On product-register screens (dashboard, admin, forms) it's Restrained — buttons, links, active states, ≤10% of any screen. On brand-register screens (landing page) it goes Committed — large proof numerals, the primary CTA, section accents can pull real visual weight from it, well past 10%.
- **Drill Teal Deep** (`accent-700`, `oklch(38% 0.09 205)`): hover/pressed state for anything using Drill Teal, both registers.
- **Drill Teal Light** (`accent-100`, `oklch(93% 0.035 205)`): soft accent fills — icon-tile backgrounds, selected-state backgrounds, the step-number chips in "How it works."

### Neutral
- **Paper** (`ink-25`, `oklch(99% 0.003 205)`): page background, both registers.
- **Mist** (`ink-50`, `oklch(97.5% 0.005 205)`): subtle secondary surface (e.g. the sample-plan card background on the landing page).
- **Hairline** (`ink-100`, `oklch(94% 0.006 205)`): borders, dividers, pill-badge backgrounds.
- **Quiet** (`ink-200`, `oklch(89% 0.008 205)`): stronger borders where `ink-100` is too faint.
- **Muted Text** (`ink-400` / `ink-500`, `oklch(64%/54% 0.01/0.011 205)`): secondary and tertiary copy — captions, metadata, helper text.
- **Ink** (`ink-700` / `ink-900`, `oklch(32%/19% 0.012/0.013 205)`): body text and headings respectively.

### Named Rules
**The Register Determines the Rule.** Product-register surfaces obey the original Quiet Accent Rule: `accent-600` on ≤10% of the screen, reserved for actionable elements, never decorative. Brand-register surfaces are exempt from that ceiling by design — a landing page proof point rendered in `ink-500` at 14px is a bug, not restraint.

## 3. Typography

**Display Font:** Geist Sans (`var(--font-geist-sans)`, already wired via `next/font`), with `ui-sans-serif, system-ui, sans-serif` fallback.
**Label/Mono Font:** Geist Mono (`var(--font-geist-mono)`), available for data labels or timestamps where a monospace moment is useful — not currently used for the credibility numbers, but a candidate for them (see Components).

**Character:** One typeface family carries the entire system across both registers — hierarchy comes from scale and weight, never a second face. On the landing page this same restraint becomes an asset: nothing about the type family screams "generic SaaS," because there's no ornamental display font doing that work for you. The type has to be sized and weighted with real conviction instead.

### Hierarchy
- **Display** (600, `clamp(2.25rem, 5vw, 3rem)`, 1.1 line-height, -0.02em tracking): the landing-page hero headline only.
- **Headline** (600, 1.5rem, 1.25 line-height, -0.01em tracking): section titles ("How it works", "A real weekly plan, not a template").
- **Body** (400, 1rem, 1.6 line-height): primary reading copy, capped 65–75ch.
- **Label** (500, 0.75rem, 1.4 line-height): pill badges, metadata, small captions — e.g. the "Viewing as admin — read only" badge.

### Named Rules
**The Proof Number Rule.** Any number presented as direct evidence of credibility or outcome (a score, a student count, an hours-tutored figure, an accuracy percentage) is never rendered at body or label scale. It gets its own visual step — minimum Headline scale, `accent-600` or `ink-900` (never `ink-500`), with its label demoted beneath it in Label scale. Editable numeric inputs in product screens are form controls, not proof displays, and use body-size input typography. If a stat and a caption are the same size, the stat lost.

## 4. Elevation

Flat by default across the whole system — this carries over unchanged from the product register's original Flat-By-Default Rule. Depth comes from whitespace and 1px `ink-100`/`ink-200` borders, not shadows, on every app screen (dashboard, admin, onboarding, account).

The one register-specific exception: brand-register hero and proof moments (the credibility bar, a featured CTA block) may take a single soft, low-opacity ambient shadow or a solid `accent`/`ink-900` fill to read as a real, weighty object worth stopping for. This is a deliberate, sparing exception — not a general license to add shadows across the landing page.

### Shadow Vocabulary (if applicable)
- **proof-ambient** (`box-shadow: 0 8px 30px oklch(19% 0.013 205 / 0.08)`): reserved for brand-register hero/proof blocks that need to feel lifted off the page. Never used in the app.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow, if it appears, signals either a transient overlay (menu, tooltip) or one of the named brand-register proof exceptions above — never permanent app card structure.

## 5. Components

### Buttons
- **Shape:** 6px radius (`rounded-md`).
- **Primary:** `accent-600` background, white text, `12px 24px` padding, both registers.
- **Hover / Focus:** background shifts to `accent-700`; 150ms ease-out color transition (`transition-colors duration-150 ease-out`), no layout-affecting motion.
- **Ghost / Text link (secondary):** `ink-500` text, `ink-700`/`ink-900` on hover, no background or border at any state.

### Pill Badges
- **Style:** `ink-100` background, `ink-500`/`ink-600` text, `9999px` radius, `4px 10px` padding, Label typography.
- **Use:** status/role indicators (e.g. "Viewing as admin — read only"), never as a decorative chip.

### Cards / Containers
- **Corner Style:** 8px radius (`rounded-lg`) for standard cards, 12px (`rounded-xl`) for larger feature/proof containers.
- **Background:** white on `ink-25` page background for standard cards; `ink-50` for the sample-plan container specifically (a secondary-surface moment, not a card needing its own border).
- **Shadow Strategy:** none by default (see Elevation); brand-register proof/hero containers may use `proof-ambient`.
- **Border:** 1px `ink-100`.
- **Internal Padding:** 20px (`p-5`) small cards, 24px (`p-6`) standard, 32px (`p-8`) hero/feature containers.

### Inputs / Fields
- **Style:** 1px `ink-200` border, white background, `rounded-md`.
- **Focus:** border shifts to `accent-600`.
- **Error / Disabled:** error text in a legible red beneath the field, never color-only; disabled at reduced opacity with `cursor-not-allowed`.

### Navigation
- **Style:** flat top bar, `ink-100` bottom border, `DrillMap` wordmark at `ink-900` left-aligned, right-aligned text links (`ink-600`, `ink-900` on hover). No dropdowns, no mega-menu — this is a small, flat nav by design at every screen size so far.

### Credibility Bar (signature component, brand register)
The landing page's proof-stat row. Currently under-designed: four stats rendered as plain inline `text-sm text-ink-500` separated by middot characters — identical visual weight to filler copy, which is exactly why it doesn't land. Per the Proof Number Rule, each stat should be a two-line unit: the number/fact at Headline scale in `ink-900` or `accent-600`, its description beneath at Label scale in `ink-500`, arranged as a row of equal-width columns (not an inline run of text) with generous horizontal spacing (`gap-x-12`+) rather than middot separators doing the work of visual separation.

## 6. Do's and Don'ts

### Do:
- **Do** treat proof numbers (178 score, Stanford Law, 200+ students, 3,000+ hours) as first-class visual elements on brand-register pages, per the Proof Number Rule — Headline scale minimum, never body/label scale.
- **Do** keep the app (dashboard, onboarding, admin) strictly Restrained — `accent-600` on ≤10% of the screen, flat, bordered — even as the landing page goes bolder. One brand, two registers.
- **Do** use the single Geist Sans family with real weight/scale contrast to build hierarchy, rather than introducing a second display face.
- **Do** pair any status or state indicator with an icon or label, never color alone.
- **Do** keep motion restrained everywhere: transitions only as direct feedback to a state change (hover, focus, toggle), 150ms ease-out, nothing choreographed.

### Don't:
- **Don't** build a "generic SaaS template" landing page — no interchangeable hero-plus-gradient-blob-plus-feature-card-grid that could belong to any startup. Named PRODUCT.md anti-reference.
- **Don't** default to a "corporate/legacy test-prep" look (Kaplan/Princeton Review-style institutional, stock-photo energy). Named PRODUCT.md anti-reference.
- **Don't** render credibility or outcome numbers at the same visual weight as surrounding body copy — see the Credibility Bar component note and the Proof Number Rule.
- **Don't** carry the landing page's Committed color energy into the authenticated app, or the app's Restrained quietness back onto the landing page. The registers are deliberately different.
- **Don't** add shadows under static, resting app cards. The one shadow exception (`proof-ambient`) is brand-register-only and sparing.
- **Don't** introduce a second accent hue to make the landing page feel bolder — the Committed strategy means using more of Drill Teal, not adding a new color.
