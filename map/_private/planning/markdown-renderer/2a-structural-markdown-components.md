# 2A — Add List, Blockquote, and Code block

**Goal:** The package gains the three neutral structural Components a Markdown document still cannot express: arbitrarily nested lists, ordinary block quotations, and non-truncating preformatted code blocks.

**Wave:** 2 — one coordinating session and worktree. Starts only after 1A has landed. If sub-agents are available, fan out one per Component inside this same worktree after the shared content contract is understood; otherwise implement them in sequence.

## Orient, verify the dependency, then re-root

Work in `/Users/jack/Sites/discern-design-system`. Begin with `discern_status` and verify wave 1A is on `main`: the public semantic inline-content API resolves through `./cli`, `renderParagraphCli` is generated, Paragraph is present in the Component registry, and its content-model ADR is indexed. If any fact is absent, stop and report that wave 1A has not landed; do not approximate its contract locally.

If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `markdown-2a`, then re-root into the absolute returned worktree before reading or editing code.

Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/20-components/README.md`, `map/70-cli/README.md`, ADR-0004, the content-model ADR from 1A, the `add-a-component` skill, the complete Paragraph anatomy, and the existing Pull quote, Code listing, Key points, Prerequisite list, Procedure, Checkbox, Stack, and Box implementations. Verify every anchor against the live tree.

## Coordination and ownership

The coordinator owns the shared public shape, commits, codegen, generated files, Catalogue, map, CHANGELOG, final tests/gate, and acceptance. After fixing the interfaces and test boundaries, prefer three parallel sub-agents with these disjoint slices:

- **List:** `src/components/editorial/list/` and a dedicated List test file;
- **Blockquote:** `src/components/editorial/blockquote/` and a dedicated Blockquote test file;
- **Code block:** `src/components/editorial/code-block/` and a dedicated Code block test file.

All work happens in the coordinator's single `markdown-2a` worktree. Sub-agents do not run codegen, edit generated files, modify shared map/changelog/barrels, dispatch sibling briefs, commit, accept, or supervise one another. If shared source beyond the 1A content authority must change, the coordinator makes that change first or takes it back centrally. This internal fan-out is the safe parallel seam; separate worktrees would collide over registries and Catalogue output.

## Background

The catalogue contains several list-shaped or quote-shaped Components, but each carries a narrower meaning: Procedure is an executable operational sequence, Prerequisite list expresses readiness states, Key points is a curated editorial summary, Checkbox is a form frame, and Pull quote adds authored quotation marks plus attribution. Code listing is a publication-grade, line-numbered source figure that trims and truncates to its frame. Reusing any of them for ordinary Markdown would lie about semantics or lose content.

The new Components are intentionally neutral and compositional. They must be independently useful outside Markdown, and their React and CLI editions must describe the same structure.

## Deliverables

Work in atomic commits, one logical step each.

1. **Add generic List.** Use the `add-a-component` skill to create full anatomy under `src/components/editorial/list/`. Support unordered, ordered, and task-list semantics; an explicit ordered-list start; mixed/nested list kinds; checked, unchecked and non-task items; tight and loose rhythm; rich inline item content from 1A; continuation paragraphs; and nested structural blocks without flattening them into one sentence. The React edition uses real `ul`/`ol`/`li` and disabled/read-only checkbox semantics where task markers need them. The CLI edition uses stable hanging indentation, aligns continuations beneath content, handles number-width changes such as 9→10, and gives Unicode and ASCII/no-colour markers the same meaning. It must remain legible at narrow widths and must not confuse task items with an interactive Checkbox request.
2. **Add neutral Blockquote.** Use full anatomy under `src/components/editorial/blockquote/`. It accepts one or more semantic/rendered child blocks, including paragraphs, lists, headings, code and nested quotations. The React edition uses `<blockquote>` without inventing attribution. The CLI edition applies a quiet capability-aware rail to every visible and intentional blank line, recursively narrows the available measure, preserves child styling and hyperlinks, and composes nested rails deterministically. It adds no smart quotation marks, citation, title or Callout tone; those remain Pull quote and Callout concerns.
3. **Add non-truncating Code block.** Use full anatomy under `src/components/editorial/code-block/`. Accept literal code plus an optional language/info label. The browser edition emits semantic `pre > code`, retains source whitespace, and may expose a namespaced language hook without bundling a highlighter. The CLI edition never executes or styles source control sequences, never adds mandatory line numbers, and never drops code characters, leading indentation, internal blank lines, or trailing logical blank lines. Tabs have one documented expansion policy. At finite widths, use a deterministic lossless continuation treatment or an explicit preserve-width option; silent `truncateText` is forbidden. Distinguish this contract clearly from Code listing, which remains a captioned, referenceable editorial figure.
4. **Make composition first-class.** List items and Blockquote children must carry package-styled output without treating legitimate package SGR/OSC as hostile or allowing foreign sequences through. Reuse 1A's semantic content and the established styled-text parser, `wrapStyledTextPreservingIndent`, `measureText`, and `composeCliBlocks`; do not accept arbitrary escape-bearing strings as a shortcut. Decide and document how nested block widths and blank-line ownership are passed down so a List inside a Blockquote and a Blockquote inside a list are both stable.
5. **Prove each component and the nesting class.** Give each Component exact React semantics/accessibility tests and exact CLI frames at narrow, standard and wide widths across truecolour, ANSI 256, ANSI 16, no-colour, Unicode and ASCII. Cover empty/malformed inputs, long markers, deep nesting limits, mixed list kinds, loose/tight items, multiline task items, nested quotes with blank lines, code containing Markdown delimiters, tabs, very long tokens, Unicode graphemes, terminal-control payloads, and deterministic repeated rendering. Add integration fixtures for List→Blockquote→Code block and Blockquote→List→Paragraph; every visible line must respect the requested width except a deliberately documented code preserve mode.
6. **Enrol and explain.** Metadata `useWhen`/`notWhen` must guard the semantic boundaries: List versus Procedure/Prerequisite list/Key points/Checkbox; Blockquote versus Pull quote/Callout; Code block versus Code listing/Terminal/Raw output. Add generic examples, regenerate all surfaces once after the substreams converge, update `map/20-components/README.md`, `map/70-cli/README.md`, and `CHANGELOG.md` under **Unreleased**, and make no version change.
7. **Preview all three.** Leave the Catalogue server running on `discern identity --port` and report exact localhost Web/CLI URLs for `list`, `blockquote`, and `code-block` (`?surface=cli#component-<slug>` for CLI).

