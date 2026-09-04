# Interface builder

The interface builder is the Catalogue's Beta composition instrument. It authors an inert tree of real browser Components, previews that accepted tree in a true browser frame, saves one guarded local working document, and emits consumer-ready TSX, runtime selection, and Builder JSON. It is served at `/catalogue/builder/`; it is not part of the published package.

The security and effect boundary is recorded in [ADR 0027](../_adr/0027-keep-builder-documents-inert.md). Named local drafts and wider file management remain an explicit owner decision in [`discern/TODO.md`](../../discern/TODO.md), not a second persistence model hidden inside the current workspace.

## Composition boundary

[`app.tsx`](../../catalogue/builder/app.tsx) is the browser bootstrap and [`workspace/workspace.tsx`](../../catalogue/builder/workspace/workspace.tsx) composes the feature surfaces. Neither is a fallback authority for feature logic. Preview, discovery, tree/Layers, and Inspector own their matching directories and styles. Their shared seams are the accepted-document store, registry projections, selection/insertion projection, preview protocol, feedback model, and export preflight.

[`workspace/document-store.ts`](../../catalogue/builder/workspace/document-store.ts) is the only live document and bounded-history authority. Every mutation is a pure document command submitted to that store. Preview, autosave, file output, runtime selection, and TSX therefore see the same accepted snapshot; a refused command cannot create a shadow preview or export state.

[`model.ts`](../../catalogue/builder/model.ts) owns the versioned Component/text tree and its immutable operations. [`policy.ts`](../../catalogue/builder/policy.ts) owns acceptance, URL and additional-prop safety, structural limits, and complexity limits. The registry-derived policy is assembled once in [`registry-core.ts`](../../catalogue/builder/registry-core.ts) and guards every entry to live state, including restore, import, Inspector edits, history, rendering, and emission. Rejection reports a human path and keeps the last accepted snapshot intact; technical policy evidence remains available under disclosure.

Additional props are literal JSON only. They cannot shadow modeled props or carry executable handlers, raw HTML, React identity/ref data, prototype-sensitive keys, embedded documents, or executable URL schemes. The same recursive restrictions cover modeled JSON values. There is no lenient preview document and no code execution path.

## Placement, compatibility, and Layers

[`tree/compatibility.ts`](../../catalogue/builder/tree/compatibility.ts) derives render-content compatibility from Component metadata, documented controls, and the accepted tree. [`tree/projection.ts`](../../catalogue/builder/tree/projection.ts) projects that authority into typed insertion targets, selection paths, Layers, canvas overlays, discovery context, feedback, and validation. Human slot labels come from the registry control projection; technical prop names stay behind the policy boundary.

Add, palette drag, canvas drop, Layers drop, move, wrap, duplicate, direct slot editing, and keyboard reorder all pass through [`tree/controller.ts`](../../catalogue/builder/tree/controller.ts) and the same accepted-document commit. An invalid structure is refused before history, autosave, preview, or export and names a valid alternative when one exists. Root pointer geometry stays isolated in [`placement.ts`](../../catalogue/builder/placement.ts).

[`tree/layers.tsx`](../../catalogue/builder/tree/layers.tsx) is the permanent, independently scrollable structure surface. It owns collapse, slot targets, row actions, pointer drops, and semantic keyboard movement. Selection is shared with the canvas and Inspector; history reconciliation preserves identity when possible and chooses the nearest surviving node otherwise. A focused Layers selection row is an explicit document-shortcut surface, while actual buttons, links, inputs, disclosures, file controls, and editable content retain ordinary shortcut isolation.

## Discovery, imagery, templates, and defaults

[`discovery/registry.ts`](../../catalogue/builder/discovery/registry.ts) adapts the core registry into the Catalogue's [universal search](../../catalogue/search/search.ts). Normalisation, aliases, ranking, ordering, and match reasons are consumed directly; the Builder does not own a compatibility search dialect. Contextual picking keeps the query, suspends unrelated purpose filtering, and supplies the compatible population from the tree authority.

Component and template cards consume the shared [generated-image resolver](../../catalogue/example-images.ts) and its manifest. The current Preview Theme selects the matching image asset, while the live preview remains the rendering truth. Visual and Compact density, Groups, Recent, and Favourites are comfort projections; their guarded bounded storage in [`discovery/preferences.ts`](../../catalogue/builder/discovery/preferences.ts) cannot block document editing.

