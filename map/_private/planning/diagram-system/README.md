# Diagram system programme

Briefs for making diagrams a first-class, package-owned surface in `@discern-sh/design-system`: one typed semantic model; deterministic layout into an internal scene; tasteful token-driven SVG for React and standalone Markdown assets; and a first-class terminal projection for `renderMarkdownCli` and the interactive Markdown browser.

The programme follows two complementary research passes. Inspection of `cathrynlavery/diagram-design` showed that its quality comes from a disciplined visual grammar, density budgets, layout constraints, and review gates around agent-authored static SVG—not from a reusable layout engine. A broader tool survey found capable specialists, but none simultaneously satisfy this package's deterministic byte contract, token-only theming, accessible SVG, React-free neutral/CLI graphs, standard-Markdown delivery, and Discern's terminal reader. The resulting architecture owns a deliberately small diagram system and defers all optional dependency choices until the owned baseline can be measured.

This is a package programme. Waves 1–5 make the design-system surface complete and consumer-shaped but do not edit the sibling Discern product, publish a release, add a diagram authoring CLI, or create a general-purpose diagram language. After those waves land, the owner can release with the `release` skill and create a separate downstream programme in the Discern repository to adopt the published API in its documentation build and `discern docs` reader.

Every brief is a self-contained prompt for a fresh agent. Dispatch one wave only after every lower shipping wave has landed on `main`. Wave 4 may use sub-agents inside its one coordinating worktree for disjoint kind folders, but this programme deliberately avoids concurrent worktrees: every wave meets in the diagram kind registry, generated exports, Catalogue, Markdown model, release guards, or shared documentation.

## Fixed programme contracts

Change one only through an explicit ADR and an update to every unstarted brief.

| Fact                       | Contract                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Programme goal             | A consumer can author one readonly, JSON-safe `DiagramSpec`, render it as deterministic accessible SVG or a React `Diagram`, and pass the same spec through Markdown to a meaningful terminal rendering without owning layout, SVG, accessibility, or terminal presentation code.                                                                                                                                              |
| Architectural boundary     | `DiagramSpec → validate/layout → DiagramScene → projection`. Specs contain meaning and restrained author hints; kinds own layout; the internal scene owns geometry; SVG, React, and terminal projections never parse one another's output. Neutral diagram and CLI graphs never import React.                                                                                                                                  |
| Component shape            | There is one Editorial `Diagram` Component with full React/CSS/Metadata/examples/CLI anatomy. Diagram kinds are a separate generated canonical set, not Components and not Catalogue registrations. `DataFigure` remains the optional authority for a title, legend, caption, and source around a diagram.                                                                                                                     |
| Authoring                  | V1 uses typed TypeScript data modules. There is no fenced Markdown DSL, free-form SVG, arbitrary HTML/CSS, parser plugin, canvas editor, or author-supplied pixel coordinate escape hatch. Standard Markdown continues to reference generated `.svg` files with ordinary image syntax.                                                                                                                                         |
| Kind enrolment             | Every kind owns typed spec data, validation, semantic description, layout, examples/fixtures, and a declared CLI projection stance. Codegen discovers the set and fails when a required surface is missing. Generated registries and dispatchers are never hand-edited.                                                                                                                                                        |
| Initial library            | `flow` is the dependency-free vertical slice. The completed library adds `architecture`, `cycle`, `sequence`, and `timeline`; state-machine and decision-tree cases use `flow` unless the real corpus proves a distinct grammar is necessary.                                                                                                                                                                                  |
| Terminal contract          | `describeDiagram(spec)` is the universal, lossless textual fallback. A kind may declare an enhanced pure CLI projector; `renderDiagramCli` uses it only when the projector can preserve meaning within explicit capabilities and width, otherwise it falls back to the description. Visual parity with SVG is not a goal.                                                                                                      |
| Markdown bridge            | An isolated standard Markdown image is promoted only when the caller supplies an explicit source→spec resource. Browser Markdown may render the live `Diagram`; CLI Markdown and the interactive browser call `renderDiagramCli`. Without a matching resource, current image behavior is unchanged. No renderer reads files or fetches URLs.                                                                                   |
| SVG contract               | `renderDiagramSvg` returns a complete, deterministic, portable SVG string with semantic text, `role="img"`, a title and description from the same accessibility authority, namespaced classes, and no scripts, `foreignObject`, external fetches, event attributes, raw markup, random IDs, or environment reads. Standalone light, dark, and adaptive output use resolved token values; React uses live design-system tokens. |
| Accessibility              | Every diagram is informative and requires a non-empty accessible title and summary. One canonical short alternative derived from both feeds raw-Markdown alt and image-level naming; a fuller structural plain-text equivalent feeds terminal fallback. Meaning is never encoded only by colour or position; unknown or invalid content fails before partial rendering. Decorative artwork remains the Artwork group's job.    |
| Visual character           | Calm editorial canvas; generous whitespace; restrained borders and semantic accent; rounded but not pill-like nodes; short sans-serif primary labels and optional mono annotations; orthogonal or simple curved connectors; consistent arrowheads; deliberate hierarchy; no ornamental gradients, shadows, icon soup, or automatic legends. Complexity limits prompt authors to split unreadable diagrams.                     |
| Determinism and safety     | Equal spec and options produce byte-identical SVG, descriptions, scenes, and CLI frames. IDs, ordering, number formatting, wrapping, validation limits, and tie-breaking are explicit. Labels are plain text and every emitted XML/control boundary escapes or rejects hostile input.                                                                                                                                          |
| Dependencies and licensing | Waves 1–5 add no runtime or build dependency. Any later dependency must have an inspected direct and transitive licence graph compatible with both this package's Apache-2.0 distribution and the Discern consumer's `FSL-1.1-ALv2`; uncertainty is a stop, not an inferred approval. Wave 6 evaluates options but cannot add one.                                                                                             |
| Versioning                 | No implementation brief bumps package versions or publishes. Waves 2–5 add `CHANGELOG.md` entries under **Unreleased**. The owner uses the `release` skill after the shipping lane and adversarial review.                                                                                                                                                                                                                     |
| Worktree names             | Pass these literal names to `discern_start`: `diagram-1a`, `diagram-2a`, `diagram-3a`, `diagram-4a`, `diagram-5a`, and `diagram-6a`.                                                                                                                                                                                                                                                                                           |

