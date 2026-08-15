# 3A — Upgrade Prose, Heading, Table, and Footnotes

**Goal:** Existing Markdown-adjacent Components gain additive rich and lossless CLI contracts, so the future Markdown dispatcher can reuse them without flattening inline semantics, truncating content, or breaking current consumers.

**Wave:** 3 — one coordinating session and worktree. Starts only after 2A has landed. If sub-agents are available, fan out one per existing Component inside this worktree after the compatibility rules are fixed; otherwise work in sequence.

## Orient, verify dependencies, then re-root

Work in `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Verify waves 1A and 2A are present on `main`: the semantic inline API and `renderParagraphCli`, `renderListCli`, `renderBlockquoteCli`, and `renderCodeBlockCli` all resolve through `./cli`, their Components appear in the generated registry, and the content-model ADR is indexed. If any prerequisite is absent, stop and report the missing landing instead of reimplementing it.

If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `markdown-3a`, then re-root into its returned absolute worktree before reading or editing.

Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/20-components/README.md`, `map/70-cli/README.md`, ADR-0004, the 1A content-model ADR, and the complete source and tests for Paragraph, Prose, Heading, Table, Footnotes, List, Blockquote, Code block, `src/cli/rhythm.ts`, and `src/cli/presenter.ts`. Verify all anchors against the live tree.

## Coordination and compatibility boundary

The coordinator owns any shared content-model change, integration tests, commits, codegen, map, CHANGELOG, Catalogue, final gate and acceptance. Prefer up to four sub-agents with disjoint ownership:

- **Prose:** `src/components/editorial/prose/` and its dedicated tests;
- **Heading:** `src/components/display/heading/` and its dedicated tests;
- **Table:** `src/components/display/table/` and its dedicated tests;
- **Footnotes:** `src/components/editorial/footnotes/` and its dedicated tests.

Sub-agents work in the same `markdown-3a` worktree. They do not edit shared foundation modules, generated surfaces, map, CHANGELOG or one another's files; do not dispatch sibling briefs; and do not commit or accept independently. The coordinator integrates and regenerates once.

Every upgrade is additive. Existing props compile, and legacy examples/default calls remain byte-identical unless an explicit ADR establishes that a correction must break them. New semantic inputs and lossless modes may intentionally produce new frames.

## Background

The component inventory initially made these four look more Markdown-ready than their CLI contracts are:

- Prose advertises headings, paragraphs, lists, links and inline code on the browser, but CLI `text: string` is stripped to plain wrapping.
- Heading accepts one plain `text` string and truncates both it and `accent` to one line.
- Table requires every string cell to be non-empty, rejects too-narrow widths, and truncates every cell to a single row.
- Footnotes accepts one plain string per note, so nested emphasis, links, paragraphs, lists and return references cannot survive.

The new Paragraph/List/Blockquote/Code block and semantic inline authority now provide the missing vocabulary. This wave connects existing public Components to it without turning Markdown into a privileged private caller.

## Deliverables

Work in atomic commits, one logical step each.