[`discovery/templates.ts`](../../catalogue/builder/discovery/templates.ts) owns Builder-only Starters and Blocks. Each definition creates and validates an accepted tree, derives its Component identities from that tree, and borrows a representative generated image. A Starter is editable Builder data composed of multiple Components; a Block is one bounded insertable subtree. Neither is a new public Component or a guaranteed consumer recipe.

[`defaults.ts`](../../catalogue/builder/defaults.ts) adds generic creation-time meaning after public defaults and source-owned `catalogueBuilderDefaults`. It owns complex seeds and structured-row seeds without changing public Component defaults, examples, prop types, or the eventual accepted export.

## Preview, interaction, and Appearance

[`preview/`](../../catalogue/builder/preview/) owns viewport, visual zoom, Edit/Interact mode, Appearance scope, frame geometry, and the same-origin protocol. Protocol v6 carries the optional accent hue and the bounded axes beside Theme resolution, so a `previewAccent` or `previewField` deep link crosses the frame boundary as inert data and the frame writes the same hue and axes to its real Root. A selected fixed viewport is the iframe's actual `innerWidth`; Fit and manual zoom change only its displayed scale. Media queries and local container queries therefore observe browser truth, and overlay coordinates map through the protocol's measured logical rectangles rather than duplicated layout assumptions. In Edit, wheel input over the overlay scrolls the true frame until its boundary, then chains to the surrounding canvas; the frame's scroll measurement remaps selection and insertion chrome for deep content.

[`render.tsx`](../../catalogue/builder/render.tsx) is the one accepted-tree React renderer used by the frame and pure tests. In Edit, the frame is inert and editor overlays own selection. In Interact, public Components retain their production interaction, motion, reduced-motion, local-responsive, semantic colour, hierarchy, and elevation contracts. Editor selection, hover, and insertion chrome stays outside the frame and uses stable editor-only colours; it neither imitates nor suppresses Component focus and selection.

The frame injects inert Catalogue-local witnesses for every source-declared `on*` callback, while the export contract requires consumer wiring only for callbacks that are actually required. Safe scalar change callbacks may control transient frame state so real Tabs, disclosures, dialogs, and theme controls can be exercised. Navigation, submission, popups, and downloads are contained in the frame. Witnesses are bounded in a one-line scrollable status region so feedback cannot grow over later interactions; resetting interactions remounts the frame state without changing document history.

Workspace and Preview each render the shared [`AppearanceControl`](../../catalogue/shell/appearance.tsx) and consume the same [named conveniences](../../catalogue/shell/appearance-options.ts) over the public hue and the same bounded axes. Their state is independent, but their semantics are not forked: invalid stored or URL accents and axes canonicalise through the shared authorities, and choosing a named hue never moves an axis. Generated images follow the Preview Theme. Workspace Appearance never recolours editor-selection facts.

## Inspector, feedback, persistence, and files

[`controls.ts`](../../catalogue/builder/controls.ts) and [`inspector/registry.ts`](../../catalogue/builder/inspector/registry.ts) project source documentation, variants, object shapes, effective defaults, provenance, reset behavior, and export facts into the Inspector's progressive categories. Slots expose empty, direct-text, structured, and element-only postures without changing the document model. Structured rows edit the same JSON value as the Advanced raw editor.

Malformed structured or additional JSON remains a local field draft. Its inline validation names the human selection/slot/control path and offers a correction; line and exact policy detail stay under Technical details. Until correction, preview, history, persistence, and every export continue using the last accepted value. Recovery clears every stale field error and announces that the path is valid again.

[`inspector/feedback.ts`](../../catalogue/builder/inspector/feedback.ts) keeps selection announcements, transient action toasts, field validation, callback witnesses, durable storage alerts, and save state as different lifecycles. Success, refusal, storage failure, and export readiness therefore never share a misleading message or tone.

[`persistence.ts`](../../catalogue/builder/persistence.ts) owns guarded access to the one local autosave and rejected-source recovery. Read or write denial trips a circuit breaker without making the in-memory document read-only. Corrupt input opens a safe empty composition and preserves the exact rejected source for inspection and download. Import checks size before reading and cannot win a newer load; New/Replace uses inline confirmation. Download names and object URL lifecycle are deterministic.

[`inspector/preflight.ts`](../../catalogue/builder/inspector/preflight.ts) validates once and derives export identity, cost, TSX, runtime selection, and Builder JSON from the same accepted snapshot. [`export.ts`](../../catalogue/builder/export.ts) owns canonical imports, props, identifiers, callback parameters, escaping, and filenames. [`cost.ts`](../../catalogue/builder/cost.ts) owns dependency closure, Component CSS facts, and behaviour-script need. Copy/download feedback states the file effect separately from local autosave.

