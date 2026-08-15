# 1A — Establish semantic inline content and Paragraph

**Goal:** The package owns one typed, safe, width-aware inline-content vocabulary and a generic Paragraph Component, giving every later Markdown structure a shared way to render rich prose without accepting caller-authored ANSI.

**Wave:** 1 — solo foundation. Dispatch this brief first and land it before 2A starts.

## Orient, re-root, then read

Work in `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout call `discern_start` with the literal name `markdown-1a`, then re-root into the absolute worktree path it returns before reading or editing anything.

Read the worktree's compiled `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/20-components/README.md`, `map/70-cli/README.md`, ADR-0004, ADR-0007, `src/cli/ansi.ts`, `src/cli/text.ts`, `src/cli/theme.ts`, `src/cli/rhythm.ts`, `src/components/editorial/prose/`, and the tests in `tests/cli/styled_text_test.ts` and `tests/cli/editorial_article_test.ts`. Invoke the `add-a-component` skill before scaffolding Paragraph and the `discern-write-adr` skill for the public content-model decision.

Verify these anchors against the live tree; this brief was prepared from trunk `0a30a08e9d7bc8c61ff75e697062bd362816b608` and may be stale when dispatched.

## Background

The browser Prose Component is a typographic context for paragraphs, links, lists and inline code, but its terminal renderer accepts only `text: string` and immediately routes it through plain `wrapText`. The CLI foundations now know how to emit and wrap package-owned SGR and OSC 8 sequences, yet there is no semantic input type saying _this run is strong_, _this is code_, _this is a link_, or _this image becomes an accessible textual fallback_. A Markdown renderer built today must parse into private ad-hoc flags and paint them itself, which duplicates package policy and makes later Components disagree.

This wave establishes the one inline authority before any structural Markdown Component is added. It also adds Paragraph because Prose is a container/reading context, not the semantic unit represented by one Markdown paragraph.

## Fixed semantic contract

The package-owned vocabulary must represent, nest, validate and render at least:

- text;
- emphasis and strong emphasis, including nesting and overlap;
- strikethrough;
- inline code whose contents remain literal;
- links with a label subtree, destination, and optional title;
- images with alt content, source, and optional title — the terminal never fetches or draws an image and instead emits an explicit, meaning-preserving fallback;
- soft breaks, hard breaks, and literal text produced from escaped punctuation or decoded entities;
- footnote references with a stable identifier/label for the later Footnotes integration.

Callers provide semantic data, not ANSI strings, HTML, React nodes, or parser-specific objects. Plain strings may be a documented shorthand. The public type must be recursively immutable and package-owned.

## Deliverables

Work in atomic commits, one logical step each.

1. **Record the content-model decision.** Write an ADR that fixes ownership, public type shape, nesting rules, safe-link/image policy, no-colour fallbacks, validation boundary, and how React Components may consume equivalent semantics without importing React into `./cli`. Explicitly reject separate per-Component span models and third-party parser ASTs as public API. Update the ADR index through the project authority rather than hand-editing generated material.
2. **Add the CLI semantic-inline foundation.** Create the appropriately named module under `src/cli/` and export it through `./cli`. It must turn the typed vocabulary into package-styled text using `renderStyledSpans`/`styleText`, `styleHyperlink`, Token-derived typography and colours, and `wrapStyledText`; do not write escape sequences, width algorithms, colours, or link envelopes again. Preserve nested styles across wrapping. Define one plain-text projection for measurement, titles, anchors, and degraded output so later Components do not each flatten content differently.
3. **Make degradation meaningful.** At every colour depth and in ASCII, the same visible text and targets survive. Where removing SGR would erase a semantic distinction, use a restrained textual fallback: inline code must remain visibly code-like; links retain their target according to the package hyperlink fallback; image output names itself and retains meaningful alt text and source; footnote references retain a visible marker. Document the exact policy and test it.
4. **Make hostile input inert.** No content node may inject CSI/OSC, cursor controls, bidi/format controls, raw HTML, or an unsafe browser/terminal link. Reuse an existing package control-sanitisation authority if one fits; otherwise introduce one authority with tests rather than scattering replacements. Preserve the fact visibly where that is the repository's established terminal posture. Validate malformed trees, empty required labels, impossible nesting, unsafe or non-printable destinations, and cycles/depth exhaustion without hangs.
5. **Add the Paragraph Component with fixed anatomy.** Create `src/components/editorial/paragraph/` with `paragraph.css`, `paragraph.tsx`, `paragraph.meta.ts`, `paragraph.examples.tsx`, `paragraph.cli.ts`, and `mod.ts`, plus a framework-neutral sibling type module where warranted. The React edition renders a semantic `<p>` and accepts ordinary phrasing children; the CLI edition accepts the new semantic content, a theme, and an explicit capability-bounded measure/width. It wraps without losing styling or targets and owns no surrounding blank-line boundary. Metadata must explain when to use Paragraph versus Prose, Callout, Heading, and arbitrary preformatted text.
6. **Prove the whole class.** Add exact tests for nested strong/emphasis/strike/code/link runs crossing multiple wraps; Unicode graphemes and CJK; soft versus hard breaks; link and image fallbacks; footnote markers; empty and malformed trees; deeply nested input; hostile controls and URLs; truecolour, ANSI 256, ANSI 16, no-colour, Unicode and ASCII. Assert line widths after ANSI removal, independent validity of every wrapped styled line, deterministic repeated rendering, and byte-identical legacy styled-text authorities. Add React semantics/accessibility tests and the generated enrolment/conformance expectations required of every Component.
7. **Catalogue, map and contract.** Add generic Paragraph examples that exercise rich inline semantics without product copy. Update `map/20-components/README.md`, `map/70-cli/README.md`, and `CHANGELOG.md` under **Unreleased**; do not bump a version. Regenerate through `deno task codegen`/`discern_prepare`, never by editing `src/generated/` or `catalogue/generated/` directly. Leave the Catalogue dev server running on the worktree's deterministic port and report the exact Paragraph Web and `?surface=cli#component-paragraph` localhost URLs.

