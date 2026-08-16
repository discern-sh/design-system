/** Shared failure, accessibility, and keyboard authorities for browser gates. */
import type { Locator, Page } from "playwright-core";

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
