# 3A - Give discern a distinctive visual character

Status: pending

## Goal

Give the published design system's Web surfaces more character, confidence, and material presence through exceptional everyday details, while keeping its uncustomised monochrome presentation beautifully restrained. Enable consumers to compose stronger expression without sacrificing the system's consistency or correctness.

The owner confirms that all wave 2 briefs have completed and landed. 3A is the next dispatch. Build on that completed polish; do not repeat its programme or wait for already-satisfied dependencies.

## Orient and establish the baseline

Begin with `discern_status` at `/Users/jack/Sites/discern-design-system`. Resume this effort's recorded worktree if one exists; otherwise call `discern_start` with the literal name `signature`. Re-root all reads, edits, commands, and discern calls to its returned absolute path.

Record the starting commit and inspect the landed contracts you will build on. Verify these worktree-relative anchors against live code:

- `AGENTS.md` and `map/_private/planning/design-polish/README.md`;
- this brief's [visual references and owner decisions](3a-references/README.md), including both saved studies;
- `map/00-orientation/design-principles.md` and `map/10-tokens-themes/README.md`;
- `map/20-components/README.md` and `map/20-components/marketing-composition.md`;
- `map/60-catalogue/visual-review.md`;
- `src/tokens/tokens.ts`, `src/tokens/appearance.ts`, `src/styles/`, and `assets/fonts.css`;
- `src/components/core/icon/`, the Marketing and Artwork component authorities, and their examples;
- `catalogue/compositions.tsx`, `catalogue/review/`, and `catalogue/review-postures.ts`;
- `tests/component_appearance_contract_test.ts`, `tests/component_review_postures_test.ts`, `tests/icon_alignment_test.ts`, and `tests/release_test.ts`.

## Intent and settled direction

The library began as a documentation design system. Its editorial character works well for sustained reading and the owner's future personal homepage/blog, but carries too much of that voice into marketing and application interfaces. The problem is a competent yet cautious appearance: everything can feel like a think-piece. The desired first impressions are excellent taste; thoughtful, human, inviting craft; and technical capability, with the character of an excellent instrument.

**Distinct voices, shared craft** is the governing relationship. Reading and personal publishing may resemble each other closely. Marketing needs more immediate impact and a recognisable software-product presence. Operational interfaces need clarity, precision, and satisfying controls. Shared details should reveal their relationship without making these uses interchangeable.

The owner has already explored and approved a material direction. Use the linked studies and their recorded judgments as evidence, not as production code or a new round of unrestricted brand discovery:

- Preserve the restrained monochrome default. Make stronger expression available through a small set of optional, composable treatments. Their public form is an implementation decision; a new global slider, bundled personality preset, or separate theming framework is not a requirement.
- Prioritise convincing presses, subtle surface shading/depth, expressive iconography, and light moving across deliberately selected surfaces. Everyday controls and arrangements must carry the craft even without a hero, logo, animation, or coloured accent.
- Keep the existing serif and its carefully chosen reading roles. Explore a new marketing display face, with serif retained for selected quotations or passages rather than every marketing headline.
- Keep ambient light and the restrained transition shimmer. Refine ambient light against light backgrounds and large-icon relief against dark backgrounds. Lighting starts neutral; any subtle tint derives selectively from existing Appearance authorities.
- Keep icons flat by default and at small interface sizes. Offer subtle relief for larger expressive placements. Drop the tilted-icon direction.

The existing Structure and Emphasis axes already influence borders and shadows. Identify what each accepted effect adds before creating a capability; compose with or improve the existing authority wherever it already owns the relationship. Stronger treatments must be independently selectable where useful, and removable locally. A grid of twelve cards must not acquire twelve competing light animations by default.

### Typography decision still with the owner

The owner will choose the new marketing display face and confirm it when needed. Surface that dependency early, with the required weights/styles and asset or licence information. Use the existing sans-serif provisionally for independent composition and material exploration, and label it as provisional. Do not silently select or ship a permanent substitute. Final typography-dependent review requires the chosen face and its real fallbacks.

Explore hierarchy, weight, proportion, spacing, and composition as well as font family. A font swap alone is not the completion bar. Resolve the smallest reusable role or override that lets marketing speak differently while preserving editorial consumers.

### Marketing and human presence

The originating product is chiefly operated by coding agents. Its human audience includes experienced engineers and, in roughly equal measure, builders who use agents without extensive engineering knowledge. The owner's target understanding is: “I can work confidently with coding agents because engineering practices are systematically enforced for me, without extensive experience or complex configuration.” Treat this as the intended meaning, not final marketing copy. Establish that relevance before explaining the mechanisms.

