# Select a Runtime per route

Emit one Runtime for each route family that uses the same Components. A site-wide selection makes every page pay for the broadest page. Route-level selection keeps the cost attached to the route that needs it, and the Manifest shows what the Emitter resolved.

## Choose Groups and Components

Use a Group when a route uses most of that grammar. Add individual Components when the route needs a precise extra. Dependencies remain the Emitter's job.

This example gives long-form guides their documentation chrome and gives a compositions route the broader visual vocabulary it uses:

```ts
import { emitDesignSystemRuntime } from "@discern-sh/design-system/runtime";

const routes = {
  guides: {
    output: "./public/design-system/guides/",
    groups: ["Docs"],
    components: ["brand", "heading", "table-of-contents"],
    assets: ["fonts"],
  },
  compositions: {
    output: "./public/design-system/compositions/",
    groups: ["Marketing", "Editorial"],
    components: ["button", "brand", "cluster"],
    assets: ["fonts", "grain"],
  },
} as const;

for (const route of Object.values(routes)) {
  await emitDesignSystemRuntime({
    outputRoot: new URL(route.output, import.meta.url),
    groups: route.groups,
    components: route.components,
    assets: route.assets,
  });
}
```

Keep each `outputRoot` dedicated to its Runtime. Emission replaces that directory.

## Read the resolved cost

The requested list is an instruction. `manifest.selection.resolvedComponents` is the result after dependency resolution. Read these Manifest fields after every emission:

| Question                                    | Manifest authority                                                 |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Which Components did the route request?     | `selection.requestedComponents` and `selection.requestedGroups`    |
| Which dependencies joined them?             | `selection.resolvedComponents` and each Component's `dependencies` |
| Did the Selection acquire browser behavior? | each Component's `behaviors` and `outputs.scripts`                 |
| Which optional assets were copied?          | `selection.assets` and `outputs.assets`                            |
| What does each emitted file cost?           | `integrity.files[].bytes`                                          |

Optional assets never enter through Component dependencies. Select `fonts` or `grain` on the route that uses it.

## Governed reference profiles

The standards in `discern.toml` hold these unminified emitted costs at their measured ceilings:

| Profile          | Selection and included files                                                                                     |       Ceiling |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------: |
| Minimal docs CSS | Docs header, Docs nav, Anchor heading, Prose, Code listing, and Pager; `discern.css` after dependency resolution |  25,804 bytes |
| Workflow CSS     | `groups: ["Workflow"]`; resolved `discern.css`                                                                   |  67,377 bytes |
| Marketing CSS    | `groups: ["Marketing"]`; resolved `discern.css`                                                                  |  66,287 bytes |
| Browser behavior | every declared behavior-bearing Component; `discern.js`                                                          |   6,844 bytes |
| Fonts            | `fonts.css` and 4 WOFF2 files                                                                                    | 183,726 bytes |
| Grain            | `grain.css` and `textures/grain.png`                                                                             |  99,442 bytes |

The font measure excludes the 3 emitted OFL texts because a browser doesn't request them as font resources. They remain in the Manifest with byte sizes and integrity hashes.

Grain earns its 99,442 bytes on a large hero, image treatment, or composition where texture carries part of the visual hierarchy. Documentation and interface routes use the gradient-only `.discern-grain-wash` without selecting the PNG.

## Why repeated declarations remain component-owned

The CSS audit found 126 declaration-block shapes repeated across 109 Component stylesheets, with 425 occurrences. Removing every repeated body would save at most 18,373 of 229,661 authored bytes, or 8.00%, before selector and cascade costs.

No extraction is applied. Moving those declarations into the always-emitted foundation would charge a Component selected alone for rules it doesn't use. Combining rules during emission would change cascade order unless a CSS-aware transform proved equivalence. A future remedy must operate only on the resolved Selection, preserve rule order and theme bytes, reduce the representative profiles above, and pass lone-Component byte comparisons. That is an Emitter architecture decision and needs an ADR.
