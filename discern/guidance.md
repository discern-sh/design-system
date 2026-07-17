# discern-design-system — project guidance

The design system behind [discern.sh](https://discern.sh): a framework-neutral,
deterministic CSS design system for Deno sites, published to JSR as
`@discern-sh/design-system` and consumed by the public — treat every public name
as API.

## Conventions

- **Component anatomy is fixed.** Every component lives in its own folder under
  `src/components/<group>/<slug>/` owning `<slug>.css`, `<slug>.tsx`,
  `<slug>.meta.ts`, `<slug>.examples.tsx`, and `mod.ts`. The metadata and group
  order generate the runtime registry, React export surface, catalogue, and
  dependency graph — a new component needs no manual registration anywhere.
- **Never hand-edit generated surfaces.** `src/generated/` and
  `styleguide/generated/` come from `deno task codegen` (the gate runs it in its
  fix stage). After changing component metadata, component CSS, component
  imports, or package assets, regenerate rather than patch.
- **Tokens change in `src/tokens/tokens.ts` only** — never in emitted CSS.
  Preserve `--discern-font-size-xs` as the authored interface-text floor and
  keep the UI font role paired with its central OpenType feature set.
- **Every public name wears the `discern` namespace** (classes, custom
  properties, data attributes, keyframes, layers) and every foundation rule
  stays scoped beneath `:where([data-discern-root])`. No unprefixed globals,
  ever.
- **The neutral core never imports React.** React enters only through the
  `./react` adapter (18.3+ peer contract, build-time rendering). The release
  tests fail a stray React import in the root, manifest, runtime, tokens, or
  theme graphs.
- **Themes move tokens, never component CSS.** Light/dark and consumer branding
  override public custom properties; a theme that forks a component stylesheet
  is a defect. Keep semantic roles distinct — success must never collapse into
  accent, and the inverse roles stay dark-on-light in both site themes.
- **Keep examples generic.** Product claims, customer names, routes, commands,
  and bespoke artwork belong to the consumer and enter through props or slots.
- **Ship visible changes with a preview.** For every component or Catalogue
  change, leave the Catalogue dev server running on the worktree's deterministic
  port (`discern identity --port`) and include the exact localhost URL in the
  handoff, so review never requires reconstructing the development command.
- **The published contract is guarded.** JSR versions are immutable; releases
  follow SemVer and every contract change lands in `CHANGELOG.md`. Every
  exported symbol carries documentation and the publish set is allowlisted in
  `deno.json` — release tests enforce both.
- **TypeScript is strict and stays strict.** `deno.json` sets
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, and friends; write code that passes without loosening
  a flag. Use type-only imports where a value is not needed.
- **`deno fmt` owns style, including markdown.** The compiled agent files
  (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are fmt-excluded because discern
  regenerates them from this source — edit here, then `discern refresh`.

The seven binding rules behind these conventions live in
[map/00-orientation/design-principles.md](../map/00-orientation/design-principles.md)
— read them before changing anything structural, and override one only through
an ADR.
