# Tokens & themes

Tokens (primitive, semantic-role, and Preset layers in [`tokens.ts`](../../src/tokens/tokens.ts)), the light/dark Theme roles, the branded blue Preset, and the Root-scoped foundation and utility CSS.

## Typography roles

The display face carries editorial headings. The body and interface faces carry prose, labels, indices, dates, measurements, status metadata, annotations, captions, and identities. The monospace face is reserved for an explicitly monospaced brand name and code, including source, commands, file paths, and terminal output. A component does not use monospace to create a technical mood.

Components that accept arbitrary content keep the text face by default. Consumers mark code through the component's code-bearing prop or semantic markup. The `Brand`, `SiteHeader`, and `SiteFooter` `mono` variants and the `.discern-mono` utility remain explicit opt-ins; discern's public surfaces use that brand variant for the name `discern`.

The emitted Runtime treats the user's system colour scheme as the default. A Root with no `data-discern-theme`, or with `data-discern-theme="system"`, follows `prefers-color-scheme`; `"light"` and `"dark"` remain deterministic overrides. Consumer Presets mirror their dark overrides inside the same system media query so branding and semantic roles move together.

Theme roles can carry non-colour presentation values when a Component needs one semantic behavior to switch with the active Theme. `--discern-brand-artwork-opacity` keeps supplied multicolour artwork visible in light Theme and removes it in dark Theme when the Component provides a separate monochrome treatment; it does not affect ordinary artwork by itself.

## Series colour

`--discern-color-series-1..6` are the fixed-order categorical data-series roles consumed by the chart family and `DataFigure` series swatches. Their hues avoid the reserved state, ink, and accent hues, and their safety is machine-checked in [`tests/chart/palette_test.ts`](../../tests/chart/palette_test.ts) — colour-vision-deficiency separation of adjacent pairs at a pinned floor, ANSI 256 distinctness, and a pinned ANSI 16 collapse — through the same terminal derivation every theme token rides. The theming boundary is deliberately asymmetric and permanent: browser consumers may override the custom properties, while terminal series colours stay package-authored because an override cannot re-run those proofs ([ADR-0030](../_adr/0030-own-charts-as-a-quantitative-kind-family.md)). Semantic state tones are never recruited as series colours.

## Contextual contrast

The inverse surface and ink roles remain stable light-on-dark roles across both Themes. Marketing section's contrast surface uses them to establish a local semantic scope: ordinary canvas, surface, sunken, ink, muted ink, faint ink, and border roles move together for the section's descendants. Terminal and Code listing use the same roles for their opt-in showcase treatments. This is contextual composition rather than a third Theme, and it requires no `data-discern-theme` branch in Component CSS. [ADR-0006](../_adr/0006-homepage-treatments-ship-as-variants.md) records why these recipes remain opt-in Component contracts instead of global Token defaults.

_This subtree is not yet written — filling it is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
