# The Design System artifact (maintainer convenience)

_A generator for the Claude Design "Design System" artifact that mirrors this package. Internal tooling: nothing here is part of the published package, its README, or any end-user documentation._

The maintainer prototypes with Claude Design against a Design System artifact that carries this package's tokens, brand book, fonts, a curated set of component cards, and the whole React adapter as one browser bundle. [`scripts/design-system-artifact/`](../../scripts/design-system-artifact/) regenerates every file of that artifact from the package sources so a re-sync is one command rather than a hand rebuild.

## Running it

```sh
discern scripts design-system-artifact
```

The Project Script runs the generator from the project root with `deno run`. Options: `--out <dir>` chooses the output directory (default `dist/design-system-artifact/`, ignored by git and replaced on every run); `--index` also writes a fresh `project/design-system.json` for a system that does not exist yet; `--no-bundle` skips the adapter bundle while iterating on cards or tokens.

## What it derives, and from where

| Output under `project/`                                   | Authority                                                                                                                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.json`                                             | [`tokens.ts`](../../src/tokens/tokens.ts) and the appearance evaluator at both poles and under the default Accent projection; type roles from the foundation; each usage note is the source description. |
| `README.md`                                               | `brand-book.md` beside the generator (hand-written usage rules that name tokens) plus a generated provenance note.                                                                                       |
| `components/<Name>/preview.html`                          | The Component's canonical `catalogueExamples` rendered to static HTML through the React adapter, with the theme handed off from the page's `data-theme`.                                                 |
| `components/<Name>/README.md`                             | The Component's Metadata (description, use when, not when, accessibility, CLI stance) and the props block of the generated author guide.                                                                 |
| `components/index.d.ts`                                   | Top-level `interface` and `type` declarations harvested from the card Components' sources, documentation only.                                                                                           |
| `components/bundle.js`                                    | `src/react.ts` bundled with `deno bundle --format=iife` over shims that read React 18 from `window.React`; assigns `window.Discern`.                                                                     |
| `components/bundle.css`                                   | The complete emitted runtime (`emitDesignSystemRuntime({ all: true })`) plus the font-pack family stacks and the Catalogue's `.discern-example-*` helpers.                                               |
| `components/Cover/preview.html`                           | `cover.ts`: the ink ladder as blocks and the ◮ mark as the pattern, bound to tokens.                                                                                                                     |
| `fonts/`, `assets/Licenses/`, `assets/Textures/README.md` | Copied from `assets/`.                                                                                                                                                                                   |

Beside `project/` the run also writes `uploads/grain.png` (an asset upload, not a file), `index.template.json` (the index shape with the upload id and owner left to fill), `publish.json` (the exact `root`, `files`, and upload list for the Artifact tool's publish call), and the scratch `runtime/` and `bundle-work/` folders.

The set of Components that get a card is `cardHeights` in [`components.ts`](../../scripts/design-system-artifact/components.ts): a prototyping kit of about sixty everyday Components, not the whole Catalogue. Add a slug and a starting height to give a Component a card; the bundle and the type declarations already cover every Component.

## Publishing and re-syncing

The generator writes files; publishing is the agent's step with its Artifact tool, following the artifact type's own instructions: upload `uploads/grain.png` as an asset, then publish `publish.json`'s files in one call. For an existing system, read its live index first and change only `lastChange` and the keys the change touches; never overwrite it with `index.template.json`. `index.d.ts` must be published with `contentType: "text/plain"`. The artifact's link is not recorded in the repository; it lives in the maintainer's claude.ai artifact gallery under the title "discern".

The in-app browser cannot open claude.ai, so verify a rebuild by serving the output directory over HTTP and opening a card wrapped in a page that loads a `tokens.css` compiled from `tokens.json` before `bundle.css`.
