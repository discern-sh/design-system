# Getting started

_Cloning, setting up, and running the project locally for the first time._

This is the path from a fresh clone to a running project and a first green gate. The discern commands are the same on every stack; the stack-specific steps (installing dependencies, configuring the environment, running the app) are filled in below.

## The discern loop

These work the same regardless of language or framework:

- **`discern start`** creates an isolated worktree for a change and moves you into it (see the worktree note in the project guidelines).
- **`discern prepare`** is the fast inner loop — applies the fix-stage capabilities, then the check-stage capabilities; no build, no tests.
- **`discern done`** is the full gate — (in a worktree) a fail-fast merge check first, then fixers and build, then checks and tests in parallel, then any scope `gate`s that fired. Run it before declaring a change done.
- **`discern doctor`** verifies the install is sound (dispatcher executable, hooks present, every configured capability resolvable, git worktree support, required tools on PATH).

## Setting up

**Prerequisites.** Deno 2.9.x is the only requirement — CI pins v2.9.2. No Node.js toolchain is needed: React and its type packages arrive through Deno's npm support, and the runtime emitter's `node:fs/promises` writes work under Deno.

**Install dependencies.**

```sh
deno install --frozen
```

This populates the cache and `node_modules/` from `deno.lock`. It is also what a fresh worktree runs automatically (`[worktree.setup].ensure` in `discern.toml`), and what the cached-only test fixtures rely on — run it before the first test run.

**Environment.** None. There are no secrets, no `.env` values, and no external services anywhere in this project.

**Run the Catalogue** (the local component browser):

```sh
deno task serve
```

builds `dist/` and serves the Catalogue at `http://127.0.0.1:8010`. Note the port is fixed in [`serve.ts`](../../scripts/serve.ts) — when running the Catalogue in more than one worktree at once, only one gets the port.

**First green gate.** Run `discern done`. On this project that is: fix stage (`deno task fix`, then `deno task codegen`), build stage (`deno task build` plus the Catalogue type-check), then lint, typecheck, and the test suite in parallel, with the `css_size` standard measured alongside (full-catalogue `dist/discern.css` must stay under its ceiling). All green means the change is done by this project's definition; a non-obvious failure points at the [gate gotchas](done-gate-gotchas.md).
