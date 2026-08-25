# ADR 0032: Use the medium-contrast series palette with layered identity guards

**Status**: accepted

## Context

[ADR-0030](0030-own-charts-as-a-quantitative-kind-family.md) established six fixed categorical slots with paired non-colour cues. Its first palette optimized for a measured colour-vision-distance floor and avoided every semantic, ink, and accent hue. That made the proof unusually restrictive: the resulting teal, rust, sky, olive, purple, and pink sequence passed its machinery, but read as a loud dashboard palette on the calm editorial canvas. Because slot 1 also serves single-series charts, teal dominated the most common examples.

The tokens remain unreleased, so this is the least costly point to correct their visual character. Reordering the same colours preserved the proof but not the character. A Tableau-style business palette looked familiar but retained the dashboard-rainbow effect. Paul Tol's published medium-contrast sequence produced the more restrained, publication-like result in live light and dark Catalogue comparisons.

## Decision

The six light series tokens reproduce [Paul Tol's medium-contrast qualitative sequence](https://sronpersonalpages.nl/~pault/) in its published order: soft blue, deep blue, gold, burgundy, ochre, and rose. The dark tokens are package-authored lighter counterparts that preserve that order and character. One-series charts use slot 1's soft blue; there is no separate singleton colour role.

The six-slot limit, authored-order identity, marker shapes, terminal marker and fill glyphs, sequential accent ramp, browser-overridable tokens, and fixed package-authored terminal palette remain as ADR-0030 defined them. Diagrams keep their neutral semantic roles and do not consume this categorical palette.

The palette proof is layered rather than treating one incumbent distance as the definition of safety:

- the authored OKLCH values must reproduce the selected light and dark sRGB palettes exactly;
- every adjacent pair in both modes must remain at least `0.09` apart in OKLab after the existing severe protan and deutan simulations;
- all six colours remain pairwise distinct after ANSI-256 quantization;
- ANSI-16 collapse is recorded exactly, but colour is not required to distinguish adjacent slots at that depth because the separately guarded marker and fill glyphs carry identity.

Categorical hues no longer avoid every semantic and accent hue. This palette deliberately uses blues and golds in those regions. Semantic state tokens are still never recruited as series colours, and a series never communicates its identity by colour alone.

## Consequences

Single-series charts become calm blue rather than teal, while dense charts use a restrained paired sequence. The selected light palette has an external design provenance, and the dark adaptation, colour-vision simulation, and terminal reductions remain package-owned and deterministic.

The cost is explicit: hue alone can resemble a brand or state colour, and ANSI-16 can collapse adjacent slots. Labels, authored order, shapes, and glyphs are therefore part of the identity contract rather than optional decoration. The `0.09` simulation floor is a regression guard for this palette, not a claim that one numerical threshold proves universal accessibility. A future palette change must be judged aesthetically and then update the pinned reference and all three projection guards together.

## Alternatives considered

**Keep or reorder the first palette.** This preserved its unusually high distance floor but retained the visual character that prompted the decision.

**Use the Tableau-style business sequence.** It was clear and familiar in the Catalogue, but the orange, coral, teal, green, and yellow run read more like a general-purpose analytics dashboard than the package's editorial surface.

**Add a separate singleton token.** A dedicated one-series blue would reduce teal dominance without changing the categorical palette, but slot 1 of the chosen sequence already supplies that treatment and avoids another public role.
