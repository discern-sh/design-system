# 2A — Make preview widths and interaction truthful

**Goal:** Replace the width-capped inert canvas with an exact logical browser preview that activates real viewport breakpoints, scales visibly rather than lying, and offers safe explicit Edit and Interact modes while preserving inert Builder documents.

**Wave:** 2. Implement in parallel with 2B–2D after Builder 1A has landed. Land first within wave 2.

Other wave-2 streams are in flight. You own `2A` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify the architecture prerequisite, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify `map/_private/planning/builder-ux/_done/1a-builder-architecture-and-interaction-seams.md` is on `main` and that preview modules, `styles/preview.css`, preview browser checks, and the versioned preview protocol seam exist. Stop if the marker or behavioural seam is missing.

Call `discern_start` with the literal name **`builder-2a`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

After re-rooting, read:

- `AGENTS.md`, this programme README, `map/60-catalogue/interface-builder.md`, and ADR 0027;
- all post-1A preview modules/styles/checks plus `catalogue/builder/render.tsx` and the accepted-document policy;
- the shared Appearance control/state authority landed by Catalogue 1A, treating it as read-only;
- representative responsive Components using viewport media queries and container queries, including Hero block, CTA Band, Table, Site header, and a dense Workflow component;
- interactive Components and behaviour contracts including Tabs, disclosure/details, Tooltip/Dialog where present, Theme controls, and required-callback examples.

Use `discern-cure-a-bug` for the false-width defect class and any interaction/safety defect. Use `discern-write-adr` if the preview document, iframe protocol, or safe callback boundary changes the architectural/security decision materially. Use the in-app browser throughout.

## Background

The current Width control applies `max-width` to a `<div>` inside the centre column. In a 1,528px browser, “390px” produces a 390px box while `matchMedia('(max-width: 820px)')` remains false; Hero retains desktop flex actions and a 114.6px desktop title. “1200px” can render at roughly 860px because the centre column is smaller. The labels therefore express confidence the preview has not earned.

The canvas also suppresses focusability and intercepts every click by design. That is correct for editing and document safety, but it prevents a person from testing Tabs, disclosure, dialog, tooltip, theme, or callback-driven behaviour. Safety and interaction need explicit modes rather than one compromise surface.

## Deliverables

### 1. Give the composition a genuine logical viewport

Use the post-1A preview protocol to render accepted Builder documents in a bounded same-origin iframe or an equally real nested browsing context. A resizable `<div>` is not sufficient because viewport media queries must observe the selected logical width.

- Support Fluid and exact 1200, 768, and 390 logical widths. Fluid means the current available logical viewport and displays its measured pixel value.
- If the logical frame is wider than the workspace, preserve its width and scale the visual result to fit or allow horizontal panning. Never cap the logical width silently.
- Display logical width and visual zoom together, for example `1200px · Fit 71%`.
- Provide Fit, 50%, 75%, 100%, and Reset controls with keyboard-complete semantics. Preserve a useful default rather than forcing control-cockpit decisions before every edit.
- Keep iframe sizing, scale wrapper geometry, canvas scroll/pan, selection coordinates, and device-pixel ratio explicit. Pointer hit testing in Edit mode must map correctly at every zoom.
- Do not animate between widths through misleading intermediate layouts. Respect reduced motion.
- Keep URL or local comfort state only where it composes with the existing Builder contract; do not turn every transient pan offset into document data.

Use a browser assertion inside the frame—not outer element width—as the contract. At 390 and 768, relevant `matchMedia` queries must match; at 1200, the frame's `innerWidth` remains 1200 even when displayed smaller.

### 2. Keep Edit mode inert and precise

Edit is the default authoring mode.

- The document remains accepted inert data; no `extra` prop, imported JSON, or text can become executable code.
- Built Component links, buttons, fields, media, and contenteditable descendants do not navigate, submit, or steal ordinary edit focus.
- Selection, hover, insertion, and drop decoration is editor-owned and mapped through the frame protocol without mutating the Component DOM contract exposed to consumers.
- Pointer selection does not unnecessarily move focus to an inspector heading or display a large input-like focus ring. Preserve screen-reader announcements and move focus for keyboard/pane transitions where it actually helps.
- Editor selection, hover, insertion, and keyboard-focus treatments use a stable editor palette/shape independent of consumer accent hue and preview surface. Forced colours remain explicit and meaningful.

Do not reimplement tree selection or insertion semantics; consume the post-1A tree contract and let 2B change those rules.

### 3. Add an explicit safe Interact mode

Interact mode temporarily gives the preview to the rendered design-system Components.

- Remove Edit selection interception and editor overlays while the mode is active.
- Allow design-system-owned local state and emitted behaviours to run so Tabs, disclosure, Dialog/Tooltip, and similar Components can be exercised by pointer and keyboard.
- Prevent or visibly intercept top-level navigation, form submission, downloads, popups, and external effects. Offer “Open link” only as an explicit Builder action if useful.
- Required callbacks use deterministic safe witnesses derived from the existing export callback contract. Show a compact event log such as `onValueChange("details")`; do not invent silent no-ops or serialize functions into the document.
- Reset transient interaction state deliberately when changing document/example/viewport only where the real component would remount. Do not let stale frame state appear in Builder history or exported JSON.
- Switching back to Edit restores the same selected document node and authoring context without recording a document change.
- Clearly label the current mode and its consequence. A person should not wonder whether a click edits, navigates, or interacts.

