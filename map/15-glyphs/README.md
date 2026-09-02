# Glyph Atlas and Discern Glyphs

[`src/glyphs/atlas.ts`](../../src/glyphs/atlas.ts) is the private React-free data authority for two deliberately different layers. The Glyph Atlas is a bounded Unicode 17.0.0 reference population whose exact scalar or standardized-sequence identity can evolve with a reviewed Unicode update. Discern Glyphs is the smaller `discernGlyphAliases` collection: authored names, discovery terms, recommendations, use guidance, surface posture, and contextual ASCII degradation that reference canonical IDs.

[ADR-0041](../_adr/0041-separate-unicode-glyph-identity-from-curated-aliases.md) records why Unicode identity, contextual meaning, and fallback are separate facts and why this foundation has no public export or Catalogue route.

## Authority boundary

Canonical records own exact code points, official names or sequence labels, scalar properties, presentation behaviour, Unicode age, and source provenance. Their display string, ID, identity-based search terms, grapheme count, and terminal width are derived; [`validation.ts`](../../src/glyphs/validation.ts) recomputes the relationships and delegates width to [`graphemeWidth()`](../../src/cli/text.ts). Atlas selection rationale and hazards are authored Discern judgement kept beside, but distinct from, the Unicode fields.

Curated aliases own intended meaning. One canonical identity may support several aliases because navigation, output, status, and relationship contexts do not have the same fallback or recommendation. `normalizeGlyphSearchTerm()` is the shared discovery normalizer. Discovery titles never become accessible names; the component or consumer context supplies localized action and content labels.

The current consumers are the complete-population validation and regression suite under [`tests/glyphs/`](../../tests/glyphs/). There is no `./glyphs` package export and no Catalogue projection. Catalogue search and detail work starts by iterating `glyphAtlasData.canonical`, searching each record's derived `searchTerms`, and joining `glyphAtlasData.aliases` by `canonicalId`; it does not create another registry.

## Independent neighbours

The Atlas does not own glyph grammar merely because it contains the same character. [`motif.ts`](../../src/cli/motif.ts) owns semantic and brand motif roles, [`triangles.ts`](../../src/cli/triangles.ts) owns fixed plain-triangle geometry, [`glyph-ramps.ts`](../../src/cli/glyph-ramps.ts) owns chart ramps and series cues, and component renderers such as [`icon.cli.ts`](../../src/components/core/icon/icon.cli.ts) retain their existing contracts. Box drawing, punctuation, prose separators, and other local grammars remain with the surface that gives them meaning.

## Unicode update review

`GLYPH_ATLAS_UNICODE_VERSION` and `GLYPH_ATLAS_UNICODE_SOURCES` pin the research inputs and Unicode terms. An update begins from those primary files, reviews every selected scalar and sequence fact, updates the authored records, and runs the offline validator. Width changes are inspected through the existing package authority rather than a second algorithm. Alias meaning, recommendation, and ASCII degradation receive separate product review; a Unicode-data change never rewrites curated judgement automatically. No build, test, code-generation, or package-consumer path fetches the network.
