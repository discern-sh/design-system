# Discern design system

The design system behind [discern.sh](https://discern.sh): an opinionated, framework-neutral visual system for Deno sites. It ships semantic tokens, light/dark themes, scoped component CSS under one `discern` namespace, an optional React adapter for static rendering, and a deterministic runtime emitter that outputs only what a consumer selects.

```sh
deno add jsr:@discern-sh/design-system
```

## Public imports

| Import                                    | Contract                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@discern-sh/design-system`               | Token metadata, component/group metadata types, the package manifest, and `semanticClass` |
| `@discern-sh/design-system/manifest`      | Framework-neutral manifest schema and the complete package ownership manifest             |
| `@discern-sh/design-system/runtime`       | Deterministic selected-runtime emitter                                                    |
| `@discern-sh/design-system/tokens`        | Primitive, semantic, and Discern-preset token metadata                                    |
| `@discern-sh/design-system/theme/discern` | Default branded blue preset                                                               |
| `@discern-sh/design-system/react`         | Optional React components and their public prop types                                     |

Only `./react` resolves React. The package keeps React and React DOM as catalogue development dependencies and peer dependencies, while its root, manifest, runtime, token, and theme graphs do not import them.

## Root, theme, and semantic HTML

Generated foundations apply only inside an opted-in boundary. Put `data-discern-root` on that boundary and choose light or dark roles with `data-discern-theme`:

```html
<main data-discern-root data-discern-theme="light">
  <button class="discern-button discern-button--primary discern-button--md">
    <span class="discern-button__label">Continue</span>
  </button>
</main>
```

Load the emitted `discern.css` before consumer composition styles. Semantic HTML never requires React; most Components remain CSS-only, while Components that declare browser behavior name their emitted script in the Manifest. Public classes, custom properties, data attributes, layers, and keyframes use the `discern` namespace. Consumer styles may add their own composition class, but must not target a Component's `ownedClasses` from `manifest.json`.

Core typography uses documented system fallbacks. Selecting the optional font pack changes the public font-role tokens without changing component CSS.

## Emit a selected runtime

The emitter accepts explicit component IDs, canonical groups, or the explicit `all` catalogue selection. It resolves dependencies from generated component metadata and writes stable output order to a dedicated directory:

```ts
import { emitDesignSystemRuntime } from "@discern-sh/design-system/runtime";

const result = await emitDesignSystemRuntime({
  outputRoot: new URL("./public/design-system/", import.meta.url),
  groups: ["Editorial"],
  components: ["button", "icon"],
  assets: ["fonts"],
});

console.log(result.manifest.selection.resolvedComponents);
```

`outputRoot` must end in `/` and must be dedicated to the runtime because each emission replaces it. Every selection writes:

- `discern.css`, containing tokens, the selected theme, root-scoped foundations, utilities, and dependency-ordered component CSS;
- `manifest.json`, containing schema version, requested and resolved selections, canonical groups, component dependencies and browser behaviors, owned classes, public token names, output paths, media types, byte sizes, and SHA-256 integrity;
- `discern.js` when a resolved component declares browser behavior; and
- only the optional assets requested by the consumer.

Use `{ all: true }` for the complete catalogue. Repeated emissions with the same inputs are byte-for-byte identical. Emitted files are build inputs for your own static output; browsers should never hotlink the registry or another third-party host.

The emitter writes through `node:fs/promises`, so it runs on Deno and Node.js with identical output. Under Deno, grant it read and write permission for the output directory.

### Selection-scoped browser behavior

Most components remain static HTML and CSS. When a Selection resolves a component with browser behavior, the Emitter adds its stable script path to `manifest.outputs.scripts`. Load each path once as a deferred module:

```html
<script type="module" src="/assets/design-system/discern.js"></script>
```

`HoverCard` and `Tooltip` use this shared behavior to promote their panels into the browser's top layer, position them against their trigger, keep them inside the viewport, and preserve hover, focus, outside-press, nested-scroll, resize, and Escape behavior. The enhancer observes later DOM additions, so client-rendered instances use the same contract. Without the script or the Popover API, their static CSS fallback remains keyboard and pointer reachable, but an ancestor that clips overflow can still clip the panel.

## Optional assets

No asset is copied by default. Asset selections are independent:

- `fonts` emits `fonts.css`, four stable WOFF2 filenames, and all three SIL Open Font Licence texts;
- `grain` emits `grain.css` and `textures/grain.png`;
- selecting either one never copies the other.

Component CSS has no hidden texture dependency. The core `.discern-grain-wash` utility remains useful as a gradient without the optional texture; `grain.css` adds the texture only when a consumer chooses it. Consumers should read emitted asset paths from the manifest rather than infer a cache or registry location.

## Custom themes

Semantic component roles are separate from the default blue preset. The runtime uses that preset unless `theme: "none"` is requested. A consumer can override public tokens in its own layer without forking a component stylesheet:

```css
@layer discern.consumer {
  :where([data-discern-root]) {
    --discern-accent-hue: 145;
    --discern-color-success: oklch(58% 0.16 190);
    --discern-color-success-soft: oklch(95% 0.045 190);
    --discern-color-success-deep: oklch(34% 0.1 190);
  }

  :where([data-discern-root][data-discern-theme="dark"]) {
    --discern-color-success: oklch(74% 0.13 190);
    --discern-color-success-soft: oklch(30% 0.055 190);
    --discern-color-success-deep: oklch(90% 0.08 190);
  }
}
```

The distinct success hue is deliberate: a green accent must not erase the difference between brand actions and successful outcomes. Automated package tests cover light/dark text contrast, accent/success/warning/danger separation, reduced-motion rules, forced-colour focus outlines, and unchanged component CSS. Manual browser review still checks visible focus shape and status recognition in the consumer's actual type, layout, zoom, and operating-system colour settings.

Inverse surface and ink roles remain dark-on-light in purpose across both site themes; they do not invert with the ordinary canvas and ink roles.

## Optional React adapter

React consumers import only the explicit adapter and can render the same class contract to static HTML:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@discern-sh/design-system/react";

const html = renderToStaticMarkup(
  <Button variant="secondary">Continue</Button>,
);
```

Discern uses this adapter at build time only: no React bundle or hydration reaches the browser. Static components need no browser runtime; components whose Metadata declares browser behavior use the selection-scoped `discern.js` emitted beside their CSS. Stateful catalogue examples beyond that published behavior still require a consumer-owned browser strategy outside the catalogue.

## Output sizes

Unminified reference points for selection behaviour:

- the complete catalogue with fonts and grain emits roughly 142 KB of CSS and 293 KB of optional assets;
- the documentation selection (`groups: ["Docs"]`) emits roughly 22 KB of CSS;
- a core selection with no optional assets emits zero asset bytes.

## Developing

```sh
deno install
deno task verify
```

`deno task verify` runs formatting, lint, type-checks, the catalogue build, and the unit and real-browser conformance tests. `deno task serve` builds and serves the local component catalogue. Run `deno task codegen` after changing component metadata, component CSS, component imports, or package assets; do not edit `src/generated/` or `styleguide/generated/` by hand.

`deno task test` creates a temporary external Deno project. Its neutral fixture declares no React dependency, imports only documented package exports, emits a runtime, and is exercised again with `deno run --cached-only`. A second fixture adds the React peer contract and renders static HTML through `./react`. Neither fixture reaches into `dist/`, relies on a global Deno-cache path, uses `--unstable-raw-imports`, or fetches an asset at runtime.

`deno task conformance` builds the Catalogue and opens it in headless Chrome. Every generated example auto-enrols in light and dark WCAG scans; examples may export typed keyboard/focus scenarios beside their fixture. Reduced-motion, forced-colour focus visibility, and narrow/wide rendering are exercised too. Five review sheets are written under `dist/conformance/`. The task uses an installed Google Chrome by default; set `DISCERN_CHROME_PATH` when Chrome lives at a non-standard path.

### Authoring rules

- Change token values in `src/tokens/tokens.ts`; do not edit emitted CSS.
- Every component folder owns its implementation, CSS, metadata, examples, and `mod.ts`. Metadata and group order generate the runtime registry, React export surface, catalogue registry, and dependency graph.
- Keep examples generic. Product claims, customer names, routes, commands, and bespoke artwork belong to the consumer and enter components through props or slots.
- Preserve `--discern-font-size-xs` as the authored interface-text floor and pair the UI font role with its central OpenType feature set.

## Versioning

Releases follow SemVer and JSR versions are immutable. Before 1.0, minor versions may still change the public contract; the changelog records every breaking change.

## License

Apache-2.0 for the code. The bundled fonts remain under their own SIL Open Font Licence terms in `assets/licenses/`, and those licence texts accompany every emitted font selection.
