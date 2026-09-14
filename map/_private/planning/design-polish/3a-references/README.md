# 3A visual references and owner decisions

These notes preserve the owner's design discovery for 3A. They distinguish the agreed intent from the limitations of the sketches, so the implementation session can continue without access to the original conversation.

## Saved studies

- [Surface life studies](surface-life-studies.html): matched A/B surfaces, visible controls, content transitions, and a pin action.
- [Icon material studies](icon-material-studies.html): matched flat/relief symbols, large and small placements, and visible controls.

These are unchanged exploratory HTML fragments from the conversation on 13 September 2026. They are private reference material, not published Components, standalone pages, production CSS, or an approved public API. They use host-provided Lucide icons and the host's colour scheme. To replay them faithfully, use a compatible visualization host or its standalone-preview wrapper with Lucide support; simply opening the fragment as a file will omit icons. The explicit Appearance selectors allow light/dark comparison inside the studies.

The icon study retains rejected controls to preserve what was compared. Turn **Slight angle off** and leave **Depth on small icons off** when viewing the preferred direction. The surface study's **Cool light tint starts off**. Do not mistake every available toggle or initial setting for an approved product feature.

The visual relationships and judgments below are the reference. The sketches' hard-coded colours, dimensions, opacity, motion timing, and control labels are not token authorities or locked production values. They do not prove package accessibility, browser compatibility, imported-SVG coverage, or performance.

## Surface and interaction decisions

The owner strongly preferred surface study **B, Light & transitions**, describing it as polished and tasteful. The shimmer was reduced twice before its visible strength was accepted. Preserve that final restraint when adapting it to real Components.

| Ingredient         | Owner judgment                                                                                  | Implementation boundary or remaining work                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface depth      | Clearly liked once its toggle made the comparison visible.                                      | Quiet shading, edge highlights, and restrained shadows should compose with the existing elevation, Structure, and Emphasis authorities. This is not permission for more borders and shadows everywhere. |
| Convincing press   | Desired as an everyday detail.                                                                  | Small displacement and shadow compression should feel causally connected to pressing. Preserve clear persistent state and keyboard use. The pin action is separate from the content shimmer.            |
| Ambient light      | Strongly liked in dark mode; effectively invisible in light mode.                               | Keep it opt-in and controllable at a deliberate region or placement. Refine neutral tonal contrast in light mode. Test a repeated grid, not just one isolated attractive surface.                       |
| Transition shimmer | Accepted at its final subtle strength in both themes.                                           | In the study, change Overview/Details to see the shimmer across the content panel. Tie it to meaningful content/state arrival; do not replay it on arbitrary hovers or as a constant sweep.             |
| Cool light tint    | Off preferred in dark mode. Light mode could not be judged because ambient light was too faint. | There is no approval for a permanent cool-blue cast. Start with neutral light and solve light-mode visibility before assessing tint.                                                                    |

Ambient life and meaningful transitions are both wanted. Their roles differ: one gives a selected region understated life; the other accompanies something happening. Pointer-following highlights and intrusive lighting over buttons are unwanted. Passive surfaces should not appear clickable because they carry material detail.

Lighting should feel plausible on the actual surface. Keep it neutral by default. Where a subtle tint improves the result, derive it from the existing Appearance hue/pigment authorities, with restrained strength rather than a new independent palette. Ambient fields are the most promising place to assess tint; transition glints and icon/surface illumination need not all inherit it. A consumer's red or blue accent must not automatically dye every shadow and highlight. Tune through the shared token model, including intermediate appearances.

Motion remains optional and the still presentation must be complete. Ambient placement needs a useful off/still form and appropriate pause/reduced-motion behaviour; a dozen cards must not create a dozen competing light sources. The implementation should use the existing Artwork/motion facilities where appropriate and explicitly document any extension.

## Icon decisions

Flat generally looks best. Large-icon relief adds a premium quality, especially in light mode, so retain it as an optional dimension. Dark-mode relief needs refinement before it earns the same confidence.

- Reject the slight angle/tilt entirely.
- Keep small interface icons flat; added depth at that size contributes little.
- Keep flat large symbols available; relief is an ingredient, not the default icon identity.
- Support supplied SVGs independently of vendor or path construction. The owner's anticipated source includes services such as The Noun Project. Both filled and outlined artwork need real review.
- Use a shared Icon authority for sizing, alignment, accessible naming/decorative treatment, and any optional relief. The repository already has that wrapper; the sketch is not a reason to add a duplicate.

The reference uses silhouette-following shadows on ordinary outline SVGs. It demonstrates a visual possibility, not proof that every imported asset fits the current Icon CSS or that the same depth should apply at every size.

## Review practice learned from the studies

Initially hidden design controls meant the owner judged only what was visible. The saved revisions use visible native controls. Future comparisons must expose their controls clearly, confirm that they operate, and identify exactly what interaction reveals an effect. Judge both themes explicitly: approval in one did not imply success in the other.

Inspect a still default, the effect in motion at real speed, and the effect disabled. Compare real layouts, ordinary controls, and repeated placements with matched content and Appearance. Approval of these exploratory ingredients is not approval of the final package implementation.

## Product context provenance

The brief carries the relevant audience and first-impression intent. The owner's optional local background sources are [audiences](/Users/jack/Sites/discern/project/map/_private/brand/audiences.md) and [human benefits](/Users/jack/Sites/discern/project/map/_internal/feature-canon-human-benefits.md). They describe the consumer product, not additional design-system deliverables; a fresh session does not require that sibling checkout to understand this brief.
