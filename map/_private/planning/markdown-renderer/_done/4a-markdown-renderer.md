# 4A — Ship the top-level Markdown Component

**Goal:** `@discern-sh/design-system` exposes a first-class Markdown Component whose React and CLI editions share one parsing authority and neutral model, then compose the package's real Components into safe, deterministic, semantically complete output.

**Wave:** 4 — final integrating wave. Starts only after 3A has landed. One coordinating agent owns the implementation; use sub-agents only for read-only parser research, fixture analysis or adversarial security review, not concurrent edits to the same Markdown anatomy.

## Orient, verify the programme, then re-root

Work in `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Verify waves 1A–3A are all present on `main`: the content-model ADR and public semantic-inline API exist; Paragraph, List, Blockquote and Code block are generated rendered Components; and Prose, Heading, Table and Footnotes expose their additive rich/lossless contracts. Import their public APIs through `./cli` and `./react` rather than relying only on files. If any prerequisite is missing, stop and report which wave has not landed.

If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `markdown-4a`, then re-root into the returned absolute worktree before reading or editing.

Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/20-components/README.md`, `map/70-cli/README.md`, ADR-0004, ADR-0007, ADR-0013, the 1A content-model ADR, the `add-a-component` and `discern-write-adr` skills, every Component named in the dispatch table below, `src/cli/presenter.ts`, `src/cli/rhythm.ts`, `src/cli/projection.ts`, `deno.json`, and release/conformance tests. As read-only downstream evidence, inspect `/Users/jack/Sites/discern/src/lib/markdown.ts` and `/Users/jack/Sites/discern/tests/markdown_test.ts`; do not edit that repository. Verify all anchors against the live tree.

## Background

Discern's consumer-local renderer proves the product need but deliberately describes itself as a small, non-spec-complete parser. It privately parses inline syntax, composes some package Components, reimplements lists and blockquotes, and historically emitted raw hyperlink controls because the design system lacked the necessary authorities. Waves 1–3 close those component gaps. The last step is to move Markdown ownership upstream without replacing one private pile of presentation logic with another.

The Markdown Component must be useful beyond Discern: source in, safe semantic browser output or terminal string out, no environment reads and no framework dependency in the CLI graph. Parsing is not presentation. The parser produces one neutral tree; Component renderers remain the presentation authorities.

## Supported dialect and policy

The public contract is CommonMark plus:

- GFM tables with alignment, task-list items, strikethrough and autolinks;
- GitHub-style alerts beginning with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, or `[!CAUTION]` inside a quotation;
- footnote references and definitions.

This includes both ATX and setext headings, thematic breaks, paragraphs, soft/hard breaks, entity decoding, escapes, inline and reference links/images, inline code, indented and fenced code with info strings, ordered-list starting values, tight/loose and arbitrarily nested lists, nested blockquotes, tables, and footnotes with multi-block content. Empty/whitespace-only source renders an empty result.

Source HTML is inert by design: comments are omitted and every other raw HTML node renders only as escaped/literal text. The Component never invokes `dangerouslySetInnerHTML`. Frontmatter, definition lists, math, diagrams, syntax highlighting, embedded media fetching in the terminal, and arbitrary plugin syntax are not part of v1.

## Component dispatch table

The Markdown implementation must route semantic nodes through these public authorities rather than copy their output:

| Parsed construct             | Package authority                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Paragraph and inline content | Paragraph plus the semantic-inline foundation                                     |
| Heading                      | Heading in its rich, wrapping composition mode                                    |
| Unordered/ordered/task list  | List                                                                              |
| Ordinary quotation           | Blockquote                                                                        |
| GitHub alert                 | Callout, with one documented marker→tone mapping                                  |
| Fenced or indented code      | Code block                                                                        |
| Thematic break               | Divider's quiet rule treatment                                                    |
| GFM table                    | Table's rich responsive mode                                                      |
| Footnote section             | Footnotes; inline markers use the shared reference node                           |
| Document boundaries          | `composeCliBlocks` and the corresponding namespaced Markdown/Prose browser rhythm |

