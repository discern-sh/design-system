# Static copy actions

CopyButton is build-time markup for the selected clipboard behaviour. Selecting a Component that composes it reaches the same behaviour through generated dependencies; callers do not maintain another list of copy-capable Components. The neutral runtime and CLI graphs remain React-free. A live React host loads the same emitted script as a static page.

## Adopt it

Render from `@discern-sh/design-system/react` with `renderToStaticMarkup`, beneath `data-discern-root`. Pass `value` as the exact text to copy. Emit the route's selected Components with `emitDesignSystemRuntime` into a dedicated directory, link `discern.css`, and load every `manifest.outputs.scripts` path as a module. The complete build example is in [the public README](../../README.md#copy-actions-in-static-html).

The browser needs a secure context (HTTPS or localhost) and permission to write to the clipboard. A missing API or denied write displays failure guidance. There is no legacy `execCommand` fallback. Without the selected script, CopyButton stays inert: it is visibly unavailable and excluded from interaction and the accessibility tree. Keep the source text visible and selectable and supply manual-copy guidance where the action matters. Loading the script enables eligible controls; it cannot guarantee the browser will grant a write.

## Data and markup ownership

The [React adapter](../../src/components/docs/copy-button/copy-button.tsx) owns `data-discern-copy-value`, `data-discern-copy-duration`, and the `data-discern-copy-feedback` regions. Consumers supply the ordinary props, including ReactNode labels/icons, `failedLabel`, a ref, accessible name, disabled state, and `onClick`. Reserve the package's copy data attributes, feedback visibility, startup `inert` attribute, `aria-busy`, `data-discern-copied`, and `data-discern-copy-failed` for the adapter and behaviour.

The value is a JSON string in an HTML-escaped attribute. JSON escaping preserves carriage returns, newlines, tabs, empty content, Unicode, and code punctuation through HTML parsing; the clipboard input never comes from rendered labels or `textContent`. `value` is the sole content authority. Consumers outside React can reproduce this markup contract, including JSON encoding followed by HTML attribute escaping.

Native `disabled` remains consumer-owned, including React’s event semantics. The behaviour removes startup `inert` only inside opted-in roots.

The [selected behaviour](../../assets/behaviors/copy-button.js) is the sole clipboard, feedback, and timer owner. React renders all feedback alternatives and does not write to the clipboard. The behaviour changes their visibility without replacing authored label/icon nodes. Feedback hooks contain space-separated state names; a fallback icon is one node shared across states. Give distinct supplied variants distinct IDs. A polite, atomic live region announces the visible feedback. Explicit consumer accessible names are retained; live feedback remains independent of that name.

## Activation and lifecycle

A delegated click completes its synchronous dispatch before activation, so native or React `preventDefault()` cancels the write. Disabled controls, disabled fieldsets, and `aria-disabled="true"` do not write. The action preserves focus. A pending write has `aria-busy="true"`, makes no success claim, and ignores additional activations until it settles. Successful writes display `copiedLabel` and `copiedIcon` for `copiedForMs`; a later activation replaces that timer. Failure displays `failedLabel` until another attempt. Invalid durations use the default and negative durations become zero.

One document owns one copy listener and observer, including multiple or nested opted-in roots. Evaluating the copy behaviour again does not bind twice. Later DOM additions activate automatically. Removing a button or its opt-in root releases its state and timer; changing its value invalidates pending feedback. A write already handed to the browser cannot be cancelled, but its stale completion cannot update a released button. Reinsertion creates a fresh binding.

For document-wide teardown, dispatch `document.dispatchEvent(new Event("discern:copy-button:teardown"))`. It disconnects the copy observer/listener, clears timers, invalidates pending completions, and restores inert idle markup. Re-evaluate the emitted copy behaviour to initialize again; an already-cached module import alone does not execute again. Consumers normally let document disposal handle teardown. Keep one package version per document.

## Verify the consumer task

[The regression](../../tests/static_copy_browser_test.tsx) builds [the fixture](../../tests/fixtures/static-copy-consumer.tsx) from staged publish-allowlisted sources, serves only static HTML and selected runtime files, and exercises exact values, composition, cancellation, availability, focus, repeated activation, and teardown. Its dependency-driven canonical example sweep automatically enrolls future Components that reach CopyButton, and an unrelated wrapper proves the behaviour does not depend on a known consumer name. It also exercises the live Catalogue. Other consumer-defined clipboard actions and general controlled React interactions remain outside this copy contract.
