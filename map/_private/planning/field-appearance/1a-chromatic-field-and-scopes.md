# 1A — Project chroma and make appearances scopeable

**Goal:** Make Accent a hue-parameterised chromatic projection of the same Field laws as the achromatic default, publish symmetric Field/Accent browser scopes, and cure the primary-action shadow and Avatar opacity defects at their shared token authority.

**Wave:** 1. Runs alone. It establishes the contract consumed by 2A and 2B.

You own `1A` only. Do not launch, dispatch, or supervise the later briefs. Do not edit Component CSS/TSX, terminal renderers, Catalogue UI, or canonical imagery.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main` that:

- `map/_private/planning/monochrome-field/_done/3a-component-field-sweep.md` and `3b-catalogue-field-instrument.md` exist;
- `map/_private/planning/field-appearance/README.md` exists;
- the field projection guard passes once at the current baseline;
- `v0.29.0` resolves locally, for historical comparison only.

If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`appearance-1a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0039-admit-role-override-appearance-presets.md`, and `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`;
- the field-appearance programme README and the completed monochrome-field 0A, 1A, 2A, 3A, and 3B briefs/findings;
- `src/tokens/field.ts`, `field-css.ts`, `tokens.ts`, `src/theme/blue.ts`, `src/runtime.ts`, `src/manifest.ts`, and `src/internal/token-literals.ts`;
- `tests/field_test.ts`, `blue_theme_test.ts`, `design_system_test.ts`, `component_field_contract_test.ts`, and `scripts/conformance/field-projection.ts`;
- Button and Avatar CSS only to confirm their role consumption, plus their current canonical examples and the browser review plan;
- `map/10-tokens-themes/README.md`, `CHANGELOG.md`, `deno.json`, and the relevant standards/checkpoints in `discern.toml`.

Use `discern-write-adr` for the replacement decision and `discern-cure-a-bug` for both visual defects. Read each selected skill fully before acting.

## Background

ADR 0040 deliberately deferred chromatic derivation and made Blue a static light/dark role table. That expedient now violates the desired product model: when it overrides a role, Darkness and Emphasis no longer reach it, and Catalogue admission is effectively constrained to a small set of named hues. The Catalogue already exposes this by applying `blueThemeRoleTokens[mode]` over a live field point while separately changing `--discern-accent-hue`. The owner has now made the opposite decision: Accent is a generic hue-parameterised projection, palette changes the pigments and semantic hues, the Field axes retain the same meaning, and one authority governs the entire hue circle.

The same review exposed two authority-level defects:

- `--discern-color-action` is full active ink, while the dark-pole `--discern-color-action-shadow` is also full active ink, so primary fill and hard shadow merge. The light pole happens to retain separation because its shadow uses the 600-rung alpha.
- `--discern-color-avatar-fill-start` and `-end` are active-ink alpha roles. Their static Blue overrides are opaque, but their Field values let overlapping initials and foreign backdrops show through.

Do not preserve those outcomes as “Field character.” They are regressions. The fix is a law and a proof, never a Button or Avatar selector exception.

## Deliverables

### 1. Record the replacement decision

Write a new ADR that explicitly supersedes ADR 0040 only where it says chroma is an authored Blue static pair and the terminal never receives a preset. Preserve the field default, action inversion, opaque-owned-surface rule, series boundary, non-colour witnesses, and one-law/two-projection discipline.

The ADR must settle:

- one vocabulary for appearance identity across browser and terminal, with Field/achromatic as the default and Accent/chromatic plus a hue as opt-in;
- palette and axes as orthogonal inputs;
- the public hue domain and normalisation contract: every finite hue from `0` through `360` is supported, `360` is equivalent to `0`, named colours are conveniences rather than an allow-list, and invalid inputs fail predictably;
- which chromatic facts are primitives (the consumer's accent hue and semantic hue/chroma envelopes) and which role facts remain derived;
- how the law keeps success, warning, and danger identifiable and numerically separated when the selected accent approaches or equals a semantic hue, without silently rejecting parts of the hue circle;
- symmetric nested scoping and axis inheritance;
- how existing `./theme/blue`, `blueThemeRoleTokens`, and runtime `theme: "blue"` consumers remain compatible as the named hue-255 projection or migrate;
- why the terminal receives an explicit pure appearance input rather than ambient state (the terminal implementation belongs to 2A).

Exact curve coefficients and the collision-avoidance strategy are implementation judgments. Derive them from the existing Blue poles, the field relationships, full-domain numerical admission, and visual review; record why the selected model is the smallest one that holds the contract. Preserve the recognisable semantic family centres—success must still read as green, warning as warning, and danger as red—while adapting relative chroma, lightness, and role strength when an Accent hue coincides with one of them. If an existing numerical floor cannot be held at an exact shared hue without making a semantic family unrecognisable, stop with the smallest proof and decision needed rather than rejecting that Accent hue, weakening the floor silently, or installing a safe-hue allow-list.

### 2. Make Accent a hue-parameterised projection of the field

Replace `blueRoleValues` as a hand-authored light/dark value authority. Extend the field/appearance graph so the same role population and scalar laws can be evaluated for Field or Accent at any valid `FieldPoint`, with Accent parameterised by an arbitrary hue in the full `0–360` circle, and projected to live CSS. A Blue compatibility pair may be generated by evaluating the new law at hue 255 and darkness 0/1; it must not become another source of truth.

Requirements:

- Darkness continuously changes chromatic roles, not just a binary scheme.
- Emphasis reaches the accent ladder, semantic strengths/washes, selected and hover roles exactly as the role metadata says. Structure and Density retain their existing domains.
- Accent accepts every hue in the public domain, not merely the Catalogue's current named/safe choices. Existing names such as Blue, Green, Pink, or Rose are optional shortcuts to numeric values.
- Success, warning, and danger remain recognisable semantic families and clear the existing separation floors rather than becoming aliases of a nearby Accent hue. Their visible witnesses remain mandatory.
- `--discern-color-action` and `--discern-color-on-action` preserve inversion for every Accent hue. Do not preserve the former quiet blue fill/deep blue text pair.
- Raised/inverse/owned surfaces remain opaque; series 1–6 remain the authored ADR 0032 palette outside this projection.
- Public role names remain unchanged. A future enrolled chromatic role must be impossible to omit silently.
- TypeScript evaluation, static pole fallback, and feature-gated live CSS are projections of the same data. No CSS-only coefficients or Catalogue-owned evaluation copy may appear.

Add or extract a package-level admission proof across Field and Accent at both poles, the signed 0A midpoints, both polarity-crossover neighbours, and low/high Emphasis and Structure samples relevant to each role. Exhaust the integer hue circle `0…360`, include fractional and wrap-boundary cases, and focus additional samples where Accent approaches every semantic hue. Hold all existing text, focus, semantic-distance, opaque-surface, and series floors. An analytic proof may supplement the exhaustive sweep but must not be replaced by a few named presets. The Catalogue's current wrapper remains untouched in this stream; 2B will consume the new public/neutral authority rather than keep duplicate arithmetic. If a new chromatic margin is worth preserving as a Standard, follow `discern-set-the-standard`; never loosen an existing limit.

### 3. Publish symmetric browser appearance scopes

Add one public, namespaced scope contract generated from the appearance authority. A consumer must be able to apply Accent plus a local hue to a root or subtree inside a Field layout, apply Field inside an Accent layout, and change hue inside an Accent layout without copying role declarations. Prefer a declarative attribute such as `data-discern-appearance="field|accent"` with the existing namespaced accent-hue custom property, plus a framework-neutral helper only if it removes real consumer duplication; record the final spelling in the ADR and map.

The contract must prove:

- Field → Accent(255) → Field, Accent(120) → Field → Accent(335), and Accent(hue A) → Accent(hue B) nesting at least three levels;
- surrounding Darkness, Structure, Emphasis, and Density inherit unchanged at a colour-only nested scope;
- a nested scope may explicitly override an axis and descendants then inherit that local value normally;
- static pole fallback and live projection agree inside every scope;
- selectors stay zero-specificity, `discern`-namespaced, and inside an opted-in root;
- the runtime emits only selected appearance support, deterministically. Keep the existing `theme: "blue"` path working as the hue-255 compatibility preset where feasible; if its semantics must change, make the migration explicit in types, manifest schema, tests, docs, and changelog rather than maintaining two implementations.

Add a structural guard that future appearances and roles auto-enrol in both the evaluator and scoped CSS. Do not add an `appearance` prop or themed stylesheet to any Component.

### 4. Cure the primary-action shadow class

Change the shared `--discern-color-action-shadow` derivation so a hard-offset primary shadow is visibly separable from both its action fill and the adjacent canvas in Field and across the Accent hue circle, light and dark, at every signed field point. Preserve the action pair and let Structure continue to own structural strength; do not special-case `.discern-button`.

Define and justify a numerical separation guard (contrast and/or OKLab distance) informed by browser review. Exercise it on the actual Button at the poles, 0A midpoints, low Structure, and both appearances. The guard must fail the old dark-pole collision and auto-enrol any future primary-action consumer.

### 5. Cure translucent identity fills

Make the Avatar identity-fill base roles opaque/composited at the field point while retaining approximately the current subtle gradient character. A decorative highlight may remain translucent only over that owned opaque base. Do not change Avatar or AvatarGroup CSS unless investigation proves the roles cannot express the invariant; such a finding is an architecture blocker to report, not permission for a local patch.

Prove that computed monogram interiors remain stable over canvas, raised surface, and an overlapping sibling in Field and representative/boundary Accent hues at the poles and midpoints. The role-level opacity guard must fail the current alpha stops.

### 6. Public contract and records

Update `map/10-tokens-themes/README.md` in present tense and record the public contract change under Unreleased. Update exports and package allowlists only from their authorities. Run codegen or other producers when authored inputs require it; never hand-edit generated output.

Do not regenerate canonical imagery in this stream. Wave 3A does that once, after terminal and Catalogue integration have settled.

## Browser judgment

Use the in-app browser and the existing review instrument. Inspect at minimum:

- primary and secondary Buttons together in Field and representative Accent hues (including 0, 120, 255, and 335), light and dark;
- Button at darkness 0.25/structure 0.35/emphasis 0.65/density 0.8 and at darkness 0.75/structure 1.4/emphasis 1.35/density 1.2;
- standalone Avatar and overlapping AvatarGroup over canvas and raised surface;
- a status-rich sheet proving semantic roles still read as success, warning, and danger while Accent traverses and coincides with their hue neighbourhoods and witnesses remain visible;
- both nested scope directions.

The pre-2B Catalogue may still apply its old inline Blue pole overrides at a custom field point or restrict selection to named hues. Do not patch that UI in this stream or mistake it for the new projection. Use the emitted-runtime projection harness/browser conformance for live chromatic midpoints and arbitrary hues, and the review instrument for postures it can represent without overriding the public scope.

Leave the Catalogue watcher running on the worktree's deterministic port and report exact localhost URLs for those comparisons.

## Constraints

- Themes and appearances move tokens, never Component CSS.
- One authored graph owns Field and chromatic role relationships. Do not hide a static pair table behind a new helper.
- Preserve public role names, the achromatic default, semantic witnesses, and the fixed series palette.
- Keep neutral/core/theme graphs React-free and deterministic.
- Use focused commits: ADR/contract, chromatic law, scoped runtime, action shadow cure, Avatar ownership, records.
- Run direct tests through the configured discern queue when required by `discern.toml`; follow every diagnostic's stated remedy.

## Out of scope

- Component stylesheet or renderer changes.
- Terminal appearance APIs or renderer propagation; 2A owns them.
- Catalogue state/control changes; 2B owns them.
- Canonical image regeneration; 3A owns it.
- New series colours, a free-form theme generator, or package release.

## Definition of done

- A replacement ADR records chromatic Field projection and symmetric scopes.
- No hand-authored Blue light/dark role table remains as an authority; arbitrary Accent hues respond continuously to Darkness and Emphasis through the shared graph, with Blue retained only as hue-255 compatibility.
- Public nested Field/Accent scopes work in both directions, support local hue changes, and inherit axes.
- Primary action fill/content remains inverted and its hard shadow clears the recorded separation floor everywhere sampled.
- Avatar identity bases are opaque and backdrop-stable everywhere sampled.
- Projection, admission, runtime determinism, external-consumer, namespace, and compatibility guards pass without a loosened Standard.
- A consumer can colour one region of a Field page with any selected hue, neutralise one region of an Accent page, or select a different Accent hue for a nested region while surrounding Density and Structure continue to reach it.
- After the last edit, run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD. Cure every diagnostic.
- Move this brief to `map/_private/planning/field-appearance/_done/1a-chromatic-field-and-scopes.md` and update its programme README link to `_done/` in the final commit.
- Once green, call `discern_accept`. A recorded grant may land; without one it must refuse without mutation. Report the proof line, branch, worktree, and review URLs and stop for owner review.
