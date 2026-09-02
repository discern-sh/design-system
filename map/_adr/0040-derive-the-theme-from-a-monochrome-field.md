# ADR 0040: Derive the theme from a monochrome field

**Status**: accepted

**Partially superseded by**: [ADR 0043](0043-project-accent-from-the-field.md), for the authored Blue-pair and no-terminal-appearance conclusions only. The Field default and the remaining decisions below stay in force.

## Context

Every colour role in [`tokens.ts`](../../src/tokens/tokens.ts) carries a light value and a dark value written by hand: forty theme roles with two authored values each, two palettes that must be kept in agreement by review. The blue accent is the package default and the brand document in the discern repository names it the identity colour. Themes move tokens and never component CSS ([principle 5](../00-orientation/design-principles.md)), and [ADR 0039](0039-admit-role-override-appearance-presets.md) proved that a complete achromatic posture can be admitted as a preset without touching a stylesheet. A throwaway branch then authored that posture by hand and showed three things a preset cannot do.

It cannot invert. Primary actions are painted as the quiet end of the accent ramp for fill and the deep end for text, so an achromatic preset renders them as a grey wash with a heavy border rather than ink carrying paper. The ramp is a lightness ramp; the brand wants a polarity flip. No token override can express that without breaking every other use of the quiet rung, such as text selection.

It cannot own its backdrop. The experiment set the dark raised surface to a translucent white wash, and dialog, toast, and hover card all paint with that role, so a floating surface over a card composited to a different grey than the same surface over canvas. A translucent value whose meaning depends on what lies beneath it is a defect wherever the backdrop is not known.

It cannot reach the terminal. The CLI palette in [`theme.ts`](../../src/cli/theme.ts) derives from the base roles and its colour parser reads no alpha channel, so the preset was browser-only. Yet the terminal has been the honest version of this idea all along: it owns its ground, expresses muted as dim, decisive as reverse video, and [ADR 0015](0015-sense-terminal-background-as-a-caller-driven-effect.md) already pins the polarity crossover at relative luminance 0.179, the point where black and white text tie on contrast. The marketing contrast section in [`marketing-section.css`](../../src/components/marketing/marketing-section/marketing-section.css) is the same model hand-rolled for one component: canvas, surfaces, ink, and borders rescoped as inverse ink at fixed alphas over an owned opaque canvas.

The design system was built for discern and consumed publicly. Its visual identity needed to belong to discern rather than read as a generic editorial page, and the mark ◮ is already monochrome: filled versus unfilled, rendered in the reader's foreground colour, inverting with the theme. The contrast arithmetic supports a continuous treatment. Interpolating the canvas in OKLab lightness from paper to ink and choosing the ink pole by contrast keeps primary text at or above 4.5:1 across the whole range, with the tie at grey #757575. Secondary and tertiary ink do not survive on a fixed alpha ladder: an alpha that reads at the poles falls below its floor near the middle, so any rung that exists must vary with darkness.

## Decision

Theme colour roles are derived from a monochrome field, not authored as light and dark pairs.

**Pigments and axes.** The field is authored from two pigments, paper and ink, and a small set of numeric axes. `darkness` places the canvas between paper and ink in OKLab lightness. `structure` scales structural ink: borders, dividers, hairlines, stripes, and shadows. `emphasis` scales state ink: hover, selected, current, and the quiet accent washes. `density` scales the spacing unit. Every role keeps its existing public name; only its authority changes. Series colours are not in the field: `--discern-color-series-1..6` remain the authored hue palette of [ADR 0032](0032-use-the-medium-contrast-series-palette.md), because colour is reserved for data.

**Polarity and the contrast law.** Ink is whichever pigment wins WCAG contrast against the current canvas; the crossover is relative luminance 0.179, the same rule the terminal already uses. Every non-canvas colour role is the current ink at an alpha, and each alpha is a function of darkness chosen to hold that role's contrast floor across the field rather than a constant. Rungs bend; they never sit still. Hysteresis is a live-slider concern and has no place in the token model.

**Inversion is the exclamation mark.** A fill loud enough that canvas-polarity text cannot read on it must carry paper-polarity text. Two new roles express that contract: `--discern-color-action` and `--discern-color-on-action`. In the field they are full ink and paper. Components paint primary actions through these roles and never through a loud accent rung with hand-picked text. Quiet accent rungs stay quiet and keep canvas-polarity text.

