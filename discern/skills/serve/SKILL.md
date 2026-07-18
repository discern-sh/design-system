---
name: serve
description: Build the design system once and serve the Catalogue styleguide — no file watching. Use for a stable preview of the current tree, e.g. when handing off a finished change; when iterating and rebuilds per edit are wanted, use the watch skill instead.
metadata:
  author: "discern-design-system"
  version: "1.0"
---

# Serve the Catalogue

Build once and serve the styleguide for the tree as it stands.

1. From this checkout's root, start it as a background process: `deno task serve`
2. Resolve the port: `discern identity --port` — each worktree gets its own deterministic port; in the main checkout the task falls back to `8010`.
3. Report the URL: `http://127.0.0.1:<port>/style-guide/`

Leave it running and include that exact URL in any handoff — this is the preview the project's "ship visible changes with a preview" rule asks for.

Source edits made while it runs are **not** picked up — restart the task (or use the `watch` skill) to see them.
