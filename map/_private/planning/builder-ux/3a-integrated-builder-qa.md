# 3A — Run the integrated Builder authoring and browser hardening pass

**Goal:** Compose every landed Builder feature with the final shared Catalogue search/Appearance contracts, complete realistic authoring journeys with human eyes, cure cross-feature friction, and leave one durable real-browser proof plus an accurate present-tense Builder map.

**Wave:** 3. This is the final Builder implementation and convergence stream. Start only after Builder 2A–2D and Catalogue UX 5A have landed.

You own `3A` only. Do not relaunch completed streams. Read-only audit sub-agents may inspect disjoint journeys if available, but one coordinating agent must personally reproduce every reported issue, own all edits, reconcile cross-feature judgments, run the browser, and pass the final gate.

## Orient, verify the complete baseline, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify these markers and behavioural outcomes are on `main`:

- `map/_private/planning/catalogue-ux/_done/5a-integrated-visual-qa.md`: final universal search and reusable Appearance contracts are composed;
- `map/_private/planning/builder-ux/_done/1a-builder-architecture-and-interaction-seams.md`;
- `map/_private/planning/builder-ux/_done/2a-preview-viewport-and-interaction.md`;
- `map/_private/planning/builder-ux/_done/2b-placement-validity-and-layers.md`;
- `map/_private/planning/builder-ux/_done/2c-discovery-templates-and-defaults.md`;
- `map/_private/planning/builder-ux/_done/2d-inspector-feedback-and-export.md`.

Verify behaviourally—not by marker alone—that exact iframe widths, Edit/Interact modes, explicit insertion/compatibility, permanent Layers, generated-image/universal-search discovery, meaningful templates/defaults, progressive inspector, saved/error/export trust, and disjoint browser-check modules exist. Stop and report any missing prerequisite.

Call `discern_start` with the literal name **`builder-3a`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

After re-rooting, read:

- `AGENTS.md`, this programme README and every completed Builder brief;
- completed Catalogue 1A, 3A, and 5A briefs plus the final universal search, Appearance, and generated-image authorities;
- all post-wave-2 Builder feature contracts/modules/styles/checks and current `catalogue/builder/app.tsx` composition;
- `map/60-catalogue/interface-builder.md`, ADR 0027, `scripts/builder-conformance.ts`, its orchestrator call site, and Builder integration tests;
- `discern/TODO.md` to preserve the explicit named-draft/file-management deferral.

Use the `browser:control-in-app-browser` skill for the complete audit and `discern-cure-a-bug` for every defect fixed. Use `discern-write-adr` if reconciliation changes the security, preview, placement, template, persistence, or public boundary materially.

## Background

Wave 2 intentionally split the experience into four independently coherent vertical slices. That made parallel work safe but creates a final risk: the preview can be truthful while insertion overlays misalign at zoom; compatibility can be correct while discovery hides useful results; defaults can be meaningful while inspector labels remain confusing; persistence can be truthful while Interact events look like unsaved changes.

This pass exists to judge the Builder as a person uses it, not trust branch summaries. The quality bar is habitual usefulness: the next action should be visible, the result should be trustworthy, and technical evidence should remain available without becoming the primary navigation language.

This is a hardening pass, not a licence to invent another feature family or reopen the named-draft decision.

## Deliverables

### 1. Compose shared authorities and final workspace chrome

Call `discern_update` immediately after starting and follow its exact overlap guidance so the branch includes final Catalogue 5A search/Appearance decisions and all Builder wave-2 landings.

- Ensure Builder discovery consumes the final universal search API and alias/ranking/match-reason vocabulary without compatibility wrappers that duplicate semantics.
- Ensure Preview Appearance consumes the final shared control/state decision, including whether the accent range is exposed, moved, or hidden. Remove superseded Builder-specific controls rather than presenting two implementations.
- Ensure generated example images resolve in the current preview Theme and final asset path/manifest contract.
- Reconcile toolbar, viewport/mode, insertion target, Layers, inspector tabs, persistence, and export navigation so each consequential control names its scope: Workspace, Preview, document, or file.
- Keep editor selection/focus/insertion chrome stable and recognisable across final Appearance choices.
- Keep `app.tsx`, style entrypoint, and conformance orchestrator bounded; integration is not permission to collapse modules back into monoliths.

### 2. Audit the complete authoring matrix once

Run `deno task serve` on the deterministic worktree port and leave it running throughout review. Open `/catalogue/builder/` in the in-app browser.

Inspect at minimum:

- blank, every starter, and representative Block insertion;
- discovery by Group, human purpose, exact/intent/empty query, Visual/Compact, Recent/Favourites, ordinary and contextual slot pickers;
- root/sibling/container/named-slot placement, invalid insertion, move/wrap/duplicate/delete, pointer drag, keyboard reorder, Layers collapse/scroll, undo/redo, and direct text/slot editing;
- simple props, effective defaults/reset, every slot posture, object/array rows, raw JSON valid/invalid/corrected, additional props, required callbacks, opaque data, and longest inspector;
- Fluid/1200/768/390 at Fit and 100%, every Preview Theme/Appearance posture, Edit/Interact, responsive media/container-query Components, Tabs/disclosures/floating surfaces, callbacks, links/effects;
- autosave/reload, denied/quota/corrupt storage, retry/recovery, Download/Import JSON, New/Replace, TSX/runtime/JSON viewer, naming fallbacks, clipboard/download failure, preflight, cost/dependencies;
- light/dark Workspace, representative preview accent, keyboard traversal, forced colours, reduced motion, 400% zoom/adaptive panes, and console/axe evidence.

Do not optimise the Builder for practical phone authoring. Existing narrow/zoom states remain accessible and operable for conformance; responsive phone/tablet work in this programme refers to the composition preview.

Maintain a concise working audit table: journey/state, observed friction, authority, fix, and regression guard. Do not land a historical bug log; translate findings into present-tense code/tests/map or a real owner-facing TODO.

### 3. Complete the core human journeys

By pointer and keyboard where meaningful, complete these without reading source code or hidden instructions:

1. Start from a Landing starter, recognise its sections from generated images, replace generic content, and understand that it is Builder data rather than an exported Component.
2. Search “call to action”, understand why CTA Band matched, favourite and place it at a visible page insertion cursor, then find it in Layers.
3. Add an action to Hero through the explicit slot target after a Marketing-site browse filter; Button must remain findable and land in the named slot.
4. Attempt Button inside Button through Add, drag, move, and wrap; every route refuses before history/export and proposes a valid target.
5. Build Tabs with seeded items, edit/reorder them, switch to Interact, activate Details by pointer/keyboard, observe callback events, then return to the same Edit selection.
6. Select 390, 768, and 1200; confirm exact iframe widths/media-query results at Fit/100%, change Preview Theme/accent independently of Workspace, and keep overlays aligned.
7. Enter malformed additional JSON in a deep node, see a human path plus line/technical detail, correct it, and confirm every error disappears while the last accepted preview/export remained stable.
8. Watch Saving/Saved, reload, download/import Builder JSON, inspect TSX/runtime/JSON and function naming, copy with success/failure, and understand CSS/behaviour cost.
9. Navigate a deep composition entirely through Layers and keyboard actions while the inspector is long; selection/focus survives move, wrap, delete, undo, and redo sensibly.

Record task time, misplacement/refusal count, unnecessary inspector/palette hops, undo count, and moments where the next action was not visually predictable. These are review evidence, not permanent analytics. Cure high-leverage friction and repeat the journey until it is smooth.

### 4. Normalise cross-feature experience

Fix inconsistencies visible only after composition:

- wording and placement of Add, Insert, Place, Move, Wrap, Duplicate, Delete, Reset, Cancel, Import, Download, Copy, Interact, and Edit;
- selection path, insertion target, Layers row, canvas overlay, inspector heading, and validation path referring to the same node/slot in the same human language;
- transient toast, inline validation, storage alert, saved state, callback event, and export readiness never sharing a misleading style/lifecycle;
- exact Preview width/zoom/mode/Appearance controls reading as one scoped group rather than toolbar miscellany;
- generated image theme/crop, live preview, templates, and Builder defaults representing the same Component/example identity honestly;
- empty, loading, unavailable, refused, storage-failed, and export-blocked states offering one clear recovery action;
- focus movement following input modality, no competing outline pile-up, and danger actions looking destructive;
- index-like discovery density remaining fast with 139+ Components and future growth.

Prefer fixing a feature authority when several projections drift. Do not create a final layer of conditional patches in `app.tsx`.

### 5. Strengthen integrated browser and structural guards

Refine `scripts/builder-conformance.ts` as the bounded orchestrator over feature checks and add focused integration tests for cross-feature journeys.

Cover:

- exact frame width/media-query/zoom truth and overlay coordinate mapping;
- Edit/Interact inertness, behaviour, callback witnesses, effect containment, selection restoration, and Appearance separation;
- explicit insertion/compatibility across every mutation path, contextual compatible search, Layers/direct editing, and history selection;
- generated image/universal search population, template/default validity, Recent/Favourites failure containment, and palette performance;
- inspector category/default/path/structured-draft behaviour, stale-error clearance, feedback lifecycles, autosave/recovery/file operations, export/preflight/clipboard, and cost facts;
- the nine end-to-end journeys, axe, headings/landmarks, keyboard reachability, focus visibility, forced colours, reduced motion, 400% zoom, no document-level overflow, no unexpected console warnings, and screenshot review sheets.

