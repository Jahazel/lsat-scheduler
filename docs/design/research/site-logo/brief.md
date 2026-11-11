# Design brief: the DrillMap route logo on the site

Tracking ticket: #827. Spec: #838. Tickets: #839, #840, #841. Screenshots: `docs/design/site-logo/`.

## Job

A visitor or student sees the DrillMap route logo wherever the site names itself: every top bar, the footer, the Log in and Sign up glow panel, and the browser tab. The logo replaces the plain word "DrillMap" and still takes them home when they press it.

## The logo (decided before this brief)

- "Joined route + DrillMap": the route mark (hollow start ring, three passes, end square) beside the name in Geist SemiBold, drawn as shapes.
- Void Eclipse `#0B0B0B` for the route and the name. Abyss Blue `#2B3B79` on the end square, on light grounds only. On dark grounds every part is Silver Mist `#E4E4E4`.
- Below 32 px, use the small cut: a solid start dot and a thicker line.
- Source kit: the owner's workspace, `outputs/lsat-scheduler/drillmap-logo/`. The kit's rules (clear space, minimum size, do-nots) apply.

## Flow map

| From | User action | To |
| --- | --- | --- |
| Landing top bar | Press the logo | Landing page (`/`) |
| Log in or Sign up, top left, 1200 px and up | Press the logo | Landing page (`/`) |
| Log in or Sign up, below 1200 px | No logo (owner, 2026-11-11) | Browser Back returns to the page before |
| Signed-in top bar, desktop or phone | Press the logo | This week (`/dashboard`) |
| Admin top bar | Press the logo | Admin (`/admin`) |
| Footer | None: the footer logo is not a link | Stays |
| Any page with a logo | Go to another page with a logo | The logo glides from its old spot to its new one (existing motion, unchanged) |
| Browser tab, home screen | Open the site | The site opens; the tab and home-screen icon show the route mark |

## States

| State | When it happens | What it must show |
| --- | --- | --- |
| Rest, light ground | Top bars, Log in and Sign up left column from 1200 px | Colour logo: Void Eclipse with the Abyss Blue end square |
| Rest, dark ground | Landing footer (Void Eclipse after #813) and legal footer (graphite) | Reversed logo: every part Silver Mist |
| Log in and Sign up below 1200 px | Phone and tablet widths | No logo on the glow band (owner, 2026-11-11: the reversed logo on the band looked ugly) |
| Keyboard focus | Tab onto a logo link | The site's focus ring around the whole logo; the dark-ground ring on dark grounds |
| Phone, signed in | Signed-in bar below the desktop width, sometimes beside the workspace switcher | A logo that fits beside the switcher and the tab pill at 320 px |
| Page change | Moving between pages that both show a top-bar logo | The existing glide; no new logo motion |
| Reduced motion | The device asks for less motion | No glide (existing rule) |
| Browser tab | Any page | The small cut at 16 px; it stays readable on a light and on a dark browser tab |

## Data cases

The logo shows no user data. The layout cases are:

- The narrowest phone, 320 px, with the workspace switcher and the tab pill beside the logo.
- 200% browser zoom on every top bar.
- The Log in glow band at a short window (height 500 px or less).
- Light and dark browser tabs for the favicon.

## Out of scope

- A drawing animation of the route (owner, 2026-11-11: the logo repeats on every page, so it gets no new motion).
- Any logo on the Log in and Sign up glow panel or glow band, at any width (owner, 2026-11-11, after seeing mocks A, B, C).
- Any logo on the Log in and Sign up glow band below 1200 px. (Owner, 2026-11-11: first "no second logo", then, after seeing it, "remove it from tablet and mobile". This replaces the earlier plan to keep the reversed top-bar logo on the band.)
- A social-share picture for links pasted in chats. Follow-up idea, not this work.
- Emails, which are plain text.
- Loading screens and the onboarding preview, which use "DrillMap" as a word in sentences.
- The trademark search. It stays a step before launch, outside design.

## Open questions

1. Footer: the footer ticket waits for #813, which makes the landing footer Void Eclipse. The prototype draws the footer as #813 leaves it. (Settled with the owner, 2026-11-11.)

## Sections

In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Top bars (landing, signed-in desktop and phone, Admin, Log in and Sign up top left) | Quiet + Mark on phone | Size (Quiet: horizontal logo 1.125 rem tall everywhere) and phone layout (signed-in bars in their phone layout show the small-cut mark alone, 1.5 rem) | Owner liked Quiet, and the mark alone for signed-in phone bars. After break-ui: no logo on Log in and Sign up below 1200 px ("it looks ugly"); landing bar gap 1.5 rem from 360 to 389 px so it stays one row; sizes in rem; the link keeps the name "DrillMap" for screen readers |
| 2. Footer (dark landing footer, dark legal footer) | Echo | Size: the top-bar logo (1.125 rem) reversed to Silver Mist; not a link; the name stays for screen readers | Owner picked Echo over Sign-off (2 rem) and Mark only. Worst-case check: no sideways scroll at 320–1440 px, signed in and out. Finding: the legal pages' footer is dark (graphite) today, not light as #813 says; it stays dark |
| 3. Log in and Sign up glow panel, 1200 px and up (mocks A, B, C) | None | Mocks A (stacked top), B (above the card), C (symbol top) were built and shown | Owner, 2026-11-11: "I don't like any of them; let's not add the logo there." The glow panel keeps no logo; the only Log in and Sign up logo is the top-left one from 1200 px up |
| 4. Browser and app icons (shown once for a yes or no; no variants, owner 2026-11-11) | Kit icons as made | None: one set shown for approval | Owner approved the kit's favicon (small cut; switches to Silver Mist in a dark browser), Apple home-screen icon, and Android icons (Void Eclipse tile, Silver Mist mark). Manifest `display` is `browser`, not the kit's `standalone`: standalone can break Google sign-in and Stripe checkout on iPhones (owner, 2026-11-11). Phone check (`mobile-native`): manifest `theme_color` is Paper `#FFFFFF`, not Void Eclipse, so the phone's browser bar matches the white top bar; leave out the kit head snippet's dark `theme-color` meta |
