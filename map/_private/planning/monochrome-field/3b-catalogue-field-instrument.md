# 3B — Make the Catalogue the field instrument

**Goal:** Give the Catalogue a Field page whose sliders drive the live axes on the real emitted CSS, deep-link any point, run the admission proof at that point in the browser, export a consumer snippet, and let every component page and the review instrument render at a chosen field point.

**Wave:** 3. Runs beside 3A on disjoint files and lands first.

You own `3B` only. Do not launch, dispatch, or supervise 3A or 4A.

## Orient, verify the prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify on `main`: the `_done/` markers for 1A, 1B, and 2A; the registered axis properties in the emitted token CSS; `evaluateField` and the sampled admission proof. Place a root at darkness 0.6 in a scratch page and confirm the browser derives the roles before trusting the seam. If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`field-3b`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`, `map/_adr/0037-expose-only-semantically-safe-appearance-presets.md`, `map/_adr/0039-admit-role-override-appearance-presets.md`, the programme README, and the completed 0A, 1A, and 2A briefs and findings in `_done/`;
- `catalogue/shell/appearance-options.ts`, `appearance.tsx`, `appearance-state.ts`, the Foundations pages, the tokens page, the review instrument under `catalogue/review/`, and the Builder preview protocol where it carries an appearance option id;
- `map/60-catalogue/`, the Catalogue tests, and `tests/catalogue_appearance_options_test.ts`;
- the public Select, Switch, and any slider-capable form component, and `discern.toml` for what the Catalogue may and may not spend.

Use `discern-write-it-once`: the Field page evaluates the same proof code the tests run, shipped into the Catalogue bundle, never a re-implementation. Use the in-app browser to judge the instrument at real speed.

## Background

The Catalogue today offers named Appearance presets proven exhaustively in both themes, because a continuous hue slider promised more than fixed semantic roles could uphold. The field changes what continuity means: every point is provable by the same arithmetic, and the browser now derives the roles live. The Catalogue should show that. A Field page with real sliders is the moment the design system reads as one rule, and the proof running beside the sliders is the discern-native part: a point is not a taste, it is a verdict.

## Deliverables

### 1. The Field page

Add a Foundations page that places the whole Catalogue root at a field point through four controls: darkness, structure, emphasis, and density, plus a toggle between the achromatic default and the blue preset. Controls write the registered axis properties on the root and set the colour scheme the polarity implies. Implement polarity hysteresis in the live control only, so dragging across the crossover does not flicker, and say in the page that the token model has none.

Show beside the controls: the current canvas and ink, the polarity, every derived role as a swatch with its computed value, and the proof result at that point with each floor's margin, computed in the browser from the same authority the tests use. Refused points show their reasons verbatim.

### 2. Deep links, storage, and reach

Carry the field point in the URL and local storage through the existing appearance state authority, so any Catalogue page can render at a chosen point and a report can quote one URL. Extend the Appearance control on component pages to accept a field point as well as the named presets, keeping the presets as the proven quick choices. Extend the review instrument so a contact sheet can be rendered at a field point and at the poles, and carry the point through the Builder preview protocol at a new version if it must cross the frame boundary.

### 3. Export

Offer a copyable consumer snippet for the current point: the root declaration of the axes, the colour scheme it implies, and the preset import if blue is selected, in the same form the token map page documents. Nothing is downloaded and nothing leaves the page.

### 4. Terminal at the poles

On the Field page or the terminal foundations sheet, show the CLI palette the field yields at both poles through the existing terminal inspector, so the instrument covers both surfaces.

### 5. Records

Update `map/60-catalogue/` present-tense pages and the Unreleased changelog for the Catalogue additions. Add Catalogue tests for URL round-trips, proof rendering, the hysteresis band, and the export snippet.

## Constraints

- Dogfood public components for controls where one exists; record an exception where none does.
- The proof in the browser is the test's proof, shipped, not a copy.
- Stay inside the Catalogue: touch nothing under `src/` except a documented seam the instrument genuinely lacks, and report that seam rather than widening the public contract silently.
- Do not spend the package's behaviour-script standard; the Catalogue app is the right place for this interactivity.
- Commit in focused steps: page, state and reach, proof panel, export, terminal, records.

## Out of scope

- Component changes; 3A owns the sweep, and a component that looks wrong at a point is reported with its URL, not fixed here.
- Token laws or the CSS projection; 1A and 2A own those.
- A consumer-facing theme generator API beyond the axes.

## Definition of done

- The Field page drives the live axes on the real emitted CSS with the blue preset toggle, hysteresis in the control only, and the proof result at the current point.
- Any Catalogue page, the review instrument, and the Builder preview can render at a field point from a deep link.
- The export snippet reproduces the point in a consumer root, and the terminal palette is shown at both poles.
- Catalogue tests cover round-trips, proof rendering, hysteresis, and export; the maps and changelog describe the present.
- Someone exploring the system can find a point they like, see whether it is admissible and why, and take it away as one declaration.
- After the last edit run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `field-3b` branch and worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/monochrome-field/3b-catalogue-field-instrument.md` to `map/_private/planning/monochrome-field/_done/3b-catalogue-field-instrument.md`.
