# Static theme preference

ThemeToggle has two modes and `onThemeChange` chooses between them, the same way `Tag`'s `onRemove` decides whether a remove control exists at all. Supplying it keeps controlled React in charge of resolution, persistence, and root application, and `theme` is required alongside it. Omitting it emits build-time markup the selected behaviour activates, so static HTML gets a working control without hydration and without a handler that does nothing. Only the static mode carries `data-discern-theme-toggle`, which is how one activation is never handled twice: the behaviour cannot see a controlled control, and React owns no click in the static one.

## Who owns what

The consumer owns the first paint. The emitted script is a deferred module and cannot run before the document renders, so a page that must not flash the other theme applies the saved preference itself in the head — [the landing page](../../catalogue/landing/behaviors/theme-preference.js) is the worked example, and it does nothing else. The package owns the control from the moment the runtime loads.

The behaviour themes the opted-in root that contains the control, found with `closest("[data-discern-root]")`. A page themes everything by putting `data-discern-root` on `<html>`; a nested root moves on its own, and an unstamped root follows `prefers-color-scheme` rather than the root around it, exactly as the emitted CSS already resolves it.

Persistence is consumer-owned and declared on that same root: `data-discern-theme-storage-key` names a `localStorage` key, and without one a change lasts for the visit. A saved preference outranks the markup, so a root left out of step with storage is healed on load. While nothing is saved the root stays unstamped and the media query resolves the theme; a system change then updates only the control's name, because the CSS already followed it. Activation always writes an explicit theme and saves it when a key is configured. The package never invents a key, a route, or a product policy.

## Markup ownership

The [React adapter](../../src/components/core/theme-toggle/theme-toggle.tsx) owns `data-discern-theme-toggle`, the startup `inert` attribute, and the two `data-discern-theme-destination` glyph nodes; the [behaviour](../../assets/behaviors/theme-toggle.js) owns activation, `aria-label`, glyph visibility, and the root's `data-discern-theme`. Both destination glyphs ship so visibility changes without replacing authored ReactNodes. `data-discern-to-light-label` and `data-discern-to-dark-label` carry the two names the control swaps between.

The accessible name states the destination theme and changes with the state, so this stays an action button rather than an `aria-pressed` toggle with a stable name. Do not add `aria-pressed`: the name already says what activation does, and a pressed state with a changing name says two different things at once.

Without the script a static control stays `inert` — visibly unavailable and out of the accessibility tree — because nothing could act on it. Native `disabled`, a disabled fieldset, `aria-disabled="true"`, and `preventDefault()` all cancel activation. Evaluating the behaviour again does not bind twice, and later DOM additions activate automatically. For document-wide teardown, dispatch `document.dispatchEvent(new Event("discern:theme-toggle:teardown"))`; re-evaluate the emitted behaviour to initialise again.

## Evidence

[The regression](../../tests/static_theme_browser_test.tsx) serves a real built document and its emitted runtime, and exercises the inert document, agreement across several controls, root scoping including a nested root, cancellation and disabled state, saved and unsaved persistence, reload, repeated initialisation, teardown, and a live system-preference change. The [landing page](../../catalogue/landing/page.tsx) is the package's own consumer of the static mode.
