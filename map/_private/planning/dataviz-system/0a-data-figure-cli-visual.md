# 0A — Make the DataFigure CLI frame lossless

**Goal:** The terminal Data figure must never silently drop authored characters anywhere in its frame — visual slot, title, and legend labels alike wrap or re-render width-aware instead of being ellipsised, so every authored character reaches the reader at every width.

**Wave:** 0A — the independent pre-programme micro-effort of the dataviz programme (`map/_private/planning/dataviz-system/README.md`). It depends on nothing, may run beside `chart-1a` or `chart-2a` without collision, and must land before `chart-3a` dispatches, because wave 3A renders chart frames into this slot and must not inherit a silent fact-loss path. It is also a defect in its own right for any current caller. One focused agent touches only the `data-figure` component folder, its tests, and the changelog.

## Orient, verify the prerequisite, then re-root

Work from `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. This wave has no prerequisite wave: a clean status is the only precondition. If status records an existing worktree for this exact effort, continue there and pass its absolute path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `chart-0a`, then re-root into the returned absolute worktree before reading or editing anything.

From the worktree, read `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/70-cli/README.md`, and the 0A row of `map/_private/planning/dataviz-system/README.md` for programme context. Then read the whole of `src/components/editorial/data-figure/` (especially `data-figure.cli.ts` and `data-figure.types.ts`), `src/cli/text.ts` (the wrap/truncate/pad/measure authorities), `src/cli/box.ts`, `src/cli/block-composition.ts`, `src/cli/rhythm.ts`, the Data figure block of `tests/cli/editorial_frames_test.ts`, and the `assertExactFrame`/`testTerminalCapabilities` helpers in `src/cli/interactive/testing.ts`. This brief may be stale by dispatch time — verify every anchor and line reference below against the live tree before relying on it.

## Background

`renderDataFigureCli` accepts `visual: string` — pre-rendered text lines placed inside a titled box frame. `renderFigureFrame` in `src/components/editorial/data-figure/data-figure.cli.ts` bounds each visual line with `truncateText(line, innerWidth, "…" | ".")` (the content mapping around lines 110–119), so any line wider than `width - 4` is silently ellipsised. The existing exact-frame test asserts those elided bytes directly — the width-24 frames in `tests/cli/editorial_frames_test.ts` (around lines 260–288) expect `Terminal  ####### 7…` — proving the loss is real, shipped behaviour, not a theoretical edge.

The package already has a lossless-frame posture to model: `renderBox` in `src/cli/box.ts` wraps over-wide body lines through `wrapStyledTextPreservingIndent` (`wrapBoxLine`, lines 17–20) instead of truncating, and the CLI block contract in `src/cli/block-composition.ts` enforces a `bounded` width policy where every rendered line must fit the parent measure (`renderCliBlock` throws on overflow, with `preserve` as the sole explicit escape hatch). Note the composition consequence before choosing a mechanism: a frame that grows wider than the requested measure would violate the `bounded` contract wherever a structural parent composes the figure, so width-aware wrapping inside the frame is the likely shape — but read the real code and decide. The same defect class appears three times in this one renderer: the frame title (around lines 97–103) and the legend labels (around lines 176–182) are silently truncated exactly as the visual slot is, and the full title is printed nowhere else in the CLI output. This wave cures the class, not the instance: all three surfaces become lossless together. A title cannot wrap inside a border row, so its mechanism will differ from the visual slot's (an additional interior line, a wrapped header row — decide from the real code); the invariant is the same for all three.

## Fixed contract

- The existing `DataFigureCliProps` API keeps working: `visual` remains a plain `string`, current validation (non-empty title/visual/caption, minimum width 5) is preserved, and no prop is added, removed, or retyped without necessity.
- No authored character of `visual`, `title`, or a legend label is ever silently dropped at any width, colour depth, or charset. Where a single grapheme genuinely cannot fit the inner measure (a 2-cell grapheme at inner width 1), pick a deterministic non-silent posture — a typed error matching the renderer's existing `TypeError` discipline is acceptable; silent elision is not.
- Emitted CLI bytes are public API, so the changed frames are a documented contract change, not a quiet fix.