Use screenshots as perceptual evidence, not the sole oracle. Keep tests future-enrolling and delete obsolete duplicated/source-string checks rather than layering new ones. Do not loosen existing Builder security/resource limits or full project conformance.

### 6. Update present-tense Builder knowledge

Rewrite `map/60-catalogue/interface-builder.md` to describe the final current system:

- accepted document/history/policy boundary;
- feature module ownership;
- explicit insertion/compatibility and Layers;
- universal search, generated images, templates/defaults;
- true preview frame, modes, protocol, safe callbacks, Appearance;
- inspector drafts/validation, feedback/persistence/recovery, export/preflight/cost;
- browser conformance ownership and where to start for each change.

Link authorities rather than copying current Component/template populations, widths, or labels. Keep it present tense, not a change log. Preserve ADR 0027 and add/update an ADR only when the implementation genuinely changed a hard boundary.

Confirm `discern/TODO.md` still records named local drafts/wider file management with enough context. Do not implement it here. Add another TODO only for a real owner decision that cannot be safely resolved in this programme.

### 7. Perform the final adversarial pass

Reload from a clean session and ask:

- Can I predict where Add will land before I act?
- Can I recognise what to add before reading descriptions?
- Does 390/768/1200 mean the same thing it means in a browser?
- Is it always obvious whether a click edits or interacts?
- Can invalid work enter history, preview, autosave, or export through any route?
- Can I keep structure visible while editing details?
- Do validation, saved state, files, callbacks, and export each say exactly what is true now?
- Is any visible language written for TypeScript/document paths rather than a person?
- Has any shared fact—search, images, Appearance, metadata, cost—been copied locally?
- Is phone-authoring polish consuming effort that belongs to desktop composition usefulness?

Remove avoidable chrome, duplicated messages, stale status, and explanatory prose found by this pass. Preserve technical evidence under progressive disclosure.

## Constraints

- Preserve inert documents, strict accepted policy, deterministic exports, neutral/CLI React-free boundaries, and Catalogue-only Builder status.
- Consume final shared search, Appearance, canonical-example, and generated-image authorities; never fork them during integration.
- Preserve feature ownership. Cross-feature fixes belong in the closest authority, not a new app-level patch layer.
- Keep desktop-class authoring scope. Test canvas preview responsive widths; do not launch a mobile Builder redesign.
- Named drafts/wider file management remains TODO only.
- Never hand-edit generated files or loosen gate/standard/resource limits.
- Commit composed shared-authority updates, journey defects by class, conformance integration, and map updates in focused steps.

## Out of scope

- Named drafts, file browser/handles/folders/remote sync/conflicts.
- New public Component families, arbitrary design canvas/freeform layout, mobile-first Builder authoring, AI search, or code execution.
- Catalogue page redesign beyond consuming its final shared authorities.
- Package release/version bump.

## Definition of done

- All shared Catalogue and Builder completion markers/behaviour are composed; no duplicate search, image, Appearance, policy, registry, cost, or export authority remains.
- The complete audit matrix and nine core journeys work by sight, pointer, and keyboard at the exact live Builder URL with no hidden placement rule, false viewport, unsafe interaction, stale error/status, buried structure, or blind export.
- Recorded journey evidence shows predictable placement, bounded hops/undo, exact responsive truth, successful interaction, correction, persistence, and export; every high-leverage friction found is cured and guarded.
- Integrated browser checks cover every cross-feature contract plus accessibility, forced colours, reduced motion, 400% zoom, containment, performance, console, and review screenshots without designing a phone authoring product.
- `map/60-catalogue/interface-builder.md` accurately describes the final present system and links its authorities; named drafts/file management remains clearly deferred in TODO.
- The final adversarial pass finds no implementation-language leakage, duplicated matching/image facts, competing editor/consumer accent, stale workflow message, or avoidable visual noise.
- Leave `deno task serve` running and report the exact Builder URL plus representative starter, deep-tree, responsive, interactive, invalid, recovery, and export states for owner review.
- After the last edit run `discern_prepare`, commit every change in focused commits, then run `discern_done` on clean committed HEAD. Fix every diagnostic without loosening tests or standards.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `builder-3a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/builder-ux/3a-integrated-builder-qa.md` to `map/_private/planning/builder-ux/_done/3a-integrated-builder-qa.md` (create `_done/` if needed).