Repeated homepage experiments with workflow diagrams, accumulating evidence, artefacts, terminals, code, and imaginary chat transcripts failed to engage the owner. They asked a new visitor to study the mechanism before knowing why to care. Use recognisable symbols, short benefit statements, and concise supporting text for the opening. Detailed demonstrations belong further into the explanation. The opening must remain compelling and intelligible when completely still.

This informs the generic marketing specimen; it does not commission discern's actual landing page or copy. Keep package examples reusable and free of bespoke product claims. A carefully placed, attributed human aside can convey authorship through existing quotation/people/content facilities; personal identity, photography, and authentic commentary belong to the consumer. Avoid mascots, personification, confetti, arbitrary stylistic interruptions, and generic AI-product spectacle. The owner's confetti-library example represents delight in an ordinary action executed with unusual care, not a request for that visual effect.

## Deliverables

### 1. Demonstrate two focused interpretations

Inspect the baseline in a browser. Identify the shared rules that already work and the decisions that make different purposes feel too similar.

Develop two coherent interpretations within the settled direction, principally exploring typography, hierarchy, composition, graphic treatment, and where the expressive ingredients belong. Make a bounded comparison before implementing either throughout the package. Do not build two complete production systems.

Compare the baseline and alternatives using identical content and matched Appearance coordinates in three complete specimens:

- a sustained reading page with navigation, code, and a figure;
- a dense operational task with controls, status, and verification;
- a generic marketing page with an immediately legible opening, supporting sections, and a clear next action.

Reuse the existing Components and composition recipes. Include ordinary controls and icon placements alongside complete pages, both light and dark, at a normal and narrow allocation. Expose visibly labelled, working comparison controls, including still/motion and relevant treatment toggles. Verify that the owner can actually see and operate them. Earlier studies were initially judged only on their visible defaults because their design controls were hidden.

Use these questions to assess the rendered results:

- Does the default feel beautifully restrained and deliberately authored?
- Does expressive marketing communicate a software product and a reason to explore without studying a diagram or waiting for animation?
- Do the three purposes have distinct voices while sharing recognisable details?
- Do ordinary controls feel precise and satisfying, and reading pages retain their successful editorial character?
- Is the extra material presence visible but quiet in both themes, including repeated and dense placements?

Obtain a bounded read-only visual critique before the owner chooses. Recommend one interpretation through concrete examples and tradeoffs. Present the choice before package-wide propagation; continue independent investigation while awaiting it. The owner selects a direction, not every subsequent routine implementation detail.

### 2. Implement the reusable ingredients

Implement the chosen direction at its owning token, foundation, Component, asset, and behaviour authorities. The published package must carry the improvements; a Catalogue-only stylesheet is not the result.

Carry the accepted surface depth, convincing presses, restrained transition shimmer, selective ambient light, and optional large-icon relief into real components. Use the reference notes to distinguish approved effects from unresolved tuning. Reuse Artwork/Backdrop's existing presence, motion, and theme-balancing facilities where they fit; do not assume every decorative surface should become an interactive control or continuously animate.

The existing `Icon` in `src/components/core/icon/` already wraps supplied graphics with sizing and accessibility. Extend or adapt it rather than creating a parallel wrapper. Prove the intended treatment with both filled and outlined imported SVGs, large and small placements, and the existing alignment/label semantics. Current SVG styling assumes an outline presentation; inspect that contract rather than treating one Lucide example as proof of vendor neutrality. Consumers may supply assets from services such as The Noun Project: relief must not depend on hand-editing a particular symbol's paths. No broad icon-library acquisition is needed.

Small public capabilities and documented breaking changes are expressly authorised for this 0.x package. Choose the smallest reusable API needed for the approved result, document its defaults/composition/boundaries, update affected callers and examples, and record public changes, including every break and its migration consequence, in `CHANGELOG.md`. Use `add-a-component` if a genuinely new component is warranted. No separate permission is needed merely because an approved change adds a prop, role, treatment, or breaks compatibility.

### 3. Integrate and document the chosen rules

Audit every Web component family under the selected direction. Keep a short review record of changed, reviewed-and-retained, or unresolved families, with representative evidence. Do not restyle components that already fit simply to make the diff look comprehensive.

Give the three purposes appropriate expression and check their complete compositions. Demonstrate the new styling in a minimal consumer using emitted package CSS/assets and public markup or the build-time adapter, without Catalogue styles or a new hydration requirement.

