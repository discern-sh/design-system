# 2A — Polish the complete browser Component surface

**Goal:** Review every public browser Component through the landed posture instrument, then cure the highest-leverage affordance, motion, local-responsive, semantic-colour, hierarchy, elevation, overflow, and content-stress defects while preserving each family's distinct purpose and all package contracts.

**Wave:** 2. This is the sole population stream. Start only after browser polish 1A has landed. It must land before the final integrated browser pass.

You own `2A` only. One coordinator owns the worktree, shared decisions, generated output, commits, browser evidence, and gate. If sub-agents are available, assign the four disjoint Group bundles below inside the shared worktree, never exceeding the available concurrency slots; with four total slots, run three bundles beside the coordinator and then the fourth. Do not create separate user-visible worktrees or landing branches. If sub-agents are unavailable, perform the same bundles in sequence.

## Orient, verify prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify the following markers and behavioural outcomes are on `main`:

- `map/_private/planning/catalogue-ux/_done/5a-integrated-visual-qa.md`;
- `map/_private/planning/browser-polish/_done/1a-visual-grammar-and-review-instrument.md`;
- canonical examples, generated Web imagery, the shared Appearance authority, local-width review canvases, named interaction checkpoints, motion replay, and bounded Group review all work in the live tree.

Stop if a marker or actual contract is missing. Call `discern_start` with the literal name **`polish-2a`**, re-root every operation into its returned absolute `data.path`, and pass that path to every discern tool.

After re-rooting, the coordinator reads:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, the programme README, and the completed 1A brief/ADR;
- `map/10-tokens-themes/README.md`, `map/20-components/README.md`, and `map/60-catalogue/README.md`;
- the landed review-posture contract/instrument, canonical example authority, generated-image task/manifest, shared Appearance implementation, and all structural tests around them;
- `src/tokens/tokens.ts`, `src/styles/foundation.css`, `src/styles/utilities.css`, `src/types/component-meta.ts`, and the complete component Group/order registry;
- `scripts/conformance.ts`, `scripts/resilience-conformance.ts`, post-5A family browser checks, `discern.toml`, `discern/TODO.md`, and `CHANGELOG.md`;
- the current generated review output for every Group before changing code.

Each bundle agent reads this brief, the programme README, the completed 1A brief/decision, and every `*.css`, `*.tsx`, `*.meta.ts`, `*.examples.tsx`, `*.types.ts`, and `mod.ts` inside its assigned Component Groups before editing. Use `discern-cure-a-bug` whenever a defect's cause is not already proven. Use the in-app browser skill for judgment; tests or CSS source alone cannot prove polish.

## Parallel bundle ownership

The coordinator assigns exactly these disjoint folders:

1. **Controls and disclosure:** `src/components/core/**`, `forms/**`, `feedback/**`, `navigation/**`, and `docs/**`.
2. **Operational state:** `src/components/agents/**` and `workflow/**`.
3. **Reference and identity:** `src/components/display/**`, `editorial/**`, and `people/**`.
4. **Layout and storytelling:** `src/components/layout/**`, `marketing/**`, and `artwork/**`.

A bundle agent edits only its assigned Component folders. It may change local styles, implementations, types, metadata, examples, and colocated tests. It does not edit Tokens, foundation/utilities, review/conformance infrastructure, generators, generated files/images, root tests, Catalogue/Builder files, maps, skills, `CHANGELOG.md`, or another bundle. When a cure needs a shared authority or non-colocated guard, report the exact evidence and proposed change to the coordinator instead of copying a local workaround.

The coordinator reviews every bundle diff, reproduces each claimed defect and fix, owns shared changes once, adds cross-population guards, and commits in reviewable Group-sized steps. Do not let sub-agents run codegen/capture or race commits in the shared worktree.

## Background

