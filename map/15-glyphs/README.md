# Glyph Atlas and Discern Glyphs

[`src/glyphs/atlas.ts`](../../src/glyphs/atlas.ts) is the private React-free data authority for two deliberately different layers. The Glyph Atlas is a bounded Unicode 17.0.0 reference population whose exact scalar or standardized-sequence identity can evolve with a reviewed Unicode update. Discern Glyphs is the smaller `discernGlyphAliases` collection: authored names, discovery terms, recommendations, use guidance, surface posture, and contextual ASCII degradation that reference canonical IDs.

[ADR-0042](../_adr/0042-separate-unicode-glyph-identity-from-curated-aliases.md) records why Unicode identity, contextual meaning, and fallback are separate facts and why the reviewed foundation began without a public export. The Catalogue now projects that private data for discovery; it does not turn the data into package API.

## Authority boundary

Canonical records own exact code points, official names or sequence labels, scalar properties, presentation behaviour, Unicode age, and source provenance. Their display string, ID, identity-based search terms, grapheme count, and terminal width are derived; [`validation.ts`](../../src/glyphs/validation.ts) recomputes the relationships and delegates width to [`graphemeWidth()`](../../src/cli/text.ts). Atlas selection rationale and hazards are authored Discern judgement kept beside, but distinct from, the Unicode fields.

Curated aliases own intended meaning. One canonical identity may support several aliases because navigation, output, status, and relationship contexts do not have the same fallback or recommendation. `normalizeGlyphSearchTerm()` is the shared discovery normalizer. Discovery titles never become accessible names; the component or consumer context supplies localized action and content labels.

The complete-population validation and regression suite under [`tests/glyphs/`](../../tests/glyphs/) guards the private foundation. There is still no `./glyphs` package export.

## Catalogue projection

[`catalogue/routes/glyphs.ts`](../../catalogue/routes/glyphs.ts) is the projection authority. It iterates `glyphAtlasData.canonical` once, joins `glyphAtlasData.aliases` by `canonicalId`, derives the reversible `u-…` sequence slug, and supplies one card, detail destination, navigation identity, and shared search record per canonical identity. Alias names, categories, recommendations, uses, and guidance remain joined search/detail fields rather than additional destinations. [`catalogue/routes/registry.ts`](../../catalogue/routes/registry.ts) owns the family's position and canonical `/catalogue/glyphs/` path; [`catalogue/pages/glyphs/state.ts`](../../catalogue/pages/glyphs/state.ts) owns the validated `q`, `category`, and `recommendation` URL projection.

The explorer and detail pages under [`catalogue/pages/glyphs/`](../../catalogue/pages/glyphs/) consume those source-injected projections. Exact literal matching lives in the shared [`catalogue/search/search.ts`](../../catalogue/search/search.ts) engine, so pasted variation selectors and ZWJ sequences retain exact identity in both local and global search. Browser conformance is family-owned by [`scripts/conformance/catalogue/glyphs.ts`](../../scripts/conformance/catalogue/glyphs.ts) and enrolled once through the shared browser-check plan.

The Catalogue describes Unicode facts as source-cited, authored, bounded records. It does not claim that every property is mechanically replayed against upstream Unicode files, promise identical glyph artwork or font coverage, or turn a discovery title into an accessible label.

## Independent neighbours

The Atlas does not own glyph grammar merely because it contains the same character. [`motif.ts`](../../src/cli/motif.ts) owns semantic and brand motif roles, [`triangles.ts`](../../src/cli/triangles.ts) owns fixed plain-triangle geometry, [`glyph-ramps.ts`](../../src/cli/glyph-ramps.ts) owns chart ramps and series cues, and component renderers such as [`icon.cli.ts`](../../src/components/core/icon/icon.cli.ts) retain their existing contracts. Box drawing, punctuation, prose separators, and other local grammars remain with the surface that gives them meaning.

## Unicode update review

`GLYPH_ATLAS_UNICODE_VERSION` and `GLYPH_ATLAS_UNICODE_SOURCES` pin the research inputs and Unicode terms. An update begins from those primary files, reviews every selected scalar and sequence fact, updates the authored records, and runs the offline validator. Width changes are inspected through the existing package authority rather than a second algorithm. Alias meaning, recommendation, and ASCII degradation receive separate product review; a Unicode-data change never rewrites curated judgement automatically. No build, test, code-generation, or package-consumer path fetches the network.
