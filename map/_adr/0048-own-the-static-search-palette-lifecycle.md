# ADR 0048: Own the static Search palette lifecycle

**Status**: accepted

## Context

[ADR 0047](0047-select-static-modes-by-omitting-the-handler-and-mark-enhancement-on-the-root.md) gave Search palette a static mode and deliberately left its lifecycle — opening, dismissal, focus, and the fallback for a reader without `showModal()` — with the consumer, on the grounds that it was entangled with index loading, keyboard selection, and open triggers. The ledger set the condition for lifting it: a second static consumer reproducing the same lifecycle.

The first static consumer's lifecycle turned out to be generic in every part the package can see, and the one piece that looked application-specific was not: when an open Docs layout drawer yields to the palette, focus must return to the drawer's toggle, because the element that had focus is now inert. The drawer is already a package behaviour, so that hand-off was the consumer coordinating two package contracts through their markup.

## Decision

Selecting Search palette emits a `search-palette` behaviour that owns the static palette's lifecycle: opening from any control carrying `data-discern-search-palette-open`, closing on Escape, the close control, the backdrop, or the opt-in shortcut, focusing the field and returning focus, locking scroll, a combobox field's `aria-expanded`, and the inert-page fallback without `showModal()`. An open drawer in the same root yields through its own toggle before the palette opens, so the behaviours cooperate through public markup rather than shared state.

The consumer keeps what is specific to its content — the index, ranking, result rendering, and keyboard selection — and learns of the lifecycle through bubbling `discern:search-palette:open` and `discern:search-palette:close` events rather than binding the dialog itself. Keyboard shortcuts are opt-in on one palette per page, because a page may already use the keys.

## Consequences

A static documentation site drops its palette lifecycle script and keeps only its search logic; a second consumer inherits the drawer hand-off and fallback for free. The emitted `discern.js` for a Selection that includes Search palette grows by the behaviour, and the `behavior_script` ceiling rises with it. Escape in the native dialog follows the platform: a search field that still holds a query consumes the first press to clear it.

## Alternatives considered

Waiting for a second consumer would have left the drawer hand-off to every consumer of two package behaviours. Owning keyboard selection as well would couple the behaviour to how results are rendered and activated; the events leave that with the consumer. A cross-behaviour event from the palette to the drawer would bind two behaviours to each other's names, where the toggle click uses the contract any consumer already sees.
