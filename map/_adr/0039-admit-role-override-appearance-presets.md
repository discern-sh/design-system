# ADR 0039: Admit role-override Appearance presets

**Status**: accepted

## Context

[ADR 0037](0037-expose-only-semantically-safe-appearance-presets.md) made Catalogue Appearance a finite set of exhaustively proved options, but its option schema could express only one degree of freedom: the public accent hue. A complete role posture, such as an achromatic identity in which every grey is ink at an alpha, is inexpressible as a hue, yet it is exactly the stress test [principle 5](../00-orientation/design-principles.md) invites: if themes truly move tokens and never component CSS, a maximally hostile token-only preset must be admissible without touching a stylesheet.

The existing admission proof was also narrower than the map claimed: it verified accent text, focus, and accent-versus-semantic distinction, but not ink legibility, the inverse pair, pairwise semantic separation, or categorical-series distinctness, and it could not measure translucent values at all because the contrast of an alpha colour depends on what sits beneath it.

## Decision

Appearance options are a union. Hue-backed options keep the single `--discern-accent-hue` assignment. Preset-backed options carry complete public role-token overrides, applied per resolved theme through one shared style authority consumed by the shell, the visual review instrument, and the Builder preview (protocol v3 carries the option id). State, URLs, and storage hold option ids; legacy hue values still resolve.

The admission proof generalises rather than loosens. `oklch()` values may carry alpha and are composited over the option's canvas in gamma sRGB exactly as browsers paint them; the canvas itself must be opaque. Every option, hue or preset, now also proves ink, muted, and faint legibility on canvas, the inverse surface/ink pair, pairwise semantic-role separation at the 0.08 OKLab floor, and categorical-series visibility and pairwise distinction. All twelve authored hue options pass the extended floors unchanged; unsafe synthetic presets fail closed with named reasons.

No preset-backed option is authored yet. Synthetic presets in [`catalogue_appearance_options_test.ts`](../../tests/catalogue_appearance_options_test.ts) prove the seam; the first real one arrives with the theme that needs it.

## Consequences

Re-branding freedom now has a second proven shape: a consumer can adopt a complete role posture, not just a hue, with the same fail-closed guarantees, and the Catalogue can demonstrate it once such a preset is authored. Every future option, hue or preset, pays the extended proof, so a hue that keeps accent text legible but drowns a series colour or a faint ink can no longer be admitted.

A preset that carries translucent values must own an opaque canvas. The proof composites over that canvas only, so a preset whose ink roles are painted over other surfaces relies on those surfaces staying close to the canvas.

## Alternatives considered

Expressing a complete role posture through the hue primitive is impossible: chroma is authored per role, so no hue yields an achromatic result. Compositing alpha in OKLab instead of gamma sRGB would diverge from what browsers actually paint and prove the wrong numbers. Keeping the proof hue-only and exempting presets would make the admission gate weakest exactly where options gain the most freedom.
