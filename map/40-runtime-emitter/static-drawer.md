# Static docs drawer

Docs layout ships the navigation drawer as static markup plus the selected `docs-drawer` behaviour, the same shape as the static Theme toggle: the React adapter emits a contract, the behaviour activates it, and a page without the script degrades to something complete. Here the degraded state is the navigation in normal flow above the document, so a reader without JavaScript loses nothing but the drawer.

## Who owns what

The [React adapter](../../src/components/docs/docs-layout/docs-layout.tsx) owns the layout root's `data-discern-docs-layout`, the navigation element's id and `data-discern-docs-drawer-label`, and the veil's `data-discern-docs-drawer-veil`. The consumer owns the toggle control and renders it wherever the shell wants it, normally inside Docs header: a button carrying `data-discern-docs-drawer-toggle`, `aria-controls` naming the navigation id, `aria-expanded="false"`, `data-discern-open-label` and `data-discern-close-label` for the two names it swaps between, and the `hidden` attribute, because without the script there is nothing for it to do. The stylesheet hides a hidden toggle even when the control's own class sets a display, so an Icon button is the ordinary choice.

The [behaviour](../../assets/behaviors/docs-drawer.js) owns everything that changes: the toggle's visibility, `aria-expanded`, and `aria-label`; the navigation's `inert`, `role="dialog"`, `aria-modal`, and `aria-label`; the layout's `data-discern-docs-drawer` state; the veil's `hidden`; the body's scroll lock; and which elements outside the drawer are inert. It resolves the toggle to its navigation through `aria-controls` and to the layout through the nearest `data-discern-docs-layout` ancestor, so a toggle anywhere in the document reaches its own shell, and several shells on one page stay independent.

## The breakpoint has one owner

The stylesheet decides when the navigation is a drawer, through a container query on the layout's own inline size, and the behaviour asks rather than measuring: at the narrow allocation the stylesheet sets `--discern-docs-layout-drawer: 1` on the navigation, and the behaviour reads that computed value after every resize of the layout. There is no breakpoint in the script, so moving the query in [`docs-layout.css`](../../src/components/docs/docs-layout/docs-layout.css) moves the drawer.

Closed at the narrow allocation, the navigation is inert and the toggle is shown with its open label. Open, the navigation is a modal dialog named by `navigationLabel`; focus moves to its first focusable, Tab and Shift+Tab wrap between the toggle and the navigation's focusables, every element outside the toggle, the navigation, and the veil becomes inert, the body stops scrolling, and Escape, the veil, or the toggle closes it and returns focus to the toggle. Crossing to a wide allocation while open closes without moving focus; a wide navigation is never inert and the toggle hides again.

## First paint

The off-canvas position applies only beneath `data-discern-docs-drawer-enhanced`, never to bare markup, because the navigation must read in flow when nothing can open it. The behaviour stamps that marker on the layout root when it binds a toggle; it is a deferred module, so a page that must not shift on load stamps the marker itself in the head — `document.documentElement.setAttribute("data-discern-docs-drawer-enhanced", "")` is the whole bootstrap, and the stylesheet accepts the marker on any ancestor. The package ships no inline script and no other head bootstrap. A page that skips the bootstrap shifts once, when the script moves the navigation off-canvas, and the behaviour settles that move before it arms the slide transition, so activation snaps rather than animates. A page that stamps the marker but never loads the script has hidden its navigation behind a control nothing will reveal; the marker is a promise to load the behaviour.

Persisting the drawer's state across pages is deliberately not part of the contract: a navigation drawer opens for one choice and the next page starts closed. [ADR-0047](../_adr/0047-select-static-modes-by-omitting-the-handler-and-mark-enhancement-on-the-root.md) records the marker, the stylesheet-owned breakpoint, and the two-mode rule the drawer shares with Theme toggle and Search palette.

Evaluating the behaviour again does not bind twice, a shell added to the document later activates automatically, and removing a toggle or its navigation releases that shell. For document-wide teardown, dispatch `document.dispatchEvent(new Event("discern:docs-drawer:teardown"))`; it closes every drawer without moving focus, hides every toggle, removes the markers it stamped, and leaves a consumer's own marker alone. Re-evaluate the emitted behaviour to initialise again.

## Evidence

[The regression](../../tests/docs_drawer_browser_test.tsx) serves a real built document with the emitted runtime and proves the inert document, the activation snap, the complete open and close contract including focus wrapping and the veil, the allocation crossing in both directions, repeated initialisation, a shell added later, teardown, and a consumer's early marker positioning the drawer with no script at all. The [Docs layout example](../../src/components/docs/docs-layout/docs-layout.examples.tsx) is the package's own consumer of the contract.