The design system is not visually unfinished. Its strongest compositions already have a clear editorial character. The risk is unevenness at the seams: Button has press depth while most other controls stop at hover/focus; operational Components can give headings, paths, evidence, statuses, and recovery equal weight; passive cards sometimes resemble actions; overlay motion and Artwork motion follow different local instincts; and a Component embedded at 390 pixels can retain a wide layout because its CSS asks about the browser viewport.

A blanket transition or a wholesale contrast increase would erase that character while missing the real defects. Use the 1A review grammar as a decision filter: change a Component only when the current posture demonstrates a communication, affordance, resilience, hierarchy, or accessibility gain.

## Deliverables

### 1. Establish a complete baseline and triage by defect class

Generate the bounded 1A review evidence for every live Group before editing. For every Component, inspect all canonical Web examples plus meaningful authored postures in:

- default and dark Theme;
- every Appearance option exposed by the shared authority;
- relevant local narrow, medium, and wide inline sizes;
- keyboard focus and pointer states for interactive content;
- ordinary and reduced motion where motion exists;
- forced colours for focus/status/shape-sensitive Components;
- representative long labels, long paths, dense rows, empty content, errors, disabled/unavailable state, and scrolling where the contract admits them.

Keep a temporary audit table keyed by Component/posture, observed defect, authority, proposed cure, and guard. It is working evidence, not a historical log; delete it before the final commit. The generated registry/contact sheets—not a hand-written “reviewed components” list—are the population authority. Report the final reviewed Component/example/checkpoint counts.

Classify each finding before editing:

- **shared grammar gap:** at least three unrelated Components need the same semantic fact; coordinator considers a Token/foundation authority;
- **family pattern:** several Components in one Group share a real role; cure in the smallest Group-owned pattern available;
- **local optical issue:** cure only that Component;
- **consumer chrome issue:** leave for 3A unless the public Component contract is the cause;
- **feature request:** out of scope unless needed to make an existing contract truthful.

### 2. Make controls and disclosure tactile but restrained

Across Core, Forms, Feedback, Navigation, and Docs:

- give actual actions coherent hover, focus-visible, active/pressed, selected, open, invalid, busy, disabled, and dismissal feedback where those states exist;
- keep anchor, button, native input, and custom-control semantics honest; do not style a passive wrapper as an action or make hover the only disclosure route;
- distinguish focus from selection and validation, and preserve forced-colour outlines plus keyboard/pointer parity;
- use fast motion for immediate response and medium motion only for spatial/state continuity. Avoid bounce, overshoot, large travel, layout-affecting dimensions, and opacity-only disabled state;
- make Dialog, Search Palette, Tooltip, Hover Card, Tabs, FAQ/summary, Copy, Theme, and form lifecycle changes feel causally connected without delaying access to content or violating focus restoration;
- ensure busy/copied/error state does not disappear before assistive technology or a person can perceive it; do not turn transient feedback into permanent decoration;
- keep touch/coarse-pointer use complete when hover is absent.

Watch every changed transition at production speed and under reduced motion. Static screenshots alone are not acceptance.

### 3. Clarify operational state, reference density, and reading hierarchy

Across Agents, Workflow, Display, Editorial, and People:

- establish a clear order among identity, current state, evidence, location, recovery action, annotations, and raw technical detail;
- keep success, warning, danger, running, blocked, selected, and accent emphasis semantically distinct in every exposed Appearance posture and without colour as the only witness;
- reserve looping motion for genuine working/ongoing state. Agent presence and status remain fully legible in the still/reduced posture;
- reduce nested card/border/badge/shadow stacks when spacing, heading level, or a single surface boundary expresses the hierarchy more clearly;
- make Window, Terminal, Card, Table, Tag, Code Listing, Data Figure, Chart, Diagram, Markdown, Timeline, profiles, and dense Workflow evidence locally contained and readable without hiding their intrinsic width or semantics;
- use xs/faint treatment only for terse annotations. Sentence-length impact, recovery, explanation, or evidence must remain comfortably readable without a global Token darkening;
- keep Charts and Diagrams static and semantic. Do not add hover data, zoom, tooltips, or consumer drawing controls.