## Implementation consequences

The following sharpen how the fixed contracts are enforced; they do not add a public surface or change the architecture above:

- Diagram kinds are the reference/documentation family: a reader can inspect and revisit their precise relationships. Meaningful intuition-building physical schematics, spatial metaphors, animation, or controls remain consumer-owned; package Artwork remains semantically disposable decoration.
- A kind's layout is not complete until one shared package-private scene-conformance authority has proved universal bounds, text/arrowhead clearance, connector attachment, and prohibited intersections. Lines terminate at shape boundaries rather than depending on an occluding fill.
- Kind Metadata follows the existing `useWhen`/`notWhen` convention and owns measurable complexity budgets alongside the CLI stance. Generated author guidance and validation derive from those facts; an over-budget refusal names the exceeded dimension and a practical split/decomposition remedy.
- Accessible title and summary name and describe the diagram without becoming duplicate visible canvas prose. `DataFigure` or the surrounding document owns visible title, caption, source, and explanation.
- Semantic scene roles resolve through typed paired style bundles: node/container roles keep surface, border, primary ink, annotation ink, and non-colour cue together; connector roles keep stroke, marker, and line treatment together. Colour communicates meaning rather than authored sequence.
- Committed font-metric data is deterministic and bound to inspected bundled-font bytes. Browser measurement may calibrate or audit it on demand, but routine codegen and runtime layout never capture host-dependent metrics.

## Waves and dispatch order

| Key | Brief                                                                                   | Internal parallelism                                                      | Starts when                                                    |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1A  | [Establish the neutral diagram foundation](_done/1a-neutral-foundation.md)              | One architectural agent                                                   | Complete                                                       |
| 2A  | [Ship the first complete Diagram surface](2a-shipped-diagram-surface.md)                | One integrating agent                                                     | 1A has landed                                                  |
| 3A  | [Project diagrams through Markdown and the terminal reader](3a-markdown-integration.md) | One integrating agent                                                     | 2A has landed                                                  |
| 4A  | [Complete the diagram-kind library](4a-diagram-kind-library.md)                         | One coordinator; up to four disjoint kind sub-agents in the same worktree | 3A has landed                                                  |
| 5A  | [Harden the complete surface for release](5a-production-hardening.md)                   | One adversarial hardening agent; read-only audits may fan out             | 4A has landed                                                  |
| 6A  | [Evaluate optional diagram dependencies](6a-dependency-review.md)                       | One research/decision agent; read-only candidate checks may fan out       | 5A has landed; optional and non-blocking for the first release |