**Backdrop ownership.** Raised surfaces are opaque at the field point: the authority composites them once and emits an opaque colour, so a dialog, toast, popover, or tooltip means the same thing over any backdrop. Only roles that sit on canvas by contract, such as sunken and wash roles, may stay translucent.

**Poles remain the public contract.** `data-discern-theme` with `light`, `dark`, and `system` pins darkness to 0 or 1 and sets `color-scheme`, which the browser cannot derive from a number. The darkness axis is an author override on the root for consumers who want a mid-field point and accept declaring the colour scheme the polarity implies. Existing consumer overrides of individual roles keep working, because a derived declaration is still a custom property a later layer may replace.

**One law, two evaluators.** The law is authored once, as a small expression tree in the token authority, and projected twice: compiled to CSS for the browser, and evaluated in TypeScript at a chosen point for the terminal palette, chart palettes, and the admission proof. The two projections are proven equal by a conformance check that reads computed styles at sample points and compares them with the TypeScript evaluation. A second hand-written copy of the law in either language is a defect.

**Achromatic by default.** The default emission is the field with no chroma: mono is the package's identity. The blue accent becomes a preset layer, `./theme/blue`, that overrides the accent and semantic families with its authored hues; a consumer who wants red danger or green success overrides those families exactly as the green fixture does today. The semantic distinctness proofs hold in both postures, and status meaning never rests on colour alone in either.

**What this does not do.** It does not fork component CSS per theme; principle 5 stands and is strengthened. It does not add a runtime hue picker or a theme generator API beyond the field's axes. It does not recolour the series palette, add chart interactivity, or change the CLI's ownership of its ground. It does not make the terminal parse alpha: the terminal consumes the field evaluated at a pole and maps alpha to dim, normal, and bold.

## Consequences

Light and dark stop being two things to keep in agreement and become two samples of one rule, which is the strongest form of the single-source-of-truth principle this package has. A consumer reads one authority to understand every grey. Any point in the field can be proven the same way the poles are, and the admission proof already composites alpha over an opaque canvas exactly as browsers paint, so mid-field presets cost nothing new to prove.

The identity changes. Public surfaces that select no preset render in ink and paper; the blue is opt-in. The brand document in the discern repository must change with this record, and the neutrals that the blue theme tinted cool become achromatic for everyone unless a later decision adds neutral hue and chroma to the field. The runtime's `theme` option and the `./theme/discern` export are renamed and recorded in the changelog before 1.0.

The population must be swept. Every `light-dark()` in component CSS becomes a derived role; every primary action moves to the action pair; loud accent rungs stop carrying hand-picked text; floating surfaces paint with opaque surface roles; raw pixel spacing and untokenised borders and shadows become illegal so that structure and density actually reach them. Non-colour witnesses for status become a proven browser contract, as they already are in the terminal.

Mid-field contrast is real but thinner. Primary text holds AA everywhere; muted and faint ink hold only because their rungs rise near the middle, and a standard samples the field so the minimum margin can never fall. Some components will look different at the middle than at the poles by design.

Live browser derivation depends on `round()`, `abs()`, and registered numeric custom properties, which sets a floor on supported browsers that the emitted CSS must state. Until the live projection lands, the poles are emitted as today's pair CSS from the same authority, so nothing about this decision requires the two halves to ship together.

## Alternatives considered

Shipping mono as a preset over the authored blue roles keeps two hand-written palettes plus a third and cannot express inversion, backdrop ownership, or the structure and density axes at all; the experiment proved the ceiling of that altitude.

Making darkness a boolean with a contrast slider is a dark-mode toggle with a knob, and it would still leave the rungs constant, which the arithmetic shows is wrong near the middle.

Deriving the chromatic blue roles from the field as well would require per-role chroma laws that the hand-tuned values do not follow, and would delay the achromatic identity behind a harder problem. Blue stays authored, as a preset.

Keeping polarity at darkness 0.5 instead of the contrast crossover reads naturally but puts a dead zone in the field where both pigments lose; the 0.179 rule is what the terminal already trusts and what the numbers support.
