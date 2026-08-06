# Interface builder

The interface builder is the Catalogue's visual composition surface: a drag-and-drop page editor that places real adapter Components on a live themed canvas and exports consumer-ready source. It serves at `/style-guide/builder/` from the same dev server as the Catalogue (`deno task serve` or `deno task watch` on the worktree's assigned port), and the Catalogue sidebar links to it.

## What it edits

A builder document is a serializable tree: Component instances with configured props, whose `ReactNode` slots hold further instances or literal text. The tree lives in [`model.ts`](../../styleguide/builder/model.ts) with pure operations (insert, move with subtree protection, nudge, duplicate with fresh ids, prop and text updates). The current document autosaves to `localStorage` and round-trips through a validated JSON save format for files.

## Where its knowledge comes from

Everything the builder knows is derived — it adds no authored metadata anywhere:

- The palette is the generated Catalogue registry in canonical Group order, searchable and filterable by purpose, exactly like the Catalogue's own index.
- Inspector controls derive in [`controls.ts`](../../styleguide/builder/controls.ts) from each entry's extracted prop documentation and literal-union variants: booleans become toggles, literal unions become selects (numeric literals stay numbers), `ReactNode` props become slots, `ReactElement` props become element-only slots that start empty, structural types become JSON editors, and event handlers are excluded. Components whose props form a source union (Button, Mention, Agent mention) reconstruct their shared surface from their variant type aliases plus a children slot; anything further enters through the additional-props JSON field.
- Required controls receive synthesized defaults so a freshly placed Component renders immediately; required structural JSON and element-only slots wait for the user instead.
- The canvas and the tests share one renderer, [`render.tsx`](../../styleguide/builder/render.tsx), so preview and export can never disagree. Required function props render as no-ops; exports leave them for the consumer to wire.

## Export surfaces

[`export.ts`](../../styleguide/builder/export.ts) emits deterministic consumer TSX importing from `@discern-sh/design-system/react` — the same idiom consumer sites author marketing pages in — plus the `components: […]` runtime-selection line a consumer pastes into its emitter bundle config. The selection lists only directly placed Components; the emitter owns dependency closure.

[`cost.ts`](../../styleguide/builder/cost.ts) resolves that closure against the package manifest and reports the exact Component CSS bytes and whether the composition needs the emitted behavior script, live as the document changes.

## Boundaries

- The builder is styleguide-only: nothing under `styleguide/builder/` is published to JSR, and the neutral core stays React-free.
- Canvas selection and drag attribution ride on `data-discern-builder-*` attributes passed through Component prop spreads; an instance of a Component that does not spread unknown props is still fully editable through the outline and inspector.
- Canvas clicks select instead of activating — interactive Component behavior is exercised in the Catalogue, not the builder.

## Where it lives

| Concern                                    | Authority                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Document model and tree operations         | [`model.ts`](../../styleguide/builder/model.ts)                        |
| Control derivation and default synthesis   | [`controls.ts`](../../styleguide/builder/controls.ts)                  |
| TSX, selection, and JSON export            | [`export.ts`](../../styleguide/builder/export.ts)                      |
| Dependency-closure cost                    | [`cost.ts`](../../styleguide/builder/cost.ts)                          |
| Registry lookups and adapter resolution    | [`registry-index.ts`](../../styleguide/builder/registry-index.ts)      |
| Shared canvas/test renderer                | [`render.tsx`](../../styleguide/builder/render.tsx)                    |
| Builder chrome and interactions            | [`app.tsx`](../../styleguide/builder/app.tsx)                          |
| Class-level guarantees for every Component | [`builder_test.ts`](../../tests/builder_test.ts)                       |
