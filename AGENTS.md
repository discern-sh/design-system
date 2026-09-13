# Working in discern Design System

discern's built-in instructions appear first. discern Design System's own instructions follow the divider and take precedence where they conflict.

## Operating discern

discern gives each development task an isolated workspace, runs the project's configured checks, records completion evidence, and controls how changes land on the shared branch. Its configuration lives in **`discern.toml`**. Use its **MCP tools** as the primary interface.

- **Orient first.** Call **`discern_status`** at the start of every session, including investigation-only and resumed sessions. It reports current state and the next action without running checks or changing the project.
- **Use the effort's worktree before editing.** An effort is one task carried through implementation and review. Continue in its existing worktree across feedback and resumed sessions. For a new effort requiring edits, call **`discern_start`** from the main checkout and move your file operations to the returned path. Read-only investigation does not require creating a worktree.
- **Finish through `discern_done`.** It verifies the configured gate: the checks required to call the change complete. Use **`discern_prepare`** or a diagnostic's reproduce command while iterating. A long call announces a `discern progress` handle; after a lost call, read the run back with it instead of rerunning. Follow the finishing sequence below before reporting completion.
- **Follow the reported next action.** Use the result's diagnostics and recovery instructions instead of bypassing them with raw Git or shell operations. If the remedy cannot be followed, use **`discern_docs`** for the relevant procedure or report the unresolved condition to the owner.
- **Find the right reference.** **`discern_docs`** explains discern; **`discern_map`** reads the current project's documentation; **`discern_doctor`** diagnoses installation problems.

**When MCP is unavailable:** tell the owner and use the **`discern` CLI**, with `--markdown` for readable results or `--json` for structured fields. Read the reported state, diagnostics, recovery instructions, and any owner relay or Proof. If output is truncated, retrieve its structured or stored view; never repeat an effectful command just to recover omitted output. If the CLI is also unavailable, stop and let the owner choose between installing discern (`curl discern.sh` explains how) and continuing without its protections.

## Communicating with the owner

Explain discern's findings through their consequences for the requested work: what happened, what remains unverified, and what you will do next. Match the owner's technical familiarity; explain unfamiliar terms when needed. Distinguish observed facts from suspected causes. Continue authorized investigation and repair before asking the owner to resolve routine implementation choices. When a decision is needed, present the supported tradeoff, your recommendation, and what approval would authorize. Keep completion claims within the available evidence.

## Generated files — don't hand-edit

discern compiles the project's instruction sources (`discern/instructions.md`) into the agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and materializes skills into their directories (`.claude/skills`, `.agents/skills`). To change what you read, edit the source and run **`discern refresh`** — edits to a generated file are overwritten on the next compile.

## Isolated worktree workflow

discern keeps each effort in its own **linked git worktree** so parallel work doesn't collide.

No per-worktree resources are configured. If parallel worktrees collide over shared state (a database, a port), the `[worktree.resources]` table isolates it per worktree.

Keep one worktree for the whole effort, through review feedback and resumed sessions.

- **Resume the assigned worktree.** If this effort already has a worktree, continue at its recorded path and pass `path` to discern tools that accept it. If that path is unavailable, ask which worktree belongs to this effort instead of creating another. Do not call `discern_start` again.
- **Never adopt another effort's worktree**, even when it is idle or clean. Fleet rows in `discern_status` do not say which effort is yours.
- **Move your own file operations.** `discern_start` creates a worktree from `main` with branch prefix `agent/` and re-aims discern's tools. Your shell and editor must also use the returned path. If you can't change your working root, prefix shell commands with `cd <path> &&` and target file operations explicitly.
- **Update through `discern_update`.** Call it when behind `main`; it checks its own preconditions, so no Git pre-check or hand-merge is needed. Re-read affected files named in its overlap report before continuing.
- **Wait through `discern_await`.** Use one longest-safe call when work depends on a sibling effort or the trunk, and follow its continuation or recovery instructions.
- **Use the test queue.** Limit: 1 concurrent test run across checkouts (`[gate].concurrent_test_runs`). Run direct tests through `discern queue -- <command>`.

### Finishing an effort

1. Run **`discern_prepare`**, review its changes, and commit the intended work belonging to this effort. `prepare` may rewrite files; staging and committing remain your responsibility. Commit each logical change separately.
2. Run **`discern_done`** on the clean, committed final tree; it refuses uncommitted work, includes the complete test stage, and reuses passing evidence whose inputs are unchanged, so a final gate needs no standalone test preflight; `discern_test` runs the complete test stage on demand when that stage is itself the requested task. Before any expensive repeat, name what changed or what new evidence the run will obtain. Diagnose a timeout at the layer whose named budget fired; never raise a limit to pass.
3. Read the completion evidence and landing-authority result. **Proof** records what the configured gate established for the exact validated commit. Later edits require renewed verification.
4. Report what changed, what was verified, and anything still unresolved. End with the returned Proof line verbatim.

