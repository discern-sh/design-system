# Browser component polish programme

Briefs for making the complete public browser Component surface feel deliberate in use: clear affordances, restrained motion, truthful local responsiveness, stable semantic colour, legible hierarchy, and coherent elevation. The result must survive light/dark Theme, every Appearance choice the project exposes, keyboard and pointer interaction, reduced motion, forced colours, long content, and narrow embedding without becoming a generic layer of hover effects.

This is the follow-on visual work deliberately left out of the [Catalogue UX programme](../catalogue-ux/README.md). Catalogue 5A first lands the final route families, canonical examples, deterministic imagery, Appearance authority, and browser-conformance seams. This programme then uses those authorities to review and polish the public Components themselves, performs the deferred nuanced metadata-legibility pass in their real Catalogue consumer, and hands the result to the [Builder UX programme](../builder-ux/README.md). Builder feature work may proceed in parallel, but Builder 3A waits for this programme's final marker before its own integration proof.

Every brief is a complete prompt for a fresh agent. The three streams land independently and sequentially. Wave 2 may fan its disjoint Component Group bundles out to sub-agents inside one coordinating worktree; generated output, shared authorities, integration, commits, and the gate remain coordinator-owned.

## Why a separate programme exists

At planning time the registry contains 139 Components across 13 Groups. Static styling is already strong, especially in the Editorial and Marketing families, but review evidence is uneven:

- the current complete-system screenshots capture default light/dark at wide and narrow page viewports with animation disabled, so hover, focus, press, open, selected, and motion postures are not reviewable as one surface;
- only a minority of example modules author browser conformance scenarios, while interactive semantics are spread across native elements, Component state, floating behaviour, and CSS pseudo-classes;
- motion uses the existing fast, medium, and reveal Tokens but adoption is sparse and locally judged; ornamental Artwork motion is much more developed than ordinary control feedback;
- most responsive Component CSS still asks about the page viewport even when the Component can be embedded in a narrow Catalogue canvas or Builder frame;
- the public `--discern-accent-hue` permits a complete hue range, while success, warning, and danger remain fixed semantic roles. The existing green consumer fixture proves that a brand hue near success needs coordinated role overrides;
- Catalogue 5A intentionally refuses a blanket muted-text/tiny-metadata change, leaving the nuanced role-by-role legibility judgment to this programme.

The answer is not “animate everything” or “raise every contrast value”. The high-leverage move is one review instrument and one small visual grammar, applied through the real Component authorities and then judged over the whole surface.

## Fixed programme contracts

Change one only through a justified programme amendment. Record any hard-to-reverse exception in an ADR.

| Fact                | Contract                                                                                                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product goal        | A person can recognise what is interactive, predict what an interaction will do, follow meaningful state change, and read hierarchy without inspecting implementation details.                                                                                        |
| Motion              | Motion communicates cause, continuity, progress, or spatial relationship. Passive surfaces do not lift merely to look lively. Fast/medium/reveal Tokens are the starting vocabulary; add a Token only when repeated semantics prove a missing role.                   |
| Reduced motion      | Every state remains complete and understandable with motion reduced or absent. No information depends on animation, and the existing global reduced-motion guard remains the floor.                                                                                   |
| Static contract     | Browser output remains complete without hydration or new behaviour JavaScript. Prefer CSS for polish; do not spend the `behavior_script` ceiling on ornamental effects.                                                                                               |
| Interaction posture | Hover, focus-visible, active/pressed, selected, expanded/open, disabled, loading, success, warning, and danger are reviewed only where the Component genuinely owns them. Pointer-only evidence is never accepted for a keyboard-relevant action.                     |
| Affordance          | Interactive and passive cards must not look interchangeable. Clickable regions expose a consistent visible response and valid semantics; passive frames do not acquire pointer cursors or hover lift.                                                                 |
| Elevation           | Existing surface, border, and `shadow-card`/`shadow-window`/`shadow-pop` roles express hierarchy. A bespoke shadow needs an optical reason, not another unrecorded elevation tier.                                                                                    |
| Responsiveness      | A Component that changes because of its allocated inline size responds to that local size, normally through containment and container queries. Viewport queries remain valid for genuinely page-scale Components. Conversion is semantic, never mechanical.           |
| Colour semantics    | Accent never becomes success, warning, or danger by accident. Every Appearance choice exposed by project UI is proven in both Themes; an unsafe arbitrary hue control is constrained or paired with coordinated semantic-role generation rather than left misleading. |
| Text hierarchy      | `--discern-font-size-xs` remains the authored interface-text floor. Tiny/faint styling is reserved for terse tertiary facts, not sentence-length explanation; repair misuse locally instead of globally darkening every muted Token.                                  |
| Examples            | Generic canonical examples and optional authored review postures are the evidence. Do not add product copy, bespoke artwork, or demo-only API solely to make a screenshot attractive.                                                                                 |
| Review evidence     | Screenshots/contact sheets help human judgment but are not a pixel-baseline oracle. Structural, accessibility, state, geometry, and future-enrolment assertions guard the durable contract.                                                                           |
| Charts              | Chart remains deliberately static. Tooltips, hover data, zooming, or other Chart behaviour require the separate owner decision recorded in `discern/TODO.md`.                                                                                                         |
| Public contract     | Public class, Token, prop, behaviour, and emitted-byte changes follow codegen, documentation, conformance, and Unreleased changelog rules. Generated files and images are never hand-edited.                                                                          |

## Waves and dispatch order

