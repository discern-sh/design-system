/**
 * Semantic marker for Catalogue copy needed to make the next decision.
 *
 * Owning route styles still decide hierarchy. Browser conformance uses this
 * marker to prevent sentence-length explanations from falling back to the
 * terse tertiary treatment used for labels, counts, and implementation facts.
 */
export const catalogueCopyRoleAttribute = "data-discern-catalogue-copy";
export const catalogueDecisionCopyRole = "decision";

export const catalogueDecisionCopyProps = Object.freeze(
  {
    [catalogueCopyRoleAttribute]: catalogueDecisionCopyRole,
  } as const,
);

/** Live-enrolling selector shared by every Catalogue browser projection. */
export const catalogueDecisionCopySelector =
  `[${catalogueCopyRoleAttribute}="${catalogueDecisionCopyRole}"]`;