## Deliverables

Work in focused commits, one logical step each.

1. **Make the frame lossless.** Replace the per-surface truncation in `renderFigureFrame` — visual lines, the frame title, and legend labels — with mechanisms that preserve every character: wrap over-wide content width-aware inside the frame (composing the shared `src/cli/text.ts` authorities the way `renderBox` does — do not write a second wrapping implementation), or another mechanism you can defend per surface after reading the real code. Keep ANSI/Unicode parity: each mechanism must behave identically in meaning under `unicode: false` and at every colour depth. Document the chosen mechanisms and their rationale in the module doc comment. Update the existing exact frames in `tests/cli/editorial_frames_test.ts` deliberately to the new lossless bytes — this is the intended byte change, not a weakened test.
2. **Add the regression guard.** A test that fails if any Data figure CLI content — visual, title, or legend label — is elided, modelled on the existing Data figure block and `assertExactFrame`/`testTerminalCapabilities` usage in `tests/cli/editorial_frames_test.ts`. Guard the class, not the instance: render pathological content (lines and labels far wider than the frame, long unbroken runs, wide East-Asian/emoji graphemes) across narrow and wide columns, Unicode and ASCII, and assert every authored grapheme survives into the stripped output in order — and that no `…` or `.` substitution marker was introduced by the frame. Pin the impossible-fit grapheme edge explicitly to the non-silent posture you chose.
3. **Record the byte change.** Add a `CHANGELOG.md` entry under **Unreleased** (create the section above the current release) describing the terminal Data figure change: over-wide visual lines, titles, and legend labels now render losslessly instead of being ellipsised, with the mechanisms named.

## Constraints

- `./cli` stays React-free, deterministic, and pure: no I/O, environment, or clock reads; equal props and capabilities produce identical bytes.
- Compose the shared text, box, and composition authorities; do not fork a private wrapping or measurement copy. Single source of truth per behaviour.
- Zero new dependencies. No code copied from surveyed tools; independent implementation with provenance recorded where a source materially shaped the result.
- Never hand-edit generated surfaces — change sources and let `discern_prepare` run codegen.
- Preserve the seven design principles in `map/00-orientation/design-principles.md`. Never loosen a standard to pass.
- After the final edit, run `discern_prepare`, commit the resulting clean tree, then run `discern_done` once on that committed HEAD.

## Out of scope

- Everything chart-related — the sibling waves' territory: kind-family machinery (`chart-1a`), the chart foundation (`chart-2a`), the Chart surface and DataFigure's legend evolution (`chart-3a`), Markdown projection (`chart-4a`), the kind library (`chart-5a`), hardening (`chart-6a`), and dependency review (`chart-7a`).
- DataFigure's legend vocabulary — wave 3A owns its evolution into series identity. This wave only makes existing legend labels lossless; it adds no tone, shape, or item vocabulary.
- The browser Data figure component, its CSS, and its examples' visual content.
- Editing the sibling Discern product repository; version bumps or publishing.

## Definition of done

- **Measurable:** `renderDataFigureCli` emits every authored character — visual, title, and legend labels — at every tested width, charset, and colour depth; the regression guard fails on any reintroduced elision including the impossible-fit edge; the existing exact-frame tests pass with deliberately updated bytes; `DataFigureCliProps` is unchanged for current callers; `CHANGELOG.md` carries the **Unreleased** entry; `discern_done` is green on clean committed HEAD.
- **Semantic:** a caller can hand any pre-rendered text and any title or legend to the terminal Data figure and trust that the reader sees all of it — the chart programme can later render into this frame without inheriting silent fact loss, and today's consumers stop losing data they never knew was cut.
- **Preview:** leave the Catalogue dev server running on the worktree's deterministic port (`discern identity --port`) and include the exact URL `http://localhost:<port>/?surface=cli#component-data-figure` in the handoff.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/dataviz-system/_done/0a-data-figure-cli-visual.md` (create the directory if needed). After the green proof, run `discern_accept`; a recorded grant may land wave 0A, while a refusal means report the proof line and branch/worktree and stop for owner review. Do not dispatch any chart wave.
