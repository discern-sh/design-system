# Glossary

Every discern-design-system-specific term, defined precisely. This is the canonical dictionary: the names defined here are used verbatim across the whole documentation tree, and synonyms are not introduced. The few nouns the whole system is built on come first, because they show up everywhere else.

For a narrative tour of how these terms relate, read [concepts.md](concepts.md). For the architectural shape, see [system-map.md](system-map.md).

---

## Core nouns

### Token

A named public CSS custom property in the `discern` namespace — the unit all styling resolves through. Tokens come in three layers, all declared in [`tokens.ts`](../../src/tokens/tokens.ts): primitive values, semantic roles (canvas, ink, accent, success, warning, danger, and the non-inverting inverse roles), and the Preset's branded values. Consumers re-brand by overriding public Tokens, never by editing emitted CSS.

### Component

One self-contained folder under [`src/components/<group>/<slug>/`](../../src/components/) owning its implementation (`<slug>.tsx`), stylesheet (`<slug>.css`), Metadata (`<slug>.meta.ts`), examples (`<slug>.examples.tsx`), and `mod.ts`. There are 80, and every surface that lists them is generated from their Metadata.

### Selection

What a consumer asks the Emitter for: explicit component IDs, canonical Groups, or the whole catalogue (`all`), plus independently chosen Optional Assets. The Emitter resolves a Selection through the Registry (pulling in dependencies, excluding everything else) before emitting.

### Runtime

The emitted output set a Selection produces: `discern.css`, the Manifest, and only the requested Optional Assets, written to a dedicated output directory that each emission replaces. Identical Selections yield byte-identical Runtimes.

---

## Components & metadata

### Group

One of the ten canonical component families — Core, Display, Docs, Editorial, Feedback, Forms, Layout, Marketing, Navigation, People — mirrored by the folder layout under `src/components/`. A Group is a valid unit of Selection.

### Metadata

A Component's `*.meta.ts` file: name, slug, Group, catalogue order, description, and accessibility notes, typed by [`component-meta.ts`](../../src/types/component-meta.ts). Metadata is the single source Codegen reads; adding a Component folder with Metadata enrols it in every generated surface with no manual registration.

### Owned Classes

The `discern-*` class names a Component's stylesheet claims, recorded per Component in the Manifest. Consumer styles may add their own composition classes but must never target another party's Owned Classes.

---

## Generation

### Codegen

The `deno task codegen` run of [`generate.ts`](../../scripts/generate.ts), which derives every generated surface from Metadata and package assets. Generated files are committed, never hand-edited; CI and the quality gate both fail a stale generation.

### Registry

The generated component catalogue in [`src/generated/component-registry.ts`](../../src/generated/component-registry.ts): IDs, Groups, dependency edges, and Owned Classes. The Emitter resolves every Selection through it.

---

## Emission

### Emitter

`emitDesignSystemRuntime()` in [`runtime.ts`](../../src/runtime.ts) — the deterministic writer that turns a Selection into a Runtime. It writes through `node:fs/promises`, so Deno and Node produce identical bytes.

### Manifest

The `manifest.json` a Runtime carries: schema version, requested and resolved Selection, Groups, dependencies, Owned Classes, public Token names, output paths, media types, byte sizes, and SHA-256 integrity. Consumers read asset paths and ownership facts from the Manifest rather than inferring them. (The framework-neutral schema is exported from [`manifest.ts`](../../src/manifest.ts).)

### Optional Asset

An independently selectable asset pack: `fonts` (four WOFF2 files, `fonts.css`, and the SIL OFL licence texts) or `grain` (`grain.css` and its PNG texture). No Optional Asset is emitted unrequested, and selecting one never copies the other.

---

## Consumption

### Root

The consumer-marked boundary element carrying `data-discern-root`. All generated foundations apply only beneath it (via `:where()`, at zero specificity); outside the Root the package styles nothing.

### Theme

The light/dark role assignment chosen per Root with `data-discern-theme`. Themes move Tokens only — component CSS is byte-identical across Themes.

### Preset

A branded Token layer. The default blue Preset lives in [`theme/discern.ts`](../../src/theme/discern.ts) and is applied unless a consumer requests `theme: "none"`; a consumer Preset overrides public Tokens in its own cascade layer.

### Adapter

The optional React surface at [`react.ts`](../../src/react.ts) (`./react`): components rendering the same public class contract to static HTML, with React 18.3+ as a peer dependency. Build-time only — no bundle, hydration, or implicit browser behaviour ships to consumers.

---

## Development

### Catalogue

The local component browser under [`styleguide/`](../../styleguide/), built by [`build.ts`](../../scripts/build.ts) and served by `deno task serve`. It renders every Component's examples from the generated example registry.

---

## Cross-references

- For how these concepts fit together: [concepts.md](concepts.md)
- For the visual map: [system-map.md](system-map.md)
- For the principles that shaped them: [design-principles.md](design-principles.md)
