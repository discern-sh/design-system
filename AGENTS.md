# Working with discern

This project uses **discern**, a stack-neutral agent-development system.
Everything discern knows lives in one root file: **`discern.toml`**. Its verbs
are **MCP tools** (`discern_status`, `discern_done`, …) — the **primary surface** —
returning structured results.

This file is compiled — discern's built-in operating guidance first, then the
project's own guidance, the more specific authority: it wins on any conflict.

## Operating discern

- **Orient first.** Call **`discern_status`** at session start for a cheap,
  read-only account of what's true and next.
- **Starting a task? Get your own worktree — a separate checkout and branch for
  one change — first.** From the main checkout, run **`discern_start`**; it creates
  one and returns its path. Move into it and work only there, never on the trunk —
  the shared landing branch — or in another effort's worktree.
- **`discern_done` is the bar for "done".** It runs the gate — the project's full
  quality check; call a change finished only when the final tree passes. Iterate with
  **`discern_prepare`** (the fast fix-then-check loop) or **`discern_test`** (just
  the tests). On failure, read `diagnostics[]` for the command and output, then
  fix it.
- **`discern_help`** explains how discern works; **`discern_doctor`** diagnoses a
  misconfigured install.

If the MCP server is **unreachable**, tell the user and use the **`discern` CLI**
with `--json` meanwhile — never `tail` its agent-optimised output. Offer to fix
the connection with `discern help` / `discern doctor` afterwards.

## Generated files — don't hand-edit

discern compiles your guidance sources (`discern/guidance.md`) into the agent files
(`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and materializes skills into their directories
(`.claude/skills`, `.agents/skills`). To change what you read, edit the source and run
**`discern refresh`** — edits to a generated file are overwritten on the next
compile.

## Isolated worktree workflow

discern keeps each task in its own **linked git worktree** so parallel work
doesn't collide.

- **`discern_start`** — from the main checkout, create your isolated worktree
  (branch prefix `agent/`, forked from `main`) and re-root
  into the returned path: cd in, or start a session there. Can't change your
  working root? Prefix every shell command with `cd <path> &&` and pass `path`
  to every discern tool. Already in a worktree? Stay there.
- **`discern_update`** brings `main` into your branch when behind
  and reports upstream overlap. Idempotent — call it directly instead of
  pre-checking with git or hand-merging; it performs its own preconditions and
  gives the exact next step if it refuses. To build on unlanded work instead,
  `start` and `update` both take `from` (any ref) — work composes below the
  trunk; only `accept` lands on it.
- **`discern_accept`** is only for an explicit user handoff/land request. After
  a green `discern done` run on a completed task, relay the receipt to your owner
  and stop; land only once they accept, passing `--confirmed` (standing
  pre-authorization counts). It lands on the trunk (`main`) —
  fast-forwarded, the worktree removed, the merged branch deleted — and refreshes
  the trunk checkout it leaves behind.

While iterating, use `discern_prepare`, `discern_test`, or a targeted project
command. When the final tree is ready, commit it first, then run
`discern_done` once on the clean HEAD — that recorded receipt is the one
acceptance honors; a later commit invalidates it.

Acceptance requires a clean worktree and lands committed branch history only.

**Never edit a worktree from outside it without one of those moves, and never
start work in one you didn't create.** A clean tree doesn't mean it's free; the ones
`discern_status` lists are other efforts in flight, not a pool to claim from.

## Skills

discern makes **skills** — focused, reusable task playbooks — discoverable to
**you**; reach for one when a task matches. **`discern skills list`** shows the set.

When a session yields a durable lesson — a correction, a hard-won procedure, an
unrecorded decision — **offer to capture it** with the
`discern-teach-the-project` skill at a natural pause, so future sessions
inherit it.

## The map & decisions

The tree at `map/` is the **map** — the agent-maintained account of this
codebase, browsable with **`discern_map`**. Agents write it and keep it current;
humans read it to audit what their agents understand; a stale map is a defect.
Never touch documentation the user didn't point discern at — the map is the only
tree discern maintains. Record significant or hard-to-reverse decisions as
**Architecture Decision Records** under `map/_adr/`.

---

# discern-design-system — project guidance

<!-- setup fills this -->

<!--
  `discern setup` has your coding agent fill this in from the repository. This file
  holds ONLY this project's own conventions — discern's built-in guidance
  (docs, TODO, the worktree workflow, and the quality gate) is bundled and auto-prepended
  when the agent files compile, so don't repeat the standing disciplines here. Delete
  these comments as you fill each section.
-->

_(One-line pitch: what discern-design-system is and who it's for — replace this line.)_

## Conventions

_(Replace this section.)_ Language idioms, style, structure, naming, error handling —
anything the tooling enforces. Keep it aligned with the `[capabilities]` you wire in
`discern.toml`, so the written rule and the enforced rule never disagree.