## Adaptive and keyboard workspace

The workspace is three-pane at desktop authoring widths and a roving one-pane tablist when space or zoom makes simultaneous panes unusable. The breakpoints and pane behavior live in [`workspace/`](../../catalogue/builder/workspace/) and [`styles/workspace.css`](../../catalogue/builder/styles/workspace.css), not in this map. Narrow states preserve authoring reachability and conformance; the product does not promise a phone-first authoring workflow. Responsive phone and tablet work refers to the exact composition preview.

Placement, selection, text and prop edits, move, wrap, duplicate, delete, undo/redo, slot insertion, and files all have keyboard routes. Input modality controls focus movement: pointer selection does not jump into a large editor, while keyboard structural actions focus the new or nearest surviving target. Focus, selection, insertion, danger, forced-colour, and reduced-motion styling remain distinct.

## Browser proof and change routing

[`builder-conformance.ts`](../../scripts/builder-conformance.ts) is a bounded orchestrator over the feature checks in [`scripts/conformance/builder/`](../../scripts/conformance/builder/). It composes with the existing build, server, Chromium, axe, console, viewport, forced-colour, motion, keyboard, and screenshot lifecycle in [`conformance.ts`](../../scripts/conformance.ts); there is no second harness.

`journeys.ts` owns the integrated human composition journey and review sheets. `discovery.ts`, `tree.ts`, `preview.ts`, `inspector.ts`, and `workspace.ts` own their feature projections. The browser proof covers generated discovery, explicit and refused placement including native drag, deep Layers/history, structured drafts, exact frame and overlay truth, real interaction and effect containment, Appearance separation, persistence/file failures, export/cost, adaptive accessibility, and owner-readable starter, responsive, interactive, invalid, recovery, export, and narrow review states. Unit guards under [`tests/`](../../tests/) cover the pure and future-enrolling authorities.

Start a change at the authority below, then update its nearest unit and browser projection rather than adding an `app.tsx` condition.

| Change                                          | Start here                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tree shape or immutable operation               | [`model.ts`](../../catalogue/builder/model.ts)                                                                                                                                 |
| Accepted data, URL, or resource limit           | [`policy.ts`](../../catalogue/builder/policy.ts)                                                                                                                               |
| History or command publication                  | [`workspace/document-store.ts`](../../catalogue/builder/workspace/document-store.ts)                                                                                           |
| Compatibility, insertion, or selection language | [`tree/`](../../catalogue/builder/tree/) and [`registry-core.ts`](../../catalogue/builder/registry-core.ts)                                                                    |
| Search or matching                              | [`catalogue/search/`](../../catalogue/search/) then [`discovery/registry.ts`](../../catalogue/builder/discovery/registry.ts)                                                   |
| Generated imagery                               | [`catalogue/example-images.ts`](../../catalogue/example-images.ts)                                                                                                             |
| Starter, Block, or creation default             | [`discovery/templates.ts`](../../catalogue/builder/discovery/templates.ts) or [`defaults.ts`](../../catalogue/builder/defaults.ts)                                             |
| Frame, mode, geometry, or contained effect      | [`preview/`](../../catalogue/builder/preview/)                                                                                                                                 |
| Theme or accent semantics                       | [`catalogue/shell/appearance-state.ts`](../../catalogue/shell/appearance-state.ts) and [`appearance-options.ts`](../../catalogue/shell/appearance-options.ts)                  |
| Inspector control or draft validation           | [`inspector/`](../../catalogue/builder/inspector/)                                                                                                                             |
| Local save, recovery, import, or download       | [`persistence.ts`](../../catalogue/builder/persistence.ts) and Inspector feedback                                                                                              |
| TSX/runtime/JSON or cost                        | [`export.ts`](../../catalogue/builder/export.ts), [`inspector/preflight.ts`](../../catalogue/builder/inspector/preflight.ts), and [`cost.ts`](../../catalogue/builder/cost.ts) |
| Adaptive shell                                  | [`workspace/`](../../catalogue/builder/workspace/) and [`styles/workspace.css`](../../catalogue/builder/styles/workspace.css)                                                  |
| Integrated browser journey or review state      | [`scripts/conformance/builder/`](../../scripts/conformance/builder/)                                                                                                           |
