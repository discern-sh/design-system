# 3A - Give discern a distinctive visual character

## Goal

Evolve discern’s existing visual identity into a stylish, recognisable system whose ordinary components and complete compositions share the same considered character.

Start only after the design-polish programme has finished and landed. The owner has chosen a distinctive evolution of discern.

## Orient and establish the baseline

Begin with `discern_status` at `/Users/jack/Sites/discern-design-system`. If this effort already has a worktree, resume its recorded path. Otherwise verify the completed polish programme and its delivered contracts, then call `discern_start` with the literal name "signature".

Re-root all reads, edits, commands, and discern calls to the returned absolute path. Verify these worktree-relative anchors against live code:

- AGENTS.md
- map/_private/planning/design-polish/README.md
- map/00-orientation/design-principles.md
- map/10-tokens-themes/README.md
- map/20-components/README.md
- map/60-catalogue/visual-review.md
- src/tokens/tokens.ts and src/tokens/appearance.ts
- src/styles/, assets/fonts.css, and src/components/
- catalogue/compositions.tsx and catalogue/review/
- tests/component_appearance_contract_test.ts
- tests/component_review_postures_test.ts

## Background

Polish has established working states, readable hierarchy, control alignment, composition pacing, and adoption flows. Preserve those gains.

The remaining objective is visual authorship: a recognisable relationship between typography, space, geometry, ink, and interaction. The owner's preferred starting direction is editorial confidence with mechanical precision. Treat that as a hypothesis to demonstrate and refine.

You own the visual decisions, shared authorities, implementation, integration, and final evidence.

## Deliverables

### 1. Establish the visual direction.

Inspect the landed system in a browser. Identify the existing features that carry its character and the decisions that dilute it.

Develop two concrete evolutions using the same content in three complete specimens:

- a sustained reading page with navigation, code, and a figure;
- a dense operational task with controls, status, and verification;
- a complete generic marketing page.

Reuse existing Components and composition recipes. Show actual rendered results, including narrow layouts and both themes. Keep content and Appearance coordinates matched so comparisons reveal design changes.

Explore type weight and proportion, spacing relationships, surface geometry, rules, shadows, and emphasis. Recommend one direction and explain the tradeoffs through the rendered examples.

Present the concrete alternatives for the owner's choice before propagating a direction throughout the package. Continue independent analysis and engineering checks while awaiting that choice.

### 2. Make the chosen direction explicit.

Record a small set of visual decisions, each supported by an example and a useful boundary: where it applies and where it would be excessive. Keep numeric facts in their existing source authorities.

Extend the existing visual guidance. Use an ADR for any significant, hard-to-reverse decision. Preserve the seven binding principles.

### 3. Apply the direction coherently.

Implement shared changes at their owning token, foundation, or Component authority. Audit every Component family under the chosen direction; edit the members that need it and record representative review evidence.

Use complete compositions to judge the relationships between components. Make the published package carry the improvements. Catalogue composition styles must respect public ownership boundaries.

Give dense operational surfaces, reading surfaces, and marketing surfaces appropriate expression within the same identity. Examine the terminal projection wherever shared changes affect it.

Remove abandoned experiments before finalization.

### 4. Review independently.

If subagents are available, use two in parallel for bounded, read-only critique: one examines visual coherence and distinction; the other examines usability, accessibility, public contracts, and implementation. Otherwise perform those review passes sequentially.

Both critics inspect rendered output and source changes. Resolve their findings yourself. They do not edit shared files or launch other sessions.

## Constraints and ownership

You own this effort only. Do not dispatch other workstreams.

Preserve the completed polish contracts and the deferred backlog. Consumer repositories, new features, additional theme controls, bespoke consumer artwork, and a new review framework are outside this effort.

Retain monochrome defaults, token-only Appearance, semantic status distinction, typography and target floors, font fallbacks, reduced-motion meaning, forced-colour focus, scoped output, deterministic selection, and React-free neutral/CLI graphs.

Preserve public names unless a necessary contract change is explicitly documented. Add the appropriate changelog entries.

Use existing review and capture tools. Regenerate derived files and canonical images through their owners. Never hand-edit generated output or loosen standards. Demonstrated bugs require practical regression guards; use discern-cure-a-bug for those fixes.

## Definition of done

- The owner has selected the direction and approved its final preview.
- The three complete specimens demonstrate that direction coherently.
- Ordinary controls and dense information carry the same character.
- Review covers narrow/medium/wide allocations, both poles, representative Appearance settings, enlarged text, fallback fonts, and relevant states.
- Affected CLI output retains its meaning across supported capabilities.
- The package implements the result without Catalogue-only styling fixes.
- Independent findings are resolved and durable guidance is current.

Provide exact Catalogue URLs on the deterministic worktree port. After preview approval, stop this effort's preview/watch processes before every gate run. Run `discern_prepare`, inspect its changes, commit logical changes atomically, then run `discern_done` on the clean final HEAD. Use discern queue for direct tests.

Landing requires the owner's approval or machine-verified authority. Follow `discern_done`'s authority-aware next action; use `discern_accept` when authorized. Otherwise return the Proof and stop. This brief grants no landing authority. Never push or publish.

Return the worktree, branch, visual evidence, remaining limitations, and the final Proof line verbatim for adversarial review.
