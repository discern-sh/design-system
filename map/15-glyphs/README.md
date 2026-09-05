# Glyph Atlas and Discern Glyphs

[`src/glyphs/atlas.ts`](../../src/glyphs/atlas.ts) is the private React-free data authority for two deliberately different layers. The Glyph Atlas is a bounded Unicode 17.0.0 reference population whose exact scalar or standardized-sequence identity can evolve with a reviewed Unicode update. Discern Glyphs is the smaller `discernGlyphAliases` collection: authored names, discovery terms, recommendations, publication dispositions, use guidance, surface posture, and contextual ASCII degradation that reference canonical IDs.

[ADR-0042](../_adr/0042-separate-unicode-glyph-identity-from-curated-aliases.md) records why Unicode identity, contextual meaning, and fallback are separate facts. [ADR-0044](../_adr/0044-publish-curated-glyphs-not-canonical-atlas.md) fixes the publication boundary: a React-free `./glyphs` entrypoint exposes only approved curated candidates and resolution metadata, while the canonical Atlas remains private and Catalogue-visible.

## Authority boundary

Canonical records own exact code points, official names or sequence labels, scalar properties, presentation behaviour, Unicode age, and source provenance. Their standardized text/emoji presentation pairs, display string, ID, identity-based search terms, grapheme count, and terminal width are derived; [`validation.ts`](../../src/glyphs/validation.ts) recomputes the relationships and delegates width to [`graphemeWidth()`](../../src/cli/text.ts). Atlas selection rationale and hazards are authored Discern judgement kept beside, but distinct from, the Unicode fields.

Curated aliases own intended meaning. One canonical identity may support several aliases because navigation, output, status, and relationship contexts do not have the same fallback or recommendation. Recommendation records contextual use; the orthogonal `candidate` or `deferred` disposition selects membership in the public projection. A `unicode-only` terminal posture represents supported Unicode when no ASCII fallback honestly preserves the role. `normalizeGlyphSearchTerm()` is the shared discovery normalizer. Discovery titles never become accessible names; the component or consumer context supplies localized action and content labels.

## Public consumption

[`src/glyphs/mod.ts`](../../src/glyphs/mod.ts) exposes the immutable curated vocabulary and typed lookup/resolution contract. [`scripts/glyphs.ts`](../../scripts/glyphs.ts) validates and projects candidate aliases during codegen into a purpose-built artifact; the public graph has no Atlas, Unicode measurement, React, or I/O dependency. The name union derives from that artifact, so adding a candidate requires no second export list. [README usage](../../README.md#unicode-glyphs) is the consumer entry point.

Resolution chooses an explicit repertoire and returns text with its measured terminal cell width or a typed unavailable result. ASCII width may differ from Unicode width. Labels remain consumer-owned, and an unavailable substitute never invents a replacement mark. The complete-population regression suite under [`tests/glyphs/`](../../tests/glyphs/) guards this projection, future enrollment, contextual fallback distinctions, immutable records, isolated imports, and executable Catalogue examples.

## Catalogue projection

[`catalogue/routes/glyphs.ts`](../../catalogue/routes/glyphs.ts) is the projection authority. It iterates `glyphAtlasData.canonical` once, joins `glyphAtlasData.aliases` by `canonicalId`, derives the reversible `u-…` sequence slug, and supplies one card, detail destination, navigation identity, and shared search record per canonical identity. Alias names, categories, recommendations, publication dispositions, uses, and guidance remain joined search/detail fields rather than additional destinations. [`catalogue/routes/registry.ts`](../../catalogue/routes/registry.ts) owns the family's position and canonical `/catalogue/glyphs/` path; [`catalogue/pages/glyphs/state.ts`](../../catalogue/pages/glyphs/state.ts) owns validated URL filters and supplies the same filtered canonical population to the directory and category navigation.

The explorer and detail pages under [`catalogue/pages/glyphs/`](../../catalogue/pages/glyphs/) consume those source-injected projections. Exact literal matching lives in the shared [`catalogue/search/search.ts`](../../catalogue/search/search.ts) engine, so pasted variation selectors and ZWJ sequences retain exact identity in both local and global search. Ready-to-use names lead the compact card view; interface/reference, category, presentation, and terminal filters compose without changing identity. Search explanations preserve the shared engine's match reasons and distinguish reference mentions from intended uses. The detail workbench consumes the public resolver, renders browser examples and a real terminal Box, and generates copyable examples from its selected role, label, and repertoire. Exact presentation siblings link to their canonical routes, and `?use=` selects a published contextual role within one identity. Font and size controls are local specimens, not platform certification.

Browser conformance is family-owned by [`scripts/conformance/catalogue/glyphs.ts`](../../scripts/conformance/catalogue/glyphs.ts) and enrolled once through the shared browser-check plan.

The Catalogue describes Unicode facts as source-cited, authored, bounded records. It does not claim that every property is mechanically replayed against upstream Unicode files, promise identical glyph artwork or font coverage, or turn a discovery title into an accessible label.

## Independent neighbours

The Atlas does not own glyph grammar merely because it contains the same character. [`motif.ts`](../../src/cli/motif.ts) owns semantic and brand motif roles, [`triangles.ts`](../../src/cli/triangles.ts) owns fixed plain-triangle geometry, [`glyph-ramps.ts`](../../src/cli/glyph-ramps.ts) owns chart ramps and series cues, and component renderers such as [`icon.cli.ts`](../../src/components/core/icon/icon.cli.ts) retain their existing contracts. Box drawing, punctuation, prose separators, and other local grammars remain with the surface that gives them meaning.

## Unicode update review

`GLYPH_ATLAS_UNICODE_VERSION` and `GLYPH_ATLAS_UNICODE_SOURCES` pin the research inputs and Unicode terms. An update begins from those primary files, reviews every selected scalar and sequence fact, updates the authored records, and runs the offline validator. Width changes are inspected through the existing package authority rather than a second algorithm. Alias meaning, recommendation, and ASCII degradation receive separate product review; a Unicode-data change never rewrites curated judgement automatically. No build, test, code-generation, or package-consumer path fetches the network.