Extend existing visual guidance with a small set of rules, examples, and boundaries: where an ingredient helps, how it composes with Appearance, and where it becomes excessive. Keep numeric values in their source authorities. Use an ADR for a significant, hard-to-reverse decision or an intentional principle override. Reconcile motion guidance with any new explicit ambient treatment. Remove abandoned implementation experiments; preserve the labelled planning references as evidence of the owner's choices.

### 4. Review the integrated result independently

If subagents are available, use two in parallel for bounded read-only review of the selected implementation: one examines visual coherence and distinction, the other usability, accessibility, public contracts, and implementation. Otherwise perform those passes sequentially. The early visual critic may be reused for the final visual pass.

Critics inspect rendered results and relevant source, report actionable findings, and neither edit files nor launch other agents. Resolve their findings yourself. This is one implementation effort in one worktree; do not dispatch other programme workstreams.

## Boundaries and verification

**Web appearance is the design scope.** The owner is satisfied with CLI design. Check affected terminal projections and shared contracts for regression; do not launch a terminal redesign or translate browser lighting into terminal decoration.

Preserve the completed polish's functional relationships: readable hierarchy, aligned controls, working states, responsive composition, and adoption flows. Existing numeric style choices may evolve where evidence supports it. Keep monochrome defaults, token-only Appearance, semantic status distinction, typography and target floors, font fallbacks, reduced-motion meaning, forced-colour focus, scoped output, deterministic selection, and React-free neutral/CLI graphs.

Theme refinement belongs in shared token projections, with identical Component CSS across appearances. New lighting must remain decorative, leave complete state visible without motion, avoid pointer-following/hover lighting on controls, and respect opt-out and reduced motion. Check light/dark, representative intermediate Appearance settings, accent and pigment tints, and low/high Structure and Emphasis. Neutral light is the baseline; selective hue contribution must earn its place in both themes without obscuring status or becoming a colour wash.

Stage verification to match the work: baseline and bounded alternatives first; full family/state coverage, canonical captures, and the final gate for the chosen implementation. Review narrow/medium/wide allocations, enlarged text, fallback fonts, keyboard/focus, relevant interaction states, repeated surfaces, motion disabled, and forced colours. Check actual animation at production speed as well as still frames; inspect the cost of repeated ambient/effect layers in the existing browser tools.

Consumer repositories, unrelated deferred features, bespoke consumer artwork, a new theming framework, and a new review/capture framework remain outside this effort. Use existing review tools, regenerate derived files and canonical images through their owners, and never hand-edit generated output or loosen standards. Demonstrated bugs require practical regression guards; use `discern-cure-a-bug` for those fixes.

## Definition of done and handoff

- The owner has selected a concrete direction and approved its final rendered preview with the chosen marketing font.
- The three complete specimens show distinct voices and shared craft; the default and optional treatments both succeed, including ordinary controls and dense information.
- Accepted effects work with the documented boundaries in both themes; the light-mode ambient and dark-mode relief weaknesses have been resolved through visible comparisons.
- Optional treatments compose with existing Appearance, can be omitted, and do not multiply distracting effects across repeated surfaces.
- Imported filled/outlined SVGs, small flat icons, and optional larger relief are demonstrated through the public icon authority.
- The minimal consumer proves the result belongs to the package; affected CLI contracts retain their meaning.
- The family review, independent findings, durable guidance, public API documentation, changelog, generated output, and relevant visual evidence are complete.

Provide exact Catalogue URLs on the deterministic worktree port. Leave the preview running after `discern_done` for owner review; stop it before `discern_accept` removes the worktree. Run `discern_prepare`, inspect its changes, commit logical changes atomically, then run `discern_done` on the clean final HEAD. Direct tests use `discern queue --`; do not duplicate the full test stage immediately before the gate without a specific diagnostic need.

Archive this brief into `_done/` with repaired relative links as part of the implementation's final changes, following the programme's completion convention. Keep the visual references in their stable directory. Do not represent unfinished work as landed; completion reporting must reflect the actual acceptance result.

Landing uses the programme's task grants recorded at the desk. Follow `discern_done`'s authority-aware next action; `discern_accept` checks recorded authority. Without authority, return the Proof and stop. Visual approval, a green gate, and this brief are not themselves a landing grant. Never push or publish.

Return the worktree, branch, visual evidence, remaining limitations, and the final Proof line verbatim for adversarial review.
