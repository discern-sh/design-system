---
name: use-discern-design-system
description: Build or revise browser and terminal UI with the @discern-sh/design-system package in a consumer project — pick Components from the installed package's generated author guide, then author only through the public contract (runtime emission, React adapter, terminal renderers, or semantic HTML). Use this whenever a task touches design-system Components, tokens, themes, the runtime emitter, `discern-` classes, `data-discern-root`, or asks which Component fits some content — even when the user only names the site, docs, or CLI being built and never says "design system". Not for adding or changing a Component inside the design-system repository itself; that is the add-a-component skill's job.
metadata:
  author: "discern-design-system"
  version: "1.0"
---

# Use the discern design system

The package publishes an author guide generated from every Component's Metadata — description, purpose collections, use-when, do-not-use-when, terminal stance, accessibility contract, canonical examples — the same facts that generate its registries, adapters, and Catalogue. Read the guide of the package the project actually builds against, select by the reader's task, and author only through public surfaces. This skill copies nothing from the package: the script below prints the live guide, so it cannot drift from the installed version.

## 1. Read the guide of the package you are building against

1. Find the dependency: the `@discern-sh/design-system` entry in the project's `deno.json` imports (a `jsr:` specifier or a local checkout path) and its resolved version in `deno.lock`. Record it; the report names it.
2. List the inventory from that package, running from the project root so its config resolves the alias:

   ```sh
   deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --list
   ```

   `<skill-dir>` is this skill's directory. The script imports the package dynamically, which is why it needs `--allow-read` for a local checkout. Pass `--package <alias>` when the project aliases the package under another name (discern.sh uses `discern-design-system`), or `--package jsr:@discern-sh/design-system` for the latest release when nothing is installed yet. When this skill directory itself lives inside a design-system checkout (for example, linked from `~/.claude/skills/` into the repository), Deno resolves a `jsr:` specifier that checkout's version satisfies to the checkout's own sources; the reported specifier tells you which happened.
3. If the script reports that the package predates the guide (no `componentAuthorGuide` export; it arrived in 0.30.0), author from that version's README and say so. Never consult a newer checkout than the code will run against without authority to upgrade the dependency.

## 2. Select by the reader's task

Print only what the task needs; the complete guide is about 120 KB and belongs in a file, not in context:

```sh
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --purpose displaying-tool-output
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --group Editorial
deno run --allow-read --config deno.json <skill-dir>/scripts/component-guide.ts --component stat --component meter
```

Start from a purpose collection when the work is building documentation, displaying tool output, expressing a procedural workflow, or composing a marketing site; otherwise browse the Group. Read each shortlisted section this way:

- The description says what the Component **is**. Choose by meaning, not by appearance.
- **Use when** states the situations Metadata considers a fit.
- **Do not use when** is a refusal with a route: it names the Component or consumer-owned pattern that serves instead. Follow the route.
- The absence line ("Metadata states no situation narrower…") means no narrower rule exists, not that any use is fine. Judge from the description and the Group's siblings.
- **Terminal** names the pure renderer, or the exemption reason. An exempt Component never gets an invented terminal analogue; the reason says what the terminal should print instead.
- **Accessibility** lines are obligations the authored output must keep true.
- **Examples** are the canonical postures; their ids are also the image file names in the next step.
- **Chart** and **Diagram** select only the wrapper. Read `chartKindAuthorGuide` from `./chart` or `diagramKindAuthorGuide` from `./diagram` before choosing a kind; those guides own budgets, honesty tiers, and refused forms.

Prefer composing existing Components over a site-local imitation. Product narrative, data, routes, commands, claims, and artwork stay with the consumer and enter through props, children, or slots.

## 3. Check the pinned imagery when a checkout is at hand

When the package is a local checkout, or the repository is cloned beside the project, every canonical Web example has committed light and dark images:

```
<checkout>/catalogue/generated/example-images/<slug>--<example-id>--light.png
<checkout>/catalogue/generated/example-images/<slug>--<example-id>--dark.png
```

`catalogue/generated/example-images-manifest.ts` indexes them with labels and dimensions. Look at the `default` example (or the first listed) of each shortlisted Component to judge density, hierarchy, and allocation against the intended use. Imagery never overrides a Metadata refusal, and an example composition is evidence, not API. Without a checkout, continue from the guide alone.

## 4. Author through the public contract

Read the selected Component's public props from the same package before writing code. `deno doc` takes an exact `jsr:` version or a checkout file, not the project's alias, and its filter is an exact symbol name (`Stat` documents the adapter, `StatProps` its props):

```sh
deno doc jsr:@discern-sh/design-system@<pinned version>/react --filter StatProps
deno doc --config <checkout>/deno.json <checkout>/src/react.ts --filter StatProps
deno doc --config <checkout>/deno.json <checkout>/src/cli/mod.ts --filter renderStatCli
```

Then use the surface the output needs:

- **Runtime CSS**: `emitDesignSystemRuntime({ outputRoot, components: ["stat"], groups: ["Editorial"], assets: ["fonts"] })` from `@discern-sh/design-system/runtime` writes `discern.css`, `manifest.json`, and — only when a selected Component declares browser behavior — `discern.js`. Dependencies resolve from generated metadata; never hand-add them. Load the CSS inside an element carrying `data-discern-root` and `data-discern-theme="light"` or `"dark"`.
- **React**: `import { Stat } from "@discern-sh/design-system/react"`, rendered at build time with `renderToStaticMarkup`. The adapter produces static HTML; there is no client bundle or hydration. Rendering reads `NODE_ENV`, so grant `--allow-env=NODE_ENV`. Type-checking adapter code needs the consumer config to carry `lib` with `dom` and, when it uses `nodeModulesDir: "none"`, `jsxImportSourceTypes: "@types/react"` with `@types/react` mapped in its imports, because `npm:react` ships no types; add those to the project's own config instead of a side config.
- **Terminal**: `renderStatCli(props, capabilities)` from `@discern-sh/design-system/cli` is pure and takes explicit capabilities (columns, colour depth, Unicode). Interaction lives behind `./cli/interactive`.
- **Semantic HTML**: `semanticClass("stat", { element: "value" })` from the package root builds the documented `discern-stat__value` class for hand-authored markup.

Boundaries that hold on every surface:

- Consumer styles add their own composition classes for layout and page relationships. They never target a Component's `ownedClasses` (listed in `manifest.json`), copy Component CSS, or fork a Component for appearance.
- Themes and branding change tokens only: override public `--discern-*` custom properties, keep interface text at or above `--discern-font-size-xs`, and keep success distinct from accent.
- Imports come from documented entrypoints only, never from paths inside the package source.

## 5. Verify and report

Run the project's own build and checks. Render both themes and the narrowest supported width; where the Component declares motion, disclosure, or focus behaviour, exercise it under reduced motion and forced colours. A screenshot shows composition; it does not prove semantics, names, focus order, or keyboard operation.

Report:

- the package version or checkout authored against;
- the selected Component slugs and the guide facts that justified them;
- candidates rejected by a refusal, terminal stance, or imagery;
- images inspected, if any;
- the runtime selection and the verification performed.

## Done when

The implementation uses only public package surfaces, the runtime selection resolves every chosen Component, the rendered result keeps each Component's Metadata and accessibility contract true, and no copied guide, CSS, or example has become a second authority beside the package.
