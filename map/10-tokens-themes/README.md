# Tokens & themes

The appearance graph, its static and live projections, symmetric browser scopes, and the Root-scoped foundation and utility CSS.

## Appearance authority and poles

[`appearance.ts`](../../src/tokens/appearance.ts) owns paper and ink as OKLCH expressions of the tint axes, the bounded darkness, structure, emphasis, density, and pigment-tint axes, and one ordered law for each non-series colour role. Every law explicitly carries either its Accent projection or the fact that it stays pigment-derived. An `Appearance` is one object: the axis coordinates plus an optional `accent` hue, and `evaluateAppearance(appearance)` evaluates it to deterministic `oklch()` strings; an omitted accent is the monochrome default. [`tokens.ts`](../../src/tokens/tokens.ts) evaluates monochrome at darkness `0` and `1` into the existing `ThemeToken` pair shape, while [`appearance-live-css.ts`](../../src/tokens/appearance-live-css.ts) walks the same nodes for live browser calculations. Generated pole pairs are static fallback, not another value authority.

Canvas interpolates the two pigments in OKLab along darkness, and the active pigment changes at the `0.179` relative-luminance crossover. Structure scales structural roles, Emphasis scales state and chromatic strength within their admitted bounds, and Density applies only when the numeric four-pixel spacing fact is projected. In monochrome, `--discern-color-action` is full active ink; under an accent it is the strong selected hue. `--discern-color-on-action` is the opposite pigment in both, so the pair always inverts. The hard action shadow retains a structural response while staying at least `0.08` OKLab from fill and canvas in the admission sweep. Raised surface and Avatar identity-fill bases are composited once and emitted opaque. Sunken surfaces, washes, borders, overlays, and decorative Avatar highlight may retain alpha where their owned backdrop is part of the contract.

The pigments carry tints. `paperTint` and `paperTintHue` move white along a gamut-safe line towards a coloured stock; `inkTint` and `inkTintHue` lift black towards a coloured black. Paper is the light pigment and ink the dark one at every darkness, and the canvas takes the paper at the light pole and the ink at the dark pole, so each tint colours whichever role its pigment currently plays: a tinted ink reads as black in small text and shows in primary fills, inverse surfaces, and the dark canvas. A hue is inert while its strength is zero, `activePigmentTints` names the tints in force, and because every role is a pigment at an alpha, a tint reaches the complete surface and the terminal without a per-role law. [ADR 0045](../_adr/0045-name-the-model-appearance-and-tint-the-pigments.md) records the vocabulary, the optional accent, and the tint caps.

The Runtime emits monochrome by default. Consumer role presets remain public Token overrides, never Component CSS.

## Browser projection and authored points

The Token layer registers `--discern-darkness`, `--discern-structure`, `--discern-emphasis`, `--discern-density`, the four tint properties, and `--discern-accent-hue` as inherited numeric properties. Inside one feature query, the CSS backend binds the tinted pigments, the canvas colour, and the active and opposite pigment coordinates once, then derives every enrolled role with `calc()`, `min()`, `max()`, `clamp()`, `abs()`, `round()`, `oklch()`, `color-mix()`, and opaque compositing where required. Series roles remain static. Browser conformance compares every computed role, including a tinted point and every role in nested scopes, with TypeScript within `0.006` OKLab, checks the static pole route independently, and verifies inherited or locally overridden axes and hue.

Consumers select the atomic scope surface with Runtime option `appearanceScopes: true`. The public attribute is `data-discern-accent`: present, it applies the Accent projection at the inherited `--discern-accent-hue`; the value `none` restores monochrome. All selectors are zero-specificity and contained beneath `[data-discern-root]`. The contract supports monochrome → Accent → monochrome, Accent → monochrome → Accent, and Accent(hue A) → Accent(hue B) nesting. A colour-only scope leaves every axis untouched; setting an axis on the scope changes that coordinate for its descendants through ordinary inheritance.

```html
<main data-discern-root data-discern-accent style="--discern-accent-hue: 255">
  <aside data-discern-accent="none">Monochrome again</aside>
</main>
```

The Runtime emits the static pole pairs before that feature-gated live layer. `data-discern-theme="light"` pins darkness `0` and `color-scheme: light`; `"dark"` pins darkness `1` and `color-scheme: dark`; `"system"` and an unattributed Root follow `prefers-color-scheme`. Browsers without the complete live feature set therefore retain the package's previous pole behavior. Full live derivation requires Chrome or Edge 138+, Firefox 128+, or Safari 16.4+: [Chromium 138 supplies `abs()`](https://developer.chrome.com/release-notes/138#css_sign-related_functions_abs_sign), Firefox 128 and Safari 16.4 supply [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property), and those versions also cover the numeric [`round()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/round) form used here.

An author places a Root at a mid-darkness point by setting the axis and declaring the matching native colour scheme. Darkness `0.85` is on the dark-canvas side of the `0.4364259205` polarity crossover, so its controls use the dark scheme:

```html
<main
  data-discern-root
  style="--discern-darkness: 0.85; color-scheme: dark"
>
  <!-- Page content -->
</main>
```

Structure, emphasis, and the tints can be set on the same Root within their documented bounds. Density multiplies authored pixel spacing facts only; it never changes font size. Component-owned interface-text and touch-target floors remain unscaled.

## Typography roles

The display face carries editorial headings. The body and interface faces carry prose, labels, indices, dates, measurements, status metadata, annotations, captions, and identities. The monospace face is reserved for an explicitly monospaced brand name and code, including source, commands, file paths, and terminal output. A component does not use monospace to create a technical mood.

