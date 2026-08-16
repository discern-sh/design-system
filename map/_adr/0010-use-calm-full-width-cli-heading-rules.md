# ADR 0010: Use calm full-width CLI heading rules

**Status**: accepted

## Context

The original labeled terminal rule filled both sides of a heading with alternating triangle glyphs. That made section boundaries unmistakable in dense technical output, but the repeated changes of direction produced enough visual noise to compete with the content. Compact marker-only candidates reduced the noise but also removed the full-width boundary that lets a reader scan lengthy output for a new context.

The replacement must retain one package-owned triangle motif, remain conspicuous across the available terminal width, degrade clearly to ASCII and no colour, and keep the default rule to one row because grouped prompts and other structured frames measure that geometry. The owner also selected underline and sandwich treatments for contexts that can intentionally spend more vertical space.

## Decision

`renderTriangleSectionRule()` defaults to the strong embedded treatment: two heavy rule cells, one directional triangle, an uppercase label, and a heavy rule extending to the requested width. The renderer truncates long labels inside that geometry rather than overflowing. Unicode uses `━`; ASCII uses `=` so the strong weight remains distinct.

The same public options accept `treatment: "underline"` and `treatment: "sandwich"`. Underline places one triangle and the uppercase label above a strong full-width rule. Sandwich places that heading between two quiet full-width rules, using `─` in Unicode and `-` in ASCII. Anchor heading forwards the treatment and enrols all three in its generated Catalogue examples.

The default remains one row. Multi-row treatments are opt-in and callers that select them own the resulting height. Other discarded candidate geometries do not become public variants, and the package does not restore repeated triangle fields around labels.

## Consequences

Every Component that delegates a true section boundary to the shared rule receives the calmer default, including grouped choices, Divider, Section, Docs header, Procedure, Anchor heading, and Playground chrome. Their labels become uppercase and their rule geometry remains exactly width-bounded. Existing phase and direction options still choose the single triangle marker, while colour remains Token-derived and never carries the state alone.

Consumers gain two stable alternative treatments without copying glyphs or padding. Those names are now public API, and the underline and sandwich forms occupy two and three rows respectively, so they are inappropriate for fixed one-row internals unless the surrounding renderer measures them explicitly.

## Alternatives considered

Keeping the alternating triangle arms was rejected because it preserved the reported visual intensity. Marker-only, short-rule, bracketed, and corner candidates were rejected because they did not create a strong full-width scan boundary. Separate implementations in each Heading-like Component were rejected because glyph choice, degradation, truncation, and width ownership would drift.