Preserve the distinctive CLI and editorial contracts. Browser polish must not silently rewrite terminal renderer vocabulary or make reading surfaces resemble application control panels.

### 4. Make local responsiveness truthful

Audit every current `@media` and `@container` rule in Component CSS against the Component's actual ownership.

- When layout changes because the Component's allocated inline size is small, establish a supported containment boundary and use container queries so the same Component adapts inside Catalogue canvases, Builder iframe content, sidebars, grids, and consumer slots.
- Retain viewport queries where the Component genuinely owns a page-scale relationship, such as full-site chrome or a broad storytelling section whose contract is the viewport. Record the reasoning in code only when it is not obvious from the selector/structure.
- Do not mechanically replace query syntax, nest unnecessary containers, or let containment break intrinsic size, sticky positioning, portals, overflow, or percentage sizing.
- Review at least narrow/medium/wide local widths with a wide page viewport and a narrow page viewport. Prove the Component reacts to the intended authority.
- Stress long unbroken tokens, translated-length labels, multiline controls, dense tables/terminal/code, optional slots, absent media, and minimum/maximum content. Prefer local scrolling or reflow over clipping the document.
- Preserve exact Builder preview truth: this stream changes public Component responsiveness, not Builder's iframe or width controls.

Add focused browser geometry guards for each responsive class rather than a test that merely counts `@container` strings.

### 5. Rationalise affordance, surface, and elevation

Across all four bundles:

- clickable cards/rows/links must be recognisable as actions before hover and expose coherent hover/focus/press treatment; avoid nested interactive regions;
- passive cards, informational panels, code frames, windows, and popovers must not share the same affordance cues accidentally;
- use `surface`, `surface-sunken`, border/strong-border, and existing three shadow roles consistently with containment and elevation;
- remove redundant borders/shadows/backgrounds when they create card-on-card noise, but preserve intentional Window, terminal, marketing-stage, artwork, and hard-offset visual character;
- destructive actions remain visibly destructive and cannot inherit a current accent hue that makes them read as ordinary primary action;
- spacing and type hierarchy should do more work than badges and low-contrast microcopy.

Do not create one generic “interactive card” API unless at least three existing Components need exactly the same semantics and DOM contract. A CSS resemblance alone is not a shared Component abstraction.

### 6. Cure the known scrollable-text accessibility class

Resolve the existing `discern/TODO.md` item covering scrollable text regions without keyboard access. At minimum audit Code Block, Table, Workflow Raw Output, Command, Expected Result, Diagnostic, and Diagram against the established Terminal/Code Listing/Chart focusable-viewport treatment.

Provide correct native semantics, derived accessible names, keyboard focus, visible focus, local overflow, and no false tab stop when a region is not scrollable if that can be achieved without unstable client measurement. Leave a structural/future-member guard that fails the defect class rather than naming only today's examples, then delete the resolved TODO entry. Compose public `OverflowCue` only where continuing content is genuinely hard to discover; do not wrap every overflow region mechanically.

### 7. Integrate once through shared authorities

After all bundle edits are reviewed, the coordinator:

- resolves a shared Token/foundation change only when the baseline proves the repeated role and the change preserves every Theme/accessibility invariant;
- adds/updates named review postures using the 1A contract without turning test stress fixtures into noisy human Catalogue examples;
- adds cross-population and synthetic-future tests for interaction posture, reduced motion, local-width geometry, semantic Appearance, scroll focus, and package selection/determinism;
- runs codegen and the deterministic example-image update/verify tasks from their authorities; never edits generated code, manifest, or images directly;
- checks that new Component CSS/behaviour is selection-scoped and that neutral/CLI graphs remain React-free;
- writes one accurate Unreleased changelog section summarising actual public visual/behaviour contract changes after every bundle is known;
- keeps Group CSS density, overall CSS density, docs selection, workflow CSS, marketing CSS, and behaviour script within their existing ceilings. Cut added waste; never loosen a standard for polish.

