# Working in discern Design System

discern's built-in guidance comes first; discern Design System's own guidance fills the second half and wins on any conflict.

## Operating discern

This project uses **discern**, a stack-neutral agent-development system. Everything discern knows lives in one root file: **`discern.toml`**. Its verbs are **MCP tools** (`discern_status`, `discern_done`, …) — the **primary surface** — returning structured results.

- **Orient first.** Call **`discern_status`** at session start for a cheap, read-only account of what's true and next.
- **Keep one worktree for the whole effort.** Review feedback and resumed sessions continue there. If this effort already has a worktree, continue there using its recorded path and pass `path` to every discern tool. If that path is unavailable, ask which worktree belongs to this effort instead of creating another. Do not call `discern_start` again. For a new effort, run **`discern_start`** from the main checkout and work only at the returned path. Read-only work needs none.
- **`discern_done` is the bar for "done".** Call work finished only after its full gate passes. Iterate with **`discern_prepare`** (fast fix/regenerate/check) or **`discern_test`** (tests); fix failures from `diagnostics[]`. With a positive `[gate].concurrent_test_runs`, run direct tests through **`discern queue -- <command>`**.
- **`discern_docs`** explains how discern works; **`discern_doctor`** diagnoses a misconfigured install.

**Troubleshooting**: MCP tools unreachable? Tell the user, use the **`discern` CLI** with `--json` meanwhile. Read each result whole — never `tail` it, `grep` it, or filter it through a script; a subset drops the hints and remedies. Offer `discern doctor` afterwards. CLI not on PATH? Stop and tell the user: they choose between installing it (`curl discern.sh` explains how) and continuing without discern's protections.

## Generated files — don't hand-edit

discern compiles your guidance sources (`discern/guidance.md`) into the agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and materializes skills into their directories (`.claude/skills`, `.agents/skills`). To change what you read, edit the source and run **`discern refresh`** — edits to a generated file are overwritten on the next compile.

## Isolated worktree workflow

discern keeps each effort in its own **linked git worktree** so parallel work doesn't collide.

No per-worktree resources are configured. If parallel worktrees collide over shared state (a database, a port), the `[worktree.resources]` table isolates it per worktree.

- **`discern_start`** — only for an effort without a worktree. From the main checkout, create one (branch prefix `agent/`, forked from `main`) and re-root into the returned path: cd in, or start a session there. Continue there through later fixes and sessions. Can't change your working root? Prefix every shell command with `cd <path> &&` and pass `path` to every discern tool. Already there? Stay there.
- **`discern_update`** brings `main` into your branch when behind and reports upstream overlap. Idempotent — call it directly instead of pre-checking with git or hand-merging; it performs its own preconditions and gives the exact next step if it refuses. To build on unlanded work instead, `start` and `update` both take `from` (any ref) — work composes below the trunk; only `accept` lands on it.
- **`discern_await`** watches a sibling or the trunk in one longest-safe call. Do not surface progress updates until it returns. If `data.met: false`, continue with `data.resume` without surfacing an update. Repeat without a fixed limit until the condition holds, or until stopped or unnecessary. An `ok: false` refusal has no continuation. Do not resume it. Follow its recovery hint. Report only when the condition holds, the watch is unnecessary, or a refusal/error needs action. Always respond to new user input. On success, follow its `start`/`update` hint.
- **`discern_accept`** lands only with explicit consent from this conversation or machine-verified authority from a recorded grant. After a green `discern done`, follow its authority-aware hint: either report the one-line proof and stop, or land under the verified grant. Landing fast-forwards `main` and removes the worktree and branch.

While iterating, use `discern_prepare`, `discern_test`, or a targeted project command, and commit each logical step — acceptance lands your branch history as-is. When the final tree is ready, commit it first, then run `discern_done` once on the clean HEAD — acceptance reuses that proof; a later commit invalidates it.

**Keep this effort's worktree.** Never adopt another effort's worktree because it is idle or clean. The `discern_status` fleet isn't a pool.

## Quality standards

Standards are **numbers that can never get worse**: metrics held at a `limit` that may only improve versus `main` — a floor may only rise (`up`), a ceiling only fall (`down`). Every **`discern_done`** run verifies no limit loosened versus `main` and measures each standard alongside the tests — untouched `inputs` replay the recorded value for free; `measure = "on-demand"` defers a standard to **`discern_standards`**.

**Never loosen one to pass.** A loosened or deleted limit fails the gate. Cut waste your change added; when the work itself grew the number, report it: moving a limit is an owner decision.

## Skills

discern makes **skills** — focused, reusable task playbooks — discoverable to **you**; reach for one when a task matches. **`discern skills list`** shows the set.

When a session yields a durable lesson — a correction, a hard-won procedure, an unrecorded decision — **offer to capture it** with the `discern-teach-the-project` skill at a natural pause, so future sessions inherit it.

## The map & decisions

`map/` is the agent-maintained **map**, browsable with **`discern_map`**. Keep it current; staleness is a defect. Humans audit agent understanding. Maintain no documentation outside it unless the user asks. Put significant, hard-to-reverse decisions in **Architecture Decision Records** under `map/_adr/`. Stuck or missing context? `search` the map in task language, then fetch the best result's canonical `target`.

- `00-orientation` — Orientation
- `10-tokens-themes` — Tokens & themes
- `20-components` — Components
- `30-codegen` — Codegen
- `40-runtime-emitter` — Runtime emitter
- `50-react-adapter` — React adapter
- `60-catalogue` — Catalogue
- `70-cli` — CLI rendering
- `80-development` — Working on this project

---

# discern-design-system — project guidance

The interface system behind [discern.sh](https://discern.sh): a framework-neutral, deterministic package for browser and terminal surfaces in Deno applications, published to JSR as `@discern-sh/design-system` and consumed by the public. Browser consumers select a token-driven CSS runtime and may use the React adapter; terminal consumers use the React-free CLI renderers and optional interactive adapter. Treat every public name and emitted byte contract as API.

## One name, three roles

"discern" means three things here — don't conflate them:

1. **The product** — discern, the agent-development tool, and the discern.sh site that presents it. They live together in the sibling discern repository; nothing you edit here changes the tool or the site.
2. **This repo** — the design system those properties consume, and your only subject: the published library under `src/` and its Catalogue under `catalogue/`.
3. **Your tooling** — this repo dogfoods discern, so the "Working with discern" guidance above describes the tool running your workflow (the gate, worktrees, the `discern_*` verbs), exactly as in any project that installs it. Its footprint — `discern.toml` and the `discern/` directory holding this guidance, skills, scripts, and the TODO ledger — is project configuration, not part of the published package.

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

