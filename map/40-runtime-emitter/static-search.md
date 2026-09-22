# Static search palette

Search palette's static mode ships the complete dialog as markup plus the selected `search-palette` behaviour, the same shape as the static Docs drawer and Theme toggle: the React adapter emits a contract, the behaviour activates it, and the consumer's own script supplies only what is specific to its content — the index, ranking, rendering, and selection.

## Who owns what

The [React adapter](../../src/components/docs/search-palette/search-palette.tsx) stamps `data-discern-search-palette` on the closed dialog, `data-discern-search-palette-input` on the field, and `data-discern-search-palette-close` on the close control. `shortcuts` adds `data-discern-search-palette-shortcuts`, which lets ⌘K or Ctrl+K toggle that palette and `/` open it when focus is not in a field; one palette per page takes the shortcuts. The consumer renders the opening control wherever the page wants it: any element carrying `data-discern-search-palette-open`, with `aria-controls` naming the palette's id, or without it reaching the first static palette in its own root.

The [behaviour](../../assets/behaviors/search-palette.js) owns everything that changes: `showModal()` and `close()`, focus on the field when the palette opens and back to the control that opened it when it closes, the body's scroll lock, and a combobox field's `aria-expanded`. It closes on Escape, the close control, a press on the backdrop, and the shortcut. It binds through delegation, so a palette or opener added later works without re-evaluation. It dispatches a bubbling `discern:search-palette:open` event on the palette once it is shown and `discern:search-palette:close` once it has closed, whichever route closed it; the consumer's script resets its query, loads its index, and clears its selection in answer. A click the consumer cancels with `preventDefault()` opens and closes nothing.

## The drawer yields

When a Docs layout drawer in the same root is open, the palette closes it through the drawer's own toggle and opens once the drawer has returned focus there, so the toggle is where focus lands when the palette closes. Neither behaviour reaches into the other's state; the hand-off uses the toggle contract any consumer can see.

## Without `showModal()`

A reader whose dialog lacks `showModal()` gets the same contract by other means: the behaviour sets `open` and `data-discern-search-palette-fallback`, makes every element outside the palette inert, wraps Tab and Shift+Tab within it, and closes on Escape. The stylesheet fixes the fallback palette to the viewport and draws the overlay as a wide outline in the overlay colour, so no separate backdrop element is needed.

Evaluating the behaviour again does not bind twice. For document-wide teardown, dispatch `document.dispatchEvent(new Event("discern:search-palette:teardown"))`; it closes an open palette without moving focus and removes every listener. Re-evaluate the emitted behaviour to initialise again.

## Evidence

[The regression](../../tests/search_palette_browser_test.tsx) serves a built document with the emitted runtime and proves every dismissal route with focus return and both events, the shortcuts and the field that keeps its slash, consumer cancellation, the drawer hand-off, the fallback's inert page and Tab wrap, repeated evaluation, and teardown. The Search palette's static example is the package's own consumer of the contract.
