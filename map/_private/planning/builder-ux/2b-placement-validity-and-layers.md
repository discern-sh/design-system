# 2B — Make placement explicit and Layers structural

**Goal:** Ensure every addition visibly names its destination before it happens, prevent invalid Component/HTML nesting as a class, and make Layers a permanent precise tree-authoring surface with direct canvas affordances and keyboard-complete reordering.

**Wave:** 2. Implement in parallel with 2A, 2C, and 2D after Builder 1A has landed. Land second within wave 2, after 2A.

Other wave-2 streams are in flight. You own `2B` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify the architecture prerequisite, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify `map/_private/planning/builder-ux/_done/1a-builder-architecture-and-interaction-seams.md` is on `main` and that tree modules, `styles/layers.css`, tree browser checks, the explicit `InsertionTarget` contract, accepted-document command surface, and preview selection-message seam exist. Stop if the marker or behaviour is missing.

Call `discern_start` with the literal name **`builder-2b`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

After re-rooting, read:

- `AGENTS.md`, this programme README, `map/60-catalogue/interface-builder.md`, and ADR 0027;
- post-1A tree modules/styles/checks plus `model.ts`, `placement.ts`, `history.ts`, policy/preflight types, and tree-related portions of current tests;
- the read-only preview selection/protocol contract, discovery contextual-picker contract, and inspector selection contract;
- representative Component render semantics and props: Button/links, form controls, List/Table, Stack/Cluster/Section/Container, Hero block slots, Tabs structured items, and Components using `asChild`/cloneElement or required children;
- existing generated metadata and source prop facts before deciding whether compatibility data belongs in Builder metadata, registry projection, or another single source.

Use `discern-cure-a-bug` for the invalid-nesting and selection/history defect classes. Use `discern-write-it-once` for compatibility/future enrolment. Write an ADR before adding a hard-to-reverse public metadata contract; prefer a Catalogue-only derived policy if it can remain truthful.

## Background

The current palette click has three silent meanings: append to root when nothing is selected, append inside a selected Component with a primary `children` slot, or place after a selected leaf. Selecting a Text child inside Button and clicking Button created Button inside Button and produced React's `validateDOMNesting` warning. The user has to memorise selection-dependent rules before they can predict the tree.

The Outline exposes the structure but lives below a variable-length prop form. With Hero selected, the primary structural tool is buried beneath slot cards, props, surface/layout controls, and raw JSON. HTML drag-and-drop is available, but precise structure cannot depend on a drag gesture alone.

## Deliverables

### 1. Replace selection magic with an explicit insertion cursor

Choose and implement one coherent placement model. The recommended default is:

- a generic palette Add places at the visible page insertion cursor, initially the end of the root;
- selecting a Component does not silently change Add from “after” to “inside”;
- inserting into a container or named slot starts from an explicit canvas/Layers `＋ Add inside`, `＋ Add before/after`, or inspector slot action;
- once armed, a persistent chip names the exact target, for example `Adding to Hero block › actions`, with Change and Cancel;
- before/after/inside insertion lines or zones appear before pointer or keyboard confirmation;
- successful placement selects the new node and preserves enough context to understand where it landed.

If live-browser evidence supports a different explicit cursor model, implement it consistently and justify it. Do not preserve the old heuristic behind a target label that updates only after placement.

Root, sibling, container, and named-slot targets use one typed `InsertionTarget` consumed by pointer, keyboard, palette click, contextual picker, and drag/drop. There is one insertion command and one announcement vocabulary.

### 2. Prevent invalid nesting before it enters history

Create one Builder placement/preflight authority that evaluates the proposed child, its current props/render posture, target slot, and ancestor chain.

At minimum it must cure these classes:

- nested interactive controls and links, including a Button rendered as `<button>` or `<a>` containing another interactive Button/link/control;
- self/descendant moves and invalid cycles;
- native list/table/content-model placements the Builder can represent but React/browser semantics reject;
- Components or slots that require text, components, a bounded structure, or no children;
- moving an existing subtree into a location that makes any descendant invalid.

Do not maintain a giant central list beside Component metadata. Derive what is mechanically knowable and add the smallest declarative Builder-only compatibility fact when truth cannot be derived. A future Component or variant must fail closed or enrol automatically rather than becoming “anything goes”.

Use the same authority for Add, drag/drop, move, wrap, duplicate where ancestry changes, imported-document acceptance where applicable, and export preflight. Refusal must:

- leave document/history/selection unchanged;
- name human path and reason, e.g. `Button cannot be placed inside Button because interactive controls cannot contain interactive controls`;
- suggest valid targets or wrappers when knowable;
- retain technical detail separately when useful.

Do not rely on React console warnings as validation.

### 3. Make Layers a permanent independently scrollable surface

Move Outline/Layers out of the bottom of the prop form into the post-1A structural owner. It may be a dedicated right-pane tab, split region, or stable side strip, but long inspector content cannot push it away.

Provide:

- independently scrollable, expandable/collapsible nested rows;
- clear component identity, slot labels, text summaries, selected/ancestor state, and compact icons or semantic glyphs where source-backed;
- obvious before/after/inside drop zones and insertion cursor;
- keyboard actions for move before/after/into/out, with disabled states and announcements;
- direct duplicate, wrap, add, and delete affordances that remain accessible without turning every row into loud chrome;
- a labelled end-of-page target that behaves like the other targets rather than only accepting drag;
- focus restoration to the moved/new/nearest surviving row.

Keep drag-and-drop as a useful pointer accelerator. Add clear drag feedback and auto-scroll within Layers/canvas when practical, but never make drag the only route.

### 4. Add bounded direct canvas authoring

Through the read-only preview protocol supplied by 1A/2A, add the highest-value edit affordances without turning the canvas into a freeform layout tool:

- clicking visible nested content selects the narrowest meaningful Builder node/slot rather than always its large owning block;
- double-clicking literal text enters a bounded inline editor or routes directly to the corresponding text control with visible context;
- selection controls expose Add before/after/inside, duplicate, wrap, move, and delete where valid;
- slot boundaries can be targeted directly when empty or visually large;
- every overlay maps correctly through preview zoom and disappears in Interact mode.

Do not implement arbitrary resizing, absolute positioning, freeform drawing, or visual CSS property handles. The design system and Component props still own layout.

### 5. Preserve useful selection through history and mutation

Selection is workspace state, not document history. Improve travel/mutation rules:

- undo/redo of an edit preserves the selected node when it still exists;
- undoing creation/duplication selects its former parent or nearest surviving sibling, not the whole Composition without context;
- delete uses the same nearest-survivor rule;
- move/wrap retains the semantic selected node or newly selected wrapper deliberately;
- Escape cancels an armed insertion target before clearing unrelated selection;
- pointer selection does not force keyboard-style focus movement, while keyboard actions restore visible focus sensibly.

Add pure selection-reconciliation helpers and tests rather than scattering fallbacks across event handlers.

### 6. Guard placement and structure as future-member classes

Add focused model/unit and real-browser tests proving:

- generic Add lands at the visible cursor regardless of selection;
- explicit before/after/inside and named-slot targets display, accept, cancel, and announce consistently;
- Button/link/control invalid nesting and supported list/table/content-model violations are refused across Add, move, wrap, duplicate, import/preflight, and export;
- valid Stack/Cluster/Section/Container, Hero slots, text, and structured Components remain composable;
- a synthetic future Component with derived/declarative compatibility facts enrols without editing placement code;
- Layers remains reachable and independently scrollable beside the longest inspector, deep trees collapse/expand, and pointer/keyboard reorder produce the same tree;
- direct text/slot selection and contextual actions work at preview zoom and stay absent in Interact mode;
- selection reconciliation holds across every history/mutation case and no refused action creates history or stale feedback;
- no unexpected React nesting warnings or document-level overflow appear.

### 7. Inspect deliberate composition journeys

Run `deno task serve` on the deterministic worktree port and leave it running. In the in-app browser:

- build root Button + Stack + nested Hero with title/actions using visible targets;
- attempt Button inside Button by palette, move, and drag; confirm refusal and useful alternatives;
- place valid interactive siblings and linked Buttons without false positives;
- create a deep Hero/Tabs tree, keep Layers visible while the inspector is long, collapse/expand, move into/out, wrap, duplicate, delete, undo, and redo;
- edit nested text directly and add to empty/filled named slots;
- repeat key operations by keyboard and pointer, including at a non-100% preview zoom if 2A is already landed after the required final update.

Report exact URL and the observed tree/selection outcomes.

## Wave-2 landing order

Implementation may proceed while 2A is in flight, but this branch lands second. Before the final prepare/gate, verify `map/_private/planning/builder-ux/_done/2a-preview-viewport-and-interaction.md` is on `main`. If absent, report implementation-ready state, keep the worktree, and stop for resume. Once present, call `discern_update`, follow its exact overlap guidance, re-read preview protocol/style files it names, then finish against the composed tree.

## Constraints

- One typed insertion target and one compatibility/preflight authority serve every mutation route.
- Compatibility prevents defect classes, not only the reproduced Button id. Avoid a hand-maintained parallel registry.
- Layers and direct canvas controls manipulate Component tree/props; they do not become a freeform layout engine.
- Preserve accepted-document policy, inertness, deterministic export, and neutral/package graph boundaries.
- Stay within tree/model/placement/history modules, tree compatibility authority, `styles/layers.css`, and tree-owned unit/browser checks. Preview/discovery/inspector code is read-only except through their exported contracts.
- Keep Builder desktop-authoring scope while preserving narrow/zoom accessibility checks.
- Commit insertion model, compatibility/preflight, Layers, direct editing, selection reconciliation, and guards in focused steps.

## Out of scope

- Iframe viewport/zoom/modes/Appearance or preview effect containment.
- Search aliases, palette imagery/density, templates, favourites/recent, or Builder defaults.
- Inspector form hierarchy, validation drafts/copy, autosave/file UI, export code viewer, or cost presentation.
- Arbitrary canvas resizing/positioning, named drafts/file management, mobile-first authoring, or package release.

## Definition of done

- A visible insertion cursor/target predicts every Add, drag, move, and named-slot placement; selection alone never silently changes the operation.
- One future-enrolling compatibility/preflight authority rejects invalid interactive and supported structural nesting across every mutation/import/export route without touching history.
- Layers remains permanently reachable beside long inspectors and provides pointer/keyboard selection, reordering, insertion, wrapping, duplication, deletion, and focus restoration.
- Direct canvas text/slot selection and bounded contextual actions reduce inspector hunting and remain correct at preview zoom/Edit mode.
- Selection reconciliation preserves useful parent/sibling context through undo, redo, delete, duplicate, wrap, move, and cancellation.
- Focused pure and browser guards cover the full placement/validity/history class with no React nesting warnings.
- The exact live Builder URL has been exercised through valid and refused deep-tree journeys by pointer and keyboard, and the server remains running.
- No preview/discovery/inspector redesign, freeform layout, named-draft work, shared-authority fork, or unrelated page change appears in the diff.
- After 2A has landed and the final `discern_update` completes, run `discern_prepare`, commit every change, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `builder-2b` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/builder-ux/2b-placement-validity-and-layers.md` to `map/_private/planning/builder-ux/_done/2b-placement-validity-and-layers.md` (create `_done/` if needed).
