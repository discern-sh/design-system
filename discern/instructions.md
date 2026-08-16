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
