---
name: add-a-component
description: Add a new component to the design system — scaffold the fixed five-file anatomy, let codegen auto-enrol every surface, and ship it with conformance coverage, a changelog entry, and a Catalogue preview URL. Use when adding any component, block, or element to the catalogue, or when porting a site-local pattern into the package.
metadata:
  author: "discern-design-system"
  version: "1.0"
---

# Add a component

Every component is one folder plus codegen — no manual registration anywhere.
The metadata and imports in the folder generate the runtime registry, React
export surface, catalogue entry, and dependency graph. If you find yourself
editing `src/generated/` or `styleguide/generated/`, stop: that surface is
derived.

## 1. Place it

- Pick the group: one of `Core`, `Layout`, `Display`, `Forms`, `Feedback`,
  `Navigation`, `Marketing`, `Editorial` (`src/types/component-meta.ts` is the
  canonical list). The folder lives at `src/components/<group>/<slug>/`.
- Pick `order` by reading the sibling `*.meta.ts` files in the group — it sets
  catalogue display order. Leave gaps (10, 20, 30…) so later insertions don't
  renumber the group.

## 2. Scaffold the fixed anatomy

Five files, always the same shape (crib a small sibling like
`src/components/display/kicker/`):

| File                  | Owns                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `<slug>.css`          | All component CSS. Every class is `discern-<slug>`-prefixed BEM (`discern-x__part`, `discern-x--variant`); no globals. |
| `<slug>.tsx`          | The React adapter: `forwardRef`, typed props, `classNames` helper, type-only imports, JSDoc on every export.           |
| `<slug>.meta.ts`      | `export default {...} satisfies ComponentMeta` — name, slug, group, order, description, accessibility notes.           |
| `<slug>.examples.tsx` | Default-export component rendering representative states with **generic copy** (no product claims, no customer names). |
| `mod.ts`              | `export * from "./<slug>.tsx";`                                                                                        |

Rules that bite:

- **Style with tokens, not raw values.** Colors, space, radii, and type come
  from the public `--discern-*` custom properties; themes must move the
  component without touching its CSS. Keep interface text at or above
  `--discern-font-size-xs`.
- **Depend by importing.** If the component uses another component, import its
  `.tsx` directly — codegen derives the dependency graph from imports, so the
  runtime emitter pulls the dependency's CSS automatically.
- **No client JS.** The adapter renders static HTML at build time. Interactive
  behaviour must come from the platform (native `<dialog>`, `<details>`, CSS) or
  stay a consumer concern.

## 3. Generate and verify

1. `deno task codegen` — regenerates the registry, React surface, base styles,
   and catalogue registry. The new component now exists on every surface.
2. `discern prepare` while iterating; `discern done` before calling it done. The
   Catalogue build type-checks your examples, and every example auto-enrols in
   the light and dark accessibility scans. Add
   `export const conformance = [...]` scenarios (see
   `styleguide/conformance.ts`) when the component has keyboard or focus
   behaviour worth pinning.
3. Watch the `css_size` standard in the gate output — a new component grows
   `dist/discern.css`, and the ceiling is deliberate. A heavy component is a
   design smell before it is a budget problem.

## 4. Ship it

- A new public component is a contract change: record it in `CHANGELOG.md` under
  the upcoming version.
- Leave the Catalogue running on the worktree's deterministic port and include
  the exact URL in your handoff: `deno task serve` then
  `http://127.0.0.1:<discern identity --port>/`.
- Update `map/20-components/` if the change alters what the map describes.
