# Discern design system

The design system behind [discern.sh](https://discern.sh): an opinionated, framework-neutral visual system for Deno sites and terminals. It ships semantic tokens, light/dark themes, scoped component CSS under one `discern` namespace, pure terminal renderers, optional React and interactive-terminal adapters, and a deterministic runtime emitter that outputs only what a consumer selects.

```sh
deno add jsr:@discern-sh/design-system
```

## Public imports

| Import                                              | Contract                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@discern-sh/design-system`                         | Token metadata, component/group metadata types, the package manifest, and `semanticClass` |
| `@discern-sh/design-system/cli`                     | Pure React-free terminal renderers, capabilities, themes, and semantic motif primitives   |
| `@discern-sh/design-system/cli/interactive`         | Optional Deno terminal driver and typed interaction state machines                        |
| `@discern-sh/design-system/cli/interactive/testing` | Deterministic fake terminal, semantic key/resize scripts, and frame assertions            |
| `@discern-sh/design-system/cli/projection`          | Package-output decoding, browser projection, and explicit layout inspection               |
| `@discern-sh/design-system/manifest`                | Framework-neutral manifest schema and the complete package ownership manifest             |
| `@discern-sh/design-system/runtime`                 | Deterministic selected-runtime emitter                                                    |
| `@discern-sh/design-system/tokens`                  | Primitive, semantic, and Discern-preset token metadata                                    |
| `@discern-sh/design-system/theme/discern`           | Default branded blue preset                                                               |
| `@discern-sh/design-system/react`                   | Optional React components and their public prop types                                     |

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

## Terminal rendering and interactions

The pure `./cli` entrypoint exports every rendered Component through the same Metadata-driven registry as the web surfaces. Callers provide truthful terminal facts, and a renderer returns one deterministic, width-bounded string:

```ts
import {
  createCliPresenter,
  detectTerminalCapabilities,
  renderBadgeCli,
} from "@discern-sh/design-system/cli";

const isTty = Deno.stdout.isTerminal();
const capabilities = detectTerminalCapabilities({
  env: Deno.env.toObject(),
  isTty,
  columns: isTty ? Deno.consoleSize().columns : undefined,
});

const presenter = createCliPresenter(capabilities, { theme: "light" });
const output = presenter.present(renderBadgeCli, {
  label: "Passed",
  tone: "success",
  dot: true,
});
console.log(output);
```

The presenter is the default route when one consumer renders more than one frame: it binds capabilities, theme, terminal motif, and an optional default width once. Component renderers plus motif pattern, progress, and beacon renderers use `present(renderer, props)`. The foundation call shapes that do not fit that signature are bound directly as `box()`, `motifSpinnerFrame()`, `motifSectionRule()`, and `motifWorkflowStepper()`. An explicit per-call theme, motif, or narrower width wins over the presenter; omission falls back to the bound presenter and then the package's discern motif. The raw `(props, capabilities)` renderer APIs remain available when a caller already threads those facts itself.

`renderMarkdownCli` accepts untrusted CommonMark/GFM source and returns one complete document through the package's real terminal Components. Pass capabilities explicitly; the renderer performs no detection, I/O, environment read, or clock read:

```ts
import {
  renderMarkdownCli,
  type TerminalCapabilities,
} from "@discern-sh/design-system/cli";

const capabilities = {
  ansiControl: false,
  colorDepth: "none",
  columns: 72,
  hyperlinks: false,
  unicode: true,
} satisfies TerminalCapabilities;

const source =
  "# Report\n\n- Evidence remains complete\n- [Targets stay visible](https://example.test/source)";

const output = renderMarkdownCli({
  source,
  theme: "dark",
  maxWidth: 72,
}, capabilities);

console.log(output);
```

The fixed dialect includes CommonMark, GFM tables/task lists/strikethrough/autolinks, GitHub alerts, and footnotes. Raw HTML is inert, comments are omitted, unsafe destinations remain visible but non-clickable, controls become visible notation, duplicate heading fragments are stable, and empty source returns the empty string.

The package supplies one discern-flavoured preset without making triangles part of the generic renderer contract. Define a complete product language with `defineTerminalMotif()`, or replace only selected semantic roles with `deriveTerminalMotif()`:

```ts
import {
  createCliPresenter,
  deriveTerminalMotif,
  DISCERN_TERMINAL_MOTIF,
} from "@discern-sh/design-system/cli";

const productMotif = deriveTerminalMotif(DISCERN_TERMINAL_MOTIF, {
  unicode: {
    spinner: ["◴", "◷", "◶", "◵"],
    pattern: ["▵", "▹", "▿", "◃"],
    marker: "◉",
    status: { complete: "▵", incomplete: "▿" },
  },
});

const productPresenter = createCliPresenter(capabilities, {
  theme: "light",
  motif: productMotif,
});

console.log(productPresenter.motifSpinnerFrame(1)); // ◷
```

Every definition includes Unicode and ASCII repertoires for spinner, repeated pattern, accent marker, and complete/incomplete status roles. Definitions are validated and frozen at construction. Each Unicode glyph must be one assigned, visible, non-combining scalar that occupies one cell under the package's pinned Unicode 17.0 narrow-A geometry: East Asian Width–Ambiguous scalars such as `◐` and `◑` occupy one cell, while Wide/Fullwidth scalars and RGI emoji occupy two and are rejected. Each ASCII fallback is one printable non-space character. This is the same width policy every CLI layout uses; it does not claim support for terminals configured to render Ambiguous scalars as two cells.

To review a complete static frame as a layout, use the pure projection entrypoint with an explicit terminal viewport:

```ts
import {
  inspectTerminalLayout,
  projectTerminalInspectorHtml,
} from "@discern-sh/design-system/cli/projection";

const inspection = inspectTerminalLayout(output, { columns: 80, rows: 24 });
const reviewHtml = projectTerminalInspectorHtml(output, {
  columns: 80,
  rows: 24,
  title: "Status command",
  showGrid: true,
});

console.log(inspection.rowsBelowFold, inspection.overflowRows);
```

The inspection reports visible-cell widths, overflow, content height, and the fold as geometry facts. Consecutive blank rows and repeated exact nonblank rows are advisory review cues, not failures: a Component may own either deliberately. The returned HTML is a self-contained fragment with the real projected styles, row and column rulers, the fold, and optional cell guides; it contains no script and does not emulate cursor-driven terminal sessions.

The optional `./cli/interactive` adapter turns raw terminal input into typed interaction state and renders it through the package's Forms Component renderers. Running an interaction is the effects boundary; importing the module does not mutate the terminal:

```ts
import { requestSelection } from "@discern-sh/design-system/cli/interactive";

const environment = await requestSelection({
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
}, { motif: productMotif });
```

The `group-heading` entry is semantic interaction structure: it has a stable ID and non-empty label, needs no sentinel value of the caller's generic type, and can never be highlighted, toggled, or returned. Every rendered heading has one empty framed row above it. Disabled choices remain selectable entries with their own visible disabled state. Scrolling Select, Radio, Checkbox, and search frames use all available terminal columns unless an explicit `width` narrows them; wrapped labels keep their marker-aligned hanging indent and styling as the highlight moves. Select and search `visibleCount` plus Textarea `rows` are requested upper bounds: the adapter reduces only the current visible window when terminal height is tight and expands it again after a resize. A quiet lower-border label such as `↑ 2 more · ↓ 7 more` states how many choices remain outside the window, with `^`, `v`, and `|` fallbacks in ASCII. Search accepts `initialId` to restore an enabled provider result by stable ID without inventing a query or keypress.

`requestMarkdownBrowser()` owns a complete keyboard viewport for caller-supplied Markdown, with optional SGR mouse input. The picker uses the full height until a document opens, then the picker and document receive adaptive, independently scrollable panes; constrained terminals show one focused pane at a time. Documents always pass through the package Markdown renderer, while actions and safe external links return as typed data after mouse tracking, raw mode, cursor visibility, resize observation, and the normal screen have been restored:

```ts
import {
  type MarkdownBrowserResumableState,
  requestMarkdownBrowser,
} from "@discern-sh/design-system/cli/interactive";

let resume: MarkdownBrowserResumableState | undefined;
const result = await requestMarkdownBrowser({
  label: "Documentation",
  entries: [
    { kind: "group-heading", id: "guides", label: "Guides" },
    {
      kind: "document",
      id: "start",
      label: "Getting started",
      path: "guides/getting-started.md",
      source:
        "# Getting started\n\n[Testing](../reference/testing.md#fake-terminal) · [Website](https://example.test/docs)",
    },
    {
      kind: "document",
      id: "testing",
      label: "Testing",
      path: "reference/testing.md",
      source: "# Testing\n\n## Fake terminal\n\nScript semantic events.",
    },
    {
      kind: "action",
      id: "online",
      label: "Read the docs online",
      value: { kind: "open", href: "https://example.test/docs" },
    },
    { kind: "exit", id: "quit", label: "Quit" },
  ],
  mouse: true,
  resolveLink({ destination }) {
    return destination === "../reference/testing.md#fake-terminal"
      ? { kind: "document", documentId: "testing", fragment: "fake-terminal" }
      : { kind: "unresolved", message: "Document is outside this corpus." };
  },
  ...(resume === undefined ? {} : { initialState: resume }),
}, { theme: "dark", motif: productMotif });

resume = result.state;
if (result.kind === "action") {
  // The terminal is restored here; the consumer may now perform its effect.
  console.log(result.value.href);
}
if (result.kind === "external-link") {
  // Opening the URL is still a consumer effect and starts only from here.
  console.log(result.destination);
}
```

Picker focus owns grapheme-aware typing, Up/Down, Ctrl+P/Ctrl+N, Page Up/Page Down, Home/End, and Enter. Document focus assigns the scrolling keys to Markdown; ordinary movement advances rendered rows monotonically, while semantic anchors are consumed only after resume or reflow and repeated anchors choose the occurrence nearest their proportional fallback. `]` and `[` traverse logical link occurrences, Enter follows the focused link, and Escape first returns to ordinary scrolling. Same-document fragments stay inside the reader. Relative and root-relative paths reach `resolveLink`, whose closed result admits a document/fragment, external destination, or bounded unresolved feedback; the package never loads a file or opens a URL. Tab and Shift+Tab change panes, while Escape or `q` closes an unfocused document. Escape in the full picker, Ctrl+C, EOF, and an optional `MarkdownBrowserRuntime.abortSignal` use `InteractionCancelled`. `MarkdownBrowserRefusalError` reports unsupported ANSI control or geometry too small for one coherent pane before the initial terminal mutation. Pure `createMarkdownBrowserState()`, `transitionMarkdownBrowser()`, and `renderMarkdownBrowser()` exports support deterministic state and frame tests without terminal effects.

Mouse tracking is additive and explicit: `mouse: true` requests DECSET 1000 button reports with DECSET 1006 extended coordinates only when the terminal is interactive, ANSI control is available, and `TerminalCapabilities.mouseTracking` has not refused it. Omission leaves the complete keyboard contract and writes no mouse controls. `TerminalInputReader.readEvent()` retains one-event compatibility, while `readEvents()` returns the semantic events decoded from one raw chunk so complete-frame consumers can preserve order and repaint once per burst; the browser gives Ctrl+C priority over queued wheel work. After observed mouse input, browser cleanup disables both tracking modes, drains reports queued before a bounded cursor-position fence while preserving surrounding input, then restores the cursor, normal screen, and raw mode. OSC 8 output and mouse input are independent — one never proves support for the other. While tracking is active, unmodified clicks and wheel events go to the application instead of ordinary terminal selection or native link gestures; many terminals use Shift as a temporary bypass, but that modifier is terminal-configurable, so callers needing native selection should leave mouse tracking off.

Full-width section headings use one restrained motif marker rather than a repeated field. The presenter's `motifSectionRule()` binds its theme, motif, and capabilities, defaults to the one-row strong embedded treatment, and also exposes explicit underline and sandwich variants:

```ts
const heading = presenter.motifSectionRule("Deploying workspace changes", {
  width: capabilities.columns,
  treatment: "underline", // "embedded" (default) | "underline" | "sandwich"
});
```

The renderer uppercases and truncates the label inside the requested width. Unicode uses heavy `━` and quiet `─` rules; ASCII uses `=` and `-` so the weight distinction survives without colour. Underline and sandwich intentionally occupy two and three rows, while the embedded default remains one row for fixed interaction geometry.

Interactions require TTY stdin and stdout. The adapter brackets raw mode, supported cursor hiding, repainting, validation, cancellation, and cleanup; exceptions and EOF still restore the terminal. Before every live paint, the shared driver reads the current `TerminalIO` rows and fits the complete label, borders, control, grouped structure, hint, and lifecycle footer through the real Component renderer. A downward resize that makes the previous frame unreachable starts a new bounded live region; terminals without ANSI cursor control receive truthful static states, and a terminal below the minimum coherent frame refuses with full restoration. The public `InlineFramePainter.replace()` result remains available to product consumers choosing their own compact or static fallback; its row facts count a trailing newline as an additional occupied row. Renderers derive light and dark colour roles from the same Token metadata as the web system, then degrade through truecolour, ANSI 256, ANSI 16, and plain text. `NO_COLOR` disables ANSI styling without disabling Unicode; `C.UTF-8` and `C.utf8` keep Unicode even with `TERM=dumb`, while exact `C` and `POSIX` locales receive ASCII geometry. Grapheme-aware measurement keeps frames within the declared column count.

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

Run `deno task catalogue:cli` in a real terminal to browse one generated CLI specimen at a time without filling scrollback. Search by Component name, slug, or Group; move between Components and examples with the arrow keys; and page through tall specimens. `deno task catalogue:cli --list` prints the compact generated inventory, an exact Component slug, Group, or foundation ID prints that deterministic selection, and `deno task catalogue:cli all` explicitly prints the exhaustive catalogue. The browser Catalogue renders those same foundation registries under Foundations: search for “spinner” to reach live, reduced-motion-safe default and consumer animations beside their complete static phase evidence.

## Optional React adapter

React consumers import only the explicit adapter and can render the same class contract to static HTML:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@discern-sh/design-system/react";

const html = renderToStaticMarkup(
  <Button variant="secondary">Continue</Button>,
);
```

The `Markdown` React Component accepts the same untrusted `source` plus an optional Prose `measure`, composes native document semantics without `dangerouslySetInnerHTML`, and renders no wrapper for empty source. Discern uses this adapter at build time only: no React bundle or hydration reaches the browser. Static components need no browser runtime; components whose Metadata declares browser behavior use the selection-scoped `discern.js` emitted beside their CSS. Stateful catalogue examples beyond that published behavior still require a consumer-owned browser strategy outside the catalogue.

## Output sizes

`discern.toml` holds the current unminified ceilings: 25,804 bytes for the minimal docs CSS profile, 67,377 for the Workflow Group, 66,287 for the Marketing Group, 6,844 for behavior-bearing `discern.js`, 183,726 for browser-requested font files, and 99,442 for grain. The [route-selection guide](map/40-runtime-emitter/route-selection.md) defines every included Selection and file.

## Developing

```sh
deno install
deno task verify
```

`deno task verify` runs formatting, lint, type-checks, the catalogue build, and the unit and real-browser conformance tests. `deno task serve` builds and serves the local component catalogue. Run `deno task codegen` after changing component metadata, component CSS, component imports, or package assets; do not edit `src/generated/` or `catalogue/generated/` by hand.

`deno task test` creates a temporary external Deno project. Its neutral fixture declares no React dependency, imports only documented package exports, emits a runtime, and is exercised again with `deno run --cached-only`. A second fixture adds the React peer contract and renders static HTML through `./react`. Neither fixture reaches into `dist/`, relies on a global Deno-cache path, uses `--unstable-raw-imports`, or fetches an asset at runtime.

`deno task conformance` builds the Catalogue and opens it in headless Chrome. Every generated example auto-enrols in light and dark WCAG scans; examples may export typed keyboard/focus scenarios beside their fixture. Composition recipes marked as journeys also auto-enrol their declared stage order, heading and landmark integrity, keyboard path, exact command copy, and both-theme WCAG scans.

A mandatory resilience phase discovers rendered disclosures, interactive controls, pointer targets, wide regions, active motion, theme consumers, and semantic focus surfaces from the Catalogue itself. It checks disclosure state and keyboard operation, nested controls, 24-pixel targets with the inline-prose exception, page reflow at 390 CSS pixels and the 320-pixel equivalent of 400% zoom, reduced motion, return to system theme, and focus in ordinary and forced colours. Five review sheets are written under `dist/conformance/`. The task uses an installed Google Chrome by default; set `DISCERN_CHROME_PATH` when Chrome lives at a non-standard path.

### Terminal review surfaces

`deno task catalogue:cli` opens an alternate-screen browser over every rendered Component example, recorded exemption, and terminal-foundation sheet; `--list`, an exact selector, and the explicit `all` dump remain finite or deterministic stdout modes. The browser Catalogue maps that same registry into searchable Foundation specimens. `deno task playground:cli` is the live terminal counterpart, driving the real interactive adapter. Its alternate-screen hub first divides the forty journeys into review sections and offers global search; the menu restores normal scrollback before a journey runs, remembers the previous destination, and pauses after completion with Repeat, Next, Back, and Quit actions. `deno task playground:cli --list` prints every journey ID without a TTY, `tour` visits them all in recommended order, and a direct `<journey-id>` bypasses the hub entirely. These surfaces derive their inventories from the generated Component registries or the shared terminal-foundation registry, so a new member auto-enrols in its applicable review paths; each journey prints the current terminal facts (columns, rows, Unicode, colour depth, ANSI control) before it runs so observations are reproducible. These are development and review instruments for this repository, not published package APIs.

### Authoring rules

- Change token values in `src/tokens/tokens.ts`; do not edit emitted CSS.
- Every component folder owns its implementation, CSS, metadata, examples, and `mod.ts`. Metadata and group order generate the runtime registry, React export surface, catalogue registry, and dependency graph.
- Keep examples generic. Product claims, customer names, routes, commands, and bespoke artwork belong to the consumer and enter components through props or slots.
- Preserve `--discern-font-size-xs` as the authored interface-text floor and pair the UI font role with its central OpenType feature set.

## Versioning

Releases follow SemVer and JSR versions are immutable. Before 1.0, minor versions may still change the public contract; the changelog records every breaking change.

## License

Apache-2.0 for the code. The bundled fonts remain under their own SIL Open Font Licence terms in `assets/licenses/`, and those licence texts accompany every emitted font selection.
