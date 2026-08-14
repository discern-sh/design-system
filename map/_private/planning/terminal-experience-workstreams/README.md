# Terminal experience workstreams

Briefs produced from the 2026-08-14 terminal-experience research review. The review compared the shipped `./cli` and `./cli/interactive` surfaces against the flagship Discern consumer's real call sites and verified every claim at file level. Its central findings: four live interaction defects (validation that clears while a value is still invalid, frames that grow a row on first error, discovery requests that block and go blank under provider latency, and long-running activity that leaves the terminal cursor hidden on interrupt); and a set of affordance gaps that push consumers toward hand-rolled output — no styled-text wrapping, no hyperlink authority, no bound presenter, no small narration verbs, and a test fake that is not published.

This programme fixes the defects and closes the affordance gaps in three waves. The companion consumer programme (`terminal-output-workstreams` in the Discern repository's `project/map/_private/planning/`) adopts each capability after the owner publishes it.

Every brief is a self-contained prompt for a fresh agent. It assumes no memory of the review, verifies its anchors against the live tree, and carries its own measurable and semantic definition of done.

## Fixed programme contracts

Change one only through an explicit ADR and an update to every unstarted brief.

| Fact                | Contract                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worktree names      | `terminal-1a`, `terminal-1b`, `terminal-1c`, `terminal-1d`, `terminal-2a`, `terminal-2b`, `terminal-3a` — pass the literal string to `discern_start`                                                                                                                                     |
| Vocabulary          | Terminal input is `request*` / `Interaction*` per ADR-0011; "prompt" is reserved for coding-agent instructions and fails the gate in interaction sources                                                                                                                                 |
| Purity split        | `./cli` renderers stay pure over explicit `TerminalCapabilities`; effects live only in `./cli/interactive` behind injectable `TerminalIO` (ADR-0004, ADR-0007)                                                                                                                           |
| Presentation        | Interactive frames render through the real Component renderers; no second presentation authority, no copied palette or glyph cycle                                                                                                                                                       |
| Geometry            | Requested sizes are ceilings; fitting goes through the renderer against the live viewport; painting stays refusal-typed (ADR-0009)                                                                                                                                                       |
| Versioning          | No brief bumps `deno.json`/`package.json` versions. Each brief adds its CHANGELOG entries under an **Unreleased** heading; the owner's `release` skill assigns versions at each checkpoint                                                                                               |
| Shared seams        | `CHANGELOG.md` and the export barrels (`src/cli/mod.ts`, `src/cli/interactive/mod.ts`, `deno.json` exports) are the only files two streams may both touch. Each stream edits them in its final commits, immediately after `discern_update`, and resolves overlap by keeping both entries |
| Exact-frame testing | Expectation changes that express new behaviour are correct; replacing exact frames with substring assertions is not                                                                                                                                                                      |

## Waves and landing order

Dispatch wave by wave. Wave 1 is the only four-way parallel wave; its briefs own disjoint files apart from the shared seams above. Every later brief starts only after all lower waves have landed, and its dependency guard checks the predecessor's surface on trunk before editing.

| Key | Brief                                                                                         | Runs with  | Depends on    |
| --- | --------------------------------------------------------------------------------------------- | ---------- | ------------- |
| 1A  | [Make validation truthful and frames stable](1a-request-correctness.md)                       | 1B, 1C, 1D | —             |
| 1B  | [Wrap styled text and own hyperlinks](1b-styled-text-authorities.md)                          | 1A, 1C, 1D | —             |
| 1C  | [Give consumers a presenter and narration verbs](1c-presenter-and-narration.md)               | 1A, 1B, 1D | —             |
| 1D  | [Publish the testing and projection surfaces](1d-published-tooling-surfaces.md)               | 1A, 1B, 1C | —             |
| 2A  | [Make discovery requests truthful under latency](2a-discovery-truthfulness.md)                | 2B         | wave 1 landed |
| 2B  | [Make long-running activity interrupt-safe; sense the background](2b-activity-and-sensing.md) | 2A         | wave 1 landed |
| 3A  | [Compose a live activity log frame](3a-live-activity-log.md)                                  | —          | wave 2 landed |

Within wave 1 the landing order is 1A, 1B, 1C, 1D; within wave 2 it is 2A then 2B. Before landing, each later stream runs `discern_update`, re-verifies its gate, and resolves any shared-seam overlap. Wave 2's two streams own disjoint files (2A: discovery machines and frame states; 2B: activity, lifecycle, and a new sensing module).

## Release checkpoints

The consumer adopts only published JSR versions (Discern ADR 0279), so the owner runs the `release` skill at three checkpoints:

1. **After wave 1 lands** — publishes the correctness fixes, styled-text authorities, presenter, narration verbs, and the two new tooling entrypoints. Unblocks consumer waves 2A and 2B.
2. **After wave 2 lands** — publishes discovery truthfulness, the new request kinds, activity interrupt safety, and background sensing. Unblocks consumer wave 3B.
3. **After wave 3 lands** — publishes the live activity log frame. Unblocks consumer wave 3A.

The owner may combine checkpoints 2 and 3; each consumer brief guards on the capability it needs, not on a version number.

## Landing authority

Every stream touches published package code; none may claim landing authority in prose. After `discern_done` passes on the final committed tree, each agent runs `discern_accept`. A recorded standing or per-worktree grant lands the branch. Without one, the verb refuses read-only, and the agent reports its proof line and stops for owner review. To run a wave hands-off, grant its predictable worktree from bare `discern` after dispatch.

## Review loop

When a stream lands or stops at its proof, give its branch or worktree name to a reviewing session. Review the diff against trunk, walk every deliverable and the definition of done, run the gate against the branch, and hunt the known failure modes: a symptom patched without curing the class, a loosened exact-frame assertion, a hand-edited generated file, vocabulary drift back to the banned dialect, a silent decision that warranted an ADR, or scope creep into a sibling's slice. Re-read the next unstarted brief against what actually landed and amend drift before dispatch.

Each brief's final commit moves that brief into `_done/` under this directory, so the active brief list empties itself as the work lands.
