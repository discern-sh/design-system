import type { Page } from "playwright-core";
import type { FontMetricBrowserCase } from "./font-metric-overrides.ts";

const OPTIONAL_LOCAL_FONT_TIMEOUT_MS = 500;

export interface FontLoadRequest {
  readonly font: string;
  readonly timeoutMs: number;
}

type FontLoader = (font: string) => PromiseLike<readonly unknown[]>;

/** Report whether one optional font resolves before its local-only deadline. */
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

/** Keep installed metric aliases and name those unavailable on this machine. */
export async function availableFontMetricCases(
  page: Page,
  cases: readonly FontMetricBrowserCase[],
): Promise<{
  readonly available: readonly FontMetricBrowserCase[];
  readonly skipped: readonly string[];
}> {
  const available: FontMetricBrowserCase[] = [];
  const skipped: string[] = [];
  for (const candidate of cases) {
    let installed = true;
    for (const weight of candidate.weights) {
      installed &&= await page.evaluate(fontLoadsWithin, {
        font: `${candidate.style} ${weight} 64px ${candidate.fallback}`,
        timeoutMs: OPTIONAL_LOCAL_FONT_TIMEOUT_MS,
      });
    }
    if (installed) available.push(candidate);
    else skipped.push(candidate.name);
  }
  return { available, skipped };
}
