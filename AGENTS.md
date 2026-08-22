# Working in discern Design System

discern's built-in instructions comes first; discern Design System's own instructions fills the second half and wins on any conflict.

## Operating discern

This project uses **discern**, a stack-neutral agent-development system. Everything discern knows lives in one root file: **`discern.toml`**. Its verbs are **MCP tools** (`discern_status`, `discern_done`, …), the **primary surface**.

- **Orient first.** Call **`discern_status`** at session start for a fast read-only account of what's true and next.
- **Keep one worktree for the whole effort.** The worktree carries the effort's branch, identity, and any recorded authority, so review feedback and resumed sessions continue there; a second worktree would split the effort's history and its evidence. If this effort already has a worktree, continue there using its recorded path and pass `path` to every discern tool. If that path is unavailable, ask which worktree belongs to this effort instead of creating another. Do not call `discern_start` again. For a new effort, run **`discern_start`** from the main checkout and work only at the returned path. Read-only work needs none.
- **`discern_done` is the bar for "done".** Call work finished only after its full gate passes. Iterate with **`discern_prepare`** (fast fix/regenerate/check) or **`discern_test`** (tests); fix failures from `diagnostics` — each one names its location and the exact command that reproduces it. With a positive `[gate].concurrent_test_runs`, run direct tests through **`discern queue -- <command>`**.
- **Follow discern's printed next action.** A discern refusal or failure names its own next step in the result, and `hints` are matched to the state you are in. Prefer the stated remedy over improvising around it with raw git or shell — discern gives you instructions which are optimized, deterministic, and fleet-aware.
- **`discern_docs`** explains how discern works; **`discern_doctor`** diagnoses a misconfigured install.

**Troubleshooting**: MCP tools unreachable? Tell the user and use the **`discern` CLI** as a fallback (`--markdown` to read, `--json` for structured fields, and always read in full — never `tail`, `grep`, or script-filter it, a subset loses hints and remedies). Offer `discern doctor` afterwards. CLI not on PATH? Stop and tell the user: they choose between installing it (`curl discern.sh` explains how) or continuing without discern's protections.

## Generated files — don't hand-edit

discern compiles the project's instruction sources (`discern/instructions.md`) into the agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and materializes skills into their directories (`.claude/skills`, `.agents/skills`). To change what you read, edit the source and run **`discern refresh`** — edits to a generated file are overwritten on the next compile.

## Isolated worktree workflow

discern keeps each effort in its own **linked git worktree** so parallel work doesn't collide.

No per-worktree resources are configured. If parallel worktrees collide over shared state (a database, a port), the `[worktree.resources]` table isolates it per worktree.

The `discern_status` fleet isn't a pool. Never adopt another effort's worktree because it is idle or clean.

- **`discern_start`** — only for an effort without a worktree. From the main checkout, create one (branch prefix `agent/`, forked from `main`) and re-root into the returned path using your native worktree-entering tool when available; otherwise cd in, or start a session there. Continue in the worktree throughout the entire effort. Already there? Stay there. If you can't change your working root, prefix every shell command with `cd <path> &&` and pass `path` to every discern tool. Starting re-aims the discern tools at the new worktree, but your own file operations move only when you move them — edits made from the old root land on the trunk while the gate runs in the worktree, and the two quietly diverge.
- **`discern_update`** brings `main` into your branch when behind and reports upstream overlap — re-read any of your files it names, since a merge that applies cleanly can still conflict in meaning. Idempotent — call it directly instead of pre-checking with git or hand-merging; it performs its own preconditions and gives the exact next step if it refuses. To build on unlanded work instead, `start` and `update` both take `from` (any ref) — work composes below the trunk; only `accept` lands on it.
- **`discern_await`** watches a sibling or the trunk in one longest-safe call. Do not surface progress updates until it returns. If `data.met: false`, continue with `data.resume` without surfacing an update. Repeat without a fixed limit until the condition holds, or until stopped or unnecessary. An `ok: false` refusal has no continuation. Do not resume it. Follow its recovery hint. Report only when the condition holds, the watch is unnecessary, or a refusal/error needs action. Always respond to new user input. On success, follow its `start`/`update` hint.
- **`discern_accept`** lands only with explicit consent from this conversation or machine-verified authority from a recorded grant. A green gate is evidence your work is ready, but the owner decides what to do with it. After a green `discern done`, follow its authority-aware hint: either report the one-line proof and stop, or land under the verified grant. Landing fast-forwards `main` and removes the worktree and branch.

While iterating, use `discern_prepare`, `discern_test`, or a targeted project command, and commit each logical step. Acceptance lands your branch history as-is.

**Finishing an effort.** Proof binds to one exact commit, so the order matters:

1. Run `discern_prepare` and commit everything, so the final tree is committed and the fixers have nothing left to rewrite.
2. Then run `discern_done` once on the clean HEAD — acceptance reuses that proof. A later edit invalidates it, and `done` runs again on the new tree.
3. Report completion in your own words — what changed and why, plus anything the gate did not cover (a deferred standard, a decision the owner still holds) — and end with the proof line verbatim. Never paste the full proof page; the owner retrieves it with `discern status --verbose`.

## Quality standards

