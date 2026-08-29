# Tokens & themes

Tokens (primitive, semantic-role, and Preset layers in [`tokens.ts`](../../src/tokens/tokens.ts)), the light/dark Theme roles, the branded blue Preset, and the Root-scoped foundation and utility CSS.

## Typography roles

The display face carries editorial headings. The body and interface faces carry prose, labels, indices, dates, measurements, status metadata, annotations, captions, and identities. The monospace face is reserved for an explicitly monospaced brand name and code, including source, commands, file paths, and terminal output. A component does not use monospace to create a technical mood.

Components that accept arbitrary content keep the text face by default. Consumers mark code through the component's code-bearing prop or semantic markup. The `Brand`, `SiteHeader`, and `SiteFooter` `mono` variants and the `.discern-mono` utility remain explicit opt-ins; discern's public surfaces use that brand variant for the name `discern`.

The emitted Runtime treats the user's system colour scheme as the default. A Root with no `data-discern-theme`, or with `data-discern-theme="system"`, follows `prefers-color-scheme`; `"light"` and `"dark"` remain deterministic overrides. Consumer Presets mirror their dark overrides inside the same system media query so branding and semantic roles move together.

Theme roles can carry non-colour presentation values when a Component needs one semantic behavior to switch with the active Theme. `--discern-brand-artwork-opacity` keeps supplied multicolour artwork visible in light Theme and removes it in dark Theme when the Component provides a separate monochrome treatment; it does not affect ordinary artwork by itself.

## Appearance safety

The Catalogue exposes only the named Appearance presets in [`appearance-options.ts`](../../catalogue/shell/appearance-options.ts). Each option is admitted after accent, focus, success, warning, danger, inverse, categorical-series, and decorative roles remain distinguishable in both Themes; [`catalogue_appearance_options_test.ts`](../../tests/catalogue_appearance_options_test.ts) and browser conformance bind that contract. The public low-level accent hue remains available to coordinated consumer Themes, but an arbitrary hue is not by itself a promise that the unchanged semantic roles are safe.

## Motion and elevation boundaries

The fast, medium, and reveal durations and their easing roles in [`tokens.ts`](../../src/tokens/tokens.ts) are a shared vocabulary, not a universal transition. A Component owns motion only when it explains cause, continuity, progress, or space, and its reduced-motion posture resolves to the same complete state. Card, window, and pop shadows describe containment; they do not license passive lift or another implicit elevation tier. The production-speed and reduced-motion review contract lives in [Browser visual review](../60-catalogue/visual-review.md), while [`browser_polish_contract_test.ts`](../../tests/browser_polish_contract_test.ts) protects the structural boundary.

## Series colour

`--discern-color-series-1..6` are the fixed-order categorical data-series roles consumed by the chart family and `DataFigure` series swatches. They use the medium-contrast soft-blue, deep-blue, gold, burgundy, ochre, and rose sequence recorded in [ADR-0032](../_adr/0032-use-the-medium-contrast-series-palette.md). [`tests/chart/palette_test.ts`](../../tests/chart/palette_test.ts) pins the selected light and dark references, severe protan/deutan separation of adjacent pairs, ANSI 256 distinctness, and the accepted ANSI 16 collapse through the same terminal derivation every theme token rides; [`tests/cli/glyph_ramps_test.ts`](../../tests/cli/glyph_ramps_test.ts) proves the six non-colour marker and fill cues remain distinct. Browser consumers may override the custom properties, while terminal series colours stay package-authored because an override cannot re-run those proofs. Semantic state tones are never recruited as series colours, even where their hues overlap the categorical palette.

## Contextual contrast

The inverse surface and ink roles remain stable light-on-dark roles across both Themes. Marketing section's contrast surface uses them to establish a local semantic scope: ordinary canvas, surface, sunken, ink, muted ink, faint ink, and border roles move together for the section's descendants. Terminal and Code listing use the same roles for their opt-in showcase treatments. This is contextual composition rather than a third Theme, and it requires no `data-discern-theme` branch in Component CSS. [ADR-0006](../_adr/0006-homepage-treatments-ship-as-variants.md) records why these recipes remain opt-in Component contracts instead of global Token defaults.

_This subtree is not yet written — filling it is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
