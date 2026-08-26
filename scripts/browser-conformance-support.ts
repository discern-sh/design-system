/** Shared failure, accessibility, and keyboard authorities for browser gates. */
import { AxeBuilder } from "@axe-core/playwright";
import type { Locator, Page } from "playwright-core";
import { join } from "@std/path";

export const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

export const FOCUSABLE_SELECTOR =
  "a[href], area[href], button, input:not([type='hidden']), select, textarea, " +
  "summary, audio[controls], video[controls], iframe, object, embed, " +
  "[tabindex], [contenteditable]";

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;

/** Browser font posture used by component conformance matrices. */
export type BrowserFontPosture = "bundled" | "system";

const SYSTEM_FONT_CSS = `
  :where([data-discern-root]) {
    --discern-font-ui: system-ui, sans-serif;
    --discern-font-mono: ui-monospace, monospace;
  }
`;

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + 32_768)),
    );
  }
  return btoa(chunks.join(""));
}

/** Resolve the bundled-font or explicit system-fallback browser posture. */
export async function browserFontCss(
  posture: BrowserFontPosture,
): Promise<string> {
  if (posture === "system") return SYSTEM_FONT_CSS;
  let css = await Deno.readTextFile("assets/fonts.css");
  for (
    const name of [
      "crimson-pro-roman.woff2",
      "crimson-pro-italic.woff2",
      "inter.woff2",
      "jetbrains-mono.woff2",
    ]
  ) {
    const bytes = await Deno.readFile(join("assets", "fonts", name));
    css = css.replaceAll(
      `./fonts/${name}`,
      `data:font/woff2;base64,${encodeBase64(bytes)}`,
    );
  }
  return css;
}

/** Let two browser paints commit appearance changes before reading pixels. */
export async function waitForPaintedFrames(page: Page): Promise<void> {
  await page.evaluate(() =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  );
}

/** Run one WCAG scan only after theme and layout paint caches have settled. */
export async function scanBrowserAccessibility(
  page: Page,
  selector: string,
): Promise<AxeResults> {
  await waitForPaintedFrames(page);
  return await new AxeBuilder({ page })
    .include(selector)
    .withTags([...WCAG_TAGS])
    .analyze();
}

/** Collect every uncaught browser, console, and HTTP failure into one gate. */
export function addPageFailureListeners(page: Page, failures: string[]): void {
  page.on("pageerror", (error) => {
    failures.push(`Browser exception: ${error.message}`);
  });
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    ) {
      failures.push(`Browser console: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
}

/** Sequentially reachable candidates, excluding inert and negative-tabindex. */
export async function visibleEnabledTargets(root: Locator): Promise<Locator[]> {
  const candidates = root.locator(FOCUSABLE_SELECTOR);
  const targets: Locator[] = [];
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (!await candidate.isVisible() || !await candidate.isEnabled()) continue;
    const sequential = await candidate.evaluate((element) =>
      !element.closest("[inert]") &&
      !(element instanceof HTMLElement && element.tabIndex < 0)
    );
    if (sequential) targets.push(candidate);
  }
  return targets;
}
