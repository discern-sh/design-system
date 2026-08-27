# 2D — Humanise the inspector, feedback, persistence, and export

**Goal:** Turn TypeScript-shaped controls, raw document errors, silent autosave, sticky status, and blind copy actions into one progressive inspector and trust model that tells people what they are editing, what is valid, what is saved, and exactly what will be exported.

**Wave:** 2. Implement in parallel with 2A–2C after Builder 1A has landed. Land fourth and last within wave 2.

Other wave-2 streams are in flight. You own `2D` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify the architecture prerequisite, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify `map/_private/planning/builder-ux/_done/1a-builder-architecture-and-interaction-seams.md` is on `main` and that inspector modules, `styles/inspector.css`, control registry projection, feedback/persistence state contracts, preflight seam, and inspector browser checks exist. Stop if the marker or behaviour is missing.

Call `discern_start` with the literal name **`builder-2d`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

After re-rooting, read:

- `AGENTS.md`, this programme README, `map/60-catalogue/interface-builder.md`, and ADR 0027;
- all post-1A inspector modules/styles/checks plus `controls.ts`, `fields.tsx`, `object-editor.ts`, `persistence.ts`, `export.ts`, `cost.ts`, policy error types, and control/export/persistence tests;
- representative simple, slot-heavy, variant, object/array, required-callback, opaque-data, and passthrough-prop Components;
- current CopyButton and code/source presentation Components before inventing new copy or highlighting UI;
- read-only tree preflight/human-path contract, discovery Builder-default contract, and preview callback witness contract, noting that 2A–2C may strengthen them before this branch's final update.

Use `discern-cure-a-bug` for stale error/status, clipboard rejection, default display, focus, or persistence defects. Use `discern-write-it-once` for labels/defaults/path/preflight facts. Do not weaken policy diagnostics merely to make the UI friendlier; project technical detail secondarily.

## Background

The inspector exposes useful source facts but presents many of them at implementation altitude. Tabs is labelled `Items readonly TabItem[]`; optional controls show `(not set)` without the effective default; Hero produces a long sequence of empty slot cards; adding/editing visible title text requires selecting a nested Text node and finding its textarea.

Invalid additional JSON immediately produced a duplicated global and inline message beginning with an internal path such as `document.children[1].props...`. After correcting the JSON, the inline error cleared but the global alert remained. The persistent status row similarly keeps “Selected…” or “Renamed…” messages until another action, making old feedback look like current state.

Accepted documents already autosave to guarded browser storage, yet the visible primary action is “Save file”. Users cannot tell the difference between locally saved state and downloaded JSON. TSX/runtime exports are copied without inspection; clipboard rejection is silently swallowed. These are trust defects around sound internals.

## Deliverables

### 1. Organise controls around human decisions

Build a progressive inspector hierarchy such as:

1. Content;
2. Appearance;
3. Layout;
4. Behaviour;
5. Accessibility;
6. Advanced.

Derive category/label/help facts from the control registry and add the smallest explicit Builder metadata only when the source cannot communicate the human decision. Do not build a central per-Component form by hand.

- Lead with the Component's human name, short description, selection path, and compact primary actions.
- Humanise labels (`Tabs`, not `Items readonly TabItem[]`) while retaining source prop name/type as quiet technical detail where useful.
- Show the effective value and provenance: `Primary — default`, `Not set — Component default is …`, or `Overridden`. Reset restores the real default rather than an ambiguous blank.
- Collapse unused optional slots into one `Add content…`/slot menu. Once populated, show a compact summary and precise slot-specific Add Text/Add Component actions.
- Group common accessibility props structurally. Keep safe arbitrary `aria-*`, `data-*`, class/style, and JSON passthrough under Advanced.
- Keep callbacks visible as consumer wiring requirements and connect Interact-mode event witnesses without pretending functions are document data.
- Long inspector content remains independent of permanent Layers; do not pull Layers back into this form.

### 2. Make structured values pleasant and stable

- Use shaped row editors for known objects/arrays with human field labels, required/optional indication, Add/Remove, and reorder when order is semantically meaningful.
- Newly inserted rows consume 2C's valid unique Builder seeds and focus the first useful field. Do not recreate default generation here.
- Preserve draft/caret/focus while a field becomes temporarily invalid. Never remount the raw editor mid-keystroke.
- Keep **Edit as JSON** under Advanced for precision, with a stable way back to shaped rows after valid parsing.
- Display row summaries when collapsed and avoid repeating full TypeScript syntax at each nesting level.
- Bound large structures through existing document limits and explain those limits in user units only when reached.

