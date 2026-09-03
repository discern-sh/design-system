# ADR 0045: Name the model Appearance, make the accent optional, and tint the pigments

**Status**: accepted

**Partially supersedes**: [ADR 0043](0043-project-accent-from-the-field.md), where it names two appearance identities, spells the browser scope `data-discern-appearance`, and keeps a Blue export; and [ADR 0040](0040-derive-the-theme-from-a-monochrome-field.md), where it calls the model a field and leaves the pigments untinted. Both records' laws stay in force: the achromatic default, action inversion, opaque owned surfaces, the fixed series boundary, non-colour witnesses, one law with two projections, and the full-circle Accent projection.

## Context

The monochrome-field and field-appearance programmes landed a working model with three awkward edges, all still unreleased because 0.29.0 shipped `theme: "discern"` and none of the Field, Accent, or Blue names.

The word "field" did three jobs. It named the colour model, a coordinate in it, and one of two palette choices. It also collides with a public Forms component called Field and with the terminal form frame of the same name, so a reader could not tell from the word alone whether a sentence was about colour or an input.

Field and Accent were presented as alternatives. In the graph they never were: Accent evaluates the chromatic projection for the roles that carry one and falls through to the same pigment law for everything else. A consumer had to understand a two-valued identity plus a hue to express what is really one optional number. The Blue export, the `theme: "blue"` runtime option, and the manifest's `theme` field were three spellings of that same number.

Monochrome was literally black on white. A consumer who wants the achromatic posture with a whisper of navy in the dark ground, or a warm stock at the light pole, had no lever short of overriding roles by hand, which forks the law.

## Decision

**The model is the Appearance.** An `Appearance` is one object: the axis coordinates plus an optional accent hue. The authority lives in [`appearance.ts`](../../src/tokens/appearance.ts); its live projection in [`appearance-live-css.ts`](../../src/tokens/appearance-live-css.ts); its scopes in [`appearance-scope-css.ts`](../../src/tokens/appearance-scope-css.ts); its proof in [`appearance-admission.ts`](../../src/tokens/appearance-admission.ts). "Field" refers only to the Forms component. "Pole" remains an internal word for darkness `0` and `1`; user-facing controls say Light and Dark.

**The accent is optional, and that is the whole palette choice.** `accent` is either absent, which is the monochrome default, or a finite hue from `0` through `360`. There is no identity value beside it. `resolveAppearance` fills omitted coordinates and normalises the hue; the TypeScript evaluator, the static poles, the live CSS, and the terminal all consume the same object. Internally the two role projections are still named `mono` and `accent`, because a role law records which one it carries.

**The browser scope is `data-discern-accent`.** Present on a Root or subtree, it applies the Accent projection at the inherited `--discern-accent-hue`; the value `none` restores monochrome inside an Accent region. Both directions and hue replacement nest as before. The Runtime keeps `appearanceScopes` as the opt-in that emits the surface. Browsers cannot branch on whether a custom property is set, so the attribute stays the switch and the property stays the value.

**Blue is a name, not an export.** `./theme/blue`, `blueThemeRoleTokens`, and the runtime `theme` option are removed; the manifest schema moves to 4 without a `theme` field. The Catalogue keeps Blue, Indigo, Rose, and the other names as conveniences that set the number. `DEFAULT_ACCENT_HUE` remains `255` as the registered initial value of the hue primitive, which the public Token inventory now documents directly.

**The pigments carry tints.** Four axes join darkness, structure, emphasis, and density: `paperTint`, `paperTintHue`, `inkTint`, and `inkTintHue`, registered as `--discern-paper-tint`, `--discern-paper-tint-hue`, `--discern-ink-tint`, and `--discern-ink-tint-hue`. Paper and ink are OKLCH expressions of those axes: a full paper tint gives up `0.05` lightness and gains `0.02` chroma, a full ink tint lifts black to lightness `0.14` at chroma `0.021`, and the strength ramps linearly so every hue stays inside sRGB at every strength. Because every derived role is a pigment at an alpha over a canvas interpolated between the pigments, a tint reaches the whole system with no per-role law. Hue is inert while its strength is zero. The terminal accepts the same tints beside the accent, and the untinted palettes stay byte-identical and cached.

**The admission proof holds the tints.** It sweeps both pigments across the integer hue circle at four strengths for gamut, and holds every contrast, distinction, inversion, opacity, and series floor at tinted poles for twelve hues, at the tinted crossover neighbours, and at the signed dark posture with a half tint. Holding the accent-to-warning separation at that posture once the ink lifts required lowering the warning rung's high-emphasis ceiling from `0.74` to `0.72`; the poles and every default-emphasis value are unchanged.

**What this does not do.** It does not add an accent chroma axis: Emphasis still scales chromatic strength, and a low-chroma brand remains a later decision. It does not let a monochrome brand keep chromatic status colours; success, warning, and danger take colour with the accent. It does not tint the accent projection itself. It does not change the polarity law: the crossover still reads the canvas lightness, and a tinted canvas at the crossover is proved rather than re-derived.

## Consequences

A consumer learns one object. Colour is a hue you supply or leave out; warmth or coolness is a tint you dial; light and dark are the darkness axis or the theme attribute. The Catalogue panel shrinks to one Accent select plus the axes, and its URL carries `accent=<hue|none>` and `field=<axes>` with tints appended only when in use. Older links with `appearance=field|accent`, named accents, or the mono and blue suffixes migrate.

Every consumer of the old names changes, but nothing published did. The renamed files, types, attribute, and dropped export are recorded once in the Unreleased changelog rather than as a migration.

The tint caps are deliberately small. They bound what the proof can hold across the whole circle at once, and they keep the axis honest to its purpose: a whisper of stock, a coloured black, never a second accent. Raising a cap is a proof-backed change to two constants; it is not a per-hue table.

## Alternatives considered

Keeping the Field/Accent identity beside the hue preserves a vocabulary the graph does not need and leaves two spellings of "blue". Collapsing to the optional hue removes both.

One shared tint for both pigments is the common case and is what the Catalogue's ordinary control writes, but the pigments are independent facts and the print look of warm paper over cool ink costs nothing to keep. Two tints subsume one.

Tinting only the canvas would leave ink and paper pure and every rung uncoloured, so a tinted page would drift back to neutral wherever a surface or wash composites. Tinting the pigments moves everything together.

A per-hue gamut clamp would allow deeper stocks at yellow than at blue. It cannot be expressed in the CSS calc subset the live projection uses, and a hue-dependent ceiling would make the same strength mean different depths at different hues. Linear laws capped at the tightest hue keep one meaning per number.
