# System map

Bird's-eye view of how discern-design-system fits together. Read this once and
the rest of the documentation tree should slot into place.

---

## The system, end to end

```
        AUTHORED SOURCES                          GENERATED SURFACES
┌───────────────────────────────┐   deno task   ┌──────────────────────────────┐
│ Tokens        tokens.ts       │    codegen    │ src/generated/               │
│ Foundations   styles/*.css    │ ────────────► │  Registry (deps, classes)    │
│ Components    src/components/ │  generate.ts  │  React surface               │
│  55 folders × (css, tsx,      │               │  base styles · asset tables  │
│   meta.ts, examples, mod.ts)  │               │ styleguide/generated/        │
│ Preset        theme/discern.ts│               │  example registry            │
└───────────────────────────────┘               └───────┬──────────────────────┘
                                                        │ resolved through
                       ┌────────────────────────────────┼───────────────┐
                       ▼                                ▼               ▼
        ┌──────────────────────────┐   ┌──────────────────────┐  ┌─────────────────┐
        │ Emitter    runtime.ts    │   │ Adapter   react.ts   │  │ Catalogue       │
        │ Selection ──► Runtime:   │   │ React 18.3+ (peer)   │  │ styleguide/ +   │
        │  discern.css             │   │ renders the class    │  │ scripts/build.ts│
        │  manifest.json (SHA-256) │   │ contract to static   │  │ + serve.ts      │
        │  Optional Assets         │   │ HTML at build time   │  │ + conformance   │
        └────────────┬─────────────┘   └──────────┬───────────┘  └─────────────────┘
                     ▼                            ▼
        ┌─────────────────────────────────────────────────────┐
        │ CONSUMER SITE (Deno or Node build; static output)   │
        │ <main data-discern-root data-discern-theme="light"> │
        │   semantic HTML using discern-* classes             │
        │ — consumer Preset may override public Tokens —      │
        └─────────────────────────────────────────────────────┘
```

Arrows are build-time data flow. Nothing flows at browser runtime: the browser
receives static HTML plus the emitted CSS, and no registry, cache, or
third-party host is ever hotlinked.

---

## Where each piece runs

- **Everything ships as a library** — the JSR package
  `@discern-sh/design-system`. There are no services and no persistent state;
  the only state anywhere is files in the consumer's build output.
- **The Emitter** runs inside a consumer's build (Deno or Node — it writes via
  `node:fs/promises`). Under Deno it needs read and write permission for its
  output directory.
- **The Adapter** runs in a consumer's build-time React render
  (`renderToStaticMarkup`); nothing of React reaches the browser.
- **Codegen, the Catalogue build, and browser conformance** are repo-local dev
  processes: `deno task codegen`, `deno task build` (writes `dist/`,
  gitignored), and `deno task serve` (local HTTP on port 8010).
  `deno task conformance` opens every generated example in headless Chrome for
  accessibility, interaction, forced-colour, and visual checks.
- **CI** (GitHub Actions) re-runs codegen for currency, the full verify task,
  and a publish dry run on every push/PR; releases publish to JSR via trusted
  publishing when a `v*` tag matching `deno.json`'s version is released.

---

## How the map relates to the subtrees

The numbered subtrees are proposed but not yet written — filling them is tracked
in [`discern/TODO.md`](../../discern/TODO.md). `80-development/` exists today.

| Region of the map             | Documented in            |
| ----------------------------- | ------------------------ |
| Tokens, Preset, foundations   | `../10-tokens-themes/`   |
| Components (authored sources) | `../20-components/`      |
| Codegen → generated surfaces  | `../30-codegen/`         |
| Emitter, Selection, Manifest  | `../40-runtime-emitter/` |
| Adapter                       | `../50-react-adapter/`   |
| Catalogue, build, serve       | `../60-catalogue/`       |
| CI, the gate, working here    | `../80-development/`     |
