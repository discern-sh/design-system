# 1B — Wrap styled text and own hyperlinks

**Goal:** The package wraps ANSI-styled text correctly — styles and hyperlinks survive line breaks — and terminal hyperlinks have one capability-aware package authority, so no consumer ever composes raw escape sequences again.

**Wave:** 1 — runs alongside 1A, 1C, and 1D, which own disjoint files. Lands second in the wave, after 1A.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/70-cli/README.md`, and ADR-0007. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-1b` and re-root into the returned worktree before reading code.

Verify anchors against the live tree; they were checked on trunk `c3ec5d6`.

## Background

`src/cli/text.ts` measures, wraps, truncates, and pads **plain** text with full grapheme awareness, and `src/cli/ansi.ts` composes styled spans — but nothing wraps text that is *already styled*. The flagship consumer's evidence shows what that costs:

- Discern re-derives styled/plain boundaries with an O(n²) reprojection probe that **throws** — "package wrapping produced an unmappable text boundary" — when it cannot map a wrapped line back onto the styled source (`/Users/jack/Sites/discern/src/lib/text.ts:106-142`).
- Discern hand-builds OSC 8 hyperlink sequences in its Markdown renderer (`/Users/jack/Sites/discern/src/lib/markdown.ts:68-71`) — raw escape composition that its own terminal boundary guard exists to outlaw, tolerated only because the package offers no authority to route through.

Both are generic terminal behaviour. Per the consumer's ADR 0279, a generic gap is fixed and released upstream rather than copied into Discern — this brief is that upstream fix. Do not edit the Discern repository; its paths above are read-only evidence.

## Deliverables

Work in atomic commits, one logical step each.

1. **A styled-wrap primitive in the text foundation.** Given a string containing package-emitted SGR styling (and hyperlink spans once deliverable 2 exists), wrap it to a width by wrapping the plain projection and re-attributing the active styles and open hyperlinks to each output line, closing and reopening them at line boundaries so every emitted line is independently valid (safe to prefix, indent, or excerpt). Reuse the existing grapheme segmentation and measurement authorities — no second width algorithm. Define and document behaviour for truncation and padding of styled text in the same pass, so the styled and plain APIs form one coherent family.
2. **A hyperlink authority in the ANSI foundation.** One function composes an OSC 8 hyperlink from a label and URL. Decide the emission policy explicitly — which capability facts gate emission, and what the fallback renders (at minimum, the label must never be lost; whether the URL appears beside it is your documented call) — and record the policy in `map/70-cli/README.md`. Validate inputs the way the foundation already validates control-bearing text.
3. **Make the authorities compose.** Styled wrap handles hyperlink spans; truncation never emits a dangling open hyperlink; `stripAnsi`-style measurement treats hyperlink envelopes as zero-width. Nested styles (bold inside a toned span crossing a line break) survive round trips.
4. **Prove the class.** Exact-string tests across: CJK and emoji clusters inside styled runs; styles crossing multiple wraps; hyperlinks crossing wraps and truncation; every colour depth including `none`; ASCII repertoire; pathological inputs (zero width, style-only strings, unterminated input sequences rejected or normalised — pick one, test it, document it).
5. **Export and document.** Export the new API through `./cli` (`src/cli/mod.ts`), document every public symbol, update `map/70-cli/README.md`, and add CHANGELOG entries under **Unreleased**. No version bumps.

## Constraints

- Pure functions only: no I/O, no environment reads, no clock (design principle 3; ADR-0007 separates repertoire, colour, and control).
- One authority per fact: reuse `measureText`/`wrapText` internals rather than re-deriving widths; the hyperlink composer is the only place OSC 8 bytes are written.
- Vocabulary: request/interaction terms; no banned dialect.
- `CHANGELOG.md` and `src/cli/mod.ts` are shared seams with 1C: edit them in your final commits, immediately after `discern_update`, and resolve overlap by keeping both streams' entries.
- Never hand-edit generated files. Iterate with `discern_prepare`; commit each logical step.

## Out of scope

- Adopting the new APIs inside Discern (the consumer programme's wave 2 does that).
- Interactive machines, renderers' internal wrapping call sites (migrating component renderers onto styled wrap is follow-up work only if a renderer already mis-wraps styled content — record such findings in `discern/TODO.md` rather than expanding scope).
- Markdown rendering, tables, or any new component.

## Definition of done

- Measurable: styled wrap, styled truncate/pad, and the hyperlink authority are public, documented, exact-string-tested across depths and repertoires, and `discern_done` passes on the clean committed HEAD.
- Semantic: a consumer holding a styled, hyperlinked string can wrap it to any width and get lines that render correctly on their own — no consumer ever needs to parse or emit an escape sequence to do it.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/1b-styled-text-authorities.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop. Other wave-1 streams are in flight — you own 1B only; do not launch, dispatch, or supervise the sibling briefs.
