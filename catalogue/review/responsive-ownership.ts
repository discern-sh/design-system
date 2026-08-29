import { reviewInlineSizes } from "../review-postures.ts";

export type ReviewResponsiveAllocation = "local" | "page";

/**
 * The reviewed exceptions to Component-local width ownership.
 *
 * The stylesheet path lets the architectural test bind every viewport query
 * to this authority. `page` prevents the local review tool from constraining a
 * page composition to an unrelated specimen width; `local` keeps a Component
 * embedded while only its promoted/top-layer evidence follows the viewport.
 */
export const componentViewportLayoutPolicies = Object.freeze(
  [
    {
      slug: "hover-card",
      stylesheet: "src/components/feedback/hover-card/hover-card.css",
      reviewAllocation: "local",
      reason:
        "The promoted floating panel is constrained and inset against the viewport and top layer, not its trigger allocation.",
    },
    {
      slug: "article-header",
      stylesheet: "src/components/editorial/article-header/article-header.css",
      reviewAllocation: "page",
      reason:
        "The publication opener composes optional lead media and its bounded inner grid as a page-scale relationship.",
    },
    {
      slug: "article-layout",
      stylesheet: "src/components/editorial/article-layout/article-layout.css",
      reviewAllocation: "page",
      reason:
        "The page reading shell owns the sticky global-header offset and the table-of-contents, body, and rail relationship.",
    },
    {
      slug: "pull-quote",
      stylesheet: "src/components/editorial/pull-quote/pull-quote.css",
      reviewAllocation: "page",
      reason:
        "The public wide alignment deliberately escapes reading measure until the page viewport can no longer hold the breakout.",
    },
    {
      slug: "related-content",
      stylesheet:
        "src/components/editorial/related-content/related-content.css",
      reviewAllocation: "page",
      reason:
        "The full-width continuation band owns a bounded multi-story grid whose contract is the surrounding page.",
    },
    {
      slug: "site-header",
      stylesheet: "src/components/marketing/site-header/site-header.css",
      reviewAllocation: "page",
      reason:
        "The sticky full-site header owns the viewport relationship between its brand, primary navigation, and compact menu trigger.",
    },
    {
      slug: "site-footer",
      stylesheet: "src/components/marketing/site-footer/site-footer.css",
      reviewAllocation: "page",
      reason:
        "The full-site footer owns the page-wide relationship between its brand, navigation columns, and closing legal row.",
    },
    {
      slug: "marketing-section",
      stylesheet:
        "src/components/marketing/marketing-section/marketing-section.css",
      reviewAllocation: "page",
      reason:
        "The broad storytelling section owns page-frame rhythm and its bounded heading-to-content relationship at viewport scale.",
    },
  ] as const,
);

const policyBySlug: ReadonlyMap<
  string,
  (typeof componentViewportLayoutPolicies)[number]
> = new Map(
  componentViewportLayoutPolicies.map((policy) => [policy.slug, policy]),
);

/** Resolve the reviewed width owner; unexceptional Components stay local. */
export function componentReviewResponsiveAllocation(
  slug: string,
): ReviewResponsiveAllocation {
  return policyBySlug.get(slug)?.reviewAllocation ?? "local";
}

/**
 * Allocate page-owned specimens from the real page, bounded by the named
 * review canvas. Local Components preserve the explicitly requested width.
 */
export function componentReviewInlineSize(input: {
  readonly slug: string;
  readonly requestedInlineSize: number;
  readonly pageViewportWidth: number;
}): number {
  if (componentReviewResponsiveAllocation(input.slug) === "local") {
    return input.requestedInlineSize;
  }
  return Math.min(
    reviewInlineSizes.wide,
    Math.max(reviewInlineSizes.narrow, input.pageViewportWidth),
  );
}
