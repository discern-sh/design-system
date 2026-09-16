---
name: use-discern-design-system
description: Select and compose @discern-sh/design-system Components in a consumer project from the installed package's generated author guide and canonical example imagery. Use when building or revising browser or terminal UI with the package; do not use when adding or changing a design-system Component itself.
metadata:
  author: "discern-design-system"
  version: "2.0"
---

# Use the discern design system

The package generates its author guides from the same Component and kind Metadata that drives its registries, adapters, and Catalogue. Read the guide from the package the project actually builds against, select by the reader's task, and author only through public surfaces. The helper prints the live guide rather than copying it into this skill.

## 1. Read the guide of the package you are building against

1. Find the dependency: the `@discern-sh/design-system` entry in the project's `deno.json` imports (a `jsr:` specifier or a local checkout path, possibly under another alias) and its resolved version in `deno.lock`. Record it for the final report.
2. List the inventory from that package, running from the project root so its config resolves the package:

   ```sh
   deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --list
   ```

   `<skill-dir>` is this skill's directory. The script imports the package's `./components` entrypoint dynamically, which is why it needs `--allow-read` for a local checkout and for reading `deno.json`. It tries the project's `@discern-sh/design-system` mapping, then any alias `deno.json` maps to the package, then the latest JSR release. Its stderr line is the authority on what it read: the resolved specifier, the package version, and the route. When the route says "latest JSR release", the project's dependency was not found; pass `--package <alias-or-jsr-specifier>` to pin it rather than authoring against a newer release than the code will run.
3. If the package has no `./components` entrypoint, author from that installed version's README and say so. Never consult a newer checkout than the code will run against without authority to upgrade the dependency.

## 2. Select by the reader's task

Print only what the task needs; the complete guide is about 190 KB and belongs in a file, not in context:

```sh
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --purpose displaying-tool-output
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --group Editorial
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --component stat --component meter
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --diagram-kinds
```

Start from a purpose collection when the work is building documentation, displaying tool output, expressing a procedural workflow, or composing a marketing site; otherwise browse the Group, then print the shortlist by `--component`. Read each section this way:

- The description says what the Component **is**. Choose by meaning, not by appearance.
- **Use when** states the situations Metadata considers a fit.
- **Do not use when** is a refusal with a route: it names the Component or consumer-owned pattern that serves instead. Follow the route.
- The absence line ("Metadata states no situation narrower…") means no narrower rule exists, not that any use is fine. Judge from the description and the Group's siblings.
- **Terminal** names the pure renderer, or the exemption reason. An exempt Component never gets an invented terminal analogue; the reason says what the terminal should print instead.
- **Accessibility** lines are obligations the authored output must keep true.
- **Examples** are the canonical postures; their ids are also the image file names in the next step.
- **Props** closes every section: the adapter's props type, what it extends, each property with its type and doc, and every package type the properties reference, item shapes and tone unions included. Author from it directly; do not guess type names.
- **Chart** and **Diagram** select only the wrapper. Print the kind guide with `--chart-kinds` or `--diagram-kinds` before choosing a kind; it owns budgets, wrapping measures, extent, honesty tiers, and refused forms.

Prefer composing existing Components over a site-local imitation. Product narrative, data, routes, commands, claims, and artwork stay with the consumer and enter through props, children, or slots.

## 3. Check the pinned imagery when a checkout is at hand

When the package is a local checkout, or the repository is cloned beside the project, every canonical Web example has committed light and dark images:

```
<checkout>/catalogue/generated/example-images/<slug>--<example-id>--light.png
<checkout>/catalogue/generated/example-images/<slug>--<example-id>--dark.png
```

`catalogue/generated/example-images-manifest.ts` indexes them with labels and dimensions. Look at the `default` example (or the first listed) of each shortlisted Component to judge density, hierarchy, and allocation against the intended use. Images are captured at reference scale in a 960-pixel harness, so a Diagram image shows its scrolling viewport clipped at the right edge; that is the viewport contract, not a rendering defect. Imagery never overrides a Metadata refusal, and an example composition is evidence, not API. Without a checkout, continue from the guide alone.

## 4. Author through the public contract