`discern_done` proves the committed tip of this worktree and records Proof for that exact commit. It lands nothing, and the worktree stays yours afterwards.

**`discern_accept` submits and lands.** It records the submission — the exact proven commit — and lands it on `main`. A passing gate is evidence; landing requires explicit owner consent or machine-verified authority (`--confirmed` attests the conversation; recorded grants are checked automatically), and a task brief or handoff is never consent. Follow `done`'s authority-aware next action: report and wait when consent is needed, or proceed under the verified authority. Without authority it refuses read-only and the submission waits; relay the Proof line and stop. Landing removes the worktree, resources, and branch once nothing beyond the landed submission remains. If `main` moved after your Proof, `accept` proves the combination in a disposable integration worktree and lands that exact result, waiting behind another landing. A conflict or failed combined check names the cause, lands nothing: run `discern_update`, resolve, commit, `discern_done`, `discern_accept` again. Never adopt an `integration/` worktree — discern's disposable copy.

## Quality standards

Standards protect measured limits: minimums may rise and maximums may fall. **`discern_done`** checks the required standards; **`discern_standards`** measures them separately.

**Never loosen or delete a limit to make a change pass.** Investigate the measured regression and try reasonable remedies within the authorized task. If satisfying the requested outcome requires changing a limit, explain the evidence, alternatives, and recommendation to the owner.

After owner agreement, use **`discern_standards_propose`** and follow its procedure for measuring and recording the proposed limit. A general permission to land does not approve a standard-limit change.

When a measure improves, offer to preserve the gain by tightening its limit through **`discern_standards`** with `pin`.

## Checkpoints

A checkpoint asks you to judge a specific question about the change. `discern_status` and `discern_prepare` identify relevant checkpoints; `discern_done` supplies any question that needs a recorded answer.

Judge the question against the actual change and record your conclusion using the supplied instructions. If it does not hold, explain the tradeoff for the owner without including secrets. The gate can still run, but landing requires the owner to approve an exception for the exact unmet questions. Recorded landing grants do not authorize that exception.

## Skills

discern makes **skills** — focused, reusable task playbooks — discoverable to **you**; reach for one when a task matches. **`discern skills list`** shows the set.

When a session yields a durable lesson — a correction, a hard-won procedure, an unrecorded decision — **offer to capture it** with the `discern-teach-the-project` skill at a natural pause, so future sessions inherit it.

## The Map & decisions

`map/` is the agent-maintained **map**, browsable with **`discern_map`**. Agents use the map to learn and navigate the project; humans use the map to audit agent understanding. Update the map when the reader's mental model, a durable boundary, a supported workflow, or a product behavior changes.

Staleness is a defect, so keep the map current — a page is current when nothing in it is false. A map page must **reduce** the total amount of repository reading required to make a correct decision, so it should never restate what code, tests, or config already express — link the authority instead. Do not use the map to maintain independently mechanically derivable facts.

The map records what the code cannot say (boundaries, invariants, intent, where to start). The map should read in the present, not as change history. Significant, hard-to-reverse decisions belong as ADRs instead — save **Architecture Decision Records** under `map/_adr/`.

- `00-orientation` — Orientation
- `10-tokens-themes` — Tokens & themes
- `15-glyphs` — Glyph Atlas and Discern Glyphs
- `20-components` — Components
- `25-diagrams` — Diagrams
- `26-dataviz` — Dataviz
- `30-codegen` — Codegen
- `40-runtime-emitter` — Runtime emitter
- `50-react-adapter` — React adapter
- `60-catalogue` — Catalogue
- `70-cli` — CLI rendering
- `80-development` — Working on this project

Stuck or missing context? Call `discern_map` with `search` in task language, then retrieve the best result using its returned `target`.

---

# discern-design-system — project instructions

