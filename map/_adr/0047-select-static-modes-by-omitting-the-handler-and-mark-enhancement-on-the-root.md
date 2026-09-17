# ADR 0047: Select static modes by omitting the handler, and mark enhancement on the root

**Status**: accepted

## Context

The package promises build-time rendering: consumers ship static HTML and CSS, never a React bundle. Several Docs Components nevertheless need behaviour in the browser — a theme control, a search dialog, a navigation drawer — and the first versions were hydration-only, with a required handler and effects that never ran on a static page. A static consumer either wrapped them in no-op handlers, spread its own hooks through escape-hatch props, or rebuilt the markup by hand, and its structural guard forbade the third option.

Theme toggle established the answer for one Component: the presence of `onThemeChange` selects controlled React, its absence selects static markup that the selected behaviour activates, and only the static mode carries the opt-in attribute, so one activation is never handled twice. Search palette and Docs layout now face the same choice, and the drawer adds a second question the theme never had: an off-canvas navigation must not move until something can open it, the package ships no inline script, and a deferred module runs after the first paint.

## Decision

A Component that can be either controlled by React or driven by a script in static HTML has exactly two modes, and the controlling handler chooses between them. `onThemeChange` chooses for Theme toggle, `onOpenChange` for Search palette, and future two-mode Components follow the same rule rather than a `static` boolean or a separate adapter. The static mode carries every consumer-bindable hook — `data-discern-*` on the elements a script would address — and the controlled mode carries none of them; a consumer script that binds the hooks can therefore never double-handle an activation React already owns. Hooks are only stamped where a script needs a handle; the controlled markup stays byte-identical for existing consumers.

A static mode renders the resting state. A dialog renders closed with no `autofocus` and no effects; a drawer's navigation renders in flow, inert to nothing. Whatever opens it decides what receives focus.

Progressive enhancement that changes layout applies only beneath an explicit marker the package documents and the stylesheet reads: `data-discern-docs-drawer-enhanced` for the drawer. The behaviour stamps the marker on the root it activates, and a consumer that must not shift on first paint stamps the same attribute on any ancestor from its own head script. The package ships no inline script and adds no second bootstrap surface; the marker is the whole handshake. A marked page has promised to load the behaviour.

Where a behaviour depends on a breakpoint, the stylesheet owns it and the script asks: the narrow container query sets a custom property (`--discern-docs-layout-drawer`) that the behaviour reads from computed style after each resize. No breakpoint is written in JavaScript.

What is deliberately not decided here: Search palette's open, close, focus, Escape, backdrop, and `showModal()` fallback stay consumer-owned, because they are entangled with application-specific index loading, keyboard selection, and open triggers; the ledger names the condition for lifting them into a behaviour.

## Consequences

A static consumer composes a complete documentation shell from the adapters and the emitted runtime, binds the documented hooks from its own script for the parts it owns, and writes no package class. Adding a static mode to a Component is an additive union on its props, with the controlled type unchanged, so the guide states both and existing callers do not move.

The marker is a contract a consumer can break: stamping it without loading the behaviour hides the navigation. The drawer's breakpoint lives in one place, but a behaviour that needs it pays a computed-style read on resize. Two-mode props unions are harder to read than a flag, and a consumer who passes the handler by accident gets the controlled mode silently; the guide's per-mode documentation is the mitigation.

## Alternatives considered

A `static` boolean prop beside the handler would let a caller pass both and ask the Component to decide which wins; the handler's presence is already the fact that matters. A separate `StaticSearchPalette` adapter would fork the anatomy and the changelog for every future prop. Detecting "no script" in CSS through `@media (scripting: none)` would keep the navigation off-canvas in older engines with scripting disabled, an unrecoverable state, and would still shift when a script loads late; an explicit marker degrades to in-flow navigation in every engine. Reading the breakpoint with `matchMedia` in the behaviour would duplicate the stylesheet's container query in viewport terms and drift the moment either moved.