## Constraints

- `./cli` remains React-free, pure, deterministic, clock-free and I/O-free. Explicit `TerminalCapabilities` are the only environment facts.
- One authority per fact: existing styled-sequence, hyperlink, grapheme, width, theme and rhythm modules remain authoritative.
- Preserve existing public APIs and exact frames. This wave adds an authority; it does not silently reinterpret current string props.
- Every public symbol is documented and the published graph remains allowlisted. Component CSS stays namespaced, rooted and Token-driven.
- Run `discern_prepare` while iterating. After the final edit, run it once more, commit the resulting clean tree, then run `discern_done`; a post-commit fix rewrite invalidates the proof.

## Out of scope

- Parsing Markdown source or choosing a Markdown parser.
- Generic lists, blockquotes, fenced/indented code blocks, tables, headings, footnote sections, or a top-level Markdown document.
- Syntax highlighting, terminal image protocols, raw HTML execution, or consumer adoption in `/Users/jack/Sites/discern`.
- Version bumps, publication, or release work.

## Definition of done

- **Measurable:** the ADR, public inline vocabulary/projection, Paragraph's complete anatomy, CLI and React renderers, exact capability/safety tests, metadata, examples, map and Unreleased changelog entry are committed; generated surfaces are current; `discern_done` passes on the clean committed HEAD.
- **Semantic:** a consumer can describe one rich paragraph without HTML, React or ANSI and receive readable, meaning-preserving, safely wrapped output in any supported terminal, while the browser edition remains a real semantic paragraph.
- **Preview:** the Catalogue stays running and the handoff includes exact localhost links for Paragraph on Web and CLI surfaces.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/markdown-renderer/_done/1a-semantic-content-and-paragraph.md`. After the green proof, run `discern_accept`; a recorded grant may land the work, while a refusal means report the proof line and branch/worktree and stop for owner review. Do not dispatch wave 2A.
