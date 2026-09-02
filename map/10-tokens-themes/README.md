# Tokens & themes

The monochrome field, its light/dark Token projection, the optional blue Preset, and the Root-scoped foundation and utility CSS.

## Field authority and poles

[`field.ts`](../../src/tokens/field.ts) owns paper and ink as OKLab pigments, the bounded darkness, structure, emphasis, and density axes, and one CSS-expressible expression tree for each non-series colour role. `evaluateField(point)` evaluates those laws to deterministic `oklch()` strings. [`tokens.ts`](../../src/tokens/tokens.ts) evaluates darkness `0` and `1` into the existing `ThemeToken` light/dark pair shape, while [`field-css.ts`](../../src/tokens/field-css.ts) walks the same nodes to project the live browser calculations. The pair projection is the static pole fallback; it is not a second role authority.

Canvas follows darkness and active pigment polarity changes at the `0.179` relative-luminance crossover. Structure scales structural roles, emphasis scales state roles, and density applies only when the numeric four-pixel spacing fact is projected. `--discern-color-action` is full active ink and `--discern-color-on-action` is the opposite pigment, so action inversion does not depend on a moving accent rung. Raised `--discern-color-surface` is composited once and emitted opaque; the deliberately non-inverting `--discern-color-inverse-surface` remains opaque ink under paper ink at every point. Sunken surfaces, washes, borders, and overlays retain alpha because their caller-owned backdrop is part of their contract.

The Runtime emits the field when its `theme` option is absent or `"none"`. [`theme/blue.ts`](../../src/theme/blue.ts) is the opt-in `"blue"` Preset. Its chromatic role membership is enumerated from field metadata, so a future role cannot silently miss the Preset; its action pair preserves the quiet blue fill and deep blue text treatment. The Preset's static role overrides sit above the derived Token layer. Consumer Presets remain public Token overrides, never Component CSS.

## Browser projection and authored points

The Token layer registers `--discern-darkness`, `--discern-structure`, `--discern-emphasis`, and `--discern-density` as inherited `<number>` properties with the field defaults. Inside one feature query, the CSS backend binds repeated expression subtrees once and derives every non-series colour role with `calc()`, `min()`, `max()`, `clamp()`, `abs()`, `round()`, `oklch()`, and opaque compositing where the role contract requires it. Series roles remain static. A browser conformance guard evaluates every computed role at the field poles, the signed-off quarter points, and both sides of the polarity crossover, then compares it with `evaluateField` within `0.006` OKLab; the pole paths also compare independently with the static pair emission.

The Runtime emits the static pole pairs before that feature-gated live layer. `data-discern-theme="light"` pins darkness `0` and `color-scheme: light`; `"dark"` pins darkness `1` and `color-scheme: dark`; `"system"` and an unattributed Root follow `prefers-color-scheme`. Browsers without the complete live feature set therefore retain the package's previous pole behavior. Full live derivation requires Chrome or Edge 138+, Firefox 128+, or Safari 16.4+: [Chromium 138 supplies `abs()`](https://developer.chrome.com/release-notes/138#css_sign-related_functions_abs_sign), Firefox 128 and Safari 16.4 supply [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property), and those versions also cover the numeric [`round()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/round) form used here.

An author places a Root at a mid-field point by setting the axis and declaring the matching native colour scheme. Darkness `0.85` is on the dark-canvas side of the `0.4364259205` polarity crossover, so its controls use the dark scheme:

```html
<main
  data-discern-root
  style="--discern-darkness: 0.85; color-scheme: dark"
>
  <!-- Page content -->
</main>
```

Structure and emphasis can be set on the same Root within their documented bounds. Density multiplies authored pixel spacing facts only; it never changes font size. Component-owned interface-text and touch-target floors remain unscaled.

## Typography roles

The display face carries editorial headings. The body and interface faces carry prose, labels, indices, dates, measurements, status metadata, annotations, captions, and identities. The monospace face is reserved for an explicitly monospaced brand name and code, including source, commands, file paths, and terminal output. A component does not use monospace to create a technical mood.

Components that accept arbitrary content keep the text face by default. Consumers mark code through the component's code-bearing prop or semantic markup. The `Brand`, `SiteHeader`, and `SiteFooter` `mono` variants and the `.discern-mono` utility remain explicit opt-ins; discern's public surfaces use that brand variant for the name `discern`.

Theme roles can carry non-colour presentation values when a Component needs one semantic behavior to switch with the active Theme. `--discern-brand-artwork-opacity` keeps supplied multicolour artwork visible in light Theme and removes it in dark Theme when the Component provides a separate monochrome treatment; it does not affect ordinary artwork by itself.

