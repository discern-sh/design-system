# 3A — Project diagrams through Markdown and the terminal reader

**Goal:** Let ordinary Markdown reference a generated SVG while an explicit caller-supplied resource upgrades that same image to the live React `Diagram` and the semantic/enhanced CLI projection, including inside the interactive Markdown browser.

**Wave:** 3 — Markdown integration. Starts only after 2A has landed on `main`. One agent owns the shared Markdown model, both projections, interactive reader propagation, tests, docs, and Catalogue examples.

## Orient, verify wave 2A, then re-root

Work from `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Verify the 1A diagram ADR/map and all 2A public surfaces are present on `main`: `./diagram` imports without React; `renderDiagramSvg` produces an accessible static asset; React exports `Diagram`; CLI exports `renderDiagramCli`; the generated kind registries distinguish neutral and enhanced CLI graphs; and `flow` has both universal description and tested enhanced fallback behavior. If any prerequisite is missing, stop and report that 2A has not landed.

If status records an existing worktree for this exact effort, continue there and pass its absolute path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `diagram-3a`, then re-root into the returned absolute worktree before reading or editing.

Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/20-components/README.md`, `map/25-diagrams/README.md`, `map/70-cli/README.md`, `map/_adr/README.md`, the diagram ADR, ADR-0019, ADR-0020, ADR-0021, ADR-0022, and ADR-0024; then inspect every file under `src/components/editorial/markdown/`, `src/cli/semantic-inline.ts`, `src/cli/interactive/markdown-browser-model.ts`, `markdown-browser-renderer.ts`, `markdown-browser-machine.ts`, `markdown-browser-request.ts`, their public barrels, and the corresponding browser/CLI/interactive tests. Read the `discern-write-adr` skill. Verify anchors against the live tree.

As read-only consumer evidence, inspect how `/Users/jack/Sites/discern` constructs the corpus given to its package-owned Markdown browser and how its web documentation supplies Markdown. Do not edit that repository or couple this API to product-local paths.

## Background

Discern's documentation has three relevant forms. Raw Markdown must remain readable and portable, so a diagram appears there as standard `![alt](path.svg)` syntax. Browser documentation benefits from a live inline Diagram that follows the current token theme. `discern docs` uses the design system's CLI Markdown renderer and interactive reader, where an SVG file cannot communicate its structure. The bridge must connect these forms without inventing a Markdown dialect or allowing the renderer to read files.

The caller already knows which generated asset came from which typed spec. It therefore supplies that relationship explicitly. The package recognises only an isolated image paragraph whose safe normalized source matches an admitted resource. That node becomes a neutral diagram block before either projection. Unregistered and inline images keep their current behavior exactly. The Markdown image alt is the spec's canonical short title+summary alternative, while an optional image title repeats the canonical summary; the boundary must detect drift rather than let surfaces disagree.

## Fixed integration contract

Use the smallest equivalent names that fit the live API, but preserve these semantics:

```ts
interface MarkdownDiagramResource {
  readonly source: string;
  readonly spec: DiagramSpec;
}
```

- React `MarkdownProps`, `MarkdownCliProps`, and each `MarkdownBrowserDocument` receive an optional readonly collection of diagram resources. There is no global registry, resolver callback, filesystem root, fetch hook, or environment discovery.
- Source matching happens only after the existing Markdown URL normalization/safety policy. Duplicate normalized sources reject deterministically. Matching does not resolve a path against the host filesystem or browser location.
- Promotion requires a paragraph containing exactly one image and no other visible phrasing. An image mixed with prose remains an ordinary inline image.
- The image alt must equal `diagramAltText(spec)`—the canonical concise alternative derived from title and summary—after the established text normalization. If an image title is present, it must equal the canonical accessible summary. A mismatch rejects the whole Markdown render before partial output. This keeps the spec authoritative while leaving raw Markdown and generic image accessibility meaningful.
- A matching block stores the validated `DiagramSpec` and source as package-owned neutral data. React dispatches to `Diagram`; CLI dispatches to `renderDiagramCli`; neither reparses SVG. Without a resource match, the current `<img>` and `Image:` fallback contracts are unchanged.

