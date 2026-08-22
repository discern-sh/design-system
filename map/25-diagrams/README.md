# Diagrams

The diagram subsystem owns semantic, documentation-scale diagrams between author data and presentation. Start at [`src/diagram/mod.ts`](../../src/diagram/mod.ts) for the neutral boundary, then follow the generated kind authority under [`src/generated/`](../../src/generated/) to a kind folder under [`src/diagram/kinds/`](../../src/diagram/kinds/). Universal scene validity belongs to the shared conformance pass; a kind owns only its semantic validation and deterministic layout.

[ADR-0028](../_adr/0028-own-diagrams-as-typed-semantics-and-neutral-scenes.md) records why typed specs, a closed scene, generated built-in kinds, description-first terminals, and independent SVG postures form one boundary.

The foundation is internal until the first complete projection slice lands. It does not yet add a package export, React Component, SVG serializer, terminal frame, Markdown resource, or Catalogue surface. `DataFigure` continues to frame caller-owned visuals and surrounding figure prose; Markdown continues to treat ordinary images through its existing semantic-inline model. Neither is an integration point in the neutral foundation.
