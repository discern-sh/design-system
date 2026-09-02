# Discern design system

The design system behind [discern.sh](https://discern.sh): an opinionated, framework-neutral visual system for Deno sites and terminals. It ships semantic tokens, light/dark themes, scoped component CSS under one `discern` namespace, pure terminal renderers, optional React and interactive-terminal adapters, and a deterministic runtime emitter that outputs only what a consumer selects.

```sh
deno add jsr:@discern-sh/design-system
```

## Public imports

| Import                                              | Contract                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@discern-sh/design-system`                         | Token metadata, component/group metadata types, the package manifest, and `semanticClass` |
| `@discern-sh/design-system/chart`                   | Typed chart specs, descriptions, kind Metadata, and portable standalone SVG               |
| `@discern-sh/design-system/cli`                     | Pure React-free terminal renderers, capabilities, themes, and semantic motif primitives   |
| `@discern-sh/design-system/cli/interactive`         | Optional Deno terminal driver and typed interaction state machines                        |
| `@discern-sh/design-system/cli/interactive/testing` | Deterministic fake terminal, semantic key/resize scripts, and frame assertions            |
| `@discern-sh/design-system/cli/projection`          | Package-output decoding, browser projection, and explicit layout inspection               |
| `@discern-sh/design-system/diagram`                 | Typed diagram specs, descriptions, kind Metadata, and portable standalone SVG             |
| `@discern-sh/design-system/manifest`                | Framework-neutral manifest schema and the complete package ownership manifest             |
| `@discern-sh/design-system/runtime`                 | Deterministic selected-runtime emitter                                                    |
| `@discern-sh/design-system/tokens`                  | Field/Accent evaluation, admission, scopes, and primitive/semantic pole metadata          |
| `@discern-sh/design-system/theme/blue`              | Generated hue-255 Accent compatibility preset                                             |
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

## Appearances and consumer themes

Semantic roles derive from the achromatic Field by default. Select `theme: "blue"` for the generated hue-255 Accent compatibility projection; omission and `theme: "none"` keep Field. Accent accepts every finite hue from `0` through `360` (`360` aliases `0`) and keeps success, warning, and danger in recognisable, numerically distinct semantic families even when the chosen hue coincides with one of them.

Select `appearanceScopes: true` when emitting a Runtime that needs local appearance composition. Then use the zero-specificity, Root-contained scope attribute with the inherited hue primitive:

```html
<main data-discern-root data-discern-appearance="field">
  <section
    data-discern-appearance="accent"
    style="--discern-accent-hue: 145"
  >
    <button class="discern-button">Continue</button>
    <aside data-discern-appearance="field">Achromatic details</aside>
  </section>
</main>
```

Field can nest inside Accent, Accent can nest inside Field, and a nested Accent can inherit or replace the surrounding hue. Darkness, Structure, Emphasis, and Density inherit unchanged unless the local scope explicitly sets an axis. Consumers may still override public roles in their own cascade layer without forking Component CSS. Automated package tests exhaust the hue circle and cover text contrast, focus, semantic distinction, owned surfaces, fixed series, nested scopes, reduced motion, forced-colour focus outlines, and unchanged Component CSS. Manual browser review still checks visible focus shape and status recognition in the consumer's actual type, layout, zoom, and operating-system colour settings.

Inverse surface and ink roles remain dark-on-light in purpose across both site themes; they do not invert with the ordinary canvas and ink roles.

## Semantic diagrams

One typed built-in spec feeds the neutral description and standalone SVG, the live-token React Component, Markdown resource promotion, and the terminal Component renderer. Choose by what the reader must do: `flow` traces steps and returns, `architecture` locates parts and boundaries, `cycle` revisits an ordered repetition, `sequence` follows participants and messages, and `timeline` compares calendar spans and gates. These are reference and documentation forms for relationships a reader must inspect again. Flow remains sufficient for restrained state-like decisions and returns; intuition-building physical schematics, spatial metaphors, animation, controls, and bespoke illustrations remain consumer work rather than escape hatches into a drawing language. Package Artwork remains semantically disposable decoration, not an informative Diagram substitute.

Write concise sentence-case labels, preserving the required spelling of code, acronyms, and proper nouns. Keep edge and message labels to the relationship they distinguish; move explanation into surrounding prose. Every kind publishes numerical complexity budgets. A `DiagramBudgetError` names the exceeded dimension and a stable decomposition action: shorten the named label, reduce a tier or participant set, shorten the calendar range, split a dense group, or pair an overview with a focused diagram. Split before a label becomes a paragraph, a diagram needs arbitrary nesting, or the complete relationship inventory can no longer remain legible. Do not squeeze, clip, or omit facts to force a render.

The neutral `./diagram` graph imports neither React nor terminal modules. `diagramKindMetadata` and the generated Markdown string `diagramKindAuthorGuide` expose every kind's purpose, avoidance guidance, numerical budgets, remedies, and CLI stance from the same Metadata that generates the public union and dispatch:

```ts
import {
  diagramAltText,
  diagramKindAuthorGuide,
  diagramKindMetadata,
  type FlowDiagramSpec,
  type MarkdownDiagramResource,
  renderDiagramMarkdownImage,
  renderDiagramSvg,
} from "@discern-sh/design-system/diagram";

export const supportedDiagramKinds = diagramKindMetadata.map((kind) =>
  kind.slug
);
export const diagramAuthoringReference = diagramKindAuthorGuide;

export const reviewFlow = {
  kind: "flow",
  title: "Review a submission",
  summary: "Review either accepts a submission or returns it for revision.",
  nodes: [
    { id: "submit", label: "Submit material", role: "start" },
    { id: "review", label: "Review evidence", role: "decision" },
    { id: "revise", label: "Revise material" },
    { id: "accept", label: "Accept material", role: "end" },
  ],
  edges: [
    { id: "ready", from: "submit", to: "review" },
    {
      id: "accepted",
      from: "review",
      to: "accept",
      label: "Evidence is sufficient",
    },
    {
      id: "changes",
      from: "review",
      to: "revise",
      label: "Changes requested",
      emphasis: "secondary",
    },
    {
      id: "again",
      from: "revise",
      to: "review",
      label: "Review again",
      emphasis: "return",
    },
  ],
} as const satisfies FlowDiagramSpec;

// A consumer-owned build step writes the returned bytes wherever its static
// asset pipeline expects them. The package renderer itself performs no I/O.
await Deno.writeTextFile(
  new URL("./public/assets/review-flow.svg", import.meta.url),
  renderDiagramSvg(reviewFlow, { theme: "adaptive" }),
);

export const reviewFlowSource = "assets/review-flow.svg";
export const reviewFlowResource = {
  source: reviewFlowSource,
  spec: reviewFlow,
} satisfies MarkdownDiagramResource;
export const reviewFlowMarkdown = renderDiagramMarkdownImage(
  reviewFlowResource,
);
```

Standalone SVG accepts `light`, `dark`, or `adaptive`. Choose an explicit theme when the publishing surface knows its background; choose `adaptive` only when the destination should follow `prefers-color-scheme`. Each asset contains literal package palette values, intrinsic `width`/`height` plus a `viewBox`, its own accessible title and structural description, semantic text, and a deterministic light fallback when adaptive media behavior is unavailable. It contains no font payload or external reference. An external SVG loaded through `<img>` does not inherit custom properties or fonts from its host page, so the layout uses conservative package-owned metrics that remain safe under the tested system fallback. Ordinary responsive image CSS can constrain it with `max-width: 100%; height: auto` without changing its intrinsic geometry.

The Markdown remains ordinary image syntax: `renderDiagramMarkdownImage` safely escapes the canonical alt, title, and source into CommonMark, so delimiter-bearing author text cannot change the image structure. `diagramAltText(spec)` is the canonical short alternative formed from the required title and summary; keep those facts concise and do not duplicate them as visible canvas prose. Generic readers show the generated SVG and raw text keeps that meaningful alternative. Package Markdown callers may optionally register the explicit resource on `Markdown`, `renderMarkdownCli`, or a `MarkdownBrowserDocument` to upgrade only an isolated matching image. Matching happens after the existing safe URL normalization, the alt must equal `diagramAltText(spec)`, and an optional image title must equal `spec.summary`. Valid unused resources are allowed so one collection can serve a complete corpus; duplicate normalized sources reject, including a source also admitted by the chart collection — image promotion is one shared mechanism serving both families. The package never reads the asset, resolves the path against a filesystem or browser location, parses SVG, or discovers a registry.

The React projection maps the same validated scene directly to SVG and takes its live colours from emitted semantic Tokens. Its inline-size-contained, focusable viewport preserves the scene's intrinsic geometry and becomes horizontally scrollable when a narrow container cannot contain it, including when Diagram sits inside an intrinsically sized grid or flex item; it never scales text down or widens an ancestor to conceal an over-wide diagram. Compose it as the visual inside `DataFigure`; the figure owns the visible title, caption, source, and any legend, while Diagram does not grow those document-level concerns:

```tsx
import { DataFigure, Diagram, Markdown } from "@discern-sh/design-system/react";
import {
  reviewFlow,
  reviewFlowMarkdown,
  reviewFlowResource,
} from "./review-flow.ts";

export function ReviewFigure() {
  return (
    <DataFigure
      title="Review a submission"
      visual={<Diagram spec={reviewFlow} />}
      caption="A submission can return to review after revision."
      source="Process reference"
    />
  );
}

export function ReviewMarkdown() {
  return (
    <Markdown source={reviewFlowMarkdown} diagrams={[reviewFlowResource]} />
  );
}
```

The pure terminal renderer tries generated enhanced projectors for `flow`, `cycle`, and `sequence` in `auto` mode. Each uses conservative kind-specific width, density, and wrapping viability; a decline returns the same universal description used by explicit `description` mode. `architecture` is deliberately description-first because grouped boundaries plus routed relationships do not survive normal terminal widths without loss. `timeline` is description-first because exact dates, duration semantics, rows, and gates matter more than a compressed terminal scale:

```ts
import {
  renderDiagramCli,
  type TerminalCapabilities,
} from "@discern-sh/design-system/cli";
import { reviewFlow } from "./review-flow.ts";

const capabilities = {
  colorDepth: "ansi256",
  columns: 80,
  unicode: true,
} satisfies TerminalCapabilities;

console.log(renderDiagramCli({
  spec: reviewFlow,
  mode: "auto",
  theme: "dark",
  maxWidth: 80,
}, capabilities));
```

## Quantitative charts

The React-free `./chart` entrypoint owns quantities on scales the way `./diagram` owns identity and topology: typed JSON-safe specs for the six built-in kinds — `bar`, `line`, `distribution`, `heatmap`, `scatter`, and `slope`, each chosen by the reader's verb — the lossless `describeChart` structural description, kind Metadata with a generated author guide that ends with the refused forms and their remedies, a closed locale-free number format vocabulary, linear, band, log, and calendar-date scales, spec-derived series legend data via `chartSeriesLegend`, and the deterministic standalone `renderChartSvg` emitter with `light`, `dark`, or `adaptive` palettes. Validation enforces the honesty rules — zero baselines for length encodings, author-declared bins, no resampling, explicit nulls as declared gaps — and refuses with a named remedy rather than distorting; terminal frames declare an honesty tier, printing every authored value (`bar`, `distribution`, `slope`) or their exact extremes with a stated resolution (`line`, `heatmap`, `scatter`). `chartAltText(spec)` is the canonical short alternative formed from the required title and summary only, never data values, so regenerating an asset from refreshed data cannot change it.

One chart stays useful in three forms from one typed spec, exactly like a diagram. Write `renderChartSvg(spec)` to an asset path your build owns, then reference it with ordinary image syntax — `renderChartMarkdownImage` escapes the canonical alt, source, and summary title into CommonMark:

```ts
import {
  type BarChartSpec,
  type MarkdownChartResource,
  renderChartMarkdownImage,
  renderChartSvg,
} from "@discern-sh/design-system/chart";

export const reviewThroughput = {
  kind: "bar",
  title: "Reviews completed by weekday",
  summary: "Midweek days complete the most reviews.",
  categories: [
    { id: "mon", label: "Monday" },
    { id: "wed", label: "Wednesday" },
    { id: "fri", label: "Friday" },
  ],
  series: [{ id: "completed", label: "Completed", values: [4, 9, 6] }],
} satisfies BarChartSpec;

await Deno.writeTextFile(
  "assets/reviews-by-weekday.svg",
  renderChartSvg(reviewThroughput, { theme: "adaptive" }),
);
export const reviewThroughputResource = {
  source: "assets/reviews-by-weekday.svg",
  spec: reviewThroughput,
} satisfies MarkdownChartResource;
export const reviewThroughputMarkdown = renderChartMarkdownImage(
  reviewThroughputResource,
);
```

Generic readers show the generated SVG and raw text keeps the meaningful alternative. Package Markdown callers may optionally register the same resource — `charts` on `Markdown` or `renderMarkdownCli`, or a `MarkdownBrowserDocument`'s `charts` collection — to upgrade only an isolated matching image to the live token-themed `Chart` in the browser and to `renderChartCli` in terminals, where `chartMode: "description"` forces the universal description. Diagrams and charts share one promotion resolver: matching happens after the same safe URL normalization, the alt must equal `chartAltText(spec)`, an optional image title must equal `spec.summary`, valid unused resources are allowed for corpus-level collections, and duplicate normalized sources — including one source admitted by both the `diagrams` and `charts` collections — reject the whole render before partial output. The package never reads the asset, resolves the path, or parses SVG.

```tsx
import { Chart, DataFigure, Markdown } from "@discern-sh/design-system/react";
import { chartSeriesLegend } from "@discern-sh/design-system/chart";
import {
  reviewThroughput,
  reviewThroughputMarkdown,
  reviewThroughputResource,
} from "./review-throughput.ts";

export function ThroughputFigure() {
  return (
    <DataFigure
      title="Review throughput"
      visual={<Chart spec={reviewThroughput} />}
      legend={chartSeriesLegend(reviewThroughput)}
      source="Team review ledger"
    />
  );
}

export function ThroughputMarkdown() {
  return (
    <Markdown
      source={reviewThroughputMarkdown}
      charts={[reviewThroughputResource]}
    />
  );
}
```

The terminal renderer's `auto` mode asks the generated kind registry for an enhanced frame inside its declared honesty tier — `bar` is `exact`: every authored value prints beside its eighth-block bar — and renders the universal description with the data table as a real aligned table on any typed decline, so a narrow terminal changes form without dropping a value:

```ts
import { renderChartCli } from "@discern-sh/design-system/cli";
import { reviewThroughput } from "./review-throughput.ts";

console.log(renderChartCli({
  spec: reviewThroughput,
  mode: "auto",
  theme: "dark",
  maxWidth: 76,
}, capabilities));
```

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

Pass `diagrams: [reviewFlowResource]` with `source: reviewFlowMarkdown` to project the same isolated image through `renderDiagramCli`. Its default `diagramMode: "auto"` uses enhanced kind output only when it preserves every fact at the effective nested width; set `diagramMode: "description"` to force the universal semantic description. Unregistered and mixed-phrasing images retain the existing `Image:` fallback and never become links.

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
import { reviewFlowMarkdown, reviewFlowResource } from "./review-flow.ts";

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
        `# Getting started\n\n${reviewFlowMarkdown}\n\n[Testing](../reference/testing.md#fake-terminal) · [Website](https://example.test/docs)`,
      diagrams: [reviewFlowResource],
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

The `Markdown` React Component accepts the same untrusted `source`, an optional Prose `measure`, and optional explicit diagram resources. It composes native document semantics without `dangerouslySetInnerHTML`, dispatches admitted diagram blocks to the public live-token `Diagram`, and renders no wrapper for empty source. Discern uses this adapter at build time only: no React bundle or hydration reaches the browser. Static components need no browser runtime; components whose Metadata declares browser behavior use the selection-scoped `discern.js` emitted beside their CSS. Stateful catalogue examples beyond that published behavior still require a consumer-owned browser strategy outside the catalogue.

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