## Constraints

- All three are real Components with the fixed anatomy and rendered CLI stance. Never add CLI-only pseudo-components or manually register them.
- Renderers stay pure over explicit `TerminalCapabilities`; no React, I/O, environment reads, parser, clock, syntax highlighter, or interaction driver enters `./cli`.
- Component CSS stays namespaced, rooted and Token-driven. Themes move Tokens, not stylesheets.
- The semantic-inline, styled-sequence, width, theme, rhythm and hyperlink modules remain single authorities. Extend the 1A model only if the missing fact is genuinely shared and add a class-level guard.
- Run `discern_prepare` after integration, commit the clean final tree, then run `discern_done`. Never hand-edit `src/generated/` or `catalogue/generated/`.

## Out of scope

- Markdown parsing or the top-level Markdown Component.
- Upgrading Prose, Heading, Table, Footnotes, Pull quote, Code listing, Checkbox, or domain-specific list Components.
- Syntax highlighting, executable code, terminal image protocols, interactive task toggling, or consumer adoption.
- Version bumps, publication, or release work.

## Definition of done

- **Measurable:** List, Blockquote and Code block each have full anatomy, generated enrolment, documented public symbols, generic examples, Web and CLI exact tests, cross-component nesting tests, map and Unreleased changelog coverage; no content truncates; `discern_done` passes on the clean committed HEAD.
- **Semantic:** a consumer can represent ordinary Markdown lists, quotations and code without pretending they are procedures, pull quotes, forms or line-numbered figures, and nested structures remain readable and complete at real terminal widths.
- **Preview:** the Catalogue stays running and the handoff contains six exact localhost links—Web and CLI for each new Component.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/markdown-renderer/_done/2a-structural-markdown-components.md`. After the green proof, run `discern_accept`; a recorded grant may land the work, while a refusal means report the proof and branch/worktree and stop for owner review. Do not dispatch wave 3A.
