# 3A — Run integrated browser polish and perceptual QA

**Goal:** Judge the fully polished Component population as one system in its real Catalogue and landing-page consumers, cure cross-family inconsistencies, perform the deliberately deferred nuanced metadata-legibility pass, harden the review and browser guards, and leave present-tense knowledge that Builder 3A can consume without recreating any visual authority.

**Wave:** 3. This is the final implementation and convergence stream. Start only after browser polish 2A has landed.

You own `3A` only. Do not relaunch completed streams. Read-only audit sub-agents may inspect disjoint Group or Catalogue route slices, but one coordinating agent must personally reproduce every reported issue, own every edit and final visual judgment, reconcile shared changes, run the browser, and pass the gate.

## Orient, verify the complete baseline, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify these markers and their behavioural outcomes on `main`:

- `map/_private/planning/catalogue-ux/_done/5a-integrated-visual-qa.md`;
- `map/_private/planning/browser-polish/_done/1a-visual-grammar-and-review-instrument.md`;
- `map/_private/planning/browser-polish/_done/2a-component-surface-polish.md`.

Verify behaviourally that the live registry auto-enrols in the bounded review instrument, motion can be watched at production/reduced speed, local-width canvases are truthful, every exposed Appearance option is semantically proven, the complete Component population has regenerated canonical imagery, and the scrollable-text TODO class is cured. Stop if a marker exists without its outcome.

Call `discern_start` with the literal name **`polish-3a`**, re-root every operation into its returned absolute `data.path`, and pass that path to every discern tool. Call `discern_update` immediately after starting and follow its exact overlap guidance so the branch contains the final landed population.

After re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, this programme README, and both completed browser-polish briefs/decisions;
- every completed Catalogue UX brief, the current `map/60-catalogue/README.md`, and the post-5A route/page/style/conformance ownership seams;
- the Builder programme README and Builder 3A brief only to understand the downstream contract; do not open or test the Builder;
- the final canonical example, generated-image, review-posture, Appearance, Token/foundation, `OverflowCue`, and runtime-behaviour authorities;
- all Group contact-sheet/motion-review output, `scripts/conformance.ts`, `scripts/resilience-conformance.ts`, family browser checks, integration tests, `discern.toml`, `discern/TODO.md`, `CHANGELOG.md`, and the authored add-component skill.

Use the in-app browser skill for the complete audit and `discern-cure-a-bug` for every defect fixed. Use `discern-write-it-once` when several projections expose one drifted fact. Use `discern-write-adr` if integration changes the public Theme, Appearance, motion, responsiveness, or review boundary materially.

## Background

Wave 1 made the invisible reviewable. Wave 2 let four disjoint Group bundles polish 139+ Components without fighting over shared files. Those seams create a last risk: individually good families can still disagree about control response, card affordance, metadata hierarchy, surface elevation, local breakpoints, or semantic emphasis when mounted together.

The Catalogue UX programme intentionally stopped before a global muted-copy/tiny-metadata pass. That was correct: blindly darkening `ink-faint` or raising the xs floor would erase hierarchy and break a public Token contract. The fully landed Component and Catalogue surfaces now provide enough context to make the nuanced judgment role by role.

This pass is not a second redesign. It removes observed friction and visual noise, proves the whole grammar, and leaves stable evidence for future Components.

## Deliverables

### 1. Launch once and audit the complete polish matrix

Run `deno task serve` on the worktree's deterministic `discern identity --port` and leave it running throughout review. Open the exact localhost URL in the in-app browser, plus the local-only posture/motion instrument.

Inspect the live registry by Group rather than a hand-authored sample. At minimum:

- every canonical Web example in settled default review;
- every authored interaction checkpoint, including hover, focus-visible, press/active, selected/checked, expanded/open, disabled/unavailable, busy, success, warning, danger, dismissal, and focus restoration where relevant;
- every Component that changes layout at local narrow/medium/wide sizes, with both a wide page and a narrow page viewport;
- all motion-bearing Components at production speed and under reduced motion;
- light/dark plus every exposed Appearance option for semantic state, focus, chart/diagram markers, inverse surfaces, and decorative Artwork;
- forced colours, keyboard-only, no-hover/coarse-pointer, 200%/400% zoom where relevant, long labels/paths/prose, dense/empty/error content, RTL inline overflow, and no-JavaScript/static fallback for behaviour-enhanced Components;
- generated representative images at card scale against their live example;
- the root landing and every Catalogue route family where public Components are composed, including Compare and representative detail/review states.

