# Monochrome field programme

Briefs for landing [ADR 0040](../../../_adr/0040-derive-the-theme-from-a-monochrome-field.md): every colour role derived from a monochrome field of two pigments and numeric axes, light and dark as the field's poles, inversion as the primary-action treatment, opaque raised surfaces, colour reserved for data, and mono as the package identity with the blue accent demoted to a preset. The result must hold every existing accessibility and determinism contract, reach the terminal and the charts through the same authority as the browser, and give the Catalogue an instrument that shows the system as one rule rather than two palettes.

The completed package sweep exposed usability defects in the deferred static Blue and terminal boundaries. The dedicated [field-appearance programme](../field-appearance/README.md) now intervenes between wave 3 and this programme's cross-repository 4A. It replaces the Blue-only table with a hue-parameterised Accent projection across the full `0–360` circle, retains Blue only as the hue-255 compatibility preset, and restores explicit terminal opt-in while preserving the achromatic default, axes, inversion, opacity, witnesses, and one-law authority. Do not dispatch 4A until that programme is complete and included in the release selected for site adoption.

Every brief is a complete prompt for a fresh agent. The programme slug is `field`; each brief names its literal worktree name. Wave 0 is a throwaway proof of concept for the maintainer's eye and never lands. Waves 1 and 3 each run two streams in parallel on disjoint territory; waves 2 and 4 are single streams.

## Why a programme, and why the proof of concept comes first

The decision rests on contrast arithmetic and on one hand-authored experiment, not on the system rendered at scale. Before the token model is rewritten, the maintainer wants to see high-risk components under the new conventions with their own eyes: inverted primary actions, severity carried by opacity, floating surfaces over cards, structure faded low for editorial pages and high for operational ones, and the terminal at both poles. Wave 0 mocks that by hand inside the existing preset seam and the local visual review instrument, without rebuilding anything, and records what the eye disagrees with. Wave 1 reads those findings before it writes a single law.

## Harvested from the mono preset experiment

Branch `agent/mono-appearance-preset-9c8b4f` at `f2b3282e` (dropped when this package landed; the objects remain recoverable from the repository for a short while) authored mono as a role-override preset. What it taught, kept here because the branch is gone:

- **Seed alpha ladder** (light / dark, ink over paper): ink 0.87 / 0.92, muted 0.66 / 0.72, faint 0.50 / 0.55; accent-100…800 at 0.05 / 0.06, 0.09 / 0.10, 0.17 / 0.18, 0.32 / 0.34, 0.52 / 0.55, 0.82 / 0.85, 0.93 / 0.94, 1 / 1; border 0.14 / 0.16, border-strong 0.30 / 0.32, stripe 0.07 / 0.09; sunken surface 0.04 / 0.03; overlay 0.38 / 0.62 of black in both. These are pole values only. ADR 0040 requires every rung to vary with darkness; treat them as the poles of each rung's curve, not as constants.
- **Severity as opacity**: success 0.44 / 0.48, warning 0.62 / 0.66, danger 1 / 1 (the wall of solid ink), with soft surfaces at 0.04 / 0.06, 0.07 / 0.09, 0.10 / 0.12 and deep text at 0.82 / 0.90, 0.78 / 0.86, ink. The monotone ladder passed the pairwise semantic-distance floor in both themes.
- **Guard worth keeping**: a test that every hue-parameterised role is overridden concretely by a preset that claims no hue, so accent-family growth cannot silently break an achromatic posture. Under the field the same guard inverts: every chromatic role the blue preset must override is enumerated from the token metadata, never hand-listed.
- **Runtime plumbing worth keeping**: theme CSS surfaces registered with ids of the form `theme:<name>` and selected by the runtime `theme` option, with the manifest recording the chosen theme.
- **Defects the preset could not fix**, now field requirements: the primary button computed to a 5 percent wash with a 0.82 border and ink text instead of ink carrying paper; the dark raised surface was a 7 percent white wash, so dialog, toast, and hover card composited differently over a card than over canvas; and the terminal palette stayed blue because the CLI parser reads no alpha.

## Fixed programme contracts

Change one only through a justified amendment to ADR 0040 or a new record.

