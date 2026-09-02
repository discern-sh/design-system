# ADR 0042: Project Accent from the field and scope appearances symmetrically

**Status**: accepted

**Partially supersedes**: [ADR 0040](0040-derive-the-theme-from-a-monochrome-field.md), only where it keeps chroma as an authored Blue light/dark pair and withholds an appearance input from the terminal. ADR 0040's achromatic default, action inversion, opaque-owned-surface rule, fixed series boundary, non-colour witnesses, and one-law/two-projection discipline remain in force.

## Context

ADR 0040 deliberately stopped after deriving the achromatic Field. `./theme/blue` remained a hand-authored pair table because the first field work had not proved continuous chromatic curves. That boundary made Blue a second value authority: Darkness changed only its binary pole, Emphasis could not reach roles after the preset replaced them, and a consumer hue was safe only where a short list happened not to collide with the fixed success, warning, and danger values. The Catalogue exposed the split by placing static Blue pole overrides over a live field point and then changing `--discern-accent-hue` separately.

The product model is broader. A palette selects pigments while the Field axes retain their meaning. Consumers need an achromatic region inside a chromatic page, a chromatic region inside an achromatic page, and a locally different hue inside either without copying a role table. Browser and terminal projections also need one appearance identity vocabulary even though the terminal implementation remains a later workstream.

The review also exposed two defects at the same authority. The dark Field action fill and its hard shadow both reached full active ink, so the Button lost its offset edge. Avatar identity stops were active-ink alpha washes, so initials and foreign backdrops showed through the monogram. Component exceptions would preserve the faulty laws and miss the next consumer.

## Decision

**Appearance vocabulary.** `Field` is the default achromatic appearance. `Accent(hue)` is the opt-in chromatic appearance. TypeScript represents them as the explicit pure inputs `{ name: "field" }` and `{ name: "accent", hue }`; browser scopes use `data-discern-appearance="field|accent"` and Accent reads the inherited `--discern-accent-hue` primitive. The terminal receives the same explicit appearance input rather than reading ambient process or browser state. Terminal propagation belongs to the follow-on terminal work, not this decision's implementation.

**Palette and axes are orthogonal.** Appearance chooses the pigment projection. Darkness, Structure, Emphasis, and Density remain the surrounding Field coordinates and inherit through a colour-only scope. A nested scope may set one of those properties explicitly; normal CSS inheritance carries that local coordinate to its descendants. Darkness continuously moves chromatic lightness and chroma through the same polarity law, Emphasis scales chromatic strength within contrast and distinction bounds, Structure continues to own borders and hard-shadow strength, and Density remains spacing-only.

**The complete hue circle is public.** Accent accepts every finite numeric hue from `0` through `360`, including fractional values. `360` normalises to `0`. Values below `0`, above `360`, `NaN`, and infinities throw a predictable `TypeError`. Named colours such as Blue, Green, Pink, or Rose are conveniences that resolve to numbers; they are not an allow-list and cannot narrow the domain.

**Primitives and derivations.** The consumer's accent hue and the package's semantic family hue/chroma envelopes are chromatic primitives. Role lightness, chroma, alpha, polarity, and emphasis response remain derived facts in the ordered Field role graph. Every role records either its Accent projection or the explicit fact that it inherits Field. That population drives TypeScript evaluation, generated pole fallback, live CSS, Blue compatibility, and admission, so a future role cannot silently exist in only one projection. Series `1–6` remain the authored ADR 0032 palette outside this graph.

**Chromatic curves.** Accent rungs use four targets—light pole, light-side crossover, dark-side crossover, and dark pole—interpolated continuously inside each polarity. Their pole targets start from the recognisable Blue values; crossover targets buy the contrast that the middle canvas removes. Emphasis multiplies chroma, with role-specific lower and upper strength bounds where legibility or family distinction would otherwise disappear. This is the smallest model that keeps the Field axes meaningful without a CSS-only correction table.