Do not browse or test `/catalogue/builder/`; Builder 3A is the explicit downstream consumer and waits for this marker.

Maintain a concise temporary audit table: route or Component/posture, issue, authority, fix, guard, and retest URL. Read-only sub-agents may contribute findings but not edits. Reproduce each finding yourself before changing code. Delete the table before the final commit unless an unresolved owner decision belongs in `discern/TODO.md`.

### 2. Reconcile cross-family interaction and motion

Compare changed families side by side and fix drift in the closest authority:

- immediate hover/press timing, travel, shadow response, and disabled treatment;
- focus-visible versus hover/selected/invalid/danger priority;
- open/close, disclosure, overlay, copy feedback, progress, and completion continuity;
- ordinary control motion versus ongoing Agent state versus ambient Artwork;
- reduced-motion stills and no-hover/coarse-pointer completeness;
- control, link, clickable-card, dismiss, destructive-action, and passive-frame affordance.

A shared change belongs in a Token/foundation/helper only when several unrelated Components need the same semantic fact. Otherwise cure locally. Remove redundant transitions, transforms, borders, shadows, or animations found in comparison; never chase artificial sameness between an editorial figure, terminal window, button, and atmospheric backdrop.

Watch the result at real speed. A deterministic screenshot with animation disabled cannot close a motion finding.

### 3. Reconcile local responsiveness and content resilience

Exercise Component layouts inside the actual Catalogue preview/Compare canvases and local review widths, not only full-page phone/desktop screenshots.

- Cure any Component that still keys an embedded layout to viewport width or any page-scale Component incorrectly constrained by a local container.
- Check containment, intrinsic sizing, nested grids, optional slots, portals, sticky positioning, wide semantic visuals, overflow cues, and focus outlines at each boundary.
- Compare related breakpoint behaviour so the same narrow slot does not produce arbitrary density or control-order changes across families.
- Stress long translated-length labels, unbroken paths/commands, multiline prose, dense tables, empty imagery, and minimum-content columns.
- Preserve native scroll and use `OverflowCue` selectively when content continuation is otherwise genuinely hard to perceive. Do not add a fade to every scroll container.
- Prove no document-level horizontal overflow at Catalogue/root widths and that focusable scroll regions remain reachable.

Guard semantic geometry and actual local-size response, not the presence of a particular CSS query string.

### 4. Perform the deferred metadata-legibility pass precisely

Audit public Component metadata and the Catalogue chrome that presents Component names, Groups, canonical example labels, surface availability, match reasons, source labels, counts, status annotations, and explanatory copy.

Use these rules:

- xs/faint is appropriate for short tertiary labels, timestamps, file suffixes, compact code facts, and de-emphasised counts that remain readable;
- sentence-length descriptions, recovery instructions, impact, match reasons, unavailable-state explanations, and other meaning needed for the next decision must not depend on the smallest/faintest treatment;
- hierarchy should come first from ordering, proximity, measure, weight, and spacing; do not solve every issue by increasing size, contrast, badges, or borders;
- text must meet the applicable contrast and zoom/reflow contract in both Themes and all Appearance postures, including on accent/semantic/inverse surfaces;
- keep `--discern-font-size-xs` as the floor and preserve public Token values unless broad measured evidence proves the Token itself—not its misuse—is wrong;
- do not promote implementation facts merely because they are now more legible. Progressive disclosures stay secondary and closed where Catalogue 5A settled them.

Fix Component misuse in its Component folder and Catalogue-only misuse in the post-5A family/shared stylesheet that owns it. Do not create a “metadata text” mega-component or a global selector that overrides public Component hierarchy.

### 5. Reconcile surface and elevation hierarchy in real compositions

Across root, Catalogue, Compare, canonical examples, and generated imagery:

- interactive cards/rows must look actionable, passive specimens must look inspectable rather than clickable, and nested action targets must remain valid;
- overlays should read above windows/cards, windows above their canvas, sunken evidence within its parent, and inline status within content without adding a new shadow tier;
- remove card-on-card-on-panel noise, duplicated borders, competing accent bands, repeated badges, and decorative dividers when spacing already expresses the boundary;
- preserve intentional hard-offset Discern character and component-family distinctiveness rather than flattening everything to one quiet card;
- ensure danger, warning, success, selected, focus, and ordinary accent keep separate visual jobs at every Appearance choice.

If several Catalogue pages drift because they independently restyle the same public Component, remove consumer overrides and let the Component own its contract where possible. Do not force page-specific layout into public CSS.

### 6. Exercise end-to-end recognition journeys

Complete these by keyboard and pointer where meaningful:

1. From `/`, find a Component, recognise it from generated imagery, open its live default example, then reach an interaction posture without reading API prose.
2. Compare a control-heavy Group and an operational Group; distinguish clickable controls, passive frames, selected/open/error states, and supporting metadata at a glance.
3. Change Theme and each exposed Appearance choice while viewing accent, success, warning, danger, focus, Chart/Diagram, and inverse-surface witnesses; no semantic role may silently collapse.
4. Review a responsive marketing/editorial/layout Component at local narrow, medium, and wide sizes inside a wide browser, then repeat narrow page reflow.
5. Open Dialog/Tooltip or equivalent disclosure, follow motion at ordinary speed, repeat under reduced motion and keyboard-only use, and restore focus.
6. Traverse a dense Workflow/Terminal/Table/Code example, reach local overflow by keyboard, perceive continuing content, and return without moving the document sideways.
7. Read Component discovery/detail/Compare at 200% and representative 400% zoom; descriptions, match reasons, availability, and recovery remain legible while tertiary metadata stays appropriately quiet.

Record temporary time/misread/hesitation evidence only to drive fixes. Do not add analytics or commit a historical usability log.

### 7. Harden bounded guards and review economics

Refine the post-5A conformance orchestrator, family checks, 1A review instrument, and focused tests so they prove:

- complete live-registry default enrolment and valid authored postures;
- interaction state, keyboard parity, focus restoration, reduced motion, and forced-colour visibility for every changed defect class;
- local-size response, content containment, focusable scrolling, and no document overflow;
- every exposed Appearance option preserves semantic colour/focus invariants;
- metadata-role examples meet contrast/zoom/reflow and sentence-length copy is not accidentally assigned the terse-tertiary treatment in guarded projections;
- generated example imagery is current, theme-correct, exact-bounds, useful at card scale, and outside the package publish set;
- index/review filters remain bounded and do not mount the entire live population unnecessarily;
- CSS/runtime emission remains deterministic and selection-scoped, and neutral/CLI graphs remain React-free;
- a synthetic future Component/example/posture joins the correct review paths without editing a central registry.

Keep screenshots/contact sheets as human evidence, not brittle pixel approval. Delete obsolete or duplicated assertions instead of layering a new test over them. Measure review output count/bytes, cold and unchanged runtime, full conformance time, generated imagery, CSS density/Group selections, and behaviour script. Optimise or shard bounded review if necessary; never weaken coverage or loosen a standard.

### 8. Update present-tense knowledge and authored procedure

Update the smallest relevant present-tense map surfaces:

- `map/10-tokens-themes/README.md` for the final Appearance semantic-safety and motion/elevation Token boundary;
- `map/20-components/README.md` for browser review postures, local-responsive ownership, interaction/reduced-motion grammar, and scrollable-region treatment;
- `map/60-catalogue/README.md` for the local review instrument, generated image relationship, and final Catalogue metadata hierarchy.

Link source authorities and tests instead of copying Group/example inventories or CSS rules. Remove statements made false by the programme and do not write change history into the map.

Re-read the authored add-component skill and prove a new Component receives canonical examples/images/default review automatically, can add meaningful postures, and learns the local-width/motion/accessibility requirements. Amend the authored skill and run `discern refresh` only if the landed procedure is incomplete.