| Fact            | Contract                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authority       | One field authority in `src/tokens/` owns pigments, axes, and the law for every colour role as an expression tree. It is projected to CSS and evaluated in TypeScript; a second hand-written copy of any law is a defect.                           |
| Poles           | `data-discern-theme` light, dark, and system pin darkness to 0 or 1 and set `color-scheme`. Darkness as a float is an author override on the root. System preference maps to the poles only.                                                        |
| Polarity        | Ink is the pigment that wins WCAG contrast against the current canvas; the crossover is relative luminance 0.179. No hysteresis in the token model; the live slider owns that.                                                                      |
| Rungs           | Every non-canvas role is current ink at an alpha that is a function of darkness holding that role's floor: primary ink 7:1 where the canvas allows, muted 4.5:1, faint 3:1, structural ink 3:1 at default structure. Floors are proven by sampling. |
| Inversion       | `--discern-color-action` and `--discern-color-on-action` carry primary actions. No component paints text over an accent rung louder than the quiet washes except through this pair.                                                                 |
| Backdrops       | Raised surfaces are opaque at the field point. Only roles that sit on canvas by contract may be translucent. Floating surfaces never drift over an unknown backdrop.                                                                                |
| Axes            | `darkness`, `structure` (borders, dividers, stripes, shadows), `emphasis` (hover, selected, current, quiet washes), `density` (the spacing unit, with the xs text floor and touch targets unscaled). Defaults are 0, 1, 1, 1.                       |
| Identity        | The default emission is achromatic. `./theme/blue` is the preset that restores the accent and semantic hues. Series colours stay the authored hue palette of ADR 0032 in every posture.                                                             |
| Semantics       | Status meaning never rests on colour alone. Non-colour witnesses are a proven browser contract, as they are in the terminal.                                                                                                                        |
| Terminal        | The CLI consumes the field evaluated at a pole as opaque colour and maps rung bands to dim, normal, and bold. It never parses alpha and never receives a preset.                                                                                    |
| Standards       | A field contrast-margin standard (up) and the structure and witness ceilings (down) join the gate. No limit loosens to land a wave.                                                                                                                 |
| Public contract | Role names are unchanged. The runtime `theme` option, the theme export names, and any emitted-byte change land in the Unreleased changelog before 1.0. Generated files and images are never hand-edited.                                            |

## Waves and dispatch order

| Key | Brief                                                                                                 | Parallel shape                                                         | Starts when                                                                                       | Lands                                                   |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0A  | [Mock the field for maintainer sign-off](0a-proof-of-concept-signoff.md)                              | One throwaway worktree                                                 | This package is on `main`                                                                         | Never. Its findings file is read by 1A by absolute path |
| 1A  | [Build the field authority with pole emission](_done/1a-field-authority.md)                           | One architectural agent                                                | The maintainer has signed off 0A and supplied its findings path                                   | Second in wave 1; runs `discern_update` after 1B lands  |
| 1B  | [Add structure and witness detectors with falling ceilings](_done/1b-structure-and-witness-guards.md) | One focused agent                                                      | This package is on `main`; may run beside 0A                                                      | First in wave 1                                         |
| 2A  | [Derive roles live in the browser](_done/2a-live-browser-derivation.md)                               | One architectural agent                                                | 1A and 1B have landed                                                                             | Sole wave-2 stream                                      |
| 3A  | [Sweep every component onto the field](_done/3a-component-field-sweep.md)                             | One coordinator; up to four disjoint Group bundles inside one worktree | 2A has landed                                                                                     | Second in wave 3; runs `discern_update` after 3B lands  |
| 3B  | [Make the Catalogue the field instrument](_done/3b-catalogue-field-instrument.md)                     | One Catalogue agent                                                    | 2A has landed                                                                                     | First in wave 3                                         |
| 4A  | [Adopt the field on discern.sh and the homepage](4a-site-adoption-and-homepage.md)                    | One agent in the discern repository                                    | A release containing 3A, 3B, and the completed field-appearance programme is published and pinned | In the sibling repository under its own gate            |

This is an independently landed sequence, not a below-trunk stack. Wave 1 and wave 3 each hold two streams on disjoint files; the smaller stream lands first and the larger runs `discern_update` before its final gate. Each brief verifies its prerequisite behaviourally on the then-current `main` and stops with a report if it is missing. Wave 0 is dispatched first and gates wave 1 on a human decision: the maintainer reviews the mock-ups at their reported URLs and either signs off or asks the 0A agent for adjustments in the same session. Wave 4 runs in `/Users/jack/Sites/discern` and needs a published release of this package first.

Expected topology: seven owner-dispatched sessions, six landing worktrees plus one throwaway, peak concurrency of two. Wave 3A may fan its four Group bundles out to sub-agents inside its own worktree; generated output, shared authorities, integration, commits, and the gate stay coordinator-owned.

That topology describes this programme itself. The four intervening field-appearance sessions are dispatched and landed separately before 4A.

## Ownership seams

