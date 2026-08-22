# ADR 0028: Own diagrams as typed semantics and neutral scenes

**Status**: accepted

## Context

The package can frame caller-owned figures and preserve Markdown image meaning, but it has no reusable diagram model. A diagram surface has to serve browser, standalone SVG, ordinary Markdown, and terminals without making one projection parse another. It must also retain deterministic bytes, live token theming where a design-system root exists, portable files where it does not, and a React-free neutral and CLI graph. General graph engines and renderer-authored coordinates each surrender part of that contract, while separate models per surface make accessibility and topology drift.

The first use cases are small documentation diagrams whose relationships matter more than arbitrary graphical freedom. Their authors need a constrained typed vocabulary and actionable density refusals, not a drawing API or a new language. The kind library will grow, so its membership and required surfaces must enrol from one authority rather than from parallel registries.

## Decision

Diagrams use a three-part architecture: a recursively readonly, JSON-safe `DiagramSpec` states accessible context and kind-specific semantics; the selected built-in kind validates and lays that spec into one closed, immutable `DiagramScene`; independent projections consume the validated semantics or scene. The scene contains only finite geometry, ordering, grouping, and semantic style roles. It contains no JSX, CSS or token values, SVG/XML, ANSI, environment facts, or caller-authored escape hatch. One shared post-layout conformance pass guards universal bounds, clearance, shape attachment, and prohibited intersections before a scene reaches a projection.

`DiagramSpec`, `DiagramScene`, `DiagramKindMeta`, `diagramAltText`, and `describeDiagram` are the stable names for this boundary. Every spec authors one non-empty title and summary. `diagramAltText` derives the canonical concise title-and-summary alternative; it is not another authored field. `describeDiagram` validates through the same generated kind dispatch and preserves accessible context, entities, annotations, topology, relationship labels, and emphasis in plain text. This lossless description is the universal terminal contract. A kind may later add an enhanced pure CLI projection, but it must declare that stance at birth and fall back to the description whenever enhancement cannot preserve meaning.

There is one Editorial `Diagram` Component and many diagram kinds. Kinds are not Components, Catalogue registrations, or public plugins. Each kind owns typed spec data, author guidance, measurable budgets, validation, layout, description, fixtures, and a CLI stance in a fixed folder anatomy. Codegen discovers kind Metadata and derives the spec union, registry, exhaustive layout/description dispatch, and exports together. Unknown kinds fail; no default silently absorbs a future member.

Authoring in the first version is typed TypeScript data. Kinds expose restrained semantic emphasis but not raw presentation. There is no diagram DSL, raw SVG or HTML, arbitrary coordinates or ports, parser plugin, custom-kind API, callback, React node, style class, or environment-dependent layout. The dependency-free baseline uses repository code and platform primitives; an external engine can be proposed only after the owned baseline is measured and through a later decision.

Browser and file SVG have different token postures without different geometry. The live React Component resolves semantic scene roles through design-system custom properties under the opted-in root. A standalone SVG resolves the selected light, dark, or adaptive token values into a self-contained file and never assumes CSS custom properties cross an external-image boundary. Neither projection owns layout.

Standard Markdown remains ordinary image syntax. The planned Markdown integration accepts an explicit source-to-spec resource supplied by the caller: a matching image may project the live diagram in browser and its terminal form in CLI, while an unmatched image keeps existing behaviour. Markdown parsing does not become a diagram parser, and no renderer reads files or fetches URLs.

Accessibility is semantic input and tested output. Title and summary remain the image-level authority; the structural description carries every relationship that position or colour might otherwise hide; SVG title/description and Markdown naming derive from those same facts. Visible figure title, caption, legend, and source remain optional `DataFigure` or surrounding-document concerns rather than duplicated canvas prose.

## Consequences

Every projection receives one validated geometry and cannot quietly reinterpret topology. Equal inputs can produce equal scenes, descriptions, SVG, and terminal output because ordering, metric data, precision, limits, and failures are package-owned. A future kind enters all required surfaces or fails generation and type checking.

The package deliberately accepts less authoring freedom and a smaller graph family than general-purpose diagram tools. Unsupported graphs and excessive density fail with a named remedy instead of receiving an approximate drawing. Adding a new semantic kind is package work rather than consumer extension, and changing the scene vocabulary or author contract carries normal public-API review once the entrypoint ships.

Standalone and live SVG must maintain two role-resolution strategies and prove their equivalence without sharing emitted colour bytes. The terminal edition may be visually simpler than SVG; its obligation is lossless meaning, not visual parity.

## Alternatives considered

Publishing raw scene coordinates or SVG snippets would make unusual diagrams easy but turn validation, accessibility, theming, and responsive correctness into caller responsibilities. A Markdown DSL or parser plugin would make diagrams convenient to embed while creating a second language, parser safety boundary, and non-standard raw-document form. Letting SVG, React, and CLI each lay out semantics would reduce the neutral core but guarantee geometry and accessibility drift. Adopting a general graph engine first would broaden graph support at the cost of the dependency-free, deterministic, auditable baseline before the documentation corpus proves that cost necessary.
