---
name: add-a-component
description: Add a new component to the design system — scaffold the fixed five-file anatomy, let codegen auto-enrol every surface, and ship it with conformance coverage, a changelog entry, and a Catalogue preview URL. Use when adding any component, block, or element to the catalogue, or when porting a site-local pattern into the package.
metadata:
  author: "discern-design-system"
  version: "1.2"
---

# Add a component

Every component is one folder plus codegen — no manual registration anywhere. The metadata and imports in the folder generate the runtime registry, React export surface, catalogue entry, and dependency graph. If you find yourself editing `src/generated/` or `catalogue/generated/`, stop: that surface is derived.

## 1. Place it

- Pick the group: one of `Core`, `Layout`, `Display`, `Forms`, `Feedback`, `Navigation`, `People`, `Agents`, `Workflow`, `Docs`, `Marketing`, `Editorial` (`src/types/component-meta.ts` is the canonical list). The folder lives at `src/components/<group>/<slug>/`.
- Pick `order` by reading the sibling `*.meta.ts` files in the group — it sets catalogue display order. Leave gaps (10, 20, 30…) so later insertions don't renumber the group.

## 2. Scaffold the fixed anatomy

Five files, always the same shape (crib a small sibling like `src/components/display/kicker/`):

| File                  | Owns                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `<slug>.css`          | All component CSS. Every class is `discern-<slug>`-prefixed BEM (`discern-x__part`, `discern-x--variant`); no globals.                   |
| `<slug>.tsx`          | The React adapter: `forwardRef`, typed props, `classNames` helper, type-only imports, JSDoc on every export.                             |
| `<slug>.meta.ts`      | Default `ComponentMeta` plus the named, framework-neutral `componentExampleVocabulary` — one ordered id/label authority for Web and CLI. |
| `<slug>.examples.tsx` | One bounded `catalogueExamples` renderer per Web-capable canonical entry, plus a default showcase when useful; all copy stays generic.   |
| `mod.ts`              | `export * from "./<slug>.tsx";`                                                                                                          |

Rules that bite:

- **Decide the CLI stance at birth.** Metadata always declares `cli: { stance: "rendered" }` or `cli: { stance: "exempt", reason: "…" }`. Rendered Components add `<slug>.cli.ts` with a pure default renderer, `<Pascal>CliProps`, and deterministic `cliExamples`; exemptions state the concrete terminal mismatch. Codegen rejects an absent stance, a missing or orphan renderer, and an empty exemption reason.
- **Define example identity once.** Export `componentExampleVocabulary = [...] as const` beside the default Metadata, then call `defineComponentExampleVocabulary(meta, componentExampleVocabulary)` to validate that literal authority. Keep the export as a literal rather than exporting the helper call: JSR can preserve and publish the exact inferred vocabulary type without a hand-written duplicate. Stable kebab-case ids describe meaning rather than transport; labels are the human names on both surfaces; `default`, when present, is first. Shared applicability is the omission-friendly default. Mark an entry `only: "web"` or `only: "cli"` only when the other medium literally cannot represent the fact, and state that specific incompatibility in `reason`. A CLI-exempt Component marks every entry Web-only and inherits the Metadata exemption instead of repeating it.
- **Bind every applicable implementation.** Export `catalogueExamples = defineCatalogueExamples(meta, componentExampleVocabulary, [...])` from the React examples module. In a rendered CLI module, keep the literal list as private `cliExampleImplementations`, bind that exact tuple with `defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations)`, then export `cliExamples: readonly CliExample<ComponentCliProps>[] = cliExampleImplementations`. The private tuple proves canonical ids while the explicit public type prevents nested fixture shapes from becoming published API. Each list references every applicable canonical id exactly once and in order. Props and pixels may differ, but one id must preserve one semantic posture. A browser `ConformanceScenario` names the canonical Web `example` whose bounded canvas owns its targets; the Catalogue build rejects an omitted or unknown id. Keep exhaustive renderer-quality fixtures outside the human Catalogue list when they do not teach a distinct example.
- **Let Web imagery auto-enrol.** Every canonical Web implementation automatically receives Light and Dark exact-bounds images from the same renderer. Its ordinary posture renders exactly one top-level DOM root, which needs no image configuration. Only a portal or genuinely multi-root posture adds a `capture` descriptor to that implementation: optional bounded `click` or `focus` preparation plus selectors whose visible rectangles form the one capture region. Never add, edit, order, or select generated image files by hand.
- **Keep the shared sheet operable.** Every Web example starts quiescent because the Catalogue and browser guard render the complete population together. A modal or other focus-owning example exposes its trigger; it never auto-opens and makes unrelated examples inert.
- **Style with tokens, not raw values.** Colors, space, radii, and type come from the public `--discern-*` custom properties; themes must move the component without touching its CSS. Keep interface text at or above `--discern-font-size-xs`.
- **Depend by importing.** If the component uses another component, import its `.tsx` directly — codegen derives the dependency graph from imports, so the runtime emitter pulls the dependency's CSS automatically.
- **No client JS.** The adapter renders static HTML at build time. Interactive behaviour must come from the platform (native `<dialog>`, `<details>`, CSS) or stay a consumer concern.

## 3. Generate and verify

1. `deno task codegen` — validates the complete Web/CLI example parity contract, then regenerates the committed registries, React and CLI surfaces, review-tool example facts, and base styles. The build regenerates the ignored Catalogue registry from the same authored sources; never edit either generated surface directly.
2. `deno task catalogue:images --update` — renders the complete canonical Web population through the pinned local browser and replaces its typed manifest and generated PNGs. The normal gate runs `deno task catalogue:images --verify`; run that task directly to diagnose a named capture, crop, font, animation, console, stale, or orphan failure.
3. `discern prepare` while iterating; `discern done` before calling it done. The Catalogue build type-checks every bounded example, and every Web-capable entry auto-enrols in light and dark accessibility scans and generated imagery. Add `export const conformance = [...]` scenarios (see `catalogue/conformance.ts`) when the component has keyboard or focus behaviour worth pinning.
4. Watch the css standards in the gate output: `css_density` holds emitted bytes per component stylesheet, so a heavy component raises the rate it is judged by, and `docs_selection` budgets the documentation selection. A heavy component is a design smell before it is a budget problem.

## 4. Ship it

- A new public component is a contract change: record it in `CHANGELOG.md` under the upcoming version.
- Leave the Catalogue running on the worktree's deterministic port and include the exact URL in your handoff: `deno task serve` then `http://127.0.0.1:<discern identity --port>/`.
- Update `map/20-components/` if the change alters what the map describes.

## Recovery

- If codegen reports example drift, start with the named Component and fix its authored vocabulary or bound implementation; never patch a generated registry. Missing and reordered entries usually mean one applicable binder is incomplete, while a surface-only error means the vocabulary needs either a truthful implementation on both surfaces or a concrete medium incompatibility.
- If image capture reports multiple roots, clipping, or missing visible portal content, keep the ordinary root rule when the evidence is one tree; otherwise declare the smallest truthful capture selectors beside that exact Web implementation. Fix the renderer or descriptor and rerun `deno task catalogue:images --update`—never crop or replace a generated image manually.
- If an exact renderer test needs more frames than the human Catalogue should teach, keep those frames in an explicit test-fixture authority and leave them out of `componentExampleVocabulary`.
- If an example cannot be expressed honestly on one surface, name the missing browser or terminal primitive in its reason. Different prop shapes, historical fixtures, or implementation effort are not recovery reasons.
