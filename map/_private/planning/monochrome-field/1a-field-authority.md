# 1A — Build the field authority with pole emission

**Goal:** Replace the hand-authored light and dark role values with one field authority in the token module, emit the poles from it in today's pair shape so every existing consumer keeps working, add the action pair, make raised surfaces opaque, make mono the default identity with blue as a preset, and move the terminal, the charts, and the admission proof onto the same evaluation.

**Wave:** 1. Runs beside 1B on disjoint files. 1B lands first; run `discern_update` after it lands and before your final gate.

You own `1A` only. Do not launch, dispatch, or supervise 0A, 1B, or any later brief.

**Sign-off input, filled by the maintainer before dispatch:** the absolute path of the 0A findings note is `FILL BEFORE DISPATCH: /Users/jack/Sites/discern-design-system.worktrees/field-0a-<suffix>/map/_private/planning/monochrome-field/_poc/0a-findings.md`. If the line still reads as a placeholder, stop and ask for the path before doing anything else.

## Orient, verify the prerequisite, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify this planning package and ADR 0040 are on `main`, and that the findings note exists at the supplied path. Call `discern_start` with the literal name **`field-1a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`, `map/_adr/0015-sense-terminal-background-as-a-caller-driven-effect.md`, `map/_adr/0032-use-the-medium-contrast-series-palette.md`, `map/_adr/0039-admit-role-override-appearance-presets.md`, and the programme README beside this brief;
- the 0A findings note in full;
- `src/tokens/tokens.ts`, `src/theme/discern.ts`, `src/runtime.ts`, `src/manifest.ts`, `src/cli/theme.ts`, `src/cli/ansi-palette.ts`, `src/internal/oklch.ts`, chart palette resolution under `src/chart/`, and `catalogue/shell/appearance-options.ts`;
- `tests/design_system_test.ts` theme and contrast tests, `tests/catalogue_appearance_options_test.ts`, `tests/chart/palette_test.ts`, `tests/cli/glyph_ramps_test.ts`, the CLI theme tests, `tests/release_test.ts`, and `tests/fixtures/green-theme.css`;
- `deno.json` and `package.json` exports and the publish allowlist, `CHANGELOG.md`, `map/10-tokens-themes/README.md`, and `discern.toml`.

Use `discern-write-it-once` for the authority: one expression tree per role, projected, never restated. Use `discern-set-the-standard` for the contrast-margin standard. Use `discern-cure-a-bug` for any proof or palette defect you fix on the way.

## Background

Today `themeTokens` holds forty roles with a light and a dark value each, the blue accent is the default through `discernThemeTokens`, the CLI derives its palette by parsing those values, the chart family resolves series and ramps from them, and the Catalogue admission proof composites translucent values over the option's canvas. ADR 0040 makes all of that derive from one field. This wave does the derivation in TypeScript and keeps the browser contract exactly as it is: the poles are emitted as today's pair CSS. Live derivation in the browser is wave 2. Component CSS is wave 3. Nothing in this wave touches a component stylesheet.

The 0A findings carry the maintainer's eye: rung values per field point, the inversion threshold, which surfaces had to be opaque, and what looked wrong. Write the laws so that they reproduce those judgments where the arithmetic allows, and record in the changelog and map where the arithmetic overruled the eye.

## Deliverables

### 1. The field authority

Create the authority beside `tokens.ts` in `src/tokens/`. It owns:

- the two pigments, paper and ink, as OKLab values, defaulting to pure white and pure black;
- the axes `darkness`, `structure`, `emphasis`, and `density` with defaults 0, 1, 1, 1 and documented ranges;
- a minimal expression-tree type sufficient for the laws: numbers, axis references, arithmetic, `min`, `max`, `clamp`, `abs`, `round`, and linear interpolation. Keep the node set small; wave 2 must compile every node to CSS `calc()` and a node that CSS cannot express is a defect here;
- one law per colour role: canvas lightness from darkness; polarity from the 0.179 crossover; every other role as current ink at an alpha expressed as a function of darkness, scaled by structure for structural roles and by emphasis for state roles; the action pair as full ink and paper; raised surfaces composited once to opaque values; overlay and shadow pigments;
- `evaluateField(point)` returning every role as a concrete colour string in the same `oklch()` grammar the proof and the CLI already parse, with alpha where the role is translucent and none where it is opaque;
- the spacing unit as a numeric fact the CLI keeps reading, with density applied at projection time rather than baked into the number.

Series roles are not in the field. They stay authored in `tokens.ts` per ADR 0032.

### 2. Pole emission in the existing shape

`themeTokens` becomes the field evaluated at darkness 0 and darkness 1, in the existing `ThemeToken` shape, so the runtime emitter, the Catalogue token pages, and every existing test consume the same public surface. Generated values must be deterministic and formatted consistently; pin the light and dark emission of a handful of roles in a test so a law change is visible as a diff rather than a surprise.

