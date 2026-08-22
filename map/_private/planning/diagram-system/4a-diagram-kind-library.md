# 4A — Complete the diagram-kind library

**Goal:** Expand the proven flow vertical slice into a coherent documentation library—architecture, cycle, sequence, and timeline—without weakening the one-spec/one-scene/description-first contracts or turning the package into a general-purpose diagram language.

**Wave:** 4 — kind-library expansion. Starts only after 3A has landed on `main`. One coordinating agent owns the worktree, shared authorities, generated output, integration, documentation, final gate, and acceptance.

If sub-agents are available, prefer one per new kind after the coordinator fixes the shared contract, and run them in parallel inside this same worktree. Each sub-agent may edit only its assigned `src/diagram/kinds/<kind>/` folder and dedicated tests/fixtures. The coordinator alone edits common diagram modules, `scripts/generate.ts`, generated surfaces, tokens, Components, Markdown, Catalogue integration, maps, changelog, and brief housekeeping. If sub-agents are unavailable, implement the kinds sequentially. Do not launch, dispatch, or supervise any other programme brief, and do not split kinds into parallel worktrees—the generated union/registry and public barrels are shared seams.

## Orient, verify wave 3A, then re-root

Work from `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Verify waves 1A–3A are present on `main`: the generated kind anatomy exists; `flow` projects through standalone SVG, React, CLI description/enhanced rendering, Markdown, and the interactive reader; standard unregistered image behavior remains compatible; and the Diagram/Markdown ADRs and map pages describe the live contracts. If any prerequisite is missing, stop and report which wave has not landed.

If status records an existing worktree for this exact effort, continue there and pass its absolute path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `diagram-4a`, then re-root into the returned absolute worktree before reading or editing.

Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/20-components/README.md`, `map/25-diagrams/README.md`, `map/30-codegen/README.md`, `map/60-catalogue/README.md`, `map/70-cli/README.md`, both Diagram ADRs, the complete `src/diagram/` subsystem, generated neutral and CLI kind registries, Diagram Component anatomy, Markdown bridge, diagram tests, and the existing Editorial `timeline` Component so the Gantt-like diagram kind does not steal its narrative-event semantics. Verify every anchor against the live tree.

As read-only corpus evidence, inventory actual documentation and process explanations under `/Users/jack/Sites/discern`, plus the generic Catalogue examples that landed in earlier waves. Select at least two realistic cases per proposed kind and keep the cases product-neutral in package fixtures. Do not copy consumer prose, marketing artwork coordinates, or attached screenshot markup into the package.

## Background

The package should own reference archetypes, not an endlessly extensible diagrammer. Authors choose them by the reader's task—what must be documented and revisited—not merely by the subject noun. Flow has already tested the shared architecture and covers ordinary processes, decision trees, and small state machines with explicit return edges. Four further grammars cover the materially different layout problems shown by the research and likely Discern documentation: nested systems, circular feedback loops, actor/message chronology, and calendar ranges/milestones. A request to build intuition through a meaningful physical schematic, spatial metaphor, animation, or controls remains consumer-owned rather than becoming a new Diagram kind; the package Artwork group continues to own only semantically disposable decoration.

Each grammar exists because its semantics determine a better layout and a better text description. It is not a skin over a free-form scene. A kind that cannot express its meaning cleanly should remain a textual description or become a later explicit kind; callers never escape into coordinates or raw SVG.

## Required kind contracts

Use the live kind anatomy and exact names established by 1A. Preserve these semantic boundaries:

### `architecture`

- Represents a bounded system topology: nodes with stable IDs, primary label, optional annotation, semantic role such as service/store/external/boundary/focal, directed labelled relationships, and optional one-level groups/containers.
- Groups communicate ownership or boundary, not arbitrary nested drawing. Limit nesting to one level in v1; reject ambiguous membership, group cycles, and edges to nonexistent endpoints.
- Layout supports left-to-right or top-to-bottom architecture, sizes containers around their members, keeps nodes non-overlapping, routes relationships legibly, and visually distinguishes a focal node/primary flow through semantic tone rather than hard-coded colour.
- Description lists boundaries, members, node roles, and relationships in a stable order. The CLI stance may remain description-first if a grouped frame cannot preserve those facts at normal widths; any enhanced subset must decline outside a documented envelope.

### `cycle`

- Represents an ordered repeating loop of named stages with optional annotations, one optional central hub/shared-memory concept, and optional stage↔hub relationships such as signals or outcomes.
- Stage order is authored semantic order. Layout distributes stages consistently around a ring, draws one unambiguous direction, keeps labels upright, places an optional hub centrally, and routes hub spokes separately from the outer loop.
- Description states that the sequence repeats, enumerates stages in order, describes the hub, and names every spoke relationship. An enhanced CLI form is encouraged when it can show an ordered loop and hub without relying only on Unicode arrows; ASCII/no-colour must retain the same facts or fall back.