## Appearance safety

The Catalogue exposes the field as its default Appearance in [`appearance-options.ts`](../../catalogue/shell/appearance-options.ts). Hue-backed options apply the complete blue Preset and then assign its accent hue; role-backed options layer consumer overrides over the field ([ADR 0039](../_adr/0039-admit-role-override-appearance-presets.md)). The admission proof evaluates the field at darkness `0`, `0.25`, `0.5`, `0.75`, and `1`, composites translucent roles through the shared OKLab/sRGB arithmetic, and holds primary, muted, and faint ink to `7:1`, `4.5:1`, and `3:1`. Around the polarity crossover, the primary floor remains seven and the proof requires the maximum contrast physically attainable from paper and ink rather than pretending a higher alpha exists. The same proof checks the action and inverse pairs, opaque raised surfaces, semantic separation, focus, and categorical-series visibility and distinction. [`catalogue_appearance_options_test.ts`](../../tests/catalogue_appearance_options_test.ts) binds the public options and synthetic refusal cases.

The browser's contextual text proof adds a stricter use-site consequence without changing those general rung floors: small legend text needs `4.5:1`, so the light-pole faint law uses `0.55` alpha. The `0.50` eye-led value from the exploratory findings composites to only `3.94:1` on white and remains below the floor on the field's light washes, so it is not admissible. The same contextual proof keeps inverse roles stable light-on-dark: flipping them with active polarity at the dark pole turns existing inverse scopes into white surfaces carrying white canvas-oriented roles.

## Terminal derivation

[`cli/theme.ts`](../../src/cli/theme.ts) evaluates the field at its two poles and consumes the evaluator's already-composited opaque colours. The terminal never parses alpha and never receives the blue Preset. Existing type roles carry the field's emphasis bands: faint and annotation are dim, body is normal, and strong/display are bold. Series stay package-authored, while every derived truecolour value continues through the shared ANSI 256 and ANSI 16 quantisation proofs.

## Motion and elevation boundaries

The fast, medium, and reveal durations and their easing roles in [`tokens.ts`](../../src/tokens/tokens.ts) are a shared vocabulary, not a universal transition. A Component owns motion only when it explains cause, continuity, progress, or space, and its reduced-motion posture resolves to the same complete state. Card, window, and pop shadows describe containment; they do not license passive lift or another implicit elevation tier. The production-speed and reduced-motion review contract lives in [Browser visual review](../60-catalogue/visual-review.md), while [`browser_polish_contract_test.ts`](../../tests/browser_polish_contract_test.ts) protects the structural boundary.

## Series colour

`--discern-color-series-1..6` remain authored fixed-order categorical roles outside the field. They use the medium-contrast soft-blue, deep-blue, gold, burgundy, ochre, and rose sequence recorded in [ADR-0032](../_adr/0032-use-the-medium-contrast-series-palette.md). At the field poles, charts resolve the matching authored series pole. At intermediate darkness, [`palette.ts`](../../src/chart/palette.ts) selects each slot's more visible authored counterpart against the evaluated canvas. This is the one place arithmetic overrules the review mock's eye-led assignment: its light series 6 at darkness `0.25` measured `1.04:1`, below the unchanged `1.25:1` floor, so the dark counterpart is required there. The sequential `ramp-1..4` roles are not another palette; they resolve from the field's ordered active-ink alpha ladder.

[`tests/chart/palette_test.ts`](../../tests/chart/palette_test.ts) pins the authored pole references, every sampled canvas floor, the neutral sequential ramp, severe protan/deutan separation, ANSI 256 distinctness, and the accepted ANSI 16 collapse. [`tests/cli/glyph_ramps_test.ts`](../../tests/cli/glyph_ramps_test.ts) proves the six non-colour marker and fill cues remain distinct. Browser consumers may override series custom properties, while terminal series colours stay package-authored because an override cannot re-run those proofs. Semantic state tones are never recruited as series colours, even where their hues overlap the categorical palette.

## Contextual contrast

The inverse surface and ink roles remain stable light-on-dark roles across both Themes. Marketing section's contrast surface uses them to establish a local semantic scope: ordinary canvas, surface, sunken, ink, muted ink, faint ink, and border roles move together for the section's descendants. Terminal and Code listing use the same roles for their opt-in showcase treatments. This is contextual composition rather than a third Theme, and it requires no `data-discern-theme` branch in Component CSS. [ADR-0006](../_adr/0006-homepage-treatments-ship-as-variants.md) records why these recipes remain opt-in Component contracts instead of global Token defaults.