This is an independently landed sequence, not a below-trunk branch stack. Do not dispatch a higher shipping wave early. Each brief verifies its prerequisite on the then-current `main` before it creates a normal worktree, so there is no guessed branch name or manual dependency relay. Wave 6 is an optional post-baseline decision checkpoint: it may run before or after the first release, but it never changes that release's dependency-free implementation.

## Why the public Component arrives in wave 2

Wave 1 intentionally creates only the neutral internal foundation, first kind, codegen authority, and tests. Publishing a React Component in wave 1 and adding terminal support later would violate the repository's fixed Component anatomy and make a temporary CLI exemption part of the public history. Wave 2 therefore lands the dedicated `./diagram` entrypoint, standalone SVG emitter, React Component, and rendered CLI Component together as one vertical slice. Wave 3 then integrates that complete surface into the already-public Markdown contracts.

## Downstream handoff after release

Actual Discern adoption is intentionally not a seventh brief in this folder. It belongs to `/Users/jack/Sites/discern` under that repository's instructions and can begin only after the owner publishes a known design-system version; a cross-repository brief written now would either guess that version or ask one worktree to mutate two projects and move this project's housekeeping file.

After wave 5 is reviewed and released, use `discern-delegate-work` in the Discern repository to create a consumer programme with these fixed outcomes: pin the released package under Discern's existing dependency policy; author real typed specs beside their documentation authority; generate committed or build-owned SVG assets deterministically without adding a user-facing CLI; keep ordinary image syntax in raw Markdown; supply source→spec resources to both the web Markdown surface and every `MarkdownBrowserDocument` used by `discern docs`; prove web/raw/terminal equivalence and update detection; remove product-local diagram artwork only where the package surface genuinely supersedes it; and run the consumer's FSL/licence, documentation, browser, and terminal gates. Re-read the live consumer before turning that outline into prompts—the package API and consumer corpus will both have changed by then.

## Landing authority

Every wave stops for owner review unless discern records a grant. After `discern_done` passes on the final committed tree, the agent runs `discern_accept`. A standing or per-worktree grant may land it; without one, the verb refuses without mutation and the agent reports the proof line and branch/worktree for review. Prose in a brief is never landing authority.

The planning package itself follows the same rule. It must land before `diagram-1a` is dispatched, because each implementation wave moves its own committed brief into `_done/`.

## Review loop

When a wave reports green, review its branch diff against `main`, verify every deliverable and compatibility promise, rerun the gate against that worktree, inspect any SVG/CLI artifacts and Catalogue URL, and re-read the next unstarted brief against the API that actually landed. Look especially for:

- a second scene/model/layout authority hidden inside React, SVG, CLI, or Markdown;
- hand-authored coordinates or raw SVG presented as an extensibility mechanism;
- silent truncation, overlap, crossing, or unsupported graph shapes disguised as tasteful output;
- connectors that cross unrelated nodes or labels, terminate behind an occluding fill, or leave arrowheads outside the scene bounds;
- accessibility prose, Markdown alt text, and terminal descriptions drifting apart;
- accessible title/summary facts duplicated as visible canvas prose instead of remaining with `DataFigure` or the surrounding document;
- a kind that bypasses generated enrolment or omits its CLI stance;
- CSS variables assumed to cross an external `<img>` boundary;
- a node/container or connector treatment that bypasses the one paired role-style authority and assembles mismatched presentation facts;
- unstable IDs, floating-point serialization, object iteration, host-generated font measurements, or environment reads breaking determinism;
- density-limit errors that reject without naming the exceeded budget and a practical split/decomposition remedy;
- enhanced terminal art that drops facts instead of declining to the textual fallback;
- React or a new dependency entering the neutral/CLI graph;
- copied algorithms or assets without provenance and compatible licensing;
- generated files hand-edited, tests weakened, or a consequential decision left outside an ADR.

Each completed wave moves its own brief into `_done/` in its final commit. After wave 5 lands and passes adversarial review, the surface is ready for the owner's release workflow and a separate Discern adoption programme. Wave 6 can then say whether a measured limitation justifies proposing any dependency-backed follow-up.