### `sequence`

- Represents ordered interaction: stable participants, messages in authored temporal order, source/target, label, and restrained message kinds such as call, asynchronous signal, return, and self-message. Optional notes may attach to one participant or one message; v1 does not model arbitrary activation bars or timing diagrams unless the corpus proves they are necessary.
- Layout gives participants stable columns and messages stable vertical positions, handles long labels through bounded wrapping, keeps arrow direction explicit, and avoids crossings that authored order does not require.
- Description names participants then narrates messages in order with source, target, kind, label, and notes. A compact enhanced CLI sequence is viable at sufficient width; it must decline to description when participant count/label width would crop facts.

### `timeline`

- Represents a bounded calendar plan/Gantt: an explicit ISO calendar-date range, labelled groups/rows, tasks with inclusive or half-open start/end semantics fixed in the kind contract, and milestones/gates with one date and semantic emphasis.
- Inputs stay JSON-safe strings; parse ISO dates deterministically without ambient timezone, locale, clock, or `Date` formatting. Reject invalid dates, reversed ranges, out-of-range items, duplicate row IDs, and tasks whose row/group is missing.
- Layout maps dates to a stable scale, shows labelled periods/ticks appropriate to the range, keeps task rows and group bands legible, and distinguishes milestones without colour alone. Do not duplicate the existing Editorial Timeline Component, which owns chronological narrative entries rather than duration bars.
- Description names the range and enumerates groups, tasks, dates/durations, and milestones. An enhanced terminal table/range view is optional; fallback must remain complete at narrow widths.

## Deliverables

Work in focused commits. When using sub-agents, give each a disjoint folder/test assignment and review every returned diff before integrating it.

1. **Validate the taxonomy against real cases and reader intent.** Before editing shared code, write a short implementation note in the branch or commit message mapping the read-only corpus cases to `flow`, `architecture`, `cycle`, `sequence`, and `timeline`, stating for each whether the reader needs a reference map or an intuition-building explanation. Only the reference cases justify this library. If a proposed kind has no real case, two kinds collapse to the same semantics, or a case is actually meaningful illustrative/interactive consumer work, stop and bring that evidence to the owner rather than manufacture an API. A distinct `state` kind is not part of this wave unless the corpus proves flow's decision/return grammar cannot represent it; adding one requires an ADR and updated programme contracts.
2. **Lock the common authoring budget.** Reuse the common accessibility, identifiers, paired role styles, validation errors, complexity limits, geometry constants, scene conformance, scene primitives, and text measurement authority. Add a shared primitive or semantic role only when at least two kinds truly need it. Give each kind measurable limits that reflect its actual layout problem, and make every over-budget refusal name the exceeded dimension plus a practical decomposition—overview plus sub-flow, fewer participants, shorter range, or split group—rather than merely saying the diagram is too complex. Do not create four near-identical validators, palettes, arrowheads, label wrappers, or XML branches. Keep kind-specific layout arithmetic inside its kind.
3. **Implement all four kind anatomies.** Each kind supplies readonly spec types, Metadata with `useWhen`/`notWhen` guidance and measurable budgets, CLI stance, validation, deterministic layout, semantic description, generic examples, and fixtures through the existing generated enrolment path. Do not edit generated union/dispatcher files. Public `DiagramSpec`, supported-kind metadata, generated author guidance, `renderDiagramSvg`, React Diagram, and Markdown resource support must accept each kind automatically after codegen, with no projection switch patched manually.
4. **Use small per-archetype layout, not a disguised graph engine.** Implement each algorithm directly from its semantic ordering and the shared geometry primitives. Preserve source/semantic order, stable tie-breaks, explicit bounds, conservative text wrapping, tight view boxes, and honest refusal limits. Do not generalise into constraint solving, force layout, arbitrary nested groups, free ports, or scene authoring. No code copied from third-party layout engines.
5. **Give every kind a complete terminal answer at birth.** Metadata must declare `description` or `enhanced`. Every description is lossless, deterministic, Unicode-independent plain text and names facts that geometry/colour would otherwise carry. Add enhanced modules only where a conservative viability function can preserve all facts through existing CLI authorities. At least one of cycle or sequence should receive an enhanced projection if the implementation evidence supports it; do not force enhancement merely to satisfy that preference. Architecture and timeline may validly remain description-only with a documented reason and fixtures proving the fallback.
6. **Exercise every projection through the registry.** For each kind, run the same spec through scene layout, standalone light/dark/adaptive SVG, React Diagram, CLI auto and description modes, React Markdown resource promotion, CLI Markdown promotion, and an interactive-browser document. Cross-projection tests compare semantic facts rather than visual syntax. A new kind that passes its local tests but cannot traverse a generated public projection is incomplete.
7. **Prove geometry per archetype.** Add kind-focused invariant and exact fixtures for minimum, representative, long-label, dense-but-supported, directional, highlighted, and invalid cases. Architecture tests cover container bounds/membership and relationship routing; cycle tests cover ring order, hub/spokes, upright text and direction, stage/hub/satellite clearance, labels kept off the ring and spokes, and arrowheads attaching with an unambiguous tangent; sequence tests cover participant order, message order/types, self messages and notes; timeline tests cover leap dates, month boundaries, scale/ticks, groups, tasks and milestones. Across all kinds assert finite/in-bounds geometry, no node/text overlap or connector-through-label/node defect within the promises of the kind, stable byte output, and predictable actionable refusal beyond limits.
8. **Test degradation rather than merely screenshotting beauty.** Every kind gets exact description output. Every enhanced kind gets standard/narrow/wide terminal frames across Unicode/ASCII and colour/no-colour, plus typed fallback tests. SVG/React tests verify that role/tone is accompanied by shape, label, line style, or description so colour is never the only distinction and that role colours express meaning rather than authored sequence. Long labels wrap without clipping, and density limits tell authors how to split an unreadable diagram rather than compressing it into illegibility.
9. **Curate the Catalogue as the visual grammar.** Add calm generic examples representing the four research archetypes: grouped architecture with labelled primary/return relationships; an ordered learning loop with optional shared hub; a participant sequence with calls/returns; and a multi-phase plan with tasks and a critical gate. Include minimal and stress examples, light/dark/adaptive static output, and CLI description/enhanced/fallback states. Keep titles and annotations generic and concise. Do not recreate the reference screenshots pixel-for-pixel.
10. **Update public guidance and change history.** Generate the mechanically derivable kind-purpose/budget facts from Metadata, then document the reader-intent choice among kinds, when flow is sufficient, when the need is illustrative/interactive rather than a Diagram, the semantic/complexity limits, and each CLI stance in `map/25-diagrams/README.md`, Component/Catalogue docs, public README/API examples, and `CHANGELOG.md` under **Unreleased**. Phrase the choice around the reader's verb and task rather than the subject noun. Add composition examples using `DataFigure` and Markdown resources. Regenerate through codegen and leave the Catalogue running with exact Diagram Web/CLI URLs in the handoff.