1. **Upgrade Prose as a reading context, not a parser.** Retain the current `text` path and exact lead/drop-cap/measure frames. Add a semantic path that can compose one or more Paragraphs and already semantic block children through `composeCliBlocks`, preserving rich inline styling, links, hard/soft breaks and intentional paragraph boundaries. Prose controls readable measure and optional lead/drop-cap treatment; it does not parse Markdown, invent list markers, or strip child styling. Define what lead/drop-cap means when the first node is not plain text and test the decision. Keep the browser's ReactNode semantics intact.
2. **Give Heading rich content and a lossless wrap mode.** Retain current `text`, `accent`, levels 1–6, leading-boundary contract and legacy one-line default. Add semantic inline content and a documented wrapping/overflow policy the Markdown Component can choose so long headings and styled/link-bearing headings are not truncated. Continuation lines align beneath the heading content rather than the `#` prefix, remain independently styled, and respect `leadingBlankLines: 0` inside composition. The browser edition must preserve correct heading levels and phrasing semantics.
3. **Give Table rich cells and responsive lossless layout.** Retain current string columns/rows, alignment, numeric, stripe and exact compact defaults. Add semantic inline headers/cells; allow genuinely empty Markdown cells; wrap styled cells into multi-line row heights; and add a deterministic responsive mode for terminals too narrow to hold a coherent framed grid. The narrow form must preserve every header/value relationship—prefer labelled stacked records or another explicit semantic projection—rather than concatenate fields ambiguously, throw, or truncate. Respect GFM alignment metadata. Links, inline code, emphasis, CJK and emoji must measure correctly after styling. Empty tables, header-only tables, uneven source rows after parser normalization, and very many columns need explicit tested behavior.
4. **Give Footnotes rich, multi-block notes.** Retain the current `content: string`, ids, title and return-label behavior. Add semantic inline and multi-block note bodies capable of paragraphs, lists, quotations and code. Footnote references and definitions retain stable ids/labels, visible markers, and return meaning in both browser and terminal output; links use the package hyperlink authority and no-colour fallback. Wrapped continuations align beneath the note label, and nested blocks do not collapse into a sentence. Define duplicate/missing ids and repeated-reference behavior for the top-level renderer to rely on.
5. **Guard the semantic boundaries.** Update metadata and examples where needed so Prose versus Paragraph, Heading versus plain lead text, Table versus Comparison table, and Footnotes versus generic List are discoverable. Do not widen Pull quote or Code listing to cover the neutral Components added in 2A. No existing Metadata purpose or accessibility claim may become less truthful.
6. **Prove compatibility and the new class.** First pin byte-identical legacy fixtures for each Component across widths/capabilities, then add exact new-mode frames. Cover nested styles and links over wraps; headings longer than one line; empty and multiline table cells; column alignment; narrow stacked tables; notes containing multiple paragraphs/List/Blockquote/Code block; repeated footnote references; all colour depths, Unicode/ASCII, CJK/emoji, hostile controls, deterministic rerenders and maximum-width assertions. Add composed fixtures showing the four Components interleaved with the wave-2 structures under `composeCliBlocks` with exactly one blank line at each document boundary.
7. **Document, regenerate and preview.** Update `map/20-components/README.md`, `map/70-cli/README.md`, and `CHANGELOG.md` under **Unreleased**. Do not bump a version. Run codegen through the normal producer and never edit generated output manually. Leave the Catalogue server running on the worktree port and report exact localhost Web and CLI links for `prose`, `heading`, `table`, and `footnotes`, naming the new rich/lossless examples.

## Constraints

- The semantic inline API from 1A, component renderers from 2A, styled-text/hyperlink foundation, presenter, Token theme, grapheme measurement and rhythm module remain authorities. No Markdown-only copy is allowed.
- `./cli` stays React-free and pure over explicit capabilities. Existing browser semantics/accessibility and runtime selection-scoping remain intact.
- Preserve legacy TypeScript calls and default exact frames; use additive discriminants/options or backward-compatible unions. Do not make raw ANSI a public content format.
- Exact-frame changes for explicit new modes are correct; weakening old assertions to substrings is not.
- After the final edit, run `discern_prepare`, commit the clean resulting tree, then run `discern_done`. Never hand-edit generated files.

## Out of scope

- Parsing Markdown, selecting a parser dependency, or adding the top-level Markdown Component.
- New structural Components, syntax highlighting, interactive footnotes/tasks, raw HTML execution, terminal images, or consumer adoption.
- Redesigning the existing default appearance of Prose, Heading, Table or Footnotes.
- Version bumps, publication, or release work.

## Definition of done

- **Measurable:** all four existing Components accept the new semantic/lossless paths, preserve their legacy type and byte contracts, carry exact cross-capability tests and generic Catalogue examples, and are documented in the map and Unreleased changelog; generated output is current; `discern_done` passes on clean committed HEAD.
- **Semantic:** a future Markdown dispatcher can hand rich headings, prose, tables and footnotes to public Component APIs and get complete, readable content at narrow or wide widths, while every existing consumer sees the same output it had before.
- **Preview:** the Catalogue stays running and the handoff gives exact Web/CLI localhost links to each upgraded Component's relevant examples.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/markdown-renderer/_done/3a-upgrade-markdown-adjacent-components.md`. After the green proof, run `discern_accept`; a recorded grant may land it, while a refusal means report the proof and branch/worktree and stop for owner review. Do not dispatch wave 4A.
