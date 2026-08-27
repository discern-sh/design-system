# 1A — Establish the visual grammar and review instrument

**Goal:** Create one future-enrolling way to inspect the browser surface in its meaningful interaction, motion, width, Theme, and Appearance postures; settle the small shared grammar those reviews need; and make every later polish judgment repeatable without turning screenshots into a pixel-baseline gate.

**Wave:** 1. This is the sole foundation stream. Start only after Catalogue UX 5A has landed. It must land before the population-wide Component polish begins.

You own `1A` only. Do not launch or supervise 2A or 3A.

## Orient, verify the prerequisite, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify this planning package is on `main`, then verify both the marker and behavioural result of:

- `map/_private/planning/catalogue-ux/_done/5a-integrated-visual-qa.md`;
- canonical Web/CLI example identity from Catalogue 2A;
- deterministic exact-bounds Web imagery/capture from Catalogue 3A;
- final route-family conformance seams and reusable Appearance authority from Catalogue 5A.

If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`polish-1a`**, re-root every file and shell operation into its returned absolute `data.path`, and pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, and the programme README beside this brief;
- the completed Catalogue 2A, 3A, and 5A briefs and the current `map/60-catalogue/README.md`;
- the Builder programme README plus Builder 2A and 3A briefs, to preserve its true iframe-width and downstream-integration ownership;
- `src/tokens/tokens.ts`, `src/styles/foundation.css`, `src/styles/utilities.css`, `src/types/component-meta.ts`, and Theme tests;
- the landed canonical example contract, generated registry, exact-bounds capture manifest/task, shared example renderer, and any capture-region authority;
- `catalogue/conformance.ts`, the post-5A family browser-check seams, `scripts/conformance.ts`, `scripts/resilience-conformance.ts`, and the current screenshot/review output under `dist/conformance/` after running it;
- representative examples and styles for Button, Input, Switch, Tabs, Dialog, Tooltip, Search Palette, Raw Output, Agent Avatar, Window, Data Figure, Hero Block, and one Artwork Backdrop;
- `discern.toml`, especially `css_density`, Group CSS, and `behavior_script` standards; `discern/TODO.md`; and the authored `discern/skills/add-a-component/SKILL.md`.

Use `discern-write-it-once` to keep review state and future-member enrolment single-source. Use `discern-cure-a-bug` for any state, reduced-motion, capture, theme, or geometry defect you fix. Use the in-app browser skill to judge the instrument at real speed. If the Appearance boundary or a public example/type contract changes materially, use `discern-write-adr` before implementation.

## Background

The existing complete-system conformance proves valuable static and accessibility invariants. Its four main Catalogue screenshots are full-page light/dark by wide/narrow viewport with animation disabled. Component examples can also author scripted `ConformanceScenario`s, but those scenarios cover only a minority of the current population and have no stable review checkpoint or local-container axis.

That is not enough evidence for “tasteful motion” or tactile state. A default image cannot show whether a control looks pressable, whether focus and hover collapse into one state, whether a dialog enters with spatial continuity, or whether a 390-pixel Component behaves differently inside a 1440-pixel page.

The project already has the correct raw ingredients: canonical examples, browser actions, deterministic capture, fast/medium/reveal Motion Tokens, reduced-motion and forced-colour foundations, semantic Theme roles, exact local image bounds, and source-driven enrolment. Compose those authorities; do not invent a parallel demo registry.

## Deliverables

### 1. Record one restrained browser visual grammar

Turn the programme contracts into a small executable decision vocabulary. Keep the existing visual character; this is not a rebrand.

- **Immediate response:** hover and press feedback may use the fast duration. Pressed state should feel causally attached to the input and must not cause layout shift.
- **State continuity:** ordinary open/close, selection, validation, and mode changes may use the medium duration only when motion helps a person follow cause and result.
- **Reveal:** the reveal duration remains opt-in for authored entrances and storytelling. It is not the default for controls, lists, or route changes.
- **Persistent motion:** reserve looping for actual ongoing work or explicitly ambient Artwork. A static still must contain the complete meaning.
- **Affordance:** focus-visible is independent of hover; active/pressed is independent of selected; disabled/busy is recognisable without opacity alone; passive cards never gain a fake clickable lift.
- **Elevation:** existing card, window, and pop shadows are the hierarchy. A component-specific optical shadow is allowed only when its visual object—not a new elevation tier—requires it.
- **Responsive authority:** use allocated inline size for embedded Components and browser viewport only for genuine page-level composition.
- **Metadata hierarchy:** preserve the xs floor and semantic ink roles, but do not use terse-tertiary styling for explanatory sentences.

