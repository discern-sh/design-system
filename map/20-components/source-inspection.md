# Source inspection

Use CodeListing for referenced source with filename, language, highlights, and a caption. CodeBlock is the smaller literal source viewport without listing chrome. Both apply single-hue lexical emphasis. Their [React props](../../src/components/editorial/code-listing/code-listing.tsx) and [CodeBlock props](../../src/components/editorial/code-block/code-block.tsx) own the public API.

## Emphasis carries salience, not category

Browser source surfaces apply single-hue lexical emphasis. One hue cannot encode category — keyword against string against number needs distinct hues — so it encodes salience instead: comments and punctuation recede on the ink ladder, string and numeric literals lift to the accent, and names and keywords stay at base ink. This inverts what the scanner must recognise. Identifying the interesting tokens needs a language; identifying the scaffolding needs only delimiters.

The [scanner](../../src/internal/code-emphasis.ts) owns that rule and holds no keyword list. A `dialect` selects a table of comment and string delimiters, which is why the prop takes a closed set of families rather than a language name: nothing here parses grammar, and the type says so. CodeBlock and CodeListing derive a dialect from their existing `language` label, so emphasis needs no new authoring; Terminal and RawOutput opt in by naming one, because neither renders source by default and ANSI output already owns colour. `plain` is the single off switch everywhere.

Emphasis fails closed. Any construct the scanner cannot confidently terminate reverts to base ink, so a mis-closed string cannot take the rest of a listing with it — the property that makes a heuristic-free scanner safe to run over arbitrary consumer source. Density therefore varies by language: declarative sources are nearly all identifiers and punctuation and show the recession with little accent, while data-carrying sources show both. That is the cost of refusing grammar, and the reason canonical examples lead with literal-rich source.

Emphasis is presentation only. Spans carry `data-discern-emphasis` and subdivide text without altering it, so readable text, logical line numbers, highlighted lines, and the copied string are untouched; [the test support helper](../../tests/support/code-emphasis.ts) states that invariant where rendered source is asserted. Tier colours are three custom properties each surface declares from its own palette, following Terminal's precedent, so showcase treatments and consumer accents carry through without forking a stylesheet, and a Root with no accent degrades to pure ink lightness. One merged run model carries measured terminal cell widths and tiers together, so a wide grapheme is never split across a tier boundary.

## Copy and view are separate

CodeListing passes its untouched `code` to the public CopyButton. The copy value never comes from a visual gutter, selected DOM, caption, or feedback label. Load every selected runtime script using the [static copy adoption contract](../40-runtime-emitter/static-copy.md); selecting CodeListing reaches CopyButton through generated composition dependencies. Without that script the action stays inert and the source remains selectable. `copyable={false}` omits the action when a consumer provides another copy path or wants a script-free presentation.

Both source Components default to horizontal scrolling. Authors may set `wrap` to fit long lines to the available browser width. This is CSS-only presentation, available in static HTML without a client control or hydration. The page author chooses a stable viewing posture: use wrapping for prose-like source inspection and scrolling when column alignment matters. Each listing row retains one logical line number and highlight, however many visual continuations it occupies. Decorative numbers are excluded from selection and accessibility text; actual LF separators and trailing whitespace remain in the code text. HTML parsing normalizes CRLF in visible text; the JSON-encoded clipboard transport preserves the original CRLF bytes.

Standard and showcase use the same semantic implementation. The filename and language wrap within the header, and the viewport keeps an inset keyboard focus outline inside the clipped figure.

## Terminal boundary

Browser `wrap`, `copyable`, and `dialect` do not enter either CLI renderer. CodeListing's existing terminal frame is width-bounded and truncates long source lines; it is not a lossless source export. For complete terminal source inspection, use CodeBlock's independent `widthPolicy` (`wrap` or `preserve`), with visible controls and four-cell tab stops. This stream makes no terminal byte changes.

## Evidence

The [static fixture](../../tests/fixtures/static-code-listing.tsx) emits a standalone page and selected runtime only. The [browser regression](../../tests/code_listing_browser_test.tsx) guards real clipboard round-trips, text selection, logical line identity, local overflow, and keyboard access across narrow/wide and light/dark states. The [rendering regression](../../tests/code_listing_test.tsx) guards whitespace in both listing treatments. Canonical examples and the narrow keyboard posture use the existing [visual review instrument](../60-catalogue/visual-review.md).
