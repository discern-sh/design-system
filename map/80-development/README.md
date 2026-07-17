# Working on this project

_The contributor's view of the codebase — set up, write, test, ship._

This subtree documents the developer experience: getting set up locally, the testing approach, the conventions the tooling enforces, and where to look when the quality gate fails in a way the message did not explain.

The end-to-end loop is short and the same on every stack discern runs on:

- `discern start` creates an isolated worktree for a change and moves you into it (see the worktree note in the project guidelines).
- `discern prepare` is the fast inner loop — it applies the fix-stage capabilities, then the check-stage capabilities, and never builds or tests.
- `discern done` is the full gate: it runs the fix/build-stage capabilities, then `check` and `test` in parallel, fires any scope `gate`s that fired, and (in a worktree) verifies your branch contains the latest `main`. Run it before declaring any change done; fix what it reports and re-run.

## Leaves

| File                                         | What's in it                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [done-gate-gotchas.md](done-gate-gotchas.md) | Non-obvious ways `discern done` fails — the stack-independent traps (merge check, parallel-run state, stale artifacts, masked exit codes), plus a section for this stack's own. The gate points here when a stage fails. |
| [getting-started.md](getting-started.md)     | Deno prerequisites, `deno install --frozen`, running the Catalogue, and what the first `discern done` runs.                                                                                                              |
| [testing.md](testing.md)                     | The two suites, the permissions they need, cached-only fixtures, filtering one test, and how tests are written here.                                                                                                     |
| [code-conventions.md](code-conventions.md)   | What each gate stage enforces (fmt, codegen, lint, strict typecheck, css_size) and the working-level conventions beyond the tooling.                                                                                     |
