---
name: watch
description: Start the Catalogue dev server with file watching — builds once, serves, and rebuilds automatically whenever anything under src/, styleguide/, or assets/ changes. Use when iterating on components, tokens, styles, or the styleguide and a manual rebuild per edit would slow the loop; for a one-shot preview without watching, use the serve skill instead.
metadata:
  author: "discern-design-system"
  version: "1.0"
---

# Watch the Catalogue

Run the Catalogue dev server in watch mode: one command builds everything, serves the styleguide, and rebuilds on every source edit.

1. From this checkout's root, start it as a background process: `deno task watch`
2. Resolve the port: `discern identity --port` — each worktree gets its own deterministic port; in the main checkout the task falls back to `8010`.
3. Report the URL: `http://127.0.0.1:<port>/style-guide/`

Leave it running and include that exact URL in any handoff — this is the preview the project's "ship visible changes with a preview" rule asks for.

## Behaviour

- Edits under `src/`, `styleguide/`, and `assets/` trigger a full rebuild (codegen, runtime emission, styleguide bundle) and a server restart. Generated outputs (`src/generated/`, `styleguide/generated/`, `dist/`) are excluded from the watch, so rebuilds never retrigger themselves.
- There is no hot reload — refresh the browser after a rebuild.
- A failed rebuild logs the error and keeps serving the last successful output; check the task's output when the page looks stale.
- Stop it by killing the background task.
