# 2B — Put the field in the global Catalogue Appearance control

**Goal:** Make palette and all four Field axes understandable and adjustable on every Catalogue page, with one orthogonal URL/storage model and live web examples that expose the chromatic projection and symmetric scopes.

**Wave:** 2. Runs beside 2A on disjoint files after 1A lands. This is the first wave-2 stream to land.

You own `2B` only. Do not launch, dispatch, or supervise 2A or 3A. Do not edit `src/**`, terminal projection/preview files, Component folders, generated imagery, or the changelog.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main` that:

- `map/_private/planning/field-appearance/_done/1a-chromatic-field-and-scopes.md` exists;
- the replacement ADR and public Field/Accent browser scope are present;
- arbitrary Accent hues respond to Darkness and Emphasis through the public evaluator and CSS projection, with Blue represented only by hue 255;
- the current Catalogue build and shell browser check pass before your edit.

If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`appearance-2b`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, the design principles, the field-appearance README, the new 1A ADR/completed brief, and completed monochrome-field 3B brief;
- `catalogue/shell/appearance.tsx`, `appearance-state.ts`, `appearance-options.ts`, `field-state.ts`, `catalogue-shell.tsx`, and Catalogue navigation/location helpers;
- `catalogue/pages/foundations/field-page.tsx`, `field-export.ts`, the Foundations routing, and the shared Catalogue styles;
- the Builder's appearance controls, preview protocol/frame, workspace, and persistence, because they reuse the shell control and maintain separate workspace/preview states;
- `catalogue/app.tsx`, representative Component/Compare pages, the review instrument, and the public appearance API delivered by 1A;
- `tests/catalogue_appearance_options_test.ts`, `catalogue_field_state_test.ts`, `catalogue_foundations_test.tsx`, `catalogue_routes_test.ts`, Builder tests, and `scripts/conformance/catalogue/shell.ts` plus the family browser-check plan;
- `map/60-catalogue/README.md`, `visual-review.md`, and relevant `discern.toml` standards/checkpoints.

Use the in-app browser throughout. Use `discern-cure-a-bug` for the state-model class: selecting one orthogonal appearance input must never erase another.

## Background

The Catalogue already stores a complete field selection, applies its style to the one `data-discern-root`, deep-links it, and exposes detailed sliders on the Field Foundations page. The global Appearance panel, however, only offers theme and a small set of named accent hues. Its current state model treats `field` and `accent` as alternatives: `changeAccent()` deletes the field selection, and a Blue field point applies static mode-specific role overrides. Some arbitrary values currently fail the Catalogue-owned semantic-collision proof, so the names accidentally behave like an allow-list even though the public primitive is a `0–360` hue.

After 1A, that model is both misleading and redundant. Appearance identity, Accent hue, and field coordinates are independent: switching Field/Accent should retain Darkness, Structure, Emphasis, and Density; changing an axis should retain the chosen hue. The Catalogue should consume the package's public projection and full-domain admission contract, not rebuild role assignments or define a safe subset privately.

The owner wants the axes in the header Appearance control so every Button, Badge, Avatar, form, marketing block, and composition can be assessed live on its own page. The detailed Field page remains the diagnostic instrument rather than the only place where the system can move.

## Deliverables

### 1. Make Catalogue appearance state orthogonal

Refactor the shell's state authority so it carries, independently:

- appearance identity (Field or Accent) and, independently, the Accent hue across the complete public `0–360` domain;
- Darkness, Structure, Emphasis, and Density;
- native colour-scheme/pole preference, including System where that is honest.

Required behaviour:

- choosing or editing any Accent hue does not reset any axis;
- moving an axis does not reset the appearance or stored Accent hue;
- switching Field → Accent → Field restores exactly the same field point and remembers the Accent hue for the next opt-in;
- Light/Dark controls snap Darkness to the corresponding pole; moving Darkness away from a pole presents a truthful custom-field state and sets the native scheme implied by the public polarity rule with the existing live-control hysteresis;
- System remains a real OS-following pole policy, not a label over an arbitrary fixed midpoint. If System and a custom Darkness point cannot coexist truthfully, make the UI/state transition explicit rather than silently letting one override the other;
- URL and localStorage use one canonical numeric-hue representation, preserve explicit state through local navigation and Back/Forward, and parse existing named `accent=` and `field=darkness,structure,emphasis,density,preset` links as a compatibility migration;
- invalid or partial values fail closed to documented defaults.

Do not create a second source for field bounds, labels, polarity, or appearance roles. Import the 1A public authorities.

### 2. Put compact Field and Accent controls in Appearance

Extract the existing per-axis control into one reusable Catalogue-internal component and render all four axes in the global Appearance panel. The Field page must use the same control rather than retaining a second implementation.

The compact control must:

- expose Field/Accent identity plus a keyboard-accessible numeric/slider hue control covering `0–360`; named colour choices may remain as shortcuts that set that same number, never as the only accepted values;
- display each axis's human name, current numerical value, bounded range, and useful semantic endpoints;
- use the design system's public controls and meet touch, focus, keyboard, screen-reader, zoom, narrow-toolbar, and coarse-pointer requirements;
- avoid making the header panel unmanageably tall on small viewports—group and disclose advanced axes coherently without hiding the current state;
- provide a clear reset to the package default field point without changing the selected palette;
- update the live page during input and keep the URL/storage representation current without flooding browser history;
- name the custom/pole state so users understand why the Theme toggle and Darkness value agree.

The Appearance summary should communicate Field versus Accent, the current numeric/named hue where applicable, and any non-default field point at a glance. Keep copy concise; the detailed explanation belongs on the Field page.

### 3. Consume the public appearance scope

Remove Catalogue-private duplication of Blue role assignments and semantic-collision arithmetic where 1A's public evaluator/scope and full-domain proof now own those facts. Named hue options may remain, but they only set the same public numeric primitive and must not reproduce a role table or constrain free hue entry.

Add a focused demonstration on the Field page showing both directions:

- an Accent region at hue 255 inside a Field parent;
- a Field region inside an Accent parent at hue 120;
- an Accent region at hue 335 inside an Accent parent at hue 245, proving local hue replacement as well as appearance replacement.

Use representative existing Components rather than synthetic colour boxes: primary/secondary Button, semantic Badge or status family, and overlapping AvatarGroup. Show that nested colour-only scopes inherit the parent Density and Structure. Keep this a diagnostic demonstration, not a new package Component.

### 4. Keep every Catalogue instrument in agreement

Carry the orthogonal state through the main shell, Builder workspace and preview boundaries, review instrument, and consumer snippet/export surfaces. Builder's workspace appearance and isolated preview appearance remain distinct state owners, but both use the same shared control and serialization rules.

This stream does not wire the new CLI appearance API: leave `catalogue/cli-preview.tsx`, `catalogue/terminal-*`, `catalogue/pages/terminal/**`, and terminal-specific Component/Compare plumbing to 3A. Preserve their existing ground variant so the tree remains green.

### 5. Browser and state proof

Extend unit and in-app browser conformance to prove:

- the global Appearance control exposes all axes on Overview, a Component detail route, Compare, and Foundations;
- adjusting Density on a Button page changes computed spacing while the xs floor and touch target remain; adjusting Structure changes borders/shadows while focus remains emphasis;
- adjusting Darkness and Emphasis under Accent changes representative computed role values continuously, not only at a theme switch;
- entering arbitrary integer and fractional hues—including unnamed values, `0`, and `360`—updates real Components; names resolve to their documented numeric conveniences and `360` resolves equivalently to `0`;
- changing appearance/hue preserves axes, changing axes preserves appearance/hue, refresh and Back/Forward restore the exact state, and legacy URLs migrate;
- the Field page and header controls remain synchronised because they are the same authority;
- Field → Accent → Field, Accent → Field → Accent, and Accent(hue A) → Accent(hue B) demonstrations resolve intended roles and inherited axes;
- primary shadow and Avatar opacity fixes from 1A are visible in their real examples;
- the panel remains operable at narrow and wide viewports, keyboard-only, high zoom, and forced colours.

Prefer computed evidence over screenshots for guards. Use the review instrument at both poles, all 0A midpoints, low/high Structure and Density, and both appearance directions for human judgment.

### 6. Records

Update `map/60-catalogue/README.md` and `visual-review.md` in present tense with the global control, orthogonal state, and scope demonstration. This stream changes only the internal Catalogue, so leave the package changelog to the public-contract streams and final reconciliation.

Leave the Catalogue watcher running on the deterministic worktree port and report direct localhost URLs for Button, Badge, AvatarGroup, Field, and Builder appearance review.

## Constraints

- The Catalogue consumes package authorities; it does not become a second token/theme implementation.
- Palette and axes never erase one another.
- Use the shared public controls and established URL/storage/location authorities; no raw duplicate input styling or navigation state.
- Preserve separate Builder workspace and preview ownership.
- Do not hand-edit generated files or imagery.
- Commit atomically: state/serialization, shared controls, scope demo, Builder/review adapters, conformance, records.

## Out of scope

- `src/**`, Component files, terminal APIs, or chromatic curve adjustments; report a reproducible 1A defect instead.
- Terminal/CLI Catalogue preview integration; 3A owns it after 2A lands.
- Canonical image regeneration, add-component skill changes, package release, or changes in the sibling discern repository.

## Definition of done

- Every Catalogue page exposes one accessible compact control for Darkness, Structure, Emphasis, Density, theme/pole, Field/Accent appearance, and the full numeric Accent hue domain.
- Appearance, Accent hue, and axes round-trip independently through URL, storage, navigation, reload, and Builder boundaries, including legacy-link migration.
- The detailed Field page reuses the same controls and demonstrates both scope directions with real Components and inherited axes.
- Components at arbitrary Accent hues respond continuously to Darkness and Emphasis on their own pages; Field remains the default and Blue is one named hue-255 shortcut.
- Browser conformance covers representative routes, computed changes, persistence, navigation, narrow layout, keyboard, zoom, and forced colours.
- A human can open any Component page, move the field, switch palette without losing that point, and understand the result without visiting a token grid.
- After the last edit, run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic.
- Move this brief to `map/_private/planning/field-appearance/_done/2b-catalogue-appearance.md` in the final commit, and update its programme README link to `_done/`.
- Once green, call `discern_accept`. A recorded grant may land; without one it must refuse without mutation. Report the proof line, branch, worktree, and review URLs and stop for owner review.
