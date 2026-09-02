# 3A — Sweep every component onto the field

**Goal:** Move all 140 components onto the field's conventions: primary actions through the action pair, no text over loud rungs by hand, floating surfaces on opaque roles, every `light-dark()` replaced by its derived role, raw spacing and untokenised structure driven to zero so density and structure reach everything, and every status component carrying a proven non-colour witness.

**Wave:** 3. Runs beside 3B on disjoint files. 3B lands first; run `discern_update` after it lands and before your final gate.

You own `3A` only. Do not launch, dispatch, or supervise 3B or 4A. You may fan out sub-agents inside your own worktree as described below.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main`: the `_done/` markers for 1A, 1B, and 2A; live derivation in the emitted token layer; the derived-role list for `light-dark()` in the changelog; the action pair; the three falling-ceiling standards with their current limits. Exercise the projection guard once before trusting it. If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`field-3a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`, `map/_adr/0006-homepage-treatments-ship-as-variants.md`, the programme README, and the completed 0A, 1A, 1B, and 2A briefs and findings in `_done/`;
- the field authority, `tokens.ts`, and the emitted token CSS;
- `map/20-components/`, the add-component skill, and the browser polish programme's completed 2A brief for the coordinator-and-bundles pattern;
- the verbose hit lists of the three 1B detectors;
- `scripts/conformance.ts`, the family browser-check plan, the capture task for canonical imagery, and `map/60-catalogue/visual-review.md`;
- `discern.toml` standards, including the CSS group ceilings.

Use `discern-cure-a-bug` for every class you drive to zero; the ceiling becomes a permanent rule, not a lower number. Use the in-app browser and the review instrument to judge results at the poles, at the 0A mid-field points, and at low and high structure.

## Background

Waves 1 and 2 changed the authority and the emission; no component has moved. Under the field, the primary button still paints a quiet fill with deep text, six files still branch on `light-dark()`, some floating surfaces still paint with wash roles, and structure and density cannot reach declarations that hard-code pixels or colours. The three detectors landed in wave 1 list every such site. This wave works those lists to zero and makes the field's conventions the only ones a component can use.

## Deliverables

### 1. Inversion and the loud-rung rule

Every component that paints a primary action moves to `--discern-color-action` and `--discern-color-on-action`: Button primary, the CTA band, and every solid accent fill carrying light text you find by grep. Text never sits on an accent rung louder than the quiet washes except through the pair. Add a structural test over component CSS that fails a `background` on accent-400 or above in the same rule as a `color` that is not `on-action`, so the rule outlives this sweep.

### 2. Derived roles replace `light-dark()`

Migrate every call site to the role 2A defined for it, then add a guard that fails any `light-dark(` in `src/components/**/*.css`.

### 3. Backdrop ownership

Dialog, Toast, Hover card, Tooltip, and every other floating or overlaying surface paint with opaque roles. Add a guard that maps floating-behaviour components (by their floating data attributes or metadata) to the surface roles they use and fails a translucent one.

### 4. Structure and density reach everything

Work the `raw_spacing` and `untokenised_structure` hit lists to zero: spacing through the space tokens, borders and outlines through role colours, shadows through the shadow roles. Then pin both ceilings at zero and add the permanent gate rule. Prove in browser conformance that at density 0.8 the xs text floor and the minimum touch target hold on every interactive example, and that at structure 0.35 every focus-visible ring remains at 3:1 because focus is emphasis, not structure.

### 5. Witnesses

Work the `missing_witnesses` list to zero: every tone- or status-bearing element carries visible text naming the state or an icon with an accessible name. Add the browser contract: a conformance check over the statically rendered examples that fails a status element without a witness, and pin the static ceiling at zero.

### 6. Imagery, records, and the field in the polish grammar

Regenerate canonical example imagery through the existing capture authority once, at the end. Update `map/20-components/` present-tense pages for the action pair, backdrop rule, and axis reach, and the add-component skill so a new component is born on the field. Record the sweep in the Unreleased changelog.

### Fan-out

Assign the four disjoint bundles from the browser polish programme to sub-agents inside this worktree if you can run them, otherwise in sequence: Core + Forms + Feedback + Navigation + Docs; Agents + Workflow; Display + Editorial + People; Layout + Marketing + Artwork. Sub-agents edit only their assigned component folders. You own shared guards, generated output, imagery, the changelog, maps, the skill, commits, and the gate.

## Constraints

- Themes move tokens, never component CSS: a component may consume derived roles and the axes, never branch on theme.
- No pixel, colour, or shadow literal survives in component CSS except `0` and hairline widths.
- Never hand-edit generated files or imagery; regenerate once.
- The CSS group ceilings may grow only through `discern_standards` with a reported reason; the three falling ceilings end at zero and become rules.
- Commit per bundle and per shared guard so the sweep reviews step by step.

## Out of scope

- Token laws, the CSS projection, or the CLI; 1A and 2A own those, and a defect found there is reported, not patched here.
- Catalogue pages and the Field instrument; 3B owns them.
- New components, chart interactivity, or a package release.

## Definition of done

- Every primary action paints through the action pair; the loud-rung guard, the `light-dark()` guard, and the backdrop guard exist and pass.
- `raw_spacing`, `untokenised_structure`, and `missing_witnesses` measure zero, are pinned at zero, and are backed by permanent rules.
- Browser conformance proves the xs floor, touch targets, and focus rings under density 0.8 and structure 0.35.
- Canonical imagery is regenerated from the field; maps, the skill, and the changelog are current.
- Someone using any component at either pole or at a mid-field point sees inversion where an action is primary, severity by opacity with a visible witness, floating surfaces that never drift, and structure and density that visibly reach every edge and gap.
- After the last edit run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD after `discern_update` has brought 3B in, and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `field-3a` branch and worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/monochrome-field/3a-component-field-sweep.md` to `map/_private/planning/monochrome-field/_done/3a-component-field-sweep.md`.
