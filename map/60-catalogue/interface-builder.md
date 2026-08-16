# Interface builder

The interface builder is the Catalogue's visual composition surface: a drag-and-drop page editor that places real adapter Components on a live themed canvas and exports consumer-ready source. It serves at `/catalogue/builder/` from the same dev server as the Catalogue (`deno task serve` or `deno task watch` on the worktree's assigned port), and the Catalogue sidebar links to it.

## What it edits

A builder document is a serializable tree: Component instances with configured props, whose `ReactNode` slots hold further instances or literal text. The tree lives in [`model.ts`](../../catalogue/builder/model.ts) with pure operations (insert, move with subtree protection, nudge, duplicate with fresh ids, prop and text updates). The current document autosaves to `localStorage` and round-trips through a validated JSON save format for files.

## Where its knowledge comes from

Everything the builder knows is derived — it adds no authored metadata anywhere:

- The palette is the generated Catalogue registry in canonical Group order, searchable and filterable by purpose, exactly like the Catalogue's own index. Each palette card carries a live, scaled-down render of the Component's default instance, mounted lazily as it scrolls into view; a Component whose defaults cannot render shows a neutral glyph instead.
- Inspector controls derive in [`controls.ts`](../../catalogue/builder/controls.ts) from each entry's extracted prop documentation and literal-union variants: booleans become toggles, literal unions become selects (numeric literals stay numbers), `ReactNode` props become slots, `ReactElement` props become element-only slots that start empty, structural types become JSON editors, and event handlers are excluded. Components whose props form a source union (Button, Mention, Agent mention) are documented by the build's branch merge — the extraction resolves each branch alias through its common interface and merges to the shared surface — so they carry real controls, not a guessed children slot. Variant unions and object interfaces declared in shared modules under `src/components/` (e.g. `layout/space.ts`, home of `SpaceStep`) join the extraction, so cross-module unions such as layout gaps derive as selects.
- A JSON control whose type resolves to a known object interface (directly or as an array of it) edits as structured rows — one field per member, with add/remove for arrays — while the JSON string stays the stored value and raw editing stays one disclosure away ([`object-editor.ts`](../../catalogue/builder/object-editor.ts)).
- Required controls receive synthesized defaults so a freshly placed Component renders immediately; required structural JSON and element-only slots wait for the user instead.
- The canvas and the tests share one renderer, [`render.tsx`](../../catalogue/builder/render.tsx), so anything the builder exports previews identically. Newlines in literal text render as explicit `<br />` line breaks, and the TSX export emits the same breaks. Required function props render as no-ops; exports leave them for the consumer to wire. The canvas alone renders leniently — a mid-edit invalid JSON value is omitted rather than fatal — while export refuses invalid JSON outright.

## Export surfaces

[`export.ts`](../../catalogue/builder/export.ts) emits deterministic consumer TSX importing from `@discern-sh/design-system/react` — the same idiom consumer sites author marketing pages in — plus the `components: […]` runtime-selection line a consumer pastes into its emitter bundle config. The selection lists only directly placed Components; the emitter owns dependency closure.

[`cost.ts`](../../catalogue/builder/cost.ts) resolves that closure against the package manifest and reports the exact Component CSS bytes and whether the composition needs the emitted behavior script, live as the document changes.

## Boundaries

- The builder is Catalogue-only: nothing under `catalogue/builder/` is published to JSR, and the neutral core stays React-free.
- Canvas selection and drag attribution ride on `data-discern-builder-*` attributes passed through Component prop spreads; an instance of a Component that does not spread unknown props is still fully editable through the outline and inspector.
- Canvas clicks select instead of activating — interactive Component behavior is exercised in the Catalogue, not the builder.
- The inspector navigates by breadcrumb (Composition › ancestors › selection), and any selection can be wrapped in a layout Component (Stack, Cluster, Section, Container) in place — the design system's own way to control spacing, since Components carry no margin props.
- The builder chrome dogfoods the design system where it fits: its dropdowns are the Select Component, as is the Catalogue's purpose picker.

## Where it lives

| Concern                                    | Authority                                                         |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Document model and tree operations         | [`model.ts`](../../catalogue/builder/model.ts)                   |
| Control derivation and default synthesis   | [`controls.ts`](../../catalogue/builder/controls.ts)             |
| TSX, selection, and JSON export            | [`export.ts`](../../catalogue/builder/export.ts)                 |
| Structured object-prop editing             | [`object-editor.ts`](../../catalogue/builder/object-editor.ts)   |
| Dependency-closure cost                    | [`cost.ts`](../../catalogue/builder/cost.ts)                     |
| Registry lookups and adapter resolution    | [`registry-index.ts`](../../catalogue/builder/registry-index.ts) |
| Shared canvas/test renderer                | [`render.tsx`](../../catalogue/builder/render.tsx)               |
| Builder chrome and interactions            | [`app.tsx`](../../catalogue/builder/app.tsx)                     |
| Class-level guarantees for every Component | [`builder_test.ts`](../../tests/builder_test.ts)                  |
