# ADR 0044: Publish curated Glyphs, not the canonical Atlas

**Status**: accepted

## Context

The private Glyph foundation separates 57 canonical Unicode 17.0 identities from a smaller, owner-reviewed Discern vocabulary. Consumers need stable contextual names, exact text, approved fallback availability, recommendation, and browser or terminal guidance. They do not need the research schema that records Unicode properties, provenance, starter-Atlas membership, and presentation hazards.

Publishing both layers would make corrections and Unicode upgrades subject to package compatibility pressure, encourage consumers to infer interface meaning from Unicode facts, and make the Atlas look like the owner of existing Icon, motif, triangle, chart-ramp, and Component-local grammars. Keeping both layers Catalogue-only avoids those commitments but leaves consumers to copy literals and policy without a supported neutral resolver.

## Decision

A future React-free `./glyphs` entrypoint publishes only the curated aliases whose private publication disposition is `candidate`, projected into a purpose-built name and resolution contract. That contract supplies exact Unicode text, optional approved ASCII fallback, recommendation, and surface guidance. Discovery titles do not become automatic accessible labels.

Canonical Atlas records, Unicode source facts, provenance, hazards, and private or deferred aliases remain private and Catalogue-visible. Publication does not migrate or consolidate independently owned glyph grammars. This ADR defines the future boundary; it does not add the entrypoint or export data now.

## Consequences

The public contract stays small, React-neutral, useful in browsers and terminals, and isolated behind its own entrypoint for tree-shaking. Enumeration necessarily retains the approved alias projection, while unrelated package entries remain unaffected. Unicode upgrades can revise private factual records without automatically changing the public vocabulary.

Adding, renaming, or removing an exported alias and changing its exact text, fallback availability, or guidance becomes a SemVer decision. The private curation authority must continue to distinguish contextual recommendation from publication disposition, and a future export must derive from it rather than maintain a second list. Consumers that need the complete Atlas continue to use the Catalogue rather than package data.

## Alternatives considered

Publishing aliases plus all canonical Atlas records was rejected because it would stabilize a research schema and create pressure to infer or consolidate semantics the Atlas does not own. Keeping both layers Catalogue-only was rejected because approved contextual policy already has package value and would otherwise be copied by consumers.
