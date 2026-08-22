# ADR 0020: Parse Markdown once through a contained mdast adapter

**Status**: accepted

## Context

The package needs one first-class Markdown Component that can project the same document into semantic React elements and deterministic terminal Component calls. The supported dialect is CommonMark plus GFM tables, task-list items, strikethrough and autolinks, GitHub-style alerts, and footnotes. Parsing that grammar independently in the browser and terminal projections would guarantee drift, while publishing a parser's token shape would make an implementation dependency part of the package contract.

The parser must run synchronously and deterministically under Deno and through JSR's npm dependency support, without React, I/O, environment reads, terminal detection, plugin discovery, or an execution-capable HTML path. Markdown is untrusted display data: raw HTML, malformed destinations, terminal controls, Unicode format characters, and pathological documents must become inert or fail before either projection emits a partial document.

`mdast-util-from-markdown` is the mdast project's direct CommonMark parser adapter over micromark. Its corresponding GFM extensions cover tables, task lists, strikethrough and autolinks; the mdast footnote nodes are part of the CommonMark adapter's supported syntax. GitHub alerts are not a distinct Markdown grammar construct: micromark correctly exposes them as ordinary blockquotes whose first paragraph begins with an official marker, so they can be classified after parsing without forking the grammar. The exact Deno-resolved graph contains 58 npm packages including type packages; every declared package licence and included licence text is MIT, which is compatible with this package's Apache-2.0 licence.

## Decision

Markdown parsing uses exactly pinned `mdast-util-from-markdown@2.0.3`, `micromark-extension-gfm@3.0.0`, and `mdast-util-gfm@3.1.0`, with `@types/mdast@4.0.4` as a development-time structural vocabulary. The package calls `fromMarkdown` directly with the GFM syntax and mdast extensions. It does not add the unified or remark processor layer, mutate a global parser, discover plugins, or maintain a handwritten Markdown grammar.

One React-free package adapter parses source synchronously and immediately converts the mutable, dependency-owned mdast tree into a recursively readonly package-owned neutral document. Parser nodes, positions, extension data, and imported parser types do not cross that private boundary. React and CLI may each invoke this same authority, but neither owns grammar logic and neither consumes mdast. The adapter and both projections use exhaustive discriminated switches; an unhandled parser or neutral node throws, and the handled-kind and fixture inventories fail tests when the supported set changes.

The fixed dialect is CommonMark plus GFM tables, task-list items, strikethrough and autolinks, GitHub alerts, and footnotes. Official alert markers are recognised case-sensitively only at the start of a blockquote's first paragraph and only when followed by a source line break. They map as follows: `NOTE` to Callout `note`, `TIP` to `success`, `IMPORTANT` to `insight`, and both `WARNING` and `CAUTION` to `warning`. Removing the marker leaves the remaining paragraph and any later blocks as the Callout body; every other blockquote remains ordinary.

The neutral tree reuses `SemanticInlineContent` for phrasing meaning and owns only document structure and resolved relationships. Definitions resolve during whole-document adaptation. Missing definitions, duplicate footnote definitions, impossible table shapes, parser failures, unknown nodes, or limit violations reject the whole parse before projection. Empty or whitespace-only source produces an empty document and therefore an empty React result or terminal string.

Raw HTML comments are omitted. Every other mdast `html` node becomes literal visible text; no browser path uses `dangerouslySetInnerHTML`, and no terminal path interprets source bytes as styling. Outside code blocks, control and Unicode format characters become `\\u{HEX}` notation before entering semantic content. Code remains literal and delegates that same visible-control policy to Code block. Parser-derived labels, titles, identifiers, and fallback facts cross the same control boundary.

Links and images follow ADR-0019's destination policy. Non-ASCII URL references are percent-encoded before validation. Printable absolute `http:`, `https:`, `mailto:`, and `file:` destinations and printable relative, root-relative, query, fragment, and scheme-relative references remain actionable. Backslashes, encoded controls, malformed references, and every other explicit scheme are inert. An unsafe link becomes visible non-clickable label text followed by its destination fact; an unsafe image becomes visible `Image:` alternative text followed by its source fact. The adapter never silently drops a target and never places an unvalidated value in `href` or `src`.

Heading visible content and its plain slug projection come from the same neutral inline node. Slugs use GitHub-compatible repository heading rules: Unicode letters and numbers, underscores, and hyphens survive; other punctuation is removed; every whitespace scalar becomes a hyphen without run collapsing; casing is lowered; an empty result becomes `section`; and duplicates receive `-1`, `-2`, and so on in document order. The generated id is the only heading-anchor authority for both projections.

The parser boundary accepts at most 524,288 UTF-8 source bytes. Adaptation accepts at most 100,000 neutral nodes and 64 structural or inline levels. These limits are checked before returning the tree, and projections retain their own exhaustive/depth guards. A violation or parser error throws a deterministic `MarkdownParseError`; rendering never returns a partial document. The selected parser's upstream conformance and fuzzing own grammar correctness, while package fixtures own adaptation, composition, safety, and cross-projection meaning.

## Consequences

Both public editions agree because they share one source-to-model authority, while package Components remain the only presentation authorities. CommonMark and GFM maintenance can follow exact dependency upgrades deliberately; changing a pin or dialect requires reviewing fixtures and this contract rather than receiving an accidental semver range update. The direct stack avoids the processor abstraction and arbitrary plugin surface, but still brings a material transitive dependency graph that the release and licence guards must continue to audit.

The package owns two intentionally small extensions around the parser: alert classification and GitHub-compatible heading ids. Neither tokenises Markdown. Supporting a future syntax means adding its parser extension, neutral node, both projections, fixture inventory entry, and security policy together. Documents beyond the public limits are refused even when the parser could process them, trading extreme input size for a bounded display-data contract.

## Alternatives considered

`remark-parse` with `remark-gfm` exposes the same micromark/mdast foundations through unified, but its processor and plugin layer add abstraction and dependencies without helping a closed synchronous dialect. `markdown-it` and `marked` are mature parsers, but this fixed dialect would require more package-owned extension/plugin coordination for footnotes, alert classification, or a neutral tree, and their renderer-oriented APIs make parser/presentation separation less direct. A handwritten grammar would minimise dependency count but repeat the non-spec-complete consumer implementation upstream and make CommonMark edge-case ownership ours.
