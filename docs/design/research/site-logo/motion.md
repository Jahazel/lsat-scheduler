# Motion spec: the DrillMap route logo on the site

Owner rule (2026-11-11): the logo gets no new motion. It keeps the site's existing page-change glide. Every row below is either that glide or "no motion". Together they are one set to approve, not options.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Top-bar logo (full logo or phone mark) | A page change between two pages that both show a logo: landing ↔ Log in or Sign up at 1200 px and up, Log in → This week, and any signed-in page → another | Slides from its old spot to its new spot (`transform: translate`, by SiteMotion's existing `glideLogo`). The glide moves the link box, so the mark needs no size change. The mark's drawing sits about 2 px right of the full logo's left edge, because the small cut has more room inside its box | `--duration-base` (200 ms), `--ease-standard` | Appears in place, no slide |
| Log in and Sign up below 1200 px | A page change into or out of Log in or Sign up | No logo on these pages, so no glide. The page's own fade is unchanged | None | Same |
| Logo link | Hover, press | No motion. The page change and its glide are the feedback. Logo presses are rare, and the glide already moves this element | None | Same |
| Footer logo | The footer comes into view, or a page change | No logo motion. It fades with the footer, as the footer does today (`data-page-fade`) | Existing footer fade | Existing footer fade |
| Browser tab icon, home-screen icons | Page load, install | Static | None | Same |
