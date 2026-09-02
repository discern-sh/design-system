# 2A — Derive roles live in the browser

**Goal:** Project the field authority to CSS so the browser derives every colour role from registered axis properties at runtime, with the poles pinned by `data-discern-theme`, the spacing unit scaled by density, derived roles ready to replace every `light-dark()` call, and a conformance guard proving the CSS projection equals the TypeScript evaluation.

**Wave:** 2. Sole stream. Starts when 1A and 1B have landed.

You own `2A` only. Do not launch, dispatch, or supervise any other brief.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main`: the `_done/` markers for 1A and 1B, `evaluateField` in `src/tokens/`, the action pair in the role set, the `./theme/blue` export, and the `field_contrast_margin`, `raw_spacing`, `untokenised_structure`, and `missing_witnesses` standards in `discern.toml`. Exercise `evaluateField` at a mid-field point in a scratch script before trusting it. If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`field-2a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`, the programme README beside this brief, and the completed 1A brief and 0A findings in `_done/`;
- the field authority and `tokens.ts`, `src/runtime.ts` including `generateTokenCss` and the layer order, `src/styles/foundation.css`, and `src/manifest.ts`;
- every `light-dark()` call site in `src/components/**/*.css` (twelve across six files at planning time; verify with grep) and the two roles each one chooses between;
- `src/cli/theme.ts` spacing derivation, which reads pixel numbers from the spacing tokens;
- `scripts/conformance.ts`, `catalogue/conformance.ts`, and the browser conformance harness, to find where a computed-style check belongs;
- the design-system tests that pin determinism, namespace, and root scoping of emitted globals, and `discern.toml`'s `css_density` standard.

Use `discern-write-it-once`: the CSS backend is a second projection of the same expression tree, never a second authoring of any law. Use `discern-cure-a-bug` for any projection mismatch the guard finds.

## Background

After wave 1 the browser still receives two static palettes, generated from the field at its poles. That keeps every contract but wastes the field: a consumer cannot place a page at darkness 0.85, the homepage cannot drive darkness from scroll, and structure, emphasis, and density do not exist in CSS. This wave makes the field live in the browser. The token layer declares the axes as registered numeric custom properties, derives every role from them with `calc()`, and pins the poles through the existing theme attribute so `color-scheme` and native controls stay correct. Component CSS is not touched here; wave 3 migrates call sites onto the derived roles this wave defines.

## Deliverables

### 1. The CSS projection

Add a CSS backend to the expression tree that compiles every node the authority uses to `calc()`, `min()`, `max()`, `clamp()`, `abs()`, and `round()`, and emits each role as an `oklch()` with computed lightness and alpha, or an opaque composited value where the role must be opaque. Polarity is a step from the 0.179 crossover expressed in the same tree. Register `--discern-darkness`, `--discern-structure`, `--discern-emphasis`, and `--discern-density` with `@property` as inheriting numbers with the field defaults. An at-rule cannot sit beneath the root selector, so the `discern` namespace on each name is the boundary; extend the global-branding test to admit exactly those registrations and nothing else.

`generateTokenCss` emits the axes, the derived roles, and the pole pins: `data-discern-theme="light"` sets darkness 0, `"dark"` sets 1, and the system media query sets 1 for `system` and unattributed roots, each alongside the existing `color-scheme` declarations. The blue preset continues to override the chromatic roles as static values above the derived layer. Series roles stay static.

### 2. The spacing unit under density

Emit every spacing token as the authored pixel fact times `--discern-density`, keeping the pixel number in the token metadata so the CLI derivation still reads a number. State in the token descriptions which measures do not scale: the interface-text floor and touch targets are component concerns wave 3 enforces, but the unit's own description must say density never touches font size.

### 3. Derived roles for every `light-dark()`

For each `light-dark()` pair in component CSS, define the derived role that expresses its intent in the field (an edge, a fill under a particular polarity, a contrast ink) in the authority, with the blue preset providing the values the pair chose today. Do not edit the call sites; 3A migrates them. List the pairs and their replacement roles in the changelog entry so 3A has the map.

### 4. The projection guard

Add a browser conformance check that mounts a root at a sampled set of field points (the poles, the 0A points, and the crossover neighbours), reads the computed value of every derived role, and compares it with `evaluateField` at the same point within a stated tolerance in OKLab. It must also prove the poles under live derivation match the pair emission wave 1 pinned, so nothing about the browser changes at light or dark. A mismatch on any role at any point fails the gate and names the role and point.

### 5. Records and support floor

Record in the token map page and the changelog which browser versions the live projection requires (registered custom properties, `round()`, `abs()`), that the poles need none of them beyond what the package already required, and how an author places a page at a mid-field point together with the colour scheme it implies. Update the `css_density` ceiling only through `discern_standards` if the derived layer genuinely grows the measure, and report the growth; never edit the limit by hand.

## Constraints

- No law is authored in CSS. If the CSS backend cannot express a node, change the node set in the authority and re-prove the TypeScript side, never special-case a role.
- Emission stays byte-deterministic and inside the opted-in root; every new global is `discern`-prefixed.
- Do not edit `src/components/**`, Catalogue pages, or the CLI beyond what the spacing fact needs.
- Do not loosen the determinism, namespace, contrast, or field standards.
- Commit in focused steps: backend, axes and pole pins, spacing unit, derived roles, guard, records.

## Out of scope

- Migrating `light-dark()` call sites, the action pair into components, or any component CSS; 3A owns those.
- The Catalogue Field page and appearance state; 3B owns those.
- Hysteresis, sliders, or any behaviour script; the live slider lives in the Catalogue.

## Definition of done

- The token layer derives every colour role from the four registered axes with `calc()`, and the poles are pinned through `data-discern-theme` with `color-scheme` intact.
- Spacing scales with density while the CLI still derives cells from pixel numbers.
- A derived role exists for every `light-dark()` pair, named in the changelog for 3A.
- The projection guard compares computed styles with `evaluateField` at sampled points and passes, and the poles are byte-equivalent in effect to wave 1's pair emission.
- The support floor and the author's mid-field recipe are documented in the present tense.
- A consumer can set `--discern-darkness: 0.85` on the root, declare the dark scheme, and receive a coherent theme that the same proof would admit.
- After the last edit run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `field-2a` branch and worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/monochrome-field/2a-live-browser-derivation.md` to `map/_private/planning/monochrome-field/_done/2a-live-browser-derivation.md`.
