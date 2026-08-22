# ADR 0008: The package may own reusable decorative artwork

**Status**: accepted

## Context

[ADR-0006](0006-homepage-treatments-ship-as-variants.md) kept decorative artwork consumer-owned while moving reusable homepage layout and chrome into opt-in Component variants. That boundary was correct for the provider assets, product-state diagrams, narrative compositions, and identity-specific pieces under review at the time. A later set of seven token-driven backdrops exposed a different category: decorative compositions with no product claim, brand mark, or page-specific meaning, useful behind many kinds of consumer-owned content.

Keeping that category consumer-local repeats its theming, reduced-motion, forced-colour, accessibility, and selection work in every site. Folding all of it into Hero block instead makes generally useful artwork depend on one Marketing composition and ships every piece whenever that Component is selected. A package boundary is useful only if it distinguishes reusable visual material from the consumer story placed over it.

## Decision

The package may own opt-in decorative artwork when it is consumer-neutral, Token-driven, independently selectable, and semantically disposable. Package artwork contains no product claim or required information; its complete layer is hidden from assistive technology, remains a finished composition without motion, and disappears in forced-colour modes. Themes change its public Tokens rather than forking its Component CSS.

The canonical `Artwork` Group begins with a shared `Backdrop` Component and seven dependent Backdrops: Survey, Approach, Fold, Aperture, Impression, Envelope, and Cleave. `Backdrop` owns presence, accent, ambient-or-still motion, containment, and accessibility. Each concrete Backdrop owns one static React/SVG/CSS composition and depends only on `Backdrop`, so selecting one includes the common contract without including its siblings. Impression accepts a consumer glyph and defaults to the neutral half-disc `◐`; the package does not make discern's triangle its generic identity.

Hero block accepts a generic decorative `backdrop` slot but does not import the Artwork Group. Backdrops remain useful behind any positioned consumer section, and selecting Hero block alone acquires no artwork bytes.

Bespoke identity art, logos, provider assets, product-state evidence, semantic diagrams, and page-specific narrative compositions remain consumer-owned. This decision qualifies only ADR-0006's blanket decorative-artwork sentence; its opt-in variant decision and all other ownership boundaries remain in force.

## Consequences

Consumers can select one reviewed composition, tune its presence or accent, and receive the same light/dark, reduced-motion, and forced-colour behaviour as the rest of the system. The package assumes responsibility for the public classes, props, Tokens, Catalogue examples, accessibility, and payload of every Artwork Component. The full Catalogue grows, but an explicit Component selection pays only for its chosen Backdrop and the shared foundation.

Future artwork enters through ordinary Component Metadata and the fixed five-file anatomy rather than a second registry. A proposed piece that carries meaning, makes a product claim, or depends on one identity stays outside this Group even if it is visually related.

## Alternatives considered

Keeping every decorative piece consumer-owned preserves the smallest package but duplicates solved system behaviour. Shipping one configurable `BackgroundArt` Component makes discovery simple while coupling unrelated CSS and geometry into every selection. Making the seven pieces Hero block variants prevents reuse and reverses the intended dependency direction.
