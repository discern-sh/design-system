import type { Page } from "playwright-core";

export interface ViewportSize {
  readonly height: number;
  readonly width: number;
}

/** Fail when a browser operation inherits the wrong viewport. */
export function requireViewport(
  page: Page,
  viewport: ViewportSize,
  operation: string,
): void {
  const current = page.viewportSize();
  if (
    current === null ||
    current.width !== viewport.width ||
    current.height !== viewport.height
  ) {
    throw new Error(
      `${operation} requires a ${viewport.width}×${viewport.height} viewport; received ${
        current === null
          ? "an unbounded viewport"
          : `${current.width}×${current.height}`
      }`,
    );
  }
}

/** Run one browser operation at a temporary viewport, then restore it exactly. */
export async function withViewport<Result>(
  page: Page,
  viewport: ViewportSize,
  operation: () => Promise<Result>,
): Promise<Result> {
  const previousViewport = page.viewportSize();
  if (previousViewport === null) {
    throw new Error(
      "Temporary viewport operation requires a restorable viewport",
    );
  }
  await page.setViewportSize(viewport);
  try {
    return await operation();
  } finally {
    await page.setViewportSize(previousViewport);
  }
}