Pull quote, Code listing, Checkbox, Procedure, Prerequisite list, Key points, Raw output and Terminal are explicitly not substitutes.

## Deliverables

Work in atomic commits, one logical step each.

1. **Choose the parser and record the contract before implementation.** Use the `discern-write-adr` skill. Evaluate maintained, spec-oriented parsers against the fixed dialect, Deno/JSR publication, deterministic synchronous parsing, dependency weight, neutral/React-free graph, source positions if useful, raw-HTML exposure, and extension support. Prefer a parser over a handwritten grammar. Pin the chosen dependency in `deno.json`. The ADR fixes dialect/version posture, one-parse architecture, parser-AST containment, raw-HTML policy, link/image safety, heading-anchor policy, control sanitisation and fallback behavior. If no candidate supports every extension directly, adapt its private neutral AST through small package-owned extension passes; do not fork a Markdown grammar silently.
2. **Add Markdown with full Component anatomy.** Use `add-a-component` to create `src/components/editorial/markdown/markdown.css`, `markdown.tsx`, `markdown.meta.ts`, `markdown.examples.tsx`, `markdown.cli.ts`, `mod.ts`, and appropriate neutral private/shared modules. Public props accept Markdown source and only stable package options; they do not expose parser tokens. The CLI props include explicit theme and capability-bounded `maxWidth` (or the repository's settled equivalent). The React edition emits semantic HTML and composes the real React Components so generated dependency selection brings their CSS automatically. Markdown CSS owns only namespaced document-level rhythm/containment that no child Component owns.
3. **Own one parser and model, then project twice.** Build one shared parsing/adapter authority that produces a neutral internal tree from source, plus two pure projections: React nodes and CLI Component calls. A React render and a CLI render may each invoke that same authority, but they must agree on content, hierarchy, links, images, heading levels/ids, list structure, alerts, tables and footnote relationships. Do not maintain independent grammar logic in `.tsx` and `.cli.ts`; do not stringify HTML for the terminal or parse ANSI for React. Keep React imports entirely outside the neutral and CLI graphs.
4. **Compose the CLI through public renderers.** Bind theme/width/capabilities with `createCliPresenter` where appropriate, dispatch every block through the table above, and join through `composeCliBlocks` with no double blank lines. Pass narrower effective widths recursively to nested lists/quotes; never crop a child. Inline spans use the semantic authority, `styleHyperlink`, styled wrapping and Token roles. The same input and explicit capabilities produce byte-identical output on every run, with no I/O, environment, terminal detection or clock read.
5. **Make browser semantics and navigation complete.** Emit real headings, paragraphs, lists, blockquotes, `pre/code`, tables and footnote links. Create stable GitHub-compatible heading ids with deterministic duplicate suffixes so repository-authored fragment links work on GitHub and in rendered docs; headings' visible rich text and plain slug projection come from the same node. Preserve ordered-list starts and table alignment. Images have required alt semantics and only safe resolved destinations. Links and footnote returns are keyboard-reachable and descriptive.
6. **Hold the security boundary.** Markdown source is untrusted display data. Raw source controls, ESC/CSI/OSC, bidi/format characters and malformed URLs cannot reach terminal control channels or executable browser attributes. Make unsafe controls inert and meaning-visible according to the package's established sanitizer. Allow only the ADR's safe absolute/relative/fragment link and image destinations; unsupported schemes render as non-clickable text with their facts preserved. Raw HTML remains literal/escaped. Parser errors and pathological depth/size fail predictably—never hang, recurse without a bound, or partially emit an unsafe document.
7. **Prove syntax and composition, not just examples.** Add a table-driven fixture corpus covering every supported block and inline node plus their meaningful combinations: nested emphasis/code/links; snake_case and delimiter edge cases; escapes/entities; reference links and images; soft/hard breaks; long rich headings; all list forms and starts; loose multi-block items; nested lists/quotes/code; alerts; empty/aligned/wide tables; footnotes and repeated references; raw HTML/comments; hostile controls and URL schemes; empty input; unclosed constructs; CRLF normalization. Use representative upstream CommonMark/GFM examples where licensing permits, recording provenance without copying an entire external suite. The selected parser owns grammar conformance; package tests own AST adaptation and presentation.
8. **Test both projections and every terminal posture.** React tests assert semantic element hierarchy, generated dependencies, ids, escaped HTML, safe attributes and no `dangerouslySetInnerHTML`. CLI tests assert exact frames at narrow, standard and wide widths across truecolour, ANSI 256, ANSI 16, no-colour, Unicode and ASCII; stripped line widths; no unexpected controls; independently valid styled lines; complete link/image targets; responsive table and code behavior; and deterministic rerenders. Add cross-projection semantic assertions over the same fixture tree so browser and terminal cannot silently support different constructs. Include the downstream Discern renderer's current public behavior as a compatibility fixture, but do not copy its parser implementation or require byte-identical decoration where the new Components intentionally improve it.
9. **Make future syntax enrol automatically.** Add a closed handled-node registry or exhaustive discriminated switch with a compile-time/runtime guard: a parser adapter producing a new node kind must fail tests/type-check until both projections declare how it renders or why it is intentionally inert. Add a fixture inventory guard so every supported dialect feature is represented. Do not leave a default branch that silently drops unknown nodes.
10. **Document and preview the finished surface.** Add generic Catalogue examples for a compact document, the full dialect, deep nesting, hostile/inert source, and narrow ASCII/no-colour output. Update `map/20-components/README.md`, `map/70-cli/README.md`, public usage documentation where consumers discover `./cli`, and `CHANGELOG.md` under **Unreleased**; no version bump. Regenerate only through codegen. Leave the Catalogue server running and report exact Web and `?surface=cli#component-markdown` localhost URLs, plus a copyable minimal `renderMarkdownCli` example using explicit `TerminalCapabilities` or the presenter.

## Constraints

- The parser is an implementation dependency, never the public data model. One shared parsing authority and neutral model feed both projections.
- Every visible block delegates to a real Component renderer; no second palette, glyph set, table/list/quote layout, hyperlink envelope, width algorithm or rhythm authority.
- `./cli` stays React-free, pure and deterministic. Browser rendering never uses unsafe raw HTML.
- Preserve all APIs and exact frames established by waves 1–3. If integration reveals an upstream defect, cure it with a class-level guard in its owning authority rather than patching only Markdown.
- Public symbols are documented; generated surfaces are never hand-edited; CSS is namespaced/rooted/Token-driven; CHANGELOG records the public contract; no version bump or publication.
- After the final edit, run `discern_prepare`, commit the resulting clean tree, then run `discern_done` once. Keep the Catalogue server alive after the gate.

## Out of scope

- Editing Discern's local renderer, commands, docs search or HTML utilities; downstream adoption is a separate brief after a package release.
- Frontmatter, definition lists, math, Mermaid/diagrams, arbitrary Markdown plugins, syntax highlighting, HTML execution, terminal image protocols, network fetching or interactive links/tasks.
- A release, version bump, migration codemod, or removal of consumer code.

## Definition of done

- **Measurable:** the parser/dialect ADR is accepted and indexed; the Markdown Component has full anatomy and generated dependencies; one shared parser/adapter and neutral model feed the React and CLI projections; every supported node dispatches exhaustively to package authorities; safety, conformance, cross-projection and exact capability tests pass; docs, Catalogue and Unreleased changelog are current; `discern_done` passes on the clean committed HEAD.
- **Semantic:** a consumer can hand the package a real CommonMark/GFM document and receive a calm, complete terminal reading experience or safe semantic browser document—nested structure, targets and meaning intact—without maintaining Markdown parsing or terminal presentation code of its own.
- **Preview:** the Catalogue remains running and the handoff includes exact Web and CLI localhost URLs plus the minimal public invocation.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/markdown-renderer/_done/4a-markdown-renderer.md`. After the green proof, run `discern_accept`; a recorded grant may land the complete final wave, while a refusal means report the proof and branch/worktree and stop for owner review. Do not release or dispatch downstream adoption.
