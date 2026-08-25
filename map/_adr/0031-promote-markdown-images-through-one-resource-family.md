# ADR 0031: Promote Markdown images through one shared resource-family resolver

**Status**: accepted

## Context

[ADR-0029](0029-upgrade-markdown-images-through-explicit-diagram-resources.md) settled how an ordinary Markdown image upgrades to typed semantics: an explicit caller-supplied source-to-spec resource promotes an isolated matching image after URL normalisation, the spec stays the accessibility authority, and no renderer reads files. It settled that shape for one family — diagrams. Charts now need the identical bridge: the same three forms (portable generated SVG in raw Markdown, live token-themed Component in the browser, truthful terminal projection), the same producer relationship (the consumer writes `renderChartSvg` output to its own asset path), and the same drift hazards between the raw image alternative and the spec's accessibility facts.

The obvious-looking move is to copy the landed diagram resolver and substitute chart names. That copy would create a second promotion authority whose matching, URL normalisation, duplicate rejection, isolated-image test, and alt/title equality each evolve independently of the first. Every behavioural fact ADR-0029 fixed — what counts as an isolated image, how encoded-equivalent sources unify, when drift rejects the whole document — would then exist twice, and a fix or hardening applied to one family would silently miss the other. The source-side identity is already family-neutral: both families' canonical sources resolve through the one `canonicalSafeUrlReference` authority, so nothing about matching is diagram-specific. Only four facts differ per family: how a spec snapshot is validated, how the canonical alternative text derives, which summary the optional image title must equal, and which neutral block kind the promotion produces.

A second question arrives with the second family: what happens when the diagram collection and the chart collection admit the same normalised source? Sequential per-family passes would make the answer an accident of pass order — the first family to run would win the image, and reordering an internal call would change public output.

## Decision

Markdown image promotion is **one shared neutral resolver serving a family of resource kinds**. The family-neutral machinery — dense-collection inspection, JSON-safe snapshotting through the shared internal authority, exact `source`/`spec` key enforcement, canonical URL normalisation through `canonicalSafeUrlReference`, duplicate-source rejection, isolated-image detection, alt and optional-title equality, and the single recursive document walk that promotes a matching image to its resolved block — lives exactly once, in the Markdown model. Each family supplies only a typed parameter set: its spec validator, its canonical alternative derivation, its summary authority, its block construction, and the nouns its refusal messages use. The diagram family is re-expressed through this core with no behavioural change; the chart family is the second client, not a second implementation.

Family-specific typing wraps the shared core at the public boundary. `MarkdownDiagramResource` and `MarkdownChartResource` remain distinct source-to-spec pair types, supplied through distinct optional collections (`diagrams`, `charts`) on React Markdown, CLI Markdown, and each interactive Markdown-browser document. The core never widens those types into a tagged public union: callers keep compile-time certainty about which spec family a collection carries, and a future family adds a parameter set plus a typed collection rather than touching the resolver.

All admitted sources share one namespace. After each collection validates independently, the resolver combines them into one source-keyed table; a normalised source admitted by more than one family is a duplicate and rejects the whole render deterministically, exactly as a duplicate within one collection does. One image therefore promotes to at most one block, and the answer never depends on evaluation order.

Version one still adds no chart or diagram fence, directive, MDX component, parser plugin, data-file ingestion, URL protocol, global registry, resolver callback, filesystem root, file read, fetch, or SVG parsing. The dialect recorded in [ADR-0020](0020-parse-markdown-through-mdast.md) is untouched: promotion remains a post-parse resolution over standard image syntax, and ADR-0029's remaining rules — isolated-image promotion only, drift rejecting before partial output, valid unused resources allowed for corpus-level reuse — apply identically to every family and every caller.

## Consequences

Behavioural facts about promotion are single-sourced: a hardening of source inspection, a matching fix, or a policy change lands once and covers every family, and the families cannot drift because there is nothing family-local to drift. Adding a future resource kind is a parameter set, a typed collection, a neutral block, and both projections' dispatch — the resolver itself does not change. The cross-family duplicate rule makes corpus-level collections safe to grow independently: a diagram author and a chart author cannot silently contest one asset path.

The costs are accepted deliberately. The shared core's refusal messages are parameterised, so each family's errors must keep naming that family's nouns and spec type for tests and consumers that match on them. The resolver walk is now the one place promotion happens, which makes it load-bearing: a defect there affects every family at once, and its tests must cover the family matrix rather than one path. Distinct per-family collections mean a caller registering both families supplies two props rather than one mixed list — the price of keeping each collection's spec type closed at compile time.

## Alternatives considered

**A parallel chart resolver** (copy, substitute names) was rejected as the drift machine described above: two authorities for one behaviour, diverging silently from the first divergent fix.

**One public tagged resource union** (`{ family: "diagram" | "chart", source, spec }` in a single collection) would collapse the two props into one but forces every caller through a runtime discriminant, loosens each collection's spec typing, and turns an additive future family into a breaking union change. The family split is real at the type level even though the machinery beneath is shared.

**Sequential per-family resolution passes** would avoid the combined table but make cross-family duplicates order-dependent — first pass wins — leaving public output hostage to an internal call ordering. Deterministic rejection through one combined namespace is strictly clearer.