## Deliverables

Work in focused commits, one logical step each.

1. **Record the bridge decision.** Use `discern-write-adr` to record why standard image syntax plus explicit source→spec resources is the integration boundary, why an isolated image is the only promotable shape, how alt/summary drift is rejected, and why v1 does not add fenced syntax, parser plugins, file reads, SVG parsing, or a global registry. Link the ADR from `map/25-diagrams/README.md` and the Markdown subsystem map/docs where future maintainers will find it.
2. **Add one neutral resource and resolution authority.** Put `MarkdownDiagramResource` in a React-free module reachable by Markdown, CLI, and the interactive browser without creating a cycle. Reuse the public `DiagramSpec` rather than widening it. Extend the package-owned Markdown model with an exhaustive `diagram` block and one post-parse resolver (or an equivalent parse option) that validates the resource collection, identifies only isolated images, checks normalized source and accessibility facts, and returns the complete resolved neutral document before projection. React and CLI must call this same authority; do not write two promotion checks.
3. **Preserve existing image behavior exactly.** With `diagrams` absent, empty, unused, or non-matching, current browser `<img>` semantics, safe source handling, terminal `Image:` fallback, link inventories, headings, and exact frames must remain unchanged. Inline images, multiple images in a paragraph, linked images, unsafe sources, and resource sources not present in a document are not promoted. Choose and test whether unused admitted resources are allowed for corpus-level convenience; whichever policy you select must be documented and identical across all three callers.
4. **Project the neutral diagram block in React.** Add optional resources to `MarkdownProps`. Dispatch a resolved diagram block to the public React `Diagram` Component with no duplicated SVG or accessibility logic. Ensure the Markdown Component's generated dependency graph automatically enrols Diagram CSS because of the real import. Keep block rhythm, headings, and explanatory prose in Markdown/Prose; keep only diagram geometry and concise semantic labels/annotations in Diagram. The spec's title and summary remain the accessible image authority and must not be promoted into duplicate visible canvas prose. Do not wrap it in `DataFigure` without caption/source semantics that Markdown does not own.
5. **Project the same block through the CLI Component.** Add optional resources and a documented diagram projection preference to `MarkdownCliProps`, defaulting to `renderDiagramCli`'s normal auto behavior and allowing a caller to force description-only output. Pass explicit capabilities, effective nested width, Theme, and other settled presentation facts; compose the result as a real Markdown block through existing rhythm/block authorities. A narrow terminal may move from enhanced flow art to its description, but it may not crop or omit facts. Keep `renderMarkdownCliProjection` link/heading facts stable and do not make diagrams into fake links.
6. **Carry resources through the interactive Markdown browser.** Add optional diagram resources to `MarkdownBrowserDocument` (or a document-owned equivalent), validate them as immutable caller data during normal browser preflight, and pass them to the existing Markdown projection when a document opens or re-renders. Resize, pane changes, resume, scrolling, search, link focus, pointer regions, and cleanup behavior must remain owned by the existing browser state/lifecycle. Test an open document whose diagram switches between enhanced and description layouts as width changes: rendered-row counts and semantic anchors may change, but state remains coherent, no content becomes unreachable, and link occurrence addressing after the diagram remains correct.
7. **Prove raw Markdown, live browser, and terminal form one pipeline.** Add a consumer-shaped fixture consisting of a typed flow spec, the exact result of `renderDiagramSvg`, Markdown containing an ordinary relative image reference, and a matching resource. Assert: without resources, React renders `<img>` and CLI renders the existing image fallback; with resources, React renders the live token Diagram and CLI renders enhanced or described Diagram; the static asset has the same title/summary and semantic relationship inventory; and all three reject a deliberately drifted alt/title. Generate fixture outputs in the test or through their authority—do not hand-maintain a golden SVG that can drift from the spec.
8. **Close every safety and exhaustiveness gap.** Add tests for duplicate/encoded-equivalent resource sources, malformed/unsafe sources, hostile alt/title/spec text, missing alt, title omitted or matching, resource order, repeated references to one spec, one resource used by multiple documents, invalid spec, isolated versus mixed phrasing, and empty collections. Update both Markdown handled-block registries and their future-node guard so a new block cannot land without both projections. A failure rejects before React markup, CLI bytes, or interactive terminal effects are emitted.
9. **Keep existing Markdown compatibility visible.** Run the complete Markdown browser/CLI/React suites. Add explicit assertions that every pre-wave fixture produces the same semantic structure and existing exact frames when no diagram resources are supplied. Do not rewrite image semantics generally, publish a parser AST, or weaken ADR-0019/0020's URL/control policies to make matching convenient.
10. **Document the author workflow and preview it.** Update Markdown and Diagram Catalogue examples with one standard Markdown source used in both unregistered and upgraded forms, plus an interactive-reader fixture. Update `map/20-components/README.md`, `map/25-diagrams/README.md`, `map/70-cli/README.md`, public Markdown/Diagram usage documentation, and `CHANGELOG.md` under **Unreleased**. Show the intended build flow: author a typed spec; consumer build writes `renderDiagramSvg` to a known asset path; Markdown uses ordinary image syntax with `diagramAltText(spec)` as canonical alt; React/CLI callers optionally supply the resource to upgrade it. Leave the Catalogue server running and report exact Markdown and Diagram Web/CLI URLs.