| Key | Brief                                                                                                  | Parallel shape                                                                   | Starts when                  | Landing order               |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------- | --------------------------- |
| 1A  | [Establish the visual grammar and review instrument](_done/1a-visual-grammar-and-review-instrument.md) | One shared-authority worktree                                                    | Catalogue UX 5A has landed   | Sole wave-1 stream          |
| 2A  | [Polish the complete browser Component surface](_done/2a-component-surface-polish.md)                  | One coordinator worktree; up to four disjoint Group audits may fan out inside it | Browser polish 1A has landed | Sole wave-2 stream          |
| 3A  | [Run integrated browser polish and perceptual QA](_done/3a-integrated-browser-polish.md)               | One adversarial browser worktree; read-only audits may fan out                   | Browser polish 2A has landed | Final implementation stream |

Expected topology: three owner-dispatched agent sessions and three independently landed worktrees in sequence, with peak user-visible concurrency of one. A later wave is not dispatched until the preceding `_done/` marker and behavioural contract are on `main`; if a session is resumed early while that exact prerequisite branch is still in flight, use `discern-await-the-fleet` rather than polling, then `discern_update` before work continues. Wave 2 can assign its four bundles to sub-agents inside one worktree without creating sibling landing branches; obey the available slot limit (with four total slots, run the coordinator plus three bundles, then the fourth):

1. Core + Forms + Feedback + Navigation + Docs;
2. Agents + Workflow;
3. Display + Editorial + People;
4. Layout + Marketing + Artwork.

Those bundles own disjoint Component folders. Sub-agents do not edit shared Tokens, foundation/utilities, conformance contracts, generators, generated surfaces or imagery, `CHANGELOG.md`, maps, the add-component skill, or tests outside their assigned Component folders. The coordinator reviews and commits each bundle, resolves shared fixes once, regenerates once, and owns the proof.

## Ownership seams

| Stream | Primary ownership                                                                                                                                                                                                                | Explicitly leaves alone                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1A     | Post-Catalogue shared example/conformance action contract, local review instrument, review/capture orchestration, Appearance safety decision, shared motion/affordance rules, focused tests/ADR, authored add-component guidance | Population-wide Component CSS polish, Catalogue metadata pass, Builder implementation      |
| 2A     | Every `src/components/<group>/<slug>/` browser implementation/style/example in the four bundles; coordinator-owned shared corrections, generated outputs/images, cross-population tests, and Unreleased summary                  | Catalogue route/page redesign, Builder chrome, new product features, CLI renderer redesign |
| 3A     | Whole-population perceptual audit, Catalogue/root consumer integration and deferred metadata-legibility pass, final cross-group fixes, review orchestration, present-tense Token/Component/Catalogue map updates                 | Builder implementation, package release, unrelated feature families                        |

## Acceptance matrix

The integrated result must prove all of these over the live registry rather than a hand-maintained sample list.

| Dimension           | Evidence required                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default composition | Every canonical Web example appears in stable review output with no clipping, accidental nested-frame noise, broken imagery, or document overflow.                                                                    |
| Interaction         | Meaningful hover, focus-visible, active/pressed, selected, expanded/open, disabled, busy, and dismissal postures are both operable and visibly distinct without depending on colour alone.                            |
| Motion              | Motion-enabled interaction is watched at normal speed; timing and easing fit the state change, no layout shift or gratuitous looping occurs, and reduced motion preserves complete meaning.                           |
| Local width         | Relevant examples are reviewed in bounded narrow, medium, and wide containers, including long labels and dense content. Component-local adaptations respond inside embedded canvases and Builder-style frames.        |
| Theme/brand         | Light, dark, default accent, and every exposed alternative Appearance posture preserve contrast, focus, semantic role separation, and distinctive status cues.                                                        |
| Hierarchy           | Operational status, reading flow, controls, passive frames, overlays, annotations, and destructive actions have predictable relative weight without a border/shadow/badge pile-up.                                    |
| Accessibility       | Keyboard paths, focus restoration, forced colours, reduced motion, zoom/reflow, scrollable-region focus, target size, and axe remain green.                                                                           |
| Delivery            | Canonical imagery is regenerated, package selection/determinism stays intact, CSS and behaviour standards do not regress, maps describe the current system, and Builder 3A can consume the result without forking it. |

## Landing authority

Every stream calls `discern_accept` only after `discern_done` is green on the clean committed HEAD. A recorded grant may land it. Without one, `discern_accept` must refuse without mutation and the agent reports the proof line plus its named branch/worktree for owner review. Prose in these briefs is never landing consent.

This planning package must land before `polish-1a` is dispatched. Each implementation stream moves its own brief into this programme's `_done/` folder in its final commit, and downstream streams verify both the marker and the behaviour it represents.

## Adversarial review loop

When a stream reports green, review its branch against `main`, reproduce every deliverable at its exact local URL, inspect the generated/contact-sheet evidence, and rerun the gate in that worktree. Before dispatching the next brief, amend its unstarted assumptions if the landed contract differs.

Look especially for:

- a universal transition, hover lift, or cursor rule applied to passive content;
- screenshots that show only default states while claiming interaction coverage;
- a viewport query retained for behaviour that actually depends on an embedded Component's width, or a container query applied to a genuinely page-scale composition without establishing a containment contract;
- accent/success/danger states that become indistinguishable at an exposed hue;
- reduced motion that removes content or leaves an invisible initial state;
- tiny or faint sentence-length copy “fixed” by retuning all Tokens globally;
- bespoke shadows, borders, and badges accumulating instead of clarifying level;
- a polish diff that invents Chart interaction, new product functionality, public props, or behaviour JavaScript without a proven need;
- generated files edited by hand, screenshot pixels used as the only oracle, or a standard loosened to accommodate polish bytes.

After 3A lands and passes adversarial review, resume Builder 3A. It owns the last workspace-level integration and must consume these authorities rather than recreating them.