Components that accept arbitrary content keep the text face by default. Consumers mark code through the component's code-bearing prop or semantic markup. The `Brand`, `SiteHeader`, and `SiteFooter` `mono` variants and the `.discern-mono` utility remain explicit opt-ins; discern's public surfaces use that brand variant for the name `discern`.

Theme roles can carry non-colour presentation values when a Component needs one semantic behavior to switch with the active Theme. `--discern-brand-artwork-opacity` keeps supplied multicolour artwork visible in light Theme and removes it in dark Theme when the Component provides a separate monochrome treatment; it does not affect ordinary artwork by itself.

## Appearance safety

Accent accepts every finite hue from `0` through `360`; `360` aliases `0`, fractional values are valid, and invalid or non-finite values throw. Named colours are Catalogue conveniences rather than an admission list. Success remains centred at hue `152`, warning at `74–82`, and danger at `28`; polarity-relative strength envelopes keep each family recognisable and at least `0.08` OKLab from a coincident Accent and from the other semantic families. Meaning still requires the existing non-colour witness.

[`appearance-admission.ts`](../../src/tokens/appearance-admission.ts) is the package-level proof. It evaluates monochrome and the complete integer Accent circle, adds fractional seam and semantic-neighbour hues, and visits both poles, the signed 0A postures, polarity neighbours, low/high Emphasis and Structure, tinted poles at twelve hues, tinted crossover neighbours, and a half-tinted dark posture. It retains primary, muted, faint, action, inverse, focus, semantic, fixed-series, and opaque-surface floors, adds hard-shadow separation and identity-fill ownership, and sweeps both pigments across the hue circle at four tint strengths for sRGB gamut. [`appearance_test.ts`](../../tests/appearance_test.ts) binds this public proof; browser conformance binds the live and nested CSS projections. The Catalogue consumes the same numeric hue and axes for its Web and CLI projections; named choices remain conveniences over that number rather than another admission authority.

The browser's contextual text proof adds a stricter use-site consequence without changing those general rung floors: small legend text needs `4.5:1`, so the light-pole faint law uses `0.55` alpha. The `0.50` eye-led value from the exploratory findings composites to only `3.94:1` on white and remains below the floor on the light washes, so it is not admissible. The same contextual proof keeps inverse roles stable light-on-dark: flipping them with active polarity at the dark pole turns existing inverse scopes into white surfaces carrying white canvas-oriented roles.

## Terminal derivation

The terminal receives the same explicit appearance vocabulary as the browser: an optional accent hue and optional pigment tints, beside its own light or dark ground. [`cli/theme.ts`](../../src/cli/theme.ts) evaluates the selected appearance at the explicit pole, consumes its already-composited opaque colours, and projects the result through the shared truecolour, ANSI 256, and ANSI 16 authorities. Omission, or an appearance whose accent is absent and whose tints are inert, is the cached monochrome default. [`presenter.ts`](../../src/cli/presenter.ts) binds ground and appearance independently, while `with()` and per-render props can restore monochrome or replace an accent hue for one subtree without ambient state. Existing type roles carry the monochrome emphasis bands; series stay on their package-authored palette. Generated population conformance requires every rendered Component to accept and honour the shared presentation contract across both grounds, every colour depth, and Unicode/ASCII.

## Motion and elevation boundaries

The fast, medium, and reveal durations and their easing roles in [`tokens.ts`](../../src/tokens/tokens.ts) are a shared vocabulary, not a universal transition. A Component owns motion only when it explains cause, continuity, progress, or space, and its reduced-motion posture resolves to the same complete state. Card, window, and pop shadows describe containment; they do not license passive lift or another implicit elevation tier. The production-speed and reduced-motion review contract lives in [Browser visual review](../60-catalogue/visual-review.md), while [`browser_polish_contract_test.ts`](../../tests/browser_polish_contract_test.ts) protects the structural boundary.

## Series colour

`--discern-color-series-1..6` remain authored fixed-order categorical roles outside the field. They use the medium-contrast soft-blue, deep-blue, gold, burgundy, ochre, and rose sequence recorded in [ADR-0032](../_adr/0032-use-the-medium-contrast-series-palette.md). At the field poles, charts resolve the matching authored series pole. At intermediate darkness, [`palette.ts`](../../src/chart/palette.ts) selects each slot's more visible authored counterpart against the evaluated canvas. This is the one place arithmetic overrules the review mock's eye-led assignment: its light series 6 at darkness `0.25` measured `1.04:1`, below the unchanged `1.25:1` floor, so the dark counterpart is required there. The sequential `ramp-1..4` roles are not another palette; they resolve from the field's ordered active-ink alpha ladder.

[`tests/chart/palette_test.ts`](../../tests/chart/palette_test.ts) pins the authored pole references, every sampled canvas floor, the neutral sequential ramp, severe protan/deutan separation, ANSI 256 distinctness, and the accepted ANSI 16 collapse. [`tests/cli/glyph_ramps_test.ts`](../../tests/cli/glyph_ramps_test.ts) proves the six non-colour marker and fill cues remain distinct. Browser consumers may override series custom properties, while terminal series colours stay package-authored because an override cannot re-run those proofs. Semantic state tones are never recruited as series colours, even where their hues overlap the categorical palette.

## Contextual contrast

The inverse surface and ink roles remain stable light-on-dark roles across both Themes. Marketing section's contrast surface uses them to establish a local semantic scope: ordinary canvas, surface, sunken, ink, muted ink, faint ink, and border roles move together for the section's descendants. Terminal and Code listing use the same roles for their opt-in showcase treatments. This is contextual composition rather than a third Theme, and it requires no `data-discern-theme` branch in Component CSS. [ADR-0006](../_adr/0006-homepage-treatments-ship-as-variants.md) records why these recipes remain opt-in Component contracts instead of global Token defaults.