Keep Inspect overlays as a small optional extension only if the architecture makes them nearly free. Do not delay the required Edit/Interact contract to build a full DevTools clone.

### 4. Separate workspace and preview Appearance

Consume the shared Appearance state/control boundary from Catalogue 1A. Do not assume the old top-level accent slider remains the final UI; Catalogue 5A may settle it further before Builder integration.

- Workspace Theme affects Builder chrome only.
- Preview Appearance affects the iframe's design-system Theme/accent and is located with viewport/mode controls or in a compact Preview popover.
- Preserve useful System/Light/Dark and accent capability through the shared authority, but hide or move the hue range if that authority does.
- Preview Appearance persists as a comfort/review preference without entering the Builder document unless an explicit future contract says otherwise.
- Editor overlays never inherit preview accent. A red consumer accent cannot make a red Button and a red selection outline indistinguishable.

Do not add side-by-side theme comparison unless the focused implementation and tests are already complete; exact single-frame Theme switching is the requirement.

### 5. Guard the complete preview class

Add focused unit and real-browser checks proving:

- Fluid, 1200, 768, and 390 report their actual iframe `innerWidth`; 1200 remains exact when visually scaled below 100%;
- representative viewport media queries and container queries enter the same rules they do in a real page at each width;
- zoom/fit does not change logical layout, pointer selection coordinates, or document data;
- Edit mode keeps all rendered controls inert, links/submits contained, keyboard traversal out of the preview, and selection accessible;
- Interact mode switches Tabs/disclosures, opens and closes supported floating surfaces, records callback witnesses, keeps effects contained, and never changes document/history;
- returning to Edit restores selection and inertness;
- Workspace and Preview Appearance are independent, editor chrome stays stable across hues/themes, and forced-colour/reduced-motion behaviour remains correct;
- reload/restoration does not confuse logical width, zoom, mode, or preview Appearance.

Use semantic assertions inside and outside the frame. Screenshots help visual review but are not the sole proof of viewport truth.

### 6. Inspect the preview like a consumer

Run `deno task serve` on the deterministic worktree port and leave it running. In the in-app browser:

- inspect Hero, CTA Band, Table, Site header, and a dense Workflow composition at every preset and Fit/100%;
- compare at least two media-query transitions with the same Component on an ordinary page;
- exercise Tabs, disclosure, Tooltip/Dialog where supported, a callback-driven Component, links, and keyboard traversal in both modes;
- change Workspace and Preview Theme/accent independently, including a hue that previously collided with editor chrome;
- reload and verify restored state plus document/history identity.

Report exact Builder URL, measured logical/frame/display widths, and representative responsive/interactive witnesses.

## Wave-2 landing order

This branch lands first in wave 2 and has no sibling landing prerequisite. Later streams consume its landed preview protocol and style boundary; do not edit their files to prepare them.

## Constraints

- Preserve ADR 0027: accepted documents are inert and no imported value becomes code.
- A real browsing context owns viewport media queries. A div width, CSS zoom alone, or visual crop is not an acceptable substitute.
- One preview protocol carries document, selection, viewport, Appearance, mode, and event witnesses. Do not add window globals as a second authority.
- Shared Appearance code is read-only; adapt it inside preview modules rather than forking it.
- Keep Builder desktop-authoring scope. Preserve narrow/400%-zoom accessibility checks, but do not redesign phone authoring.
- Stay within preview modules/protocol/render side, `styles/preview.css`, and preview-owned unit/browser checks. Do not edit tree, discovery, inspector, or final conformance orchestration.
- Commit viewport/frame, Edit mode, Interact mode, Appearance/chrome, and guards in focused logical changes.

## Out of scope

- Placement rules, invalid nesting policy, Layers, drag/reorder, direct text editing, or undo selection.
- Palette search/cards/images/templates/default seeds.
- Inspector hierarchy, validation language, persistence/file labels, export preview, or cost summary.
- Named drafts/file management, mobile-first Builder UI, arbitrary scripts, network effects, or a full DevTools inspect mode.
- Catalogue page redesign or package release.

## Definition of done

- Every width control names the iframe's exact logical viewport, responsive media/container-query witnesses match real pages, and 1200 remains 1200 when scaled to fit.
- Fit/zoom is explicit, keyboard-complete, reduced-motion safe, and independent of logical layout/document state.
- Edit remains inert and precise; Interact safely runs design-system behaviour/callback witnesses without navigation, effects, code execution, or history mutation.
- Workspace and Preview Appearance are separate, consume the shared authority, and editor chrome remains recognisable across themes, hues, zoom, pointer, keyboard, and forced colours.
- Focused real-browser guards cover the frame, modes, responsive truth, effect containment, callback witnesses, state restoration, and Appearance separation.
- The exact live Builder URL has been exercised through every required responsive/interactive witness, and the server remains running.
- No tree/discovery/inspector redesign, named-draft work, shared-authority fork, generated hand edit, or phone-authoring project appears in the diff.
- After the last edit run `discern_prepare`, commit every change, then run `discern_done` on clean committed HEAD. Fix every diagnostic without loosening a guard or standard.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `builder-2a` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/builder-ux/2a-preview-viewport-and-interaction.md` to `map/_private/planning/builder-ux/_done/2a-preview-viewport-and-interaction.md` (create `_done/` if needed).