## Constraints

- Standard Markdown remains standard. Do not add a `discern-diagram` fence, directive, HTML comment convention, MDX component, URL query protocol, or parser plugin in this wave.
- The package performs no I/O and trusts no asset contents. It never reads the referenced SVG, resolves a filesystem path, fetches a URL, or accepts pre-rendered terminal output.
- `DiagramSpec` is the accessibility/semantics authority. `diagramAltText` derives the raw image alternative, the Markdown title may repeat the summary, and both are checked for agreement; do not create a third free-form description prop or a visible diagram heading that repeats surrounding document prose.
- Both projections consume one fully resolved neutral Markdown document. Do not match resources separately inside `.tsx`, `.cli.ts`, or the interactive renderer.
- `./cli` and `./cli/interactive` remain React-free and deterministic. No dependency is added. Public optional props are additive and documented.
- Generated registries are never hand-edited; Component styling remains token-driven and namespaced; no version bump, release, or consumer edit.
- After the final edit, run `discern_prepare`, commit the resulting clean tree, then run `discern_done` once. Keep the Catalogue server alive after the gate.

## Out of scope

- Editing the Discern product's docs, build, Markdown corpus, commands, or package version; downstream adoption follows a design-system release.
- Fenced/custom diagram syntax, JSON/YAML parsing, automatic code-fence generation, source maps, file watching, a package CLI, or a web editor.
- Rendering arbitrary image formats in a terminal, sixel/kitty/iTerm protocols, OCR/SVG parsing, network fetching, or making every Markdown image a diagram.
- New kinds, new layout behavior, animation, interaction inside diagrams, dependency evaluation, version bumps, or publication.

## Definition of done

- **Measurable:** one accepted ADR records the resource bridge; an exhaustive neutral Markdown `diagram` block is resolved by one shared authority; optional resources flow through React Markdown, CLI Markdown, and `MarkdownBrowserDocument`; unregistered images retain their existing output; registered isolated images project through Diagram on both surfaces; alt/summary drift and hostile/duplicate resources reject preflight; cross-form, exact-frame, resize/scroll/link, compatibility, safety, and generated-dependency tests pass; docs/Catalogue/Unreleased changelog are current; `discern_done` is green on clean committed HEAD.
- **Semantic:** one ordinary Markdown document stays useful as raw text, displays a generated SVG in generic readers, becomes a live token-themed diagram on the web, and remains genuinely understandable in `discern docs`—without a custom Markdown dialect or hidden filesystem behavior.
- **Preview:** the Catalogue remains running and the handoff includes exact Web and CLI URLs for the upgraded Markdown example and the Diagram Component.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/diagram-system/_done/3a-markdown-integration.md`. After the green proof, run `discern_accept`; a recorded grant may land wave 3A, while a refusal means report the proof line and branch/worktree and stop for owner review. Do not dispatch wave 4A or edit the sibling consumer.
