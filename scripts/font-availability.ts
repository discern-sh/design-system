import type { Page } from "playwright-core";
import type { FontMetricBrowserCase } from "./font-metric-overrides.ts";

const OPTIONAL_LOCAL_FONT_TIMEOUT_MS = 500;
const REQUIRED_TARGET_FONT_TIMEOUT_MS = 2_000;

export interface FontLoadRequest {
  readonly font: string;
  readonly timeoutMs: number;
}

type FontLoader = (font: string) => PromiseLike<readonly unknown[]>;

/** Report whether one font resolves before its bounded deadline. */
export async function fontLoadsWithin(
  request: FontLoadRequest,
  load: FontLoader = (font) => document.fonts.load(font),
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const unavailable = new Promise<false>((resolve) => {
    timeout = setTimeout(() => resolve(false), request.timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve()
        .then(() => load(request.font))
        .then((loaded) => loaded.length > 0, () => false),
      unavailable,
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/**
 * Load every target and keep metric cases whose optional aliases also resolve.
 */
export async function availableFontMetricCases(
  page: Page,
  cases: readonly FontMetricBrowserCase[],
): Promise<{
  readonly available: readonly FontMetricBrowserCase[];
  readonly failures: readonly string[];
  readonly skipped: readonly string[];
}> {
  const available: FontMetricBrowserCase[] = [];
  const failures: string[] = [];
  const skipped: string[] = [];
  for (const candidate of cases) {
    let fallbackAvailable = true;
    let targetAvailable = true;
    for (const weight of candidate.weights) {
      const font = `${candidate.style} ${weight} 64px`;
      const targetLoaded = await page.evaluate(fontLoadsWithin, {
        font: `${font} ${candidate.target}`,
        timeoutMs: REQUIRED_TARGET_FONT_TIMEOUT_MS,
      });
      const fallbackLoaded = await page.evaluate(fontLoadsWithin, {
        font: `${font} ${candidate.fallback}`,
        timeoutMs: OPTIONAL_LOCAL_FONT_TIMEOUT_MS,
      });
      targetAvailable &&= targetLoaded;
      fallbackAvailable &&= fallbackLoaded;
      if (!targetLoaded) {
        failures.push(
          `${candidate.name} target ${candidate.target} did not load at ${weight}`,
        );
      }
    }
    if (!fallbackAvailable) skipped.push(candidate.name);
    if (targetAvailable && fallbackAvailable) available.push(candidate);
  }
  return { available, failures, skipped };
}
