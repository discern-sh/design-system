# 1A — Create Builder ownership seams and interaction architecture

**Goal:** Refactor the Interface Builder's monolithic workspace, styles, registry projection, and browser proof into concrete feature-owned boundaries so preview, tree, discovery, and inspector improvements can run concurrently without changing current authoring behaviour.

**Wave:** 1. This is the sole Builder foundation stream. It starts after the three shared Catalogue prerequisites and must land before any Builder wave-2 brief begins.

Other Builder streams will follow. You own `1A` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify shared prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify these completion markers and their behavioural contracts are on `main`:

- `map/_private/planning/catalogue-ux/_done/1a-catalogue-architecture-and-shell.md`: universal search and reusable Appearance authorities exist;
- `map/_private/planning/catalogue-ux/_done/2a-cross-surface-example-contract.md`: canonical Component examples are addressable by stable ids;
- `map/_private/planning/catalogue-ux/_done/3a-deterministic-component-example-images.md`: generated example imagery and its typed resolver exist.

Stop if any marker is absent or the live contract is incomplete. Call `discern_start` with the literal name **`builder-1a`**, re-root every file/shell operation into the returned absolute `data.path`, and pass it to every discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/60-catalogue/interface-builder.md`, and this programme README;
- all of `catalogue/builder/**`, not only `app.tsx`;
- `scripts/builder-conformance.ts`, its call site in `scripts/conformance.ts`, and all `tests/builder*_test.ts`;
- the shared universal search, Appearance, canonical example, and generated-image contracts as read-only dependencies;
- ADR 0027, especially the inert-document and callback-wiring boundary.

Use `discern-write-it-once` when assigning authorities and `discern-cure-a-bug` if the refactor exposes a behaviour defect whose cause is not proven. Verify every anchor against the landed tree before editing.

## Background

The current Builder is technically cohesive but operationally monolithic: `app.tsx` owns nearly every state transition and rendered pane, `builder.css` owns nearly every visual rule, `registry-index.ts` feeds unrelated discovery and control concerns, and `scripts/builder-conformance.ts` owns more than a thousand lines of mixed workflow proof. Four feature agents editing those regions would not be parallel work; they would create integration conflicts and obscure which contract each test protects.

This stream is a behaviour-preserving architecture pass. Do not redesign the experience early. Its success is measured by whether wave 2 can work in disjoint files over explicit live contracts while the existing Builder still loads, authors, saves, exports, and passes the same conformance population.

## Deliverables

### 1. Give each Builder feature a concrete home

Refactor `catalogue/builder/app.tsx` into a bounded workspace composition/bootstrap and feature-owned modules. Prefer unsurprising live-tree-informed names under these conceptual seams:

- workspace/shell: toolbar, pane layout, top-level document/history/selection composition, error boundary;
- preview: rendered canvas host, decoration, preview protocol boundary, width/appearance controls;
- tree: selection, insertion target, tree mutation commands, Layers projection;
- discovery: palette records, search/filter state, contextual component picking, templates/default seeds;
- inspector: property controls, validation drafts, feedback, persistence, cost, and export surfaces.

Do not create a generic framework of interfaces wrapping every function. Move cohesive state and behaviour to the module that owns it, export a small tested contract where another feature truly consumes it, and leave single-use helpers local.

Preserve `/catalogue/builder/`, document version 1, restored local state, file import/export, TSX/runtime output, undo/redo semantics, current keyboard behaviour, and the inert preview while moving code.

### 2. Establish typed cross-feature contracts

Wave 2 needs these boundaries to exist without implementing its redesigns:

- one accepted-document/history store and command surface; features cannot mutate Builder documents independently;
- an explicit `InsertionTarget`/selection projection that discovery can display and tree placement can execute;
- a versioned same-origin preview-message protocol seam that can later carry accepted document, viewport, Appearance, mode, selection, and callback witness messages without giving the frame arbitrary code;
- one feedback model that distinguishes transient announcement, persistent validation, durable storage failure, and persistence state even if the old UI still projects them similarly;
- one discovery-record adapter from registry/search/image facts and one inspector-control adapter. Neither owns the registry core;
- one exported preflight result consumed by inspector/export and later structural validity work.

Keep current behaviour at the boundary. Do not implement exact viewport frames, Interact mode, compatibility rejection, templates, or the new feedback UI here.

### 3. Split registry projection by consumer

Refactor `registry-index.ts` so one stable core derives known slugs, metadata, component imports, canonical examples, accepted defaults, and policy facts. Give discovery and inspector separate projections over that core:

- discovery projection may consume human name/description/Group/purpose, canonical representative image, and universal search records;
- control projection may consume documented props, variant/object shapes, Builder defaults, required callbacks, export names, and modeled prop reservations.

Do not duplicate generated facts, enumerate Components, or edit generated outputs. Wave 2C owns discovery/default/template changes; 2D owns control/label changes. The core becomes read-only to both unless a later integration defect proves its public projection incomplete.

### 4. Split styles by ownership without visual redesign

Keep `catalogue/builder/builder.css` as the stable Builder stylesheet entrypoint, but move existing rules into feature-owned styles such as workspace, preview, layers, discovery, and inspector.

- Preserve the `discern` namespace, layers, forced-colour rules, reduced-motion behaviour, and adaptive/400%-zoom conformance.
- Keep selectors local to their owner. A later preview change must not edit inspector styles to change selection chrome.
- Remove dead selectors proven by the move, but do not retune Tokens, spacing, density, muted metadata, accent placement, or focus presentation as incidental cleanup.
- Do not leave one giant shared file imported by smaller empty wrappers.

### 5. Give unit and browser checks the same seams

Turn `scripts/builder-conformance.ts` into a bounded orchestrator over feature-owned browser-check modules, or an equivalently concrete seam. Split mixed `tests/builder_test.ts` responsibilities when doing so prevents wave-2 collisions.

At minimum establish separate owners for:

- preview/viewport/inertness;
- tree placement/model/history/Layers;
- discovery/search/palette/templates;
- inspector/validation/persistence/export;
- final integrated authoring journeys.

Move checks without dropping populations, axe scans, viewport/zoom postures, storage containment, file workflows, shortcut isolation, forced colours, screenshots, or console-error detection. Replace source-slicing tests only when a closer exported/behavioural guard preserves the actual invariant.

Wave 2 edits only its feature test/check module. Builder 3A alone edits the final orchestrator and cross-feature journeys.

### 6. Prove behaviour preservation in the browser

Run `deno task serve` on the worktree's deterministic port and leave it running. Use the in-app browser to:

- restore or start a composition;
- place at root and into an existing slot using the current interaction;
- edit text, variant, structured data, and additional JSON;
- move, wrap, duplicate, delete, undo, and redo;
- change current width/Theme/accent controls;
- inspect cost, copy exports, download/import JSON, reload, and confirm autosave recovery;
- traverse by keyboard and verify the current inert canvas.

This is a preservation witness, not permission to fix every UX problem in this stream. Record exact URL and any intentionally deferred issue against the owning wave-2 brief rather than adding a parallel implementation.

## Constraints

- Preserve the inert Builder document/security boundary and public package graph.
- One accepted document/history authority and one registry core remain authoritative after the split.
- Shared Catalogue search, Appearance, canonical-example, and generated-image code is read-only. Only create Builder adapters.
- Do not hand-edit generated files or materialised skills.
- Do not create empty architecture scaffolding, one-caller service layers, or a custom state-management framework.
- Commit workspace/modules, registry split, style split, and test/conformance split as focused behaviour-preserving changes.
- Keep full existing Builder and project conformance green; architecture is not a reason to weaken source-backed checks.

## Out of scope

- Genuine iframe viewport sizing, zoom, Edit/Interact mode, or preview Theme redesign.
- New insertion semantics, structural compatibility rules, direct canvas editing, or Layers redesign.
- Search quality, palette images/density, templates, favourites/recent, or creation defaults.
- Inspector hierarchy, validation copy, autosave UI, file labels, export preview, or cost redesign.
- Named drafts/file management, mobile-first Builder authoring, public Builder API, or release work.

## Definition of done

- `app.tsx`, `builder.css`, `registry-index.ts`, mixed tests, and Builder browser proof have concrete feature ownership seams; wave 2 can edit four disjoint slices without sharing those files.
- The workspace still has one accepted document/history source and explicit typed contracts for insertion target, preview messaging, feedback, discovery/control registry projections, and preflight.
- Shared search, Appearance, example, and generated-image authorities are consumed through read-only adapters rather than copied.
- Existing Builder document, authoring, persistence, export, accessibility, narrow/zoom, forced-colour, screenshot, and console-error populations remain guarded.
- A complete preservation journey has been exercised in the in-app browser at the exact reported URL, with the server left running.
- No wave-2 UX redesign, named-draft work, generated hand edit, public API, or unrelated Catalogue page change appears in the diff.
- After the last edit run `discern_prepare`, commit every resulting change in focused commits, then run `discern_done` on clean committed HEAD. Fix every diagnostic without loosening a guard or standard.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `builder-1a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/builder-ux/1a-builder-architecture-and-interaction-seams.md` to `map/_private/planning/builder-ux/_done/1a-builder-architecture-and-interaction-seams.md` (create `_done/` if needed).
