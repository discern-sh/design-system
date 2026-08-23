# Interface builder

The interface builder is the Catalogue's Beta composition instrument. It places real adapter Components on a themed canvas, saves an inert JSON document, and emits consumer-ready TSX plus the runtime Component selection. It is served at `/catalogue/builder/` by the Catalogue's existing `serve` and `watch` tasks.

The security and effect boundary is recorded in [ADR 0027](../_adr/0027-keep-builder-documents-inert.md).

## Product status

The builder is deliberately marked **Beta** in its own chrome and browser title. Its Catalogue link sits after the ordinary route and contextual navigation rather than among the primary destinations. The builder remains available for real composition work, but promotion into the Catalogue's primary navigation is an owner decision after further consumer use; the current document format must not be presented as a public hosted-builder API while that evaluation continues.

## Document and trust boundary

A document is a versioned tree of Component instances and literal text. Component `ReactNode` props hold ordered child slots. The pure tree authority is [`model.ts`](../../catalogue/builder/model.ts); pointer-to-root insertion geometry is isolated in [`placement.ts`](../../catalogue/builder/placement.ts).

Every route into live state uses the registry-derived policy in [`policy.ts`](../../catalogue/builder/policy.ts): file import, browser-storage restoration, inspector edits, history, preview, JSON save, runtime selection, and TSX export. Version `1` is checked explicitly; the parser has one version branch where a future migration can be added, but performs no implicit migration now.

Additional props must be a plain JSON object. They may preserve ordinary safe Component and DOM props, including `aria-*`, `data-*`, `class`, `className`, `style`, and safe URLs. They cannot shadow `children` or any canonical source prop, and cannot carry raw-HTML props, React identity or refs, executable handler names, prototype-sensitive keys, `srcDoc`, or executable URL schemes. The same recursive restrictions apply to JSON-valued modeled props, including nested objects. A rejection is a `BuilderDocumentError` naming the exact document path and reason. There is no lenient preview representation.

URL-bearing values enroll by the standard DOM URL-attribute names or a field-name suffix of `Href`, `Url`, or `Uri`; future Component data that reaches a navigation or resource sink must follow that naming contract. The browser's URL parser classifies the value, so control-character spellings cannot disguise a scheme. `javascript:`, `vbscript:`, and `data:` are rejected in modeled props, additional props, and nested JSON alike. Ordinary non-URL prose may still mention those strings.

Validation is iterative and completes before recursive render, export, or history work. [`BUILDER_DOCUMENT_LIMITS`](../../catalogue/builder/policy.ts) is the single authority for input, tree, slot, prop, identifier, string, and JSON-complexity ceilings. [`history.ts`](../../catalogue/builder/history.ts) bounds retained accepted snapshots from that same document population. The map records why those ceilings exist; their current numbers stay with the enforcing code and tests.

## Registry, controls, and preview

[`registry-index.ts`](../../catalogue/builder/registry-index.ts) derives the known slugs, modeled props, all canonical prop reservations, required function props, adapter exports, and default instances from the generated Catalogue registry. A future Component therefore joins the policy and inventory without manual registration.

Inspector controls derive in [`controls.ts`](../../catalogue/builder/controls.ts) from extracted source props, literal variants, and object shapes. Sibling and shared-module variants under `src/components/` remain part of that vocabulary. Structured objects use the row editor in [`object-editor.ts`](../../catalogue/builder/object-editor.ts) while retaining raw JSON as the stored value. When an opaque required data spec cannot be synthesized generically, its examples module may export `catalogueBuilderDefaults`; the generated registry binds that source-backed JSON into placement, preview, and consumer TSX instead of weakening the Component prop type. Rejected in-progress JSON and additional-prop text stays in local UI draft state; only a policy-accepted document enters history, autosave, preview, or export.

[`render.tsx`](../../catalogue/builder/render.tsx) is the one renderer used by the canvas and pure tests. The canvas supplies only Catalogue-local inspection decoration and inert preview functions for required callbacks. Palette previews are decorative and inert. The Table default is intentionally empty: its native row-group grammar is raw markup, which the inert document model does not author.

## Persistence and files

[`persistence.ts`](../../catalogue/builder/persistence.ts) owns guarded access to the document, recovery source, and theme preference in browser storage. A denied read or failed write trips a circuit breaker, leaves the in-memory document editable, and displays a durable alert with an explicit retry. A rejected stored document starts from a safe empty composition and preserves its exact source in memory and, when available, the separate recovery key. A later clean reload still exposes that recovery source.

File size is checked before `File.text()` against the 256 KiB ceiling. Read rejection and parse rejection leave the current document and history unchanged; load tokens prevent an older read from winning a race, and clearing the file input permits the same file to be retried. Save names use a deterministic lowercase slug with `composition.json` as the blank-name fallback. Download anchors and object URLs are cleaned up in a `finally` path. File and storage feedback is inline and announced; the builder opens no blocking alert or confirmation dialog.

## Export contract

[`export.ts`](../../catalogue/builder/export.ts) validates before emitting deterministic TSX from `@discern-sh/design-system/react`. The composition function identifier is derived from the document name, remains valid for blank, numeric, Unicode, and punctuation-only names, and cannot collide with an imported Component or generated type name. Props and imports have canonical ordering, JSON object keys are canonicalized, modeled values cannot be overridden by additional props, comments and strings are escaped, and literal newlines remain explicit `<br />` elements.