### 8. Inspect every changed posture and a no-change witness

Serve the worktree on its deterministic port and leave it running. Each bundle agent reports exact review deep links and evidence to the coordinator. The coordinator personally inspects:

- every changed Component at each state/width/Theme/Appearance posture that motivated the edit;
- ordinary and reduced motion with animation actually enabled where relevant;
- at least one deliberately unchanged strong Component per Group bundle, proving the programme did not flatten established character;
- the complete Group contact sheets after integration, plus generated card-scale imagery against the live example for a representative sample;
- keyboard-only, coarse-pointer/no-hover, forced colours, and narrow document containment for affected interaction classes.

Report exact URLs, reviewed population/posture counts, meaningful no-change decisions, generated-image count/bytes/timing, and standards measurements.

## Constraints

- Audit the complete live browser registry; do not hand-maintain today's count or require every Component to change.
- Apply the 1A grammar locally. No universal `transition: all`, passive hover lift, ornamental continuous motion, focus removal, or opacity-only semantics.
- Themes move Tokens, never Component CSS. Keep semantic roles distinct from accent and preserve inverse roles.
- Do not add behaviour JavaScript for decoration, Chart interaction, product features, bespoke consumer copy/artwork, or demo-only public props.
- Preserve canonical example identity. Add private review posture where enough; if a human example changes, keep Web/CLI semantic identity truthful through its canonical authority.
- Do not redesign Catalogue route/page chrome or Builder. Do not redesign CLI renderers except for the minimum shared vocabulary/type consequence of a proven public browser cure.
- Never hand-edit generated output. Commit bundle cures, shared changes, generated integration, and cross-population guards in reviewable steps.

## Out of scope

- Catalogue route/page redesign, the deferred Catalogue metadata pass, or public landing restructuring; 3A owns only the later integrated legibility judgment.
- Interface Builder feature/chrome work or dedicated Builder testing.
- New Component families, new product functionality, Chart interaction, a generic animation framework, or consumer-specific content/artwork.
- Wholesale visual rebranding, arbitrary global Token retuning, CLI renderer visual redesign, package release, or version bump.
- Replacing the 1A review/capture authority with a bundle-local fixture, screenshot script, or pixel baseline.

## Definition of done

- Every live Component and canonical Web example has been inspected through the generated review population, with meaningful authored interaction/width/motion postures exercised rather than inferred from default screenshots.
- Actual actions communicate hover, focus, press, selection/open, disabled/busy, and validation state coherently; passive surfaces do not imitate them.
- Changed motion communicates cause or continuity, is watched at real speed, and resolves to complete still meaning under reduced motion.
- Component-local responsive behaviour follows allocated inline size where appropriate, genuine page-scale queries remain deliberate, and long/dense content has no document-level overflow or clipping.
- Semantic status, accent, destructive action, hierarchy, text legibility, surfaces, and elevation remain coherent across both Themes and every exposed Appearance option without a blanket Token retune.
- The scrollable-text keyboard-access defect class is cured with a future-member guard and its TODO entry is removed.
- Generated exports, CSS, canonical imagery, manifest, and review evidence come from their authorities; package selection/determinism and React-free graphs remain intact.
- All existing standards remain at least as strict, and actual measurements plus image/review timings are reported.
- No Catalogue page redesign, Builder work, Chart interaction, arbitrary feature, product-specific content, generated hand edit, or standard loosening appears.
- Leave the dev server running and report the exact review base plus representative deep links for all four bundles.
- After the last edit run `discern_prepare`, commit all bundle/shared/generated changes in focused commits, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `polish-2a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/browser-polish/2a-component-surface-polish.md` to `map/_private/planning/browser-polish/_done/2a-component-surface-polish.md` (create `_done/` if needed).
