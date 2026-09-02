# 1B — Add structure and witness detectors with falling ceilings

**Goal:** Make three legacy patterns measurable before the field needs them gone: raw pixel spacing in component CSS, borders and shadows that bypass the role tokens, and status components without a non-colour witness. Each gets a deterministic detector and a standard whose ceiling is today's count and may only fall.

**Wave:** 1. Runs beside 0A and 1A on disjoint files and lands first.

You own `1B` only. Do not launch, dispatch, or supervise 0A, 1A, or any later brief.

## Orient, re-root, then read

From `/Users/jack/Sites/discern-design-system`, call `discern_status` and verify this planning package and ADR 0040 are on `main`. Call `discern_start` with the literal name **`field-1b`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`, the programme README beside this brief, and `map/80-development/`;
- `discern.toml` in full, especially the existing `[standards.*]` tables, their `run`, `per`, `inputs`, and `margin` keys, and the `behavior_script` and CSS standards;
- `discern/scripts/measure-runtime.ts` and `scripts/measure.ts` as the house pattern for a metric script;
- the CSS of a dozen components across groups, and `src/tokens/tokens.ts` spacing, radius, and shadow tokens;
- `src/types/component-meta.ts`, the `data-discern-tone` and `data-discern-status` attributes in component sources, and how examples render to static HTML through the React adapter;
- `tests/design_system_test.ts` for the existing structural guards over component CSS.

Use `discern-set-the-standard`, including its outlaw procedure: detector, falling ceiling, and later a permanent rule at zero.

## Background

ADR 0040 introduces structure and density axes. Structure fades structural ink; density scales the spacing unit. Neither reaches a component that writes `padding: 12px` or `border: 1px solid #ddd`, and a status that only changes colour loses its meaning when severity is carried by opacity. Wave 3 sweeps every component onto the field and must drive these patterns to zero, but it cannot be trusted to find them by hand across 140 components, and the count must never grow again in the meantime. This wave makes each pattern a number.

## Deliverables

### 1. Three detectors

Write deterministic scripts, in the same place and style as the existing measure scripts, that report:

- **raw spacing**: every `padding`, `margin`, `gap`, `inset`, `top/right/bottom/left`, and logical equivalents in `src/components/**/*.css` whose value contains a `px`, `rem`, or `em` literal other than `0`, excluding hairline widths that belong to borders;
- **untokenised structure**: every `border`, `border-*`, `outline`, and `box-shadow` declaration in component CSS whose colour is not a `--discern-color-*` or `--discern-shadow-*` custom property, and every shadow that is not one of the shadow roles or built from `--discern-shadow-color`;
- **missing witnesses**: every element in the statically rendered canonical examples that carries a tone or status attribute and contains neither visible text naming the state nor an icon or glyph with an accessible name. Render through the existing example registry and the React adapter; do not add a browser dependency to this measure.

Each script prints one `DISCERN_METRIC` line per measure and, in verbose mode, the file and line of every hit so a later agent can work the list. Give each a test proving it counts a planted violation and ignores a planted false positive.

### 2. Three standards

Add `[standards.raw_spacing]`, `[standards.untokenised_structure]`, and `[standards.missing_witnesses]` to `discern.toml` with direction `down`, `inputs` scoped to component sources and examples, and limits at today's measured counts. Pin them with `discern_standards`. Record the counts in the changelog only if the maintainer asks; a standard is not a contract change.

### 3. A note for the next agent

Add a short present-tense note to the development map describing the three measures, how to list their hits, and that wave 3 drives them to zero and then replaces the ceilings with permanent gate rules.

## Constraints

- Touch no file under `src/components/`, `src/tokens/`, `src/theme/`, or `catalogue/`. This wave counts; it does not fix.
- Detectors must be deterministic and free of environment reads; the gate replays them from inputs.
- Do not loosen or rename any existing standard.
- Commit in focused steps: each detector with its test, then the standards, then the note.

## Out of scope

- Fixing any hit; 3A owns that.
- The field authority, the action pair, or any token change; 1A owns those.
- Browser-based witness proofs; the static measure is the ceiling, and 3A adds the browser contract when it drives the count to zero.

## Definition of done

- Three scripts exist, each with a planted-violation test, and each prints a metric the gate can replay.
- Three standards are pinned at today's counts with direction `down` and scoped inputs; `discern_done` measures them.
- The development map explains the measures and their purpose.
- A later agent can list every hit for any of the three patterns with one command and know that landing a new one fails the gate.
- After the last edit run `discern_prepare`, commit every resulting change, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `field-1b` branch and worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/monochrome-field/1b-structure-and-witness-guards.md` to `map/_private/planning/monochrome-field/_done/1b-structure-and-witness-guards.md`.