## Constraints

- Kinds are a closed package-owned canonical set, not Components, plugins, renderer callbacks, or externally registered layouts. One Diagram Component continues to project all of them.
- Preserve the dependency-free baseline. No Dagre, ELK, Graphviz, Mermaid, D2, font library, date library, WASM, binary, vendored code, or network service.
- No raw SVG/HTML/CSS/ANSI, author x/y coordinates, rich React labels, arbitrary shapes, free-form ports, icons, images, links, animation, or interaction.
- Every semantic fact appears in `describeDiagram`. Enhanced CLI is optional and must fall back rather than lose information. Visual parity is explicitly not required.
- Do not fork the shared scene, token palette, arrowheads, text measurement, safety, XML escaping, Markdown resolution, or terminal wrapping inside a kind.
- Public additions are documented and additive; generated files are never hand-edited; no version bump, release, or consumer edit.
- After the final edit, run `discern_prepare`, commit the resulting clean tree, then run `discern_done` once. Keep the Catalogue server alive after the gate.

## Out of scope

- A general statechart/UML/BPMN/C4 language, ER diagrams, mind maps, charts/data visualisation, maps, mathematical plots, network-scale graphs, arbitrary nested containers, or custom kinds.
- A diagram DSL, parser, editor, drag-and-drop, zoom/pan, animation, hyperlinks, tooltips, runtime measurement, or asset file I/O.
- Consumer-specific content or artwork, changes in `/Users/jack/Sites/discern`, package publication, dependency selection, or font embedding/subsetting.

## Definition of done

- **Measurable:** `architecture`, `cycle`, `sequence`, and `timeline` enrol through the one generated kind authority with complete spec/validation/layout/description/examples/CLI stance anatomy; each traverses SVG, React, CLI, Markdown, and interactive-browser projections; semantic, geometry, determinism, safety, accessibility, terminal degradation, future-enrolment, and Catalogue tests pass; taxonomy/limits/docs and the Unreleased changelog are current; `discern_done` is green on clean committed HEAD.
- **Semantic:** an author can choose a small grammar that matches the thing they are explaining and receive a consistently tasteful diagram plus a complete terminal explanation, while the API actively prevents the unconstrained layouts and density that make generated diagrams generic or unreadable.
- **Preview:** the Catalogue remains running and the handoff links the exact Diagram Web and CLI URLs, identifying which kinds use enhanced terminal frames and which deliberately use descriptions.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/diagram-system/_done/4a-diagram-kind-library.md`. After the green proof, run `discern_accept`; a recorded grant may land wave 4A, while a refusal means report the proof line and branch/worktree and stop for owner review. Do not dispatch wave 5A or publish a release.