### 3. Project validation in human paths with correct lifecycle

One validation result should project to one control and, only when necessary, one durable workspace summary.

- Translate document paths to selection language, e.g. `Hero block › Actions › Button › Additional props`.
- Primary copy states the remedy. JSON syntax errors include line/column and a short reason.
- Keep the exact internal path/policy reason under expandable **Technical details** for agents and debugging.
- Debounce raw JSON validation or validate on blur/explicit Apply while preserving the last accepted document in preview/history/export. Do not announce every incomplete keystroke as a global failure.
- On successful correction, remove inline and global error state immediately and announce recovery once where useful.
- Errors follow the relevant node/field through selection; selecting another Component cannot make a stale unrelated message look current.
- Preflight combines policy, required wiring, and 2B structural compatibility without duplicating their rules.

Preserve strict fail-closed document acceptance. Friendlier projection is not lenient preview data.

### 4. Give feedback distinct visual and temporal roles

Replace the one sticky full-width feedback row with the post-1A model:

- selection changes: screen-reader live announcement, normally no durable visual banner;
- successful placement/move/wrap/copy/download/import: small transient toast or local action confirmation;
- inline validation: persistent beside its control until fixed;
- storage/recovery failures: durable global alert with Retry/Recovery;
- persistence state: compact stable `Saving…`, `Saved locally`, or `Storage unavailable` indicator;
- export readiness: local to Export, not a global status message.

Ensure polite/assertive live regions announce only new relevant content and do not duplicate the same slot-picker or error message. Auto-dismissed feedback pauses appropriately for hover/focus and respects reduced motion.

Fix resting danger presentation so Delete, Replace/New, and destructive confirmations are visibly danger actions despite selector specificity. Preserve accessible names and confirmation. Add visible shortcut hints for Undo, Redo, Search, Escape/cancel, and Delete where they aid discovery without toolbar noise.

### 5. Make persistence and file operations truthful

Keep the existing guarded local autosave and recovery source as the authority.

- Expose current accepted-document write state after every change and on reload/restoration.
- Say **Download builder JSON** and **Import builder JSON**, with filename/source and success/failure feedback.
- A successful download message names the deterministic filename. Import names the file and never replaces current state until parse/policy acceptance succeeds.
- New/Replace retains explicit confirmation and states that the current composition is locally replaced; do not imply a named file was deleted.
- On storage denial/quota, keep in-memory editing, show durable consequences, offer Retry and Download JSON, and retain exact recovery source.
- If unload occurs during a pending write, use the safest existing synchronous storage semantics or explain the residual risk; do not invent remote sync.

Do not add multiple named drafts, recent files, file handles, folders, conflict resolution, or a file browser. That strategy is deliberately recorded in TODO.

### 6. Build an inspectable Export workspace

Provide an Export section/tab that consumes deterministic existing emitters and the shared preflight result.

- Tabs for TSX, runtime selection, and Builder JSON with syntax-readable source, line wrapping/scroll containment, and labelled language.
- Show generated React function name and proposed filenames while the composition name changes, including fallback such as `ComposedPage` for punctuation/numeric-only names.
- Explain required callback parameters through the generated type/source rather than an instruction paragraph.
- Provide Copy and Download actions with transient success and explicit clipboard/download failure. Do not silently swallow `navigator.clipboard` rejection.
- Disable or clearly block export on invalid accepted/preflight state, link each issue back to its node/control, and never emit Button-inside-Button or missing required wiring.
- Keep source generation lazy enough that editing remains responsive; preserve canonical ordering/escaping and exact output tests.

Use existing code/source Components where they serve the need. Do not add a large editor dependency merely for colours.

### 7. Extend composition cost into useful consequences

Preserve CSS closure and behaviour-script facts, then humanise the projection:

- show human Component names with raw slugs secondary/copyable;
- distinguish instances from unique shipped Components and explain once that repeated instances do not add Component CSS repeatedly;
- expose per-Component/incremental CSS and dependency closure where truthful;
- show why the behaviour script is or is not needed and connect it to selected Components;
- make breakdown items link to Component detail/source where available;
- keep cost secondary to authoring, not a warning dashboard.

All bytes/dependencies remain derived from runtime/emitter authorities.

### 8. Guard the trust model end to end

Add focused unit and real-browser checks proving:

- simple/complex controls land in human sections, labels/defaults/provenance are truthful, optional slots collapse, and future props enrol without per-Component form edits;
- shaped/raw structured editing preserves focus/drafts, seeded rows are valid, reorder works where supported, and limits fail understandably;
- JSON/policy/structural errors project human path + technical detail, debounce correctly, preserve last accepted output, and clear everywhere after correction;
- selection/action/validation/storage/export feedback use distinct lifecycles and live-region announcements without stale duplication;
- autosave state, reload, storage denial/quota/retry/recovery, Download/Import JSON, New confirmation, and same-file retry remain failure-contained;
- TSX/runtime/JSON viewers match exact emitters, name/fallback/callback/preflight state is truthful, and clipboard/download success/failure is visible;
- danger actions have computed danger styling in both themes/forced colours and shortcuts do not fire inside controls;
- cost names/bytes/dependencies/behaviour facts derive from live authorities and future Components enrol.

### 9. Inspect long and failure-heavy journeys

Run `deno task serve` on the deterministic worktree port and leave it running. In the in-app browser:

- edit Button, Hero, Tabs/structured rows, an opaque-data Component, required callback, accessibility props, and Advanced JSON;
- compare effective defaults, reset, slot collapse/summary, shaped/raw switching, focus/caret, and longest inspector scrolling beside permanent Layers after 2B is composed;
- enter invalid JSON and structural preflight errors, correct them, switch selections, and confirm no stale global message;
- watch Saving/Saved, reload, download/import JSON, cancel/confirm New, and exercise storage denial/quota/recovery using existing harnesses;
- inspect all export tabs, naming fallbacks, callback wiring, clipboard success/failure, blocked/ready preflight, and cost breakdown;
- traverse by keyboard, forced colours where supported, and both Themes.

Report exact URL and representative saved/error/export witnesses.

## Wave-2 landing order

Implementation may proceed while 2A–2C are in flight, but this branch lands last. Before the final prepare/gate, verify these markers are on `main`:

- `_done/2a-preview-viewport-and-interaction.md`;
- `_done/2b-placement-validity-and-layers.md`;
- `_done/2c-discovery-templates-and-defaults.md`.

If any is absent, report implementation-ready state, keep the worktree, and stop. Once present, call `discern_update`, follow its exact overlap guidance, re-read Preview callback/Appearance, tree preflight/human path, and discovery default/slot contracts it names, then finish against the composed system.

## Constraints

- Strict accepted-document policy remains one authority; human validation is a projection, never a lenient parallel model.
- One feedback/persistence state contract distinguishes transient, validation, storage, saved, and export facts.
- Export viewers consume exact existing emitters/preflight; cost consumes runtime closure facts.
- Do not implement named drafts or wider file management.
- Stay within inspector/control/fields/object/persistence/export/cost modules, `styles/inspector.css`, and inspector-owned unit/browser checks. Preview/tree/discovery and final conformance orchestration are read-only.
- Preserve desktop-authoring scope and narrow/zoom accessibility without redesigning phone forms.
- Commit inspector hierarchy, structured editing/validation, feedback/persistence, export/cost, and guards in focused steps.

## Out of scope

- Preview iframe/viewport/modes/Appearance/editor overlay implementation.
- Placement/compatibility/Layers/direct canvas editing/history selection.
- Palette search/images/templates/Recent/Favourites/default generation.
- Named drafts, file browser/handles/folders/sync/conflicts, arbitrary code editor, remote storage, or package release.

## Definition of done

- Inspector controls are organised by human decision, show truthful effective defaults/provenance, collapse unused slots, and retain technical prop/type detail secondarily.
- Structured and raw editing is stable, focused, seeded through the discovery authority, bounded, and never drops accepted preview/history/export on invalid drafts.
- Validation uses human paths and actionable syntax detail, preserves strict policy, and clears every inline/global state immediately when fixed.
- Feedback, danger, shortcuts, local autosave, storage recovery, Download/Import JSON, and New confirmation form one truthful accessible state model.
- TSX/runtime/JSON are inspectable with naming, callback wiring, preflight, copy/download success/failure, and deterministic exact-output coverage; structurally invalid work cannot export.
- Cost projection humanises live closure/behaviour facts without duplicating them.
- The exact live Builder URL has been exercised through long, invalid, storage-failure, recovery, and export journeys by pointer/keyboard, and the server remains running.
- No preview/tree/discovery redesign, named-draft/file-manager work, policy weakening, shared-authority fork, or unrelated Catalogue change appears in the diff.
- After 2A–2C land and the final `discern_update` completes, run `discern_prepare`, commit every change, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `builder-2d` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/builder-ux/2d-inspector-feedback-and-export.md` to `map/_private/planning/builder-ux/_done/2d-inspector-feedback-and-export.md` (create `_done/` if needed).
