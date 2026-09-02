# ADR 0042: Separate Unicode glyph identity from curated Discern aliases

**Status**: accepted

## Context

The package already draws a small but varied glyph repertoire: terminal Icon names, the Discern motif and its rotation, plain triangles, status marks, and chart markers and fills. Those sets look related, but they do not express one decision. A motif role is consumer-bindable identity, a triangle is fixed component geometry, and a chart ramp encodes quantitative or categorical distinctions. Folding them into one icon registry would make independently changing grammars depend on an informational catalogue.

Glyph Atlas needs broader, evolving Unicode reference data, while Discern Glyphs needs a much smaller set of authored names and recommendations that can later become SemVer-protected API. Unicode identity does not supply universal interface meaning: one right arrow can participate in navigation, output, mapping, or a relationship. ASCII degradation is narrower again because the useful stand-in depends on that context. A scalar-only model also cannot represent explicit text or emoji variation, keycap sequences, or RGI ZWJ sequences without losing exact identity.

The canonical facts come only from the pinned Unicode 17.0.0 data files and reports. FontAwesome and Emojipedia inform the product shape, not the data: their names, descriptions, datasets, tags, and taxonomies are not sources.

## Decision

One private React-free authority under [`src/glyphs/`](../../src/glyphs/) holds two related collections.

Canonical Atlas records are identified by their exact ordered code-point sequence. They carry official scalar facts or an authoritative sequence label, source properties, presentation behaviour, and pinned provenance. The rendered string, sequence ID, identity-based search terms, grapheme count, and Discern terminal width are derived; width delegates to the existing `graphemeWidth()` authority. Atlas membership reasons and hazards are visibly authored judgement, not Unicode semantics.

Curated Discern aliases reference canonical IDs. They own stable machine names, discovery titles, search terms, category, recommendation and rationale, intended and discouraged uses, surface guidance, and context-specific ASCII degradation. A canonical record may therefore have several aliases without acquiring one supposedly universal meaning. Discovery titles are search metadata, never automatic accessible names.

The MVP admits scalars, standardized variation sequences, emoji sequences, and emoji ZWJ sequences, and requires each represented sequence to remain one grapheme. Package exports and Catalogue search/detail UI remain absent until the model and starter curation have been reviewed. A later public export is a separate SemVer decision.

`TerminalMotif`, `TRIANGLES`, chart glyph ramps, box drawing, punctuation, prose separators, and component-local glyph grammars retain their existing ownership. Atlas overlap records identity and discovery evidence only; it does not make those authorities consume the Atlas or authorize migration.

## Consequences

A future search or detail projection can iterate one canonical population and join curated judgement by exact ID without transcribing another list. Variation and multi-code-point identities survive round trips, and terminal geometry follows the same narrow-A policy as the rest of the package. Offline validation enrolls every future record and alias and reports the offending glyph and field.

The source is intentionally authored and bounded rather than a bundled Unicode database. Updating Unicode requires primary-source review of the selected facts, sequence status, presentation behaviour, measured geometry, and any affected recommendation; membership can evolve without promising that curated names evolve with it. Unicode properties establish identity and abstract presentation or width facts, but the Atlas cannot promise font coverage, identical artwork, weight, or baseline across platforms.

Existing glyph sets continue to contain visual overlaps. That duplication is intentional because their reasons to change differ; a future consolidation needs its own evidence and migration decision.

## Alternatives considered

A single flat icon registry was rejected because it conflates canonical identity, contextual meaning, fallback policy, and independent component grammars. A scalar-only table was rejected because variation, keycap, and ZWJ sequences are standardized glyph identities users need to search. Publishing `./glyphs` or building Catalogue UI with the foundation was rejected because either surface would harden names and projection assumptions before the model receives product review. Importing existing glyph authorities into the Atlas was rejected because visual resemblance is not shared ownership.
