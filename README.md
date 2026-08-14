# Discern design system

The design system behind [discern.sh](https://discern.sh): an opinionated, framework-neutral visual system for Deno sites and terminals. It ships semantic tokens, light/dark themes, scoped component CSS under one `discern` namespace, pure terminal renderers, optional React and interactive-terminal adapters, and a deterministic runtime emitter that outputs only what a consumer selects.

```sh
deno add jsr:@discern-sh/design-system
```

## Public imports

| Import                                      | Contract                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@discern-sh/design-system`                 | Token metadata, component/group metadata types, the package manifest, and `semanticClass` |
| `@discern-sh/design-system/cli`             | Pure React-free terminal renderers, capabilities, themes, and triangle primitives         |
| `@discern-sh/design-system/cli/interactive` | Optional Deno terminal driver and typed prompt state machines                             |
| `@discern-sh/design-system/manifest`        | Framework-neutral manifest schema and the complete package ownership manifest             |
| `@discern-sh/design-system/runtime`         | Deterministic selected-runtime emitter                                                    |
| `@discern-sh/design-system/tokens`          | Primitive, semantic, and Discern-preset token metadata                                    |
| `@discern-sh/design-system/theme/discern`   | Default branded blue preset                                                               |
| `@discern-sh/design-system/react`           | Optional React components and their public prop types                                     |

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

Core typography uses documented system fallbacks. Selecting the optional font pack preserves Iowan Old Style as the display lead and adds bundled Crimson Pro behind it without changing component CSS. Metric-adjusted Georgia, Helvetica Neue, and Arial aliases reduce geometry movement while the downloadable fonts load.

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

Select a Runtime per route family instead of selecting once for a whole site. Use Groups for breadth, individual Components for precision, and `manifest.selection.resolvedComponents` to inspect the dependencies that joined the request. The [route-selection guide](map/40-runtime-emitter/route-selection.md) includes a two-route example and the governed reference profiles.

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

## Terminal rendering and prompts

The pure `./cli` entrypoint exports every rendered Component through the same Metadata-driven registry as the web surfaces. Callers provide truthful terminal facts, and a renderer returns one deterministic, width-bounded string:

```ts
import {
  detectTerminalCapabilities,
  renderBadgeCli,
} from "@discern-sh/design-system/cli";

const isTty = Deno.stdout.isTerminal();
const capabilities = detectTerminalCapabilities({
  env: Deno.env.toObject(),
  isTty,
  columns: isTty ? Deno.consoleSize().columns : undefined,
});

console.log(
  renderBadgeCli({ label: "Passed", tone: "success", dot: true }, capabilities),
);
```

The optional `./cli/interactive` adapter turns raw terminal input into typed prompt state and renders it through the package's Forms Component renderers. Running a prompt is the effects boundary; importing the module does not mutate the terminal:

```ts
import { promptSelect } from "@discern-sh/design-system/cli/interactive";

const environment = await promptSelect({
  label: "Environment",
  choices: [
    {
      kind: "group-heading",
      id: "recommended-environments",
      label: "Recommended",
    },
    { id: "preview", label: "Preview", value: "preview" },
    { id: "production", label: "Production", value: "production" },
  ],
});
```

The `group-heading` entry is semantic prompt structure: it has a stable ID and non-empty label, needs no sentinel value of the caller's generic type, and can never be highlighted, toggled, or returned. Disabled choices remain selectable entries with their own visible disabled state. Select and search `visibleCount` plus Textarea `rows` are requested upper bounds: the adapter reduces only the current visible window when terminal height is tight and expands it again after a resize. Search accepts `initialId` to restore an enabled provider result by stable ID without inventing a query or keypress.

Prompts require TTY stdin and stdout. The adapter brackets raw mode, supported cursor hiding, repainting, validation, cancellation, and cleanup; exceptions and EOF still restore the terminal. Before every live paint, the shared driver reads the current `TerminalIO` rows and fits the complete label, borders, control, grouped structure, hint, and lifecycle footer through the real Component renderer. A downward resize that makes the previous frame unreachable starts a new bounded live region; terminals without ANSI cursor control receive truthful static states, and a terminal below the minimum coherent frame refuses with full restoration. The public `InlineFramePainter.replace()` result remains available to product consumers choosing their own compact or static fallback; its row facts count a trailing newline as an additional occupied row. Renderers derive light and dark colour roles from the same Token metadata as the web system, then degrade through truecolour, ANSI 256, ANSI 16, and plain text. `NO_COLOR` disables ANSI styling without disabling Unicode; `C.UTF-8` and `C.utf8` keep Unicode even with `TERM=dumb`, while exact `C` and `POSIX` locales receive ASCII geometry. Grapheme-aware measurement keeps frames within the declared column count.

Fleet uses compact, width-bounded identity cells by default. Operational views can opt into complete, copyable persona and branch values; when either value cannot fit its cell, the renderer emits an explicit labelled continuation instead of relying on terminal wrapping:

```ts
import { renderFleetCli } from "@discern-sh/design-system/cli";

console.log(renderFleetCli({
  identityMode: "lossless",
  rows: [{
    persona: "Terminal contract audit",
    branch: "agent/terminal-contract-audit-with-complete-identities",
    status: "working",
  }],
}, capabilities));
```

Run `deno task catalogue:cli` to inspect every rendered Component, every recorded exemption, and the generated triangle motifs. Pass a Component slug or Group name to narrow the output, or `triangles` for the motif sheet alone.

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

`discern.toml` holds the current unminified ceilings: 25,804 bytes for the minimal docs CSS profile, 67,377 for the Workflow Group, 66,287 for the Marketing Group, 6,844 for behavior-bearing `discern.js`, 183,726 for browser-requested font files, and 99,442 for grain. The [route-selection guide](map/40-runtime-emitter/route-selection.md) defines every included Selection and file.

## Developing

```sh
deno install
deno task verify
```

`deno task verify` runs formatting, lint, type-checks, the catalogue build, and the unit and real-browser conformance tests. `deno task serve` builds and serves the local component catalogue. Run `deno task codegen` after changing component metadata, component CSS, component imports, or package assets; do not edit `src/generated/` or `styleguide/generated/` by hand.

`deno task test` creates a temporary external Deno project. Its neutral fixture declares no React dependency, imports only documented package exports, emits a runtime, and is exercised again with `deno run --cached-only`. A second fixture adds the React peer contract and renders static HTML through `./react`. Neither fixture reaches into `dist/`, relies on a global Deno-cache path, uses `--unstable-raw-imports`, or fetches an asset at runtime.

`deno task conformance` builds the Catalogue and opens it in headless Chrome. Every generated example auto-enrols in light and dark WCAG scans; examples may export typed keyboard/focus scenarios beside their fixture. Composition recipes marked as journeys also auto-enrol their declared stage order, heading and landmark integrity, keyboard path, exact command copy, and both-theme WCAG scans.

A mandatory resilience phase discovers rendered disclosures, interactive controls, pointer targets, wide regions, active motion, theme consumers, and semantic focus surfaces from the Catalogue itself. It checks disclosure state and keyboard operation, nested controls, 24-pixel targets with the inline-prose exception, page reflow at 390 CSS pixels and the 320-pixel equivalent of 400% zoom, reduced motion, return to system theme, and focus in ordinary and forced colours. Five review sheets are written under `dist/conformance/`. The task uses an installed Google Chrome by default; set `DISCERN_CHROME_PATH` when Chrome lives at a non-standard path.

### Terminal review surfaces

`deno task catalogue:cli` statically prints every rendered Component example, every recorded exemption, and the triangle motif sheet; `deno task playground:cli` is its live counterpart, driving the real interactive adapter in your terminal. The playground opens a hub of named journeys covering every high-level prompt, activity, and sequential-form API, static-catalogue browsing, and stress cases for width, height, resize, Unicode/ASCII repertoire, colour degradation, and repeated prompt cycles. `deno task playground:cli --list` prints every journey ID without a TTY, `tour` visits them all in recommended order, and a direct `<journey-id>` bypasses the hub menu entirely. Both surfaces derive their inventory from the generated registries, so neither can drift from Codegen, and each journey prints the current terminal facts (columns, rows, Unicode, colour depth, ANSI control) before it runs so observations are reproducible. These are development and review instruments for this repository, not published package APIs.

### Authoring rules

- Change token values in `src/tokens/tokens.ts`; do not edit emitted CSS.
- Every component folder owns its implementation, CSS, metadata, examples, and `mod.ts`. Metadata and group order generate the runtime registry, React export surface, catalogue registry, and dependency graph.
- Keep examples generic. Product claims, customer names, routes, commands, and bespoke artwork belong to the consumer and enter components through props or slots.
- Preserve `--discern-font-size-xs` as the authored interface-text floor and pair the UI font role with its central OpenType feature set.

## Versioning

Releases follow SemVer and JSR versions are immutable. Before 1.0, minor versions may still change the public contract; the changelog records every breaking change.

## License

Apache-2.0 for the code. The bundled fonts remain under their own SIL Open Font Licence terms in `assets/licenses/`, and those licence texts accompany every emitted font selection.