Standards are **numbers that can never get worse**: metrics held at a `limit` that may only improve versus `main` — a floor may only rise (`up`), a ceiling only fall (`down`). Every **`discern_done`** run verifies no limit loosened versus `main` and measures each standard alongside the tests — untouched `inputs` replay the recorded value for free; `measure = "on-demand"` defers a standard to **`discern_standards`**.

**Never loosen one to pass.** A loosened or deleted limit fails the gate. Each limit records ground some past change earned. Cut waste your change added; when the work itself grew the number, report it: moving a limit is an owner decision.

When your change _improves_ a measure, the result hints you to offer to lock in the gain. `discern_standards` with `pin` tightens the limit to the measured value and commits that change on its own, so today's gain becomes the baseline every later branch inherits.

## Checkpoints

Configured checkpoints serve a question which requires your judgment when a matching change completes. `discern_status` and `discern_prepare` name detected checkpoints early. Use `met` only when the served question is satisfied; otherwise use `unmet` with a short, owner-relevant, secret-free tradeoff. A variance follows only the owner's explicit acceptance for the exact declared-unmet set; grants never cover one.

## Skills

discern makes **skills** — focused, reusable task playbooks — discoverable to **you**; reach for one when a task matches. **`discern skills list`** shows the set.

When a session yields a durable lesson — a correction, a hard-won procedure, an unrecorded decision — **offer to capture it** with the `discern-teach-the-project` skill at a natural pause, so future sessions inherit it.

## The Map & decisions

`map/` is the agent-maintained **map**, browsable with **`discern_map`**. Agents use the map to learn and navigate the project; humans use the map to audit agent understanding. Update the map when the reader's mental model, a durable boundary, a supported workflow, or a product behaviour changes.

Staleness is a defect, so keep the map current — a page is current when nothing in it is false. A map page must **reduce** the total amount of repository reading required to make a correct decision, so it should never restate what code, tests, or config already express — link the authority instead. Do not use the map to maintain independently mechanically derivable facts.

The map records what the code cannot say (boundaries, invariants, intent, where to start). The map should read in the present, not as change history. Significant, hard-to-reverse decisions belong as ADRs instead — save **Architecture Decision Records** under `map/_adr/`.

- `00-orientation` — Orientation
- `10-tokens-themes` — Tokens & themes
- `20-components` — Components
- `25-diagrams` — Diagrams
- `30-codegen` — Codegen
- `40-runtime-emitter` — Runtime emitter
- `50-react-adapter` — React adapter
- `60-catalogue` — Catalogue
- `70-cli` — CLI rendering
- `80-development` — Working on this project

Stuck or missing context? `search` the map in task language, then fetch the best result's canonical `target`.

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
- **Never hand-edit generated surfaces.** `src/generated/` and `catalogue/generated/` come from `deno task codegen` (the gate runs it in its fix stage). After changing component metadata, component CSS, component imports, or package assets, regenerate rather than patch.
- **Tokens change in `src/tokens/tokens.ts` only** — never in emitted CSS. Preserve `--discern-font-size-xs` as the authored interface-text floor and keep the UI font role paired with its central OpenType feature set.
- **Every public name wears the `discern` namespace** (classes, custom properties, data attributes, keyframes, layers) and every foundation rule stays scoped beneath `:where([data-discern-root])`. No unprefixed globals, ever.
- **The neutral core and CLI surface never import React.** React enters only through the `./react` adapter (18.3+ peer contract, build-time rendering). The release tests fail a stray React import in the root, CLI, manifest, runtime, tokens, or theme graphs.
- **CLI Components are pure renderers, not miniature applications.** A rendered `<slug>.cli.ts` derives deterministic text only from its props and `TerminalCapabilities`, exports typed props plus `cliExamples`, and composes the shared Token, ANSI, text, layout, rhythm, and triangle authorities instead of copying them. It performs no I/O, environment read, clock read, or interaction. Effects live behind `./cli/interactive` and paint the same Component frame states; exact frames must preserve meaning across widths, colour depths, Unicode, and ASCII.
- **Themes move tokens, never component CSS.** Light/dark, terminal ANSI fallbacks, and consumer branding derive from or override public token metadata; a theme that forks a component stylesheet or terminal palette is a defect. Keep semantic roles distinct — success must never collapse into accent, and the inverse roles stay light-on-dark in both site themes.
- **Keep examples generic.** Product claims, customer names, routes, commands, and bespoke artwork belong to the consumer and enter through props or slots.
- **Ship visible changes with a preview.** For every Component or Catalogue change, leave the Catalogue dev server running on the worktree's deterministic port (`discern identity --port`) and include the exact localhost URL in the handoff. Link CLI renderer changes directly with `?surface=cli#component-<slug>`; use the live CLI playground as well when an interactive Adapter flow changes.
- **The published contract is guarded.** JSR versions are immutable; releases follow SemVer and every contract change lands in `CHANGELOG.md`. Every exported symbol carries documentation and the publish set is allowlisted in `deno.json` — release tests enforce both.
- **TypeScript is strict and stays strict.** `deno.json` sets `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and friends; write code that passes without loosening a flag. Use type-only imports where a value is not needed.
- **`deno fmt` owns style, including markdown.** The compiled agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are fmt-excluded because discern regenerates them from this source — edit here, then `discern refresh`.

The seven binding rules behind these conventions live in [map/00-orientation/design-principles.md](../map/00-orientation/design-principles.md) — read them before changing anything structural, and override one only through an ADR.