The interface system behind [discern.sh](https://discern.sh): a framework-neutral, deterministic package for browser and terminal surfaces in Deno applications, published to JSR as `@discern-sh/design-system` and consumed by the public. Browser consumers select a token-driven CSS runtime and may use the React adapter; terminal consumers use the React-free CLI renderers and optional interactive adapter. Treat every public name and emitted byte contract as API.

## One name, three roles

"discern" means three things here — don't conflate them:

1. **The product** — discern, the agent-development tool, and the discern.sh site that presents it. They live together in the sibling discern repository; nothing you edit here changes the tool or the site.
2. **This repo** — the design system those properties consume, and your only subject: the published library under `src/` and its Catalogue under `catalogue/`.
3. **Your tooling** — this repo dogfoods discern, so the "Working with discern" instructions above describe the tool running your workflow (the gate, worktrees, the `discern_*` verbs), exactly as in any project that installs it. Its footprint — `discern.toml` and the `discern/` directory holding these instructions, skills, scripts, and the TODO ledger — is project configuration, not part of the published package.

## Conventions

- **Component anatomy is fixed.** Every component lives in its own folder under `src/components/<group>/<slug>/` owning `<slug>.css`, `<slug>.tsx`, `<slug>.meta.ts`, `<slug>.examples.tsx`, and `mod.ts`. Metadata must declare its CLI stance at birth: `rendered` adds `<slug>.cli.ts`, while `exempt` records a non-empty terminal-specific reason. Vocabulary shared with React lives in a framework-neutral sibling module. The metadata and group order generate the runtime registry, React and CLI export surfaces, CLI stance registry, catalogue, and dependency graph — a new component needs no manual registration anywhere.
- **Never hand-edit generated surfaces.** `src/generated/`, `scripts/generated/`, and the skill eval set under `skills/use-discern-design-system/evals/` are committed outputs wholly owned by `deno task codegen`; discern regenerates and checks that group. `catalogue/generated/` mixes ignored build output with committed example images and their manifest; preserve the committed artifacts during cleanup. After changing component metadata, component CSS, component imports, or package assets, regenerate rather than patch.
- **Tokens change in `src/tokens/tokens.ts` only** — never in emitted CSS. Preserve `--discern-font-size-xs` as the authored interface-text floor.
- **Every public name wears the `discern` namespace** (classes, custom properties, data attributes, keyframes, layers) and every foundation rule stays scoped beneath `:where([data-discern-root])`. No unprefixed globals, ever.
- **The neutral core and CLI surface never import React.** React enters only through the `./react` adapter (18.3+ peer contract, build-time rendering). The release tests fail a stray React import in the root, CLI, manifest, runtime, tokens, or theme graphs.
- **CLI Components are pure renderers, not miniature applications.** A rendered `<slug>.cli.ts` derives deterministic text only from its props and `TerminalCapabilities`, exports typed props plus `cliExamples`, and composes the shared Token, ANSI, text, layout, rhythm, and triangle authorities instead of copying them. It performs no I/O, environment read, clock read, or interaction. Effects live behind `./cli/interactive` and paint the same Component frame states; exact frames must preserve meaning across widths, colour depths, Unicode, and ASCII.
- **Themes move tokens, never component CSS.** Light/dark, terminal ANSI fallbacks, and consumer branding derive from or override public token metadata; a theme that forks a component stylesheet or terminal palette is a defect. Keep semantic roles distinct — success must never collapse into accent, and the inverse roles stay light-on-dark in both site themes.
- **Keep examples generic.** Product claims, customer names, routes, commands, and bespoke artwork belong to the consumer and enter through props or slots.
- **Preview visible changes before the final gate.** For Component or Catalogue changes, provide the Catalogue URL on the worktree's deterministic port (`discern identity --port`). Link CLI renderer changes with `?surface=cli#component-<slug>` and exercise the CLI playground for interactive Adapter changes. Complete the required visual review while the preview runs. Run `discern done` on the clean final HEAD and leave the preview running afterwards so the project owner can review your changes. Stop this effort's preview/watch processes before running `discern accept`, as acceptance will remove the worktree. A task grant recorded at the desk covers later green commits this agent submits for the same task, and `discern accept` checks that authority at the landing boundary. See [checkout convergence](map/80-development/checkout-convergence.md).
- **The published contract is guarded.** JSR versions are immutable; releases follow SemVer and every contract change lands in `CHANGELOG.md`. Every exported symbol carries documentation and the publish set is allowlisted in `deno.json` — release tests enforce both.
- **TypeScript is strict and stays strict.** `deno.json` sets `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and friends; write code that passes without loosening a flag. Use type-only imports where a value is not needed.
- **`deno fmt` owns style, including markdown.** The compiled agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are fmt-excluded because discern regenerates them from this source — edit here, then `discern refresh`.

The seven binding rules behind these conventions live in [map/00-orientation/design-principles.md](map/00-orientation/design-principles.md) — read them before changing anything structural, and override one only through an ADR.