Required function props are not document data. The generated composition takes a typed callback object whose fields use `ComponentProps<typeof Component>["prop"]`; every callback-driven instance has a deterministic field, including repeated instances. This makes consumer wiring mandatory and visible instead of exporting a silent no-op. The runtime selection lists directly placed slugs in deterministic order; the emitter owns dependency closure. [`cost.ts`](../../catalogue/builder/cost.ts) reports that closure's Component CSS bytes and behaviour-script requirement.

The class-level inventory generates representative and adversarial documents for every placeable Component, formats their TSX, and type-checks it against `@discern-sh/design-system/react`. It also guards source-derived select and object controls, canonical prop reservations, default rendering, and the rule that a newly omitted required prop must be a function covered by the callback contract.

## Keyboard and adaptive workspace

The canvas is one named, focus-visible inspection and scroll surface. Its rendered links, buttons, fields, media, and editable descendants are hidden from assistive technology and removed from sequential focus; the outline and inspector are the complete semantic selection and editing route. Global Delete/Backspace and undo/redo ignore events owned by links, buttons, inputs, file controls, disclosures, editable content, roles, or explicit tab stops.

Placement, selection, text and prop editing, duplicate, delete, wrap, sibling move, undo/redo, file save/load, and slot insertion all work without drag. The outline and inspector expose named move actions for Component and text nodes. After structural changes, focus moves to the surviving sibling, parent, Composition heading, or newly selected inspector as appropriate. Placement, movement, deletion, load, recovery, save, and failure feedback use live status or alert regions.

At widths above 1,180 CSS pixels, Palette, Canvas, and Inspector remain visible as the three-pane workspace. At and below 1,180 pixels—including the 900-pixel intermediate posture, 390-pixel phone, and 320-CSS-pixel/400%-zoom posture—a roving tablist exposes exactly one persistent pane without discarding document, selection, search, or inspector state. Phone chrome wraps and scrolls within bounded regions, the shell uses `100dvh` with a legacy fallback, and coarse pointer controls meet a 44-pixel target. All chrome has token-based `:focus-visible` treatment and explicit forced-colour focus and selection styles.

The shell pairs the UI font with the design system's UI-only OpenType feature token. Every builder-owned switch to display or mono resets that inherited feature set; otherwise discretionary UI alternates can turn ordinary display-font letters into historical forms. A structural unit guard enrolls explicit role changes, and the browser gate checks the computed feature state of rendered builder-chrome headings.

Native drag remains an enhancement. Root empty-space drops use pointer geometry to choose the first, middle, or final sibling boundary and draw a stable insertion line. Node/slot drops, outline-before drops, explicit end-of-page drops, subtree protection, and keyboard move buttons retain their separate semantics.

## Browser proof

[`builder-conformance.ts`](../../scripts/builder-conformance.ts) composes into the existing build, server, Chromium, axe, viewport, console-error, and screenshot lifecycle in [`conformance.ts`](../../scripts/conformance.ts). It does not create a second harness.

The gate covers both themes and every supported workspace posture; page overflow; axe WCAG A/AA 2.1/2.2; finite visible keyboard focus; canvas-internal inertness; click and touch placement; selection, edit, move, delete, undo, redo, save, successful and failed load; storage denial, quota, corrupt recovery, and file-read rejection; shortcut isolation; forced colours; the Beta label; and builder-chrome font-role isolation. The conformance summary reports the measured populations on each run instead of duplicating volatile totals in the map. Review sheets remain under `dist/conformance/` for wide light and narrow dark postures.

## Boundary and authorities

The builder remains Catalogue-only. Nothing under `catalogue/builder/` is in the JSR publish set, and neither the neutral package root nor CLI graph imports React or the builder policy. Source documents are data, not a hosted builder API, HTML format, JSX format, or code-execution surface.

| Concern                                  | Authority                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| Tree and immutable operations            | [`model.ts`](../../catalogue/builder/model.ts)                           |
| Root pointer geometry                    | [`placement.ts`](../../catalogue/builder/placement.ts)                   |
| Document/value acceptance and limits     | [`policy.ts`](../../catalogue/builder/policy.ts)                         |
| Bounded undo/redo                        | [`history.ts`](../../catalogue/builder/history.ts)                       |
| Storage, recovery, and file reads        | [`persistence.ts`](../../catalogue/builder/persistence.ts)               |
| Control/default/registry facts           | [`registry-index.ts`](../../catalogue/builder/registry-index.ts)         |
| Shared canvas/test renderer              | [`render.tsx`](../../catalogue/builder/render.tsx)                       |
| TSX, selection, and JSON export          | [`export.ts`](../../catalogue/builder/export.ts)                         |
| Dependency closure and cost              | [`cost.ts`](../../catalogue/builder/cost.ts)                             |
| Workspace state, focus, and interactions | [`app.tsx`](../../catalogue/builder/app.tsx)                             |
| Adaptive and focus presentation          | [`builder.css`](../../catalogue/builder/builder.css)                     |
| Pure class-level guards                  | [`builder_test.ts`](../../tests/builder_test.ts)                         |
| Persistence and history guards           | [`builder_persistence_test.ts`](../../tests/builder_persistence_test.ts) |
| Real-browser builder proof               | [`builder-conformance.ts`](../../scripts/builder-conformance.ts)         |