Prefer encoding enforceable parts in types, tests, and existing Token metadata. Do not add a universal motion/hover CSS utility, another global class, or a new duration/easing/elevation Token without proving repeated semantic demand across at least three unrelated Components. A hard-to-reverse shared addition needs an ADR and an Unreleased changelog entry.

### 2. Extend one authored review-posture contract

Build on the landed canonical example and `ConformanceStep` authorities so one browser action vocabulary serves behaviour proof and visual review.

The resulting source contract must support:

- a canonical example id as the stable starting state;
- a stable kebab-case posture id and short human label;
- an ordered action sequence using the existing target/action vocabulary, extended only for a real missing primitive such as pointer-down capture;
- one or more named review checkpoints inside that sequence;
- optional local inline-size, viewport, colour-scheme, reduced-motion, and Appearance requirements only when the posture genuinely needs an exception;
- a capture-region override through the existing Catalogue 3A authority for portalled/multi-root evidence, never a second crop convention;
- a precise reason when an apparently interactive posture cannot be rendered or captured truthfully.

Every canonical Web example auto-enrols in at least its settled default posture. Interactive/responsive Components can author extra postures beside their example implementation; no central 139-entry checklist or screenshot script duplicates them. Reject duplicate ids/checkpoints, missing examples or targets, impossible surface declarations, actions after terminal navigation, and a posture whose capture region is empty or outside its example.

Do not force every Component to claim every possible state. The contract should make meaningful states cheap and irrelevant states absent. Keep review metadata Catalogue/test-private unless making it public is proven necessary; the neutral and CLI module graphs must remain React-free.

### 3. Build a local-only posture and motion review instrument

Extend the post-5A conformance/capture seam with one local review surface. Do not repurpose the human Compare route or add the instrument to public navigation.

It must provide:

- stable filtering by Group, Component, canonical example, posture, and state category;
- isolated exact-bounds specimens with selected local narrow/medium/wide inline sizes, while showing the actual page viewport separately;
- light/dark and every Appearance option exposed by the shared authority;
- ordinary and reduced-motion modes;
- a settled contact-sheet posture for side-by-side comparison;
- a focused motion reel that can replay one state transition at real speed and a slowed diagnostic speed without changing production timing;
- clear current inputs and deep-linkable state so an owner can reproduce a judgment from the reported localhost URL;
- containment for wide content and the landed portal/capture-region behaviour;
- no mounting of the full live population when a bounded Group/Component review is requested.

Generate review screenshots/manifests under the existing ephemeral conformance output rather than committing a combinatorial asset population or placing it in the JSR publish set. A bounded tiered matrix is expected: every Component gets baseline default/theme/width coverage; authored interaction and Appearance postures add only their relevant axes. Do not take the full Cartesian product.

Screenshots are perceptual evidence. Assertions must separately guard target state, geometry, overflow, focus, accessible name, Theme/Appearance inputs, and reduced-motion behaviour. Do not introduce pixel-diff approvals as the sole or blocking definition of correctness.

### 4. Make the Appearance control semantically truthful

Catalogue 5A settles where the control lives; this stream proves what it may truthfully expose.

- Inspect the default hue and semantic-neighbour witnesses around danger and success (planning evidence includes approximately 20° and 145°), then use a bounded hue sweep or equivalent colour-space proof rather than trusting three screenshots.
- For every option exposed by the shared Appearance authority, prove light/dark text contrast, focus contrast on semantic soft surfaces, and distinguishable accent/success/warning/danger roles. Add shape/text witnesses where colour is never the sole cue.
- If a raw 0–360 hue control cannot uphold that contract with fixed semantic roles, do not leave it pretending otherwise. Replace the project-facing choice with tested safe presets/ranges, or have one tested Theme generator coordinate accent and conflicting semantic roles. Choose from evidence, keep one reusable authority, and record the decision.
- Keep the public low-level Token honest: consumer branding may override public Tokens, but documentation and the green fixture must show that a brand hue near a semantic role also overrides that role coherently.
- Preserve the semantic-success-is-not-accent design principle. Do not simply recolour status Components to the current accent.

Do not edit Builder feature UI in this stream. Keep the shared authority compatible so the existing Builder tree continues to build; Builder 3A consumes the final decision after browser polish 3A lands.

### 5. Leave automatic guards and authored guidance

Add focused tests proving:

- every current and synthetic future canonical Web example joins default review without a central registration edit;
- an authored posture uses one canonical example/action/capture vocabulary and invalid, duplicate, missing, or empty checkpoints fail with Component identity;
- local-width review changes the specimen's actual allocated inline size without lying about the page viewport;
- portalled evidence uses the existing declared capture region;
- stable filters/URLs reproduce Theme, Appearance, width, motion, Component, example, and posture;
- the bounded matrix does not explode into every cross-product and can review one Group without mounting all Components;
- all exposed Appearance options pass semantic colour/focus proofs in both Themes, and a synthetic colliding future option fails;
- motion review runs at production timing, diagnostic slowdown remains review-only, and reduced motion removes movement without removing final state;
- review output and metadata stay outside the package publish set and contain no absolute machine paths or timestamps.

Update the authored add-component skill so a new Component automatically gets default review, declares only meaningful interaction/responsive postures, uses the shared action/capture contract, and knows the focused review command/URL. Run `discern refresh`; never edit materialised `.agents/skills/**` directly.

### 6. Inspect the instrument with real components

Run the post-5A server on `discern identity --port` and leave it running. In the in-app browser, inspect at minimum:

- Button hover/focus/press/disabled and anchor/button parity;
- Input/Switch focus, changed, invalid, and disabled;
- Tabs selection by pointer and keyboard;
- Dialog open/close/focus restoration and Tooltip/Hover Card disclosure;
- Agent Avatar working/still and one Artwork Backdrop at ordinary/reduced motion;
- a dense Workflow specimen and a wide Display/Editorial specimen at local narrow/medium/wide sizes;
- light/dark at default accent and each exposed alternative Appearance choice.

Watch motion with animations enabled at normal speed. Capture settled contact sheets separately with deterministic animation handling. Report the exact base and representative deep-link URLs, review item/checkpoint counts, generated output count/bytes, and task timing.

## Constraints

- Compose canonical examples, conformance actions, and capture regions; do not create another per-Component state registry.
- Preserve namespace, opted-in root, deterministic emission, token-only Theme, React-free neutral/CLI graphs, accessibility invariants, and public-contract rules.
- Keep review infrastructure local/test-only and bounded. It must not add public Catalogue navigation, package exports, or a large committed screenshot corpus.
- Do not perform the population Component CSS pass or Catalogue metadata pass.
- Do not edit Builder feature files, add Chart interactivity, or loosen the `behavior_script`, CSS, test, or accessibility standards.
- Never hand-edit generated output. Commit the grammar/decision, posture contract, review instrument, Appearance proof, and guards in coherent steps.

## Out of scope

- Population-wide Component visual/CSS changes; 2A owns them.
- The Catalogue/root metadata-legibility pass or another page redesign; 3A owns the former and Catalogue UX already owns the latter.
- Interface Builder implementation or dedicated Builder testing.
- Chart interaction, a new public Component family, consumer branding UI, or behaviour JavaScript for decorative motion.
- A committed exhaustive screenshot corpus, pixel-diff approval workflow, package release, or version bump.

## Definition of done

- One source-backed, future-enrolling contract connects canonical examples, browser actions, named review checkpoints, and existing capture regions.
- The local instrument can review default, interaction, motion, local-width, Theme, Appearance, and reduced-motion postures without repurposing Compare or mounting an unnecessary full population.
- The visual grammar is small and specific: no universal hover lift/transition, no new Token without repeated need, and no behaviour-JS cost for decoration.
- Every Appearance option the project exposes has light/dark semantic colour and focus proof; an unsafe arbitrary range is no longer presented as safe.
- A future Component/example enrols in default review automatically, while a malformed authored posture and colliding future Appearance option fail closed.
- Representative controls, overlays, operational content, artwork, and wide content have been watched and captured at exact reproducible URLs.
- The authored add-component skill teaches the contract and `discern refresh` has materialised it; review output remains outside the publish set.
- No population-wide Component styling, Catalogue metadata pass, Builder feature work, Chart interaction, generated hand edit, or loosened standard appears.
- Leave the dev server running and report review URLs, posture/checkpoint counts, output bytes/timing, Appearance decision, and any owner decision still needed.
- After the last edit run `discern_prepare`, commit every resulting change in focused commits, then run `discern_done` on clean committed HEAD and cure every diagnostic without loosening a guard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and the `polish-1a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/browser-polish/1a-visual-grammar-and-review-instrument.md` to `map/_private/planning/browser-polish/_done/1a-visual-grammar-and-review-instrument.md` (create `_done/` if needed).