Delete any resolved TODO. Record only a genuine unresolved owner decision in `discern/TODO.md`; do not hide it in final chat. Reconcile `CHANGELOG.md` with the actual final public changes without duplicating the wave-2 summary.

### 9. Perform a final adversarial pass

Reload the complete review matrix and consumer journeys from a clean context and ask:

- Can I identify every action before hover?
- Does motion explain cause, continuity, progress, or space—or is it decoration?
- Do focus, selection, validation, danger, and accent each have one legible job?
- Does a Component adapt to the width it actually receives?
- Can I read the information needed for my next decision without promoting every tertiary fact?
- Does elevation describe containment, or merely add noise?
- Does reduced motion show the same complete state?
- Did the programme preserve distinctive editorial, operational, terminal, and artwork character rather than normalising it away?
- Can a future Component enter the review system without a central edit?
- Has any fix added public API, runtime behaviour, or bytes disproportionate to its perceptual value?

Remove avoidable motion, chrome, overrides, and prose found by this pass. Repeat the affected matrix and journey before the gate.

## Constraints

- Preserve the landed Catalogue route-family, canonical-example, generated-image, search, Appearance, and `OverflowCue` authorities.
- Fix public Component behaviour in the Component and consumer layout in its Catalogue/root owner; do not patch one with the other.
- No global muted-Token darkening, xs-floor change, universal hover/transition, passive-card lift, ornamental behaviour JavaScript, or Chart interaction.
- Do not browse, edit, or add dedicated tests for the Builder. It compiles under the full gate and consumes the final shared authorities in its own 3A stream.
- Do not change CLI presentation merely to match browser pixels, add a new feature family, publish a release, hand-edit generated files, or loosen a standard.
- Commit defect classes, metadata-legibility fixes, guard integration, and map updates in focused steps.

## Out of scope

- Interface Builder implementation, browsing, or dedicated tests; the amended Builder 3A brief owns downstream integration.
- New Component or feature families, Chart interaction, consumer-specific examples/artwork, or a new public review API.
- CLI visual redesign, package publication, release/version work, or a broad marketing rebrand.
- Global muted-Token darkening, a higher xs floor, universal motion/hover utilities, or a new elevation scale without a separately justified contract change.
- Treating screenshot pixels as the sole conformance oracle or committing temporary audit history.

## Definition of done

- Every live Component/default example and every authored interaction, motion, local-width, Theme, and Appearance posture has been inspected through the generated population; all fixed issues have exact retest URLs and guards.
- Cross-family controls, disclosure, operational state, reading surfaces, storytelling, and Artwork share a restrained grammar without losing their distinct visual character.
- Component-local responsive behaviour is truthful in embedded canvases, content stress is contained, scroll regions are keyboard-reachable, and no reviewed route moves the document sideways.
- The deferred metadata pass is complete by semantic role: necessary explanation is readable, tertiary facts remain quiet, xs stays the floor, and no blanket Token override appears.
- Accent, semantic states, focus, inverse surfaces, Chart/Diagram, and Artwork remain coherent in light/dark and every exposed Appearance choice.
- Interaction and motion have been watched at production speed; reduced motion, forced colours, keyboard, no-hover, and zoom/reflow preserve complete meaning.
- Review/conformance is future-enrolling, bounded, non-pixel-oracular, and its measured runtime/output/package economics are reported without a loosened standard.
- Canonical imagery and generated surfaces are current from their authorities; deterministic selection, publish containment, and React-free graphs remain intact.
- Token, Component, and Catalogue map pages describe the present system and the authored add-component procedure is accurate.
- No Builder work/testing, Chart interaction, unrelated feature, global rebrand, generated hand edit, package release, or loosened standard appears.
- Leave the server running and report the exact root, Catalogue, review-instrument, Group, motion, local-width, Appearance, and metadata witness URLs for owner review.
- After the last edit run `discern_prepare`, commit every fix/rewrite/generated update in focused commits, then run `discern_done` on clean committed HEAD and cure every diagnostic without weakening tests or standards.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `polish-3a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/browser-polish/3a-integrated-browser-polish.md` to `map/_private/planning/browser-polish/_done/3a-integrated-browser-polish.md` (create `_done/` if needed).