The Props block in each section is the props authority for the pinned package. Reach for `deno doc` only for a symbol the block does not reach (a deep React type, a CLI renderer's props); its filter is an exact symbol name, it takes an exact `jsr:` version or a checkout file rather than the project's alias, and it prints colour codes and a benign "Could not find package 'global.d.ts'" warning from `@types/react` that `NO_COLOR=1` and stderr filtering remove:

```sh
NO_COLOR=1 deno doc jsr:@discern-sh/design-system@<pinned version>/react --filter StatProps 2>/dev/null
NO_COLOR=1 deno doc --config <checkout>/deno.json <checkout>/src/cli/mod.ts --filter renderStatCli 2>/dev/null
```

### The document contract

Every page that loads the runtime carries this skeleton; the package owns the CSS and script, the consumer owns the document:

```html
<!doctype html>
<html lang="en" data-discern-root data-discern-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="<the light canvas colour>" />
    <script>
    (function () {
      var t = null;
      try {
        t = localStorage.getItem("theme");
      } catch (_) {}
      var d = t === "dark" ||
        (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.discernTheme = d ? "dark" : "light";
    })();
    </script>
    <link rel="stylesheet" href="/design-system/fonts.css" />
    <link rel="stylesheet" href="/design-system/discern.css" />
    <script type="module" src="/design-system/discern.js"></script>
  </head>
  <body>…</body>
</html>
```

- `data-discern-root` bounds every generated style; `data-discern-theme` is `"light"` or `"dark"`. The inline bootstrap resolves the stored or system preference before first paint so the page never flashes the wrong theme; the storage key and the resolution policy are the consumer's.
- Emit `appearanceScopes: true` whenever the page colours a root or a subtree: `data-discern-accent` plus an inherited `--discern-accent-hue` on the root or a region, tints, or `data-discern-accent="none"` inside an accent region. Without the option the emitted CSS contains no scoping rules and those attributes do nothing.
- `fonts.css` exists only when `assets: ["fonts"]` was selected; `discern.js` exists only when a resolved Component declares browser behavior. Read both from `manifest.outputs` rather than assuming.

### Surfaces

- **Runtime CSS**: `emitDesignSystemRuntime({ outputRoot, components: ["stat"], groups: ["Editorial"], assets: ["fonts"], appearanceScopes: true })` from `@discern-sh/design-system/runtime` writes `discern.css`, `manifest.json`, and — only when a selected Component declares browser behavior — `discern.js`. Dependencies resolve from generated metadata; never hand-add them. In `manifest.json`, read `behaviors` across every entry in `resolvedComponents`, dependencies included: a Component whose array is non-empty needs `discern.js` to be live, and every other Component is static HTML and CSS. Selecting Procedure resolves Copy button, whose `copy-button` behavior joins `discern.js`, so a Procedure step's command control is live only when the script loads.
- **React**: `import { Stat } from "@discern-sh/design-system/react"`, rendered at build time with `renderToStaticMarkup`. The adapter produces static HTML; there is no client bundle or hydration, so a required handler prop is dropped in the output. Rendering reads `NODE_ENV`, so grant `--allow-env=NODE_ENV`. Type-checking adapter code needs the consumer config to carry `lib` with `dom` and, when it uses `nodeModulesDir: "none"`, `jsxImportSourceTypes: "@types/react"` with `@types/react` mapped in its imports, because `npm:react` ships no types; add those to the project's own config instead of a side config. A throwaway render script may run with `--no-check` under a strict consumer config; anything that lands is type-checked.
- **Controlled adapters in static output**: a handler prop does not survive static rendering, so never pass a no-op one. `ThemeToggle` without `onThemeChange` emits the package's static contract: and its `theme-toggle` behavior in `discern.js` themes the opted-in root containing the control, swaps the accessible name and glyph, and persists to the `localStorage` key named by `data-discern-theme-storage-key` on that root. Apply the saved preference yourself in the head so the first paint is right; without the script the control stays inert. `Tag` accepts `onRemove`; omit it from a static `Tag` and it renders no remove button.
- **Diagrams and charts**: author the spec, then validate it before rendering the page with `checkDiagram` from `./diagram` or `checkChart` from `./chart`. Each returns every budget finding with its path and remedy in one pass, then the structural or layout refusal, if any, that stopped it; a page render stops at the first refusal. Wrapped-line budgets bind long before grapheme budgets, so keep each line within the kind guide's stated measure. A Diagram renders at reference scale inside a horizontally scrollable, keyboard-focusable viewport and never shrinks to its column; design the width to the kind guide's extent facts, and compose it inside Data figure when it needs a visible title, caption, source, or legend.
- **Terminal**: `renderStatCli(props, capabilities)` from `@discern-sh/design-system/cli` is pure and takes explicit capabilities (columns, colour depth, Unicode). Interaction lives behind `./cli/interactive`.
- **Semantic HTML**: `semanticClass("stat", { element: "value" })` from the package root builds the documented `discern-stat__value` class for hand-authored markup; `semanticClass("stat")` builds the block class.

Boundaries that hold on every surface:

- Consumer styles add their own composition classes for layout and page relationships. They never target a Component's `ownedClasses` (listed in `manifest.json`), copy Component CSS, or fork a Component for appearance.
- Themes and branding change tokens only: override public `--discern-*` custom properties, keep interface text at or above `--discern-font-size-xs`, and keep success distinct from accent.
- Imports come from documented entrypoints only, never from paths inside the package source.
- A single-file deliverable inlines the emitted `fonts.css` by rewriting each `url("./fonts/…")` to a `data:` URI of the emitted file, about 180 KB in total, or omits the `fonts` asset and keeps the documented system stack.
- Inline Components inside prose, such as `GlossaryTerm`, lose the space before them when JSX breaks the line; write `{" "}` before the tag.

## 5. Verify and report

Run the project's own build and checks. Render both themes and the narrowest supported width; where the Component declares motion, disclosure, or focus behaviour, exercise it under reduced motion and forced colours. A screenshot shows composition; it does not prove semantics, names, focus order, or keyboard operation. A scripted `element.focus()` does not open a hover card while the browser window lacks operating-system focus, because no `focusin` fires; drive it with a real keyboard Tab or pointer hover before reporting it broken.

Report:

- the package version or checkout authored against, as the helper reported it;
- the selected Component slugs and the guide facts that justified them;
- candidates rejected by a refusal, terminal stance, or imagery;
- images inspected, if any;
- the runtime selection, `appearanceScopes` if emitted, and the verification performed.

## Done when

The implementation uses only public package surfaces, the runtime selection resolves every chosen Component, every diagram and chart spec checks clean, the rendered result keeps each Component's Metadata and accessibility contract true, and no copied guide, CSS, or example has become a second authority beside the package.