Success stays centred at hue `152`, warning moves continuously from `74` toward `82`, and danger stays centred at `28`. They do not chase or reject the selected Accent hue. Instead, their polarity-relative lightness and chroma envelopes occupy a different role-strength band from Accent. In particular, danger is deep on the light side and bright on the dark side: this preserves red identity and the danger-on-wash text contract while remaining separated when Accent itself is red. The package exhausts the integer circle plus fractional, seam, and semantic-neighbour samples and holds `0.08` OKLab separation between Accent and each semantic family and between semantic families. A non-colour witness remains mandatory for meaning. No safe-hue list, silent floor reduction, or forbidden arc exists.

**Action and owned-surface laws.** `--discern-color-action` is a strong chromatic fill in Accent and full active ink in Field; `--discern-color-on-action` remains the opposite Field pigment in both, so the pair is inverted at every hue. `--discern-color-action-shadow` remains structural active ink but has a bounded Structure response that keeps its composited paint at least `0.08` OKLab from both action fill and canvas at admitted points. The Button receives no exception. Identity-fill base roles are owned surfaces: the authority composites the subtle Field stops once and emits opaque values, while Accent emits opaque chromatic stops. Decorative highlight alpha may still sit over that owned base. Avatar selectors do not change.

**Symmetric browser scopes.** The runtime can emit one atomic `appearanceScopes` surface. It generates zero-specificity selectors inside `[data-discern-root]` for both appearance values, including static light/dark pole fallback and feature-gated live declarations. Field inside Accent restores every role from the Field projection; Accent inside Field projects every enrolled chromatic role; Accent inside Accent re-evaluates from the locally inherited hue. The scope changes no axis by itself. The atomic surface includes both directions because emitting only half would make the public nesting contract order-dependent.

**Blue compatibility.** `./theme/blue`, `blueThemeRoleTokens`, and runtime `theme: "blue"` remain supported as the named Accent projection at hue `255`. Their pole pairs and live CSS are generated from the shared graph; no authored Blue role-value table remains. Existing consumers keep their import and runtime selection. New consumers that need subtree composition select `appearanceScopes` and use the appearance attribute. Runtime manifest schema 3 records that selection explicitly.

## Consequences

The achromatic Field remains the package default, but chroma is no longer a finite set of authored presets. Any hue can be evaluated in TypeScript, rendered live in CSS, nested in either direction, and admitted with the same proof. Adding a chromatic role means extending the role graph once; evaluator, fallback, live scope, Blue, and structural coverage all enrol it.

The admission proof is intentionally larger. It covers Field and Accent at the poles, signed 0A postures, polarity neighbours, low/high Emphasis and Structure, all 361 integer hue coordinates, fractional seam points, and extra samples around semantic centres. It retains text, focus, semantic-distance, opaque-surface, series, inversion, and non-colour-witness contracts, and adds the action-shadow and identity-ownership defects as permanent guards.

The chromatic curves do not reproduce every old Blue byte. The old quiet-blue action with deep-blue text is replaced by the same strong-fill/opposite-pigment law as Field. Semantic strength changes where necessary to remain recognisable, distinct, and legible at a coincident Accent hue. Those are contract corrections, not a second compatibility palette.

Browsers without the live expression feature set receive generated pole fallback inside every selected scope. Arbitrary Darkness and Emphasis between the poles require the declared live-support query, as they already do for Field. The terminal must add an explicit appearance parameter before it can consume Accent; until that work lands, its current Field projection remains unchanged.

## Alternatives considered

Keeping Blue as a table and generating more named tables preserves the authority split and turns the current safe choices into a permanent allow-list. It cannot support arbitrary nested hue changes or continuous axes.

Rotating semantic hues away from Accent would maximise numerical distance but make success, warning, and danger move around the colour wheel as branding changes. Fixed family centres with polarity-relative strength envelopes preserve meaning and admit the whole circle.

Rejecting hues near `28`, `74–82`, or `152` would make collision avoidance easy but violate the public circular domain. Weakening the `0.08` floor only at those coordinates would hide the same failure. The envelope model holds the floor without either exception.

Letting Components own an `appearance` prop or themed stylesheet would duplicate a token-scope concern across every renderer. Appearance stays a root/subtree token projection; Components continue to consume unchanged public role names.