| Stream | Primary ownership                                                                                                                                                                                                                                                     | Explicitly leaves alone                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0A     | Its own throwaway worktree: synthetic preset options, a scratch override layer, review-instrument runs, the findings note                                                                                                                                             | Landing anything                                                                                                            |
| 1A     | `src/tokens/**`, `src/theme/**`, `src/runtime.ts`, `src/manifest.ts`, `src/cli/theme.ts`, chart palette resolution, `catalogue/shell/appearance-options.ts`, theme and palette tests, exports in `deno.json`/`package.json`, changelog, token and principle map pages | Component CSS, `light-dark()` call sites, Catalogue pages, live CSS derivation, `discern.toml` standards other than its own |
| 1B     | `discern.toml` standards, detector scripts and their tests, the development map note                                                                                                                                                                                  | Any component, token, or Catalogue file                                                                                     |
| 2A     | The CSS projection of the field, registered axis properties, the space unit, derived roles replacing `light-dark()`, the computed-style conformance guard, browser-support statement                                                                                  | Component CSS call sites, Catalogue pages                                                                                   |
| 3A     | Every `src/components/<group>/<slug>/` file, generated outputs and imagery, cross-population tests, ceiling pins, components map pages                                                                                                                                | Token laws, Catalogue pages, package release                                                                                |
| 3B     | Catalogue pages, shell appearance state, the review instrument, Catalogue tests                                                                                                                                                                                       | `src/**`                                                                                                                    |
| 4A     | The discern repository: brand registry, site bundles, homepage, docs pages                                                                                                                                                                                            | This package                                                                                                                |

## Acceptance matrix

| Dimension  | Evidence required                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Single law | One expression tree per role; CSS and TypeScript projections agree at sampled points under a conformance check; no duplicated constants.        |
| Poles      | Light and dark emission stays deterministic and passes every existing theme, contrast, distinctness, series, and ANSI proof.                    |
| Field      | Sampled darkness points hold the rung floors; the contrast-margin standard records the minimum and can only rise.                               |
| Inversion  | Every primary action paints through the action pair in both identities; no text sits on a loud rung by hand.                                    |
| Backdrops  | Floating surfaces render identically over canvas and over a card at every sampled point.                                                        |
| Axes       | Structure fades structural ink only, emphasis fades state ink only, density scales spacing only, with the xs floor and touch targets unmoved.   |
| Semantics  | Status components carry a non-colour witness in the browser; the witness ceiling is zero.                                                       |
| Terminal   | The CLI palette derives from the field at both poles, keeps its glyph and word witnesses, and passes the ANSI 256 and 16 proofs.                |
| Identity   | Default emission is achromatic; the blue preset restores every chromatic role enumerated from metadata; the Catalogue default is mono.          |
| Instrument | The Catalogue Field page drives the live axes, deep-links a point, runs the admission proof at that point, and exports a consumer snippet.      |
| Delivery   | Canonical imagery regenerated, standards intact, changelog current, maps present-tense, and the site brief consumable from a published release. |

## Landing authority

`[acceptance].pre_authorized` is empty. Every landing stream calls `discern_accept` only after `discern_done` is green on the clean committed HEAD; without a recorded grant the verb refuses without mutation, and the agent reports the proof line plus its branch and worktree for owner review. Prose in these briefs is never landing consent. Wave 0A never calls `discern_accept` at all.

This planning package must land before any brief is dispatched. Each landing stream moves its own brief into `_done/` in its final commit; 1A also copies the 0A findings into `_done/` so the record survives the throwaway worktree.

## Decisions the maintainer still holds

- Whether discern's own CLI opts into an accent or a pigment tint remains a product decision for the sibling repository. The package default stays monochrome and untinted; the terminal takes an explicit per-presenter and per-renderer appearance rather than forcing either.
- Whether an accent chroma axis joins the appearance so a low-chroma brand can quieten the accent without quietening state emphasis. [ADR 0045](../../_adr/0045-name-the-model-appearance-and-tint-the-pigments.md) settled the vocabulary, the optional accent, and the pigment tints; accent chroma is the next held decision.
- Whether a monochrome brand may keep chromatic status colours. Today success, warning, and danger take colour with the accent.

## Adversarial review loop

When a stream reports green, review its branch against `main`, reproduce every deliverable at its exact local URL, and rerun the gate in that worktree. Before dispatching the next brief, amend its unstarted assumptions if the landed contract differs.

Look especially for:

- a second copy of any law, in CSS or TypeScript, that the conformance guard does not compare;
- a rung authored as a constant, or a floor met at the poles and not in between;
- a translucent raised surface, or a floating component painting with a wash role;
- a primary action still painted through the accent ramp, or text over a loud rung outside the action pair;
- `light-dark()` surviving in component CSS after 3A;
- a ceiling loosened, or a standard "temporarily" deleted, to land a wave;
- the terminal parsing alpha, or the blue preset leaking into the terminal;
- the series palette recoloured, or chart interactivity invented;
- generated files or imagery edited by hand.
