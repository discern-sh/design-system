export interface ReviewRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function validRect(rect: ReviewRect): boolean {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width > 0 && rect.height > 0;
}

/** Prove the named local width is the specimen's allocation, not the page. */
export function inspectReviewGeometry(input: {
  readonly pageViewport: { readonly width: number; readonly height: number };
  readonly requestedInlineSize: number;
  readonly specimenBounds: ReviewRect;
}): {
  readonly pageViewport: { readonly width: number; readonly height: number };
  readonly allocatedInlineSize: number;
} {
  if (!validRect(input.specimenBounds)) {
    throw new TypeError("Review specimen has empty geometry");
  }
  if (Math.abs(input.specimenBounds.width - input.requestedInlineSize) > 0.5) {
    throw new TypeError(
      `Review requested ${input.requestedInlineSize}px but allocated ${input.specimenBounds.width}px`,
    );
  }
  return {
    pageViewport: input.pageViewport,
    allocatedInlineSize: input.specimenBounds.width,
  };
}

/** Integer union for the existing declared selectors, bounded by one host. */
export function captureRegionForReview(
  regions: readonly ReviewRect[],
  host: ReviewRect,
  identity: string,
): ReviewRect {
  if (
    !validRect(host) || regions.length === 0 ||
    regions.some((rect) => !validRect(rect))
  ) {
    throw new TypeError(`${identity} has an empty review capture region`);
  }
  const left = Math.floor(Math.min(...regions.map(({ x }) => x)));
  const top = Math.floor(Math.min(...regions.map(({ y }) => y)));
  const right = Math.ceil(
    Math.max(...regions.map(({ x, width }) => x + width)),
  );
  const bottom = Math.ceil(
    Math.max(...regions.map(({ y, height }) => y + height)),
  );
  const region = { x: left, y: top, width: right - left, height: bottom - top };
  const hostRight = host.x + host.width;
  const hostBottom = host.y + host.height;
  if (
    region.x < host.x || region.y < host.y ||
    region.x + region.width > hostRight || region.y + region.height > hostBottom
  ) throw new TypeError(`${identity} capture region escapes its example host`);
  return region;
}
