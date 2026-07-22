# Working in discern Design System

The second half of this file is discern Design System's own project guidance. discern's built-in guidance comes first, so you understand how to work correctly with discern's tools and conventions. The project guidance wins on any conflict.

## Operating discern

This project uses **discern**, a stack-neutral agent-development system. Everything discern knows lives in one root file: **`discern.toml`**. Its verbs are **MCP tools** (`discern_status`, `discern_done`, …) — the **primary surface** — returning structured results.

- **Orient first.** Call **`discern_status`** at session start for a cheap, read-only account of what's true and next.
- **Starting a task? Get your own worktree — a separate checkout and branch for one change — first.** From the main checkout, run **`discern_start`**; it creates one and returns its path. Move into it and work only there, never on the trunk — the shared landing branch — or in another effort's worktree.
- **`discern_done` is the bar for "done".** It runs the gate — the project's full quality check; call a change finished only when the final tree passes. Iterate with **`discern_prepare`** (the fast fix-then-check loop) or **`discern_test`** (just the tests). On failure, read `diagnostics[]` for the command and output, then fix it.
- **`discern_help`** explains how discern works; **`discern_doctor`** diagnoses a misconfigured install.

**Troubleshooting**: If the MCP server is unreachable, tell the user and use the **`discern` CLI** with `--json` in the meantime (never `tail` or parse a subset of the CLI's agent-optimized JSON output, you will miss contextual hints). Offer to fix the connection with `discern help` / `discern doctor` afterwards. If the `discern` CLI isn't on PATH: stop and notify the user, then offer to either continue working without discern (ensuring the user is aware of the risk), or help them install discern's single self-contained binary before continuing (you can `curl discern.sh` for the agent-optimized plaintext installation guide).

## Generated files — don't hand-edit

discern compiles your guidance sources (`discern/guidance.md`) into the agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and materializes skills into their directories (`.claude/skills`, `.agents/skills`). To change what you read, edit the source and run **`discern refresh`** — edits to a generated file are overwritten on the next compile.

## Isolated worktree workflow

discern keeps each task in its own **linked git worktree** so parallel work doesn't collide.

- **`discern_start`** — from the main checkout, create your isolated worktree (branch prefix `agent/`, forked from `main`) and re-root into the returned path: cd in, or start a session there. Can't change your working root? Prefix every shell command with `cd <path> &&` and pass `path` to every discern tool. Already in a worktree? Stay there.
- **`discern_update`** brings `main` into your branch when behind and reports upstream overlap. Idempotent — call it directly instead of pre-checking with git or hand-merging; it performs its own preconditions and gives the exact next step if it refuses. To build on unlanded work instead, `start` and `update` both take `from` (any ref) — work composes below the trunk; only `accept` lands on it.
- **`discern_accept`** is only for an explicit user handoff/land request. After a green `discern done` run on a completed task, relay the receipt to your owner and stop; land only once they accept (or gave you a standing pre-authorization). It fast-forwards the trunk (`main`), refreshes it, runs `[repository].ensure` and `smoke`, reports failures without stopping cleanup, then removes the worktree and branch.

While iterating, use `discern_prepare`, `discern_test`, or a targeted project command. When the final tree is ready, commit it first, then run `discern_done` once on the clean HEAD — that recorded receipt is the one acceptance honors; a later commit invalidates it.

Acceptance requires a clean worktree and lands committed branch history only.

**Never edit a worktree from outside it without one of those moves, and never start work in one you didn't create.** A clean tree doesn't mean it's free; the ones `discern_status` lists are other efforts in flight, not a pool to claim from.

## Quality standards

Standards are **numbers that can never get worse**: metrics held at a `limit` that may only improve versus `main` — a floor may only rise (`up`), a ceiling only fall (`down`). Every **`discern_done`** run verifies no limit loosened versus `main` and measures each standard alongside the tests — untouched `inputs` replay the recorded value for free; `measure = "on-demand"` defers a standard to **`discern_standards`**.

**Never loosen one to pass.** A loosened or deleted limit fails the gate. Cut waste your change added; when the work itself grew the number, report it: moving a limit is an owner decision.

## Skills

discern makes **skills** — focused, reusable task playbooks — discoverable to **you**; reach for one when a task matches. **`discern skills list`** shows the set.

When a session yields a durable lesson — a correction, a hard-won procedure, an unrecorded decision — **offer to capture it** with the `discern-teach-the-project` skill at a natural pause, so future sessions inherit it.

## The map & decisions

`map/` is the agent-maintained **map**, browsable with **`discern_map`**. Keep it current; staleness is a defect. Humans audit agent understanding. Maintain no documentation outside it unless the user asks. Put significant, hard-to-reverse decisions in **Architecture Decision Records** under `map/_adr/`.

Use a region as `target` for its index, or add `search` to scope a query. When unsure, search in task language, then fetch a result with its canonical `target`.

- `00-orientation` — Orientation
- `10-tokens-themes` — Tokens & themes
- `20-components` — Components
- `30-codegen` — Codegen
- `40-runtime-emitter` — Runtime emitter
- `50-react-adapter` — React adapter
- `60-catalogue` — Catalogue
- `80-development` — Working on this project

---

# discern-design-system — project guidance

The design system behind [discern.sh](https://discern.sh): a framework-neutral, deterministic CSS design system for Deno sites, published to JSR as `@discern-sh/design-system` and consumed by the public — treat every public name as API.

## One name, three roles

"discern" means three things here — don't conflate them:

1. **The product** — discern, the agent-development tool, and the discern.sh site that presents it. Both live in other repositories; nothing you edit here changes the tool or the site.
2. **This repo** — the design system those properties consume, and your only subject: the published library under `src/` and its catalogue under `styleguide/`.
3. **Your tooling** — this repo dogfoods discern, so the "Working with discern" guidance above describes the tool running your workflow (the gate, worktrees, the `discern_*` verbs), exactly as in any project that installs it. Its footprint — `discern.toml` and the `discern/` directory holding this guidance, skills, scripts, and the TODO ledger — is project configuration, not part of the published package.

## Conventions

- **Component anatomy is fixed.** Every component lives in its own folder under `src/components/<group>/<slug>/` owning `<slug>.css`, `<slug>.tsx`, `<slug>.meta.ts`, `<slug>.examples.tsx`, and `mod.ts`. The metadata and group order generate the runtime registry, React export surface, catalogue, and dependency graph — a new component needs no manual registration anywhere.
- **Never hand-edit generated surfaces.** `src/generated/` and `styleguide/generated/` come from `deno task codegen` (the gate runs it in its fix stage). After changing component metadata, component CSS, component imports, or package assets, regenerate rather than patch.
- **Tokens change in `src/tokens/tokens.ts` only** — never in emitted CSS. Preserve `--discern-font-size-xs` as the authored interface-text floor and keep the UI font role paired with its central OpenType feature set.
- **Every public name wears the `discern` namespace** (classes, custom properties, data attributes, keyframes, layers) and every foundation rule stays scoped beneath `:where([data-discern-root])`. No unprefixed globals, ever.
- **The neutral core never imports React.** React enters only through the `./react` adapter (18.3+ peer contract, build-time rendering). The release tests fail a stray React import in the root, manifest, runtime, tokens, or theme graphs.
- **Themes move tokens, never component CSS.** Light/dark and consumer branding override public custom properties; a theme that forks a component stylesheet is a defect. Keep semantic roles distinct — success must never collapse into accent, and the inverse roles stay dark-on-light in both site themes.
- **Keep examples generic.** Product claims, customer names, routes, commands, and bespoke artwork belong to the consumer and enter through props or slots.
- **Ship visible changes with a preview.** For every component or Catalogue change, leave the Catalogue dev server running on the worktree's deterministic port (`discern identity --port`) and include the exact localhost URL in the handoff, so review never requires reconstructing the development command.
- **The published contract is guarded.** JSR versions are immutable; releases follow SemVer and every contract change lands in `CHANGELOG.md`. Every exported symbol carries documentation and the publish set is allowlisted in `deno.json` — release tests enforce both.
- **TypeScript is strict and stays strict.** `deno.json` sets `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and friends; write code that passes without loosening a flag. Use type-only imports where a value is not needed.
- **`deno fmt` owns style, including markdown.** The compiled agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are fmt-excluded because discern regenerates them from this source — edit here, then `discern refresh`.

The seven binding rules behind these conventions live in [map/00-orientation/design-principles.md](../map/00-orientation/design-principles.md) — read them before changing anything structural, and override one only through an ADR.

