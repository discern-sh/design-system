# Component detail

The detail route is an adoption instrument: inspect the real specimen, make focused adjustments, and copy a truthful working starting point. Title, specimen, essential controls, and open adoption actions form the hierarchy; raw implementation links are the secondary evidence row at the bottom of the card, and Usage guidance plus Props and variants stay closed disclosures.

Views are One example (default), All, States, and Playground, chosen with the public SegmentedControl beside the Web/CLI surface choice; the canonical example select applies to the example views. The page modules live in [`catalogue/pages/components/`](../../catalogue/pages/components/) — `detail-page.tsx`, `detail-state.ts`, `detail-stage.tsx`, `detail-playground.ts(x)`, `detail-states.tsx` — with [`component-detail.css`](../../catalogue/styles/component-detail.css), [`tests/catalogue_component_detail_test.ts`](../../tests/catalogue_component_detail_test.ts), and [`scripts/conformance/catalogue/component-detail.ts`](../../scripts/conformance/catalogue/component-detail.ts) per the [ownership seams](ownership-seams.md). `ComponentSpecimen` and `ComponentExampleControl` keep the call contract Compare consumes; `ComponentSurfaceControl` keeps its button semantics for Compare alone.

## One authority for editable usage

The playground's single authority is a **Builder-backed starter model**, not derived canonical-example source: [`registry-core.ts`](../../catalogue/builder/registry-core.ts) seeds one policy-accepted node per Component, [`render.tsx`](../../catalogue/builder/render.tsx) paints it, and [`export.ts`](../../catalogue/builder/export.ts) emits its TSX and runtime selection, so the editable specimen and the copied code consume the same model and cannot disagree. Canonical examples remain authored `.examples.tsx` renderers whose source carries repository-local imports; copying them verbatim would hand a consumer unresolvable code, which is why they are browsed live but never exported as usage. The starter is labelled a starter and never presented as the canonical example.

Eligibility derives from the Builder's `rendersFromDefaults`: a Component whose required element-only slots or structural JSON lack source-backed defaults reports that reason instead of fabricating a render. Consumer callbacks are witnessed in the preview and exported as the explicit typed callback contract. The type-correctness of every Component's exported starter TSX is guarded at the Builder authority ([`tests/builder_inspector_test.ts`](../../tests/builder_inspector_test.ts)); detail tests add the render↔code same-model guarantee and the whole-registry eligibility sweep. Field widgets are the shared Builder inspector fields, styled by [`control-fields.css`](../../catalogue/builder/styles/control-fields.css).

## Inspection stage and the state strip

Fit fills the actually allocated canvas; 360/720/1000 are URL-reproducible exact widths confirmed by a live measured readout. The stage owns its own horizontal scrolling behind a dashed boundary so a fixed preview canvas is never mistaken for page overflow, while the component's own scrolling keeps its overflow cues inside the specimen. Expand widens the detail column to the full main allocation. Width controls shape Web canvases only; CLI frames keep their fixed column projection.

States presents each canonical Web example as its committed generated snapshot from the [example-images authority](../../catalogue/example-images.ts), captioned as not operable, with authored review postures linked into the existing [review instrument](visual-review.md) and the live example one link away — no second screenshot runner, and focus-owning examples are never mounted simultaneously.

## URL state

`surface`, `example`, `view` (`all`/`states`/`playground`), `width` (`narrow`/`standard`/`wide`), `expanded`, shared Appearance, and the [discovery return context](component-discovery.md); comfort defaults are omitted and fragments stay reserved for the example views. The Playground is Web-only and states that contract on the CLI surface with the standard unavailable panel.
