# Source inspection

Use CodeListing for referenced source with filename, language, highlights, and a caption. CodeBlock is the smaller literal source viewport without listing chrome. Their [React props](../../src/components/editorial/code-listing/code-listing.tsx) and [CodeBlock props](../../src/components/editorial/code-block/code-block.tsx) own the public API.

## Copy and view are separate

CodeListing passes its untouched `code` to the public CopyButton. The copy value never comes from a visual gutter, selected DOM, caption, or feedback label. Load every selected runtime script using the [static copy adoption contract](../40-runtime-emitter/static-copy.md); selecting CodeListing reaches CopyButton through generated composition dependencies. Without that script the action stays inert and the source remains selectable. `copyable={false}` omits the action when a consumer provides another copy path or wants a script-free presentation.

Both source Components default to horizontal scrolling. Authors may set `wrap` to fit long lines to the available browser width. This is CSS-only presentation, available in static HTML without a client control or hydration. The page author chooses a stable viewing posture: use wrapping for prose-like source inspection and scrolling when column alignment matters. Each listing row retains one logical line number and highlight, however many visual continuations it occupies. Decorative numbers are excluded from selection and accessibility text; actual LF separators and trailing whitespace remain in the code text. HTML parsing normalizes CRLF in visible text; the JSON-encoded clipboard transport preserves the original CRLF bytes.

Standard and showcase use the same semantic implementation. The filename and language wrap within the header, and the viewport keeps an inset keyboard focus outline inside the clipped figure.

## Terminal boundary

Browser `wrap` and `copyable` do not enter either CLI renderer. CodeListing's existing terminal frame is width-bounded and truncates long source lines; it is not a lossless source export. For complete terminal source inspection, use CodeBlock's independent `widthPolicy` (`wrap` or `preserve`), with visible controls and four-cell tab stops. This stream makes no terminal byte changes.

## Evidence

The [static fixture](../../tests/fixtures/static-code-listing.tsx) emits a standalone page and selected runtime only. The [browser regression](../../tests/code_listing_browser_test.tsx) guards real clipboard round-trips, text selection, logical line identity, local overflow, and keyboard access across narrow/wide and light/dark states. The [rendering regression](../../tests/code_listing_test.tsx) guards whitespace in both listing treatments. Canonical examples and the narrow keyboard posture use the existing [visual review instrument](../60-catalogue/visual-review.md).