### 3. The action pair and opaque surfaces

Add `--discern-color-action` and `--discern-color-on-action` to the role set with documentation. The field maps them to ink and paper. The blue preset maps them to today's primary-button look (the quiet accent fill and the deep accent text) so blue changes nothing visible until wave 3 moves components onto the pair. Make `--discern-color-surface` and `--discern-color-inverse-surface` opaque at every point; keep sunken and wash roles translucent by contract and say so in their descriptions.

### 4. Mono by default, blue as a preset

The default emission is the field. Move the accent hue primitive and every chromatic role value into a blue preset: `src/theme/blue.ts` exporting the preset object and its CSS, exported as `./theme/blue`, with the runtime `theme` option becoming `"blue" | "none"` and `"none"` the default, and the manifest recording it. Remove `./theme/discern` and `discernThemeTokens`; this is a pre-1.0 breaking change and the changelog says so plainly. Enumerate the roles the preset must override from token metadata (every role whose blue value differs from the field's), never as a hand-maintained list, and test that the enumeration is complete. Keep the green fixture working as a consumer override of the blue preset and add a mono-consumer fixture that overrides one semantic family with a hue on top of the field.

In `catalogue/shell/appearance-options.ts`, the default option becomes the field; hue-backed options become the blue preset plus a hue assignment; the admission proof consumes `evaluateField` for the default and the preset values for blue. Extend the proof to sample the field at the darkness points the findings used and hold the rung floors at each. Keep the Catalogue building; do not add pages.

### 5. Terminal and charts on the field

`src/cli/theme.ts` derives both terminal variants from `evaluateField` at the poles. The evaluator hands it opaque colours already composited over the canvas, so the CLI never parses alpha. Map rung bands to the existing dim, normal, and bold type roles where the terminal already expresses emphasis by attribute, and keep the ANSI 256 and 16 proofs and the glyph-ramp proofs green. The blue preset does not reach the terminal. The chart family's accent-derived sequential ramp becomes an ink alpha ramp under the field; series stay hued; the palette proofs stay green.

### 6. A standard that can only rise

Add a `[standards.field_contrast_margin]` measure in `discern.toml` with direction `up`: sample the field across darkness and report the minimum margin over the rung floors in the same units the proof uses, with `inputs` scoped to the token module so untouched trees replay. Pin the limit at the measured value with `discern_standards`.

### 7. Records

Update `CHANGELOG.md` Unreleased with the identity change, the export rename, the action pair, opaque surfaces, and the terminal derivation. Rewrite `map/10-tokens-themes/README.md` in the present tense to describe the field, the poles, the action pair, the preset, and the terminal derivation, replacing the interim "field decision" paragraph. Update principle 5's "How it shows up" in `map/00-orientation/design-principles.md` to name the authority. Copy the 0A findings note into `map/_private/planning/monochrome-field/_done/0a-findings.md`.

## Constraints

- One expression tree per role. A constant that appears in two laws is a shared named node, not two literals.
- The neutral core and the CLI graph import no React; the release tests must stay green, including the publish allowlist and symbol documentation coverage.
- Emission stays byte-deterministic; the runtime tests that pin determinism must pass unchanged in intent.
- Do not edit any file under `src/components/`, any `light-dark()` call site, `src/styles/`, or Catalogue pages.
- Do not loosen a floor, a distinctness threshold, a series proof, or a standard. If the arithmetic cannot meet a floor at a sampled point, tighten the law or report the point as refused; never move the floor.
- Commit in focused steps: authority, pole emission, action pair and surfaces, blue preset, terminal, charts, proof, standard, records.

## Out of scope

- Live CSS derivation, registered axis properties, and `light-dark()` replacement; 2A owns those.
- Any component change; 3A owns the sweep.
- The Catalogue Field page; 3B owns it.
- Detectors and ceilings for spacing, borders, shadows, and witnesses; 1B owns those.
- A package release or version bump.

## Definition of done

- The gate is green on the clean committed HEAD after `discern_update` has brought 1B in.
- `evaluateField` exists, every colour role except series derives from it, `themeTokens` is its two poles, and a pinned emission test shows the values.
- The action pair and opaque surfaces are in the role set with the blue preset preserving today's look.
- Default emission is achromatic; `./theme/blue` restores every chromatic role enumerated from metadata; `./theme/discern` is gone and the changelog says so.
- The terminal and chart palettes derive from the field and every ANSI, glyph, and series proof passes.
- The admission proof samples the field and the `field_contrast_margin` standard is pinned.
- Maps and the changelog describe the present; the 0A findings are copied into `_done/`.
- Someone reading `src/tokens/` can explain every grey in the system from one rule, and a consumer selecting no preset receives discern's ink-and-paper identity with nothing broken.
- After the last edit run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `field-1a` branch and worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/monochrome-field/1a-field-authority.md` to `map/_private/planning/monochrome-field/_done/1a-field-authority.md`.
