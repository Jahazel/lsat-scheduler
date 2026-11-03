# Findings: Landing hero

The owner supplied the references (2026-11-03), so this file records what each one shows instead of a fresh search. All are desktop web. Motion read from live pages is marked as measured; motion read from still frames is marked as inferred.

## Hero layout patterns

### Floating product tiles around a centered headline
- **Example:** [t3.codes](https://t3.codes/).
- **What it does:** a centered headline with small tilted product tiles around it on a faint grid. The product screen peeks in at the fold.
- **When it works:** when the product's content is concrete enough that fragments of it explain the product.
- **Tradeoffs:** busy on small laptops; the tiles must be real content, or they read as decoration.
- **Fit:** DrillMap's drill cards are short and specific (question type, minutes, score). Chosen as H1.

### Icons inline in the headline
- **Example:** Mobbin's own site ([section](https://mobbin.com/sites/sections/2c52def4-6537-44aa-af28-f41a995a3812)).
- **What it does:** small colored icon tiles sit between the headline words.
- **When it works:** for short, punchy headlines.
- **Tradeoffs:** a common pattern, so it reads as generic. The tiles also break up the reading of the headline.
- **Fit:** built as H2; not chosen.

### Product in a gradient frame with tabs
- **Example:** Calendly ([section](https://mobbin.com/sites/sections/1aecb2bd-9275-46c8-bd6a-ab20e3847941)).
- **What it does:** the product screen sits in a large color-gradient frame, with icon tabs above it.
- **When it works:** when several product views each need a moment.
- **Tradeoffs:** close to the "gradient blob" anti-reference in PRODUCT.md.
- **Fit:** built as H2; not chosen.

### Split layout with a data drawing
- **Example:** Zaro ([section](https://mobbin.com/sites/sections/4e38789e-832b-46be-9c0f-8068da7081c1)).
- **What it does:** the headline is on the left. On the right, an isometric layered drawing has a ruler. A ruled logo strip runs underneath.
- **When it works:** when the product's model can be drawn.
- **Tradeoffs:** the drawing needs a legend to make sense.
- **Fit:** built as H3; not chosen.

## Flow and motion
- **t3.codes, measured** (read from the page's running animations, 2026-11-03): the tiles rise in a stagger, each 700 ms with ease-out, then stay still.
- **H1 plan:** keep the one-time drift-in, then add a slow 4 px float. Reduced motion skips both.
- **Mobbin and Calendly, inferred:** no hero motion is visible in the still frames.
