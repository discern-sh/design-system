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

/** Wait for loaded assets, application readiness, fonts, and a painted layout. */
export async function loadReadyBrowserPage(
  page: Page,
  url: string,
  readySelector: string,
  timeout?: number,
): Promise<void> {
  await page.goto(url, { waitUntil: "load" });
  await page.locator(readySelector).waitFor(
    timeout === undefined ? {} : { timeout },
  );
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await waitForPaintedFrames(page);
}

/** Wait until a browsing context's scroll position is unchanged for two frames. */
export async function waitForStableWindowScroll(
  target: Locator,
): Promise<void> {
  await target.evaluate((element) => {
    const view = element.ownerDocument.defaultView;
    if (view === null) throw new Error("Scroll target has no browsing context");
    return new Promise<void>((resolve) => {
      let previousX = view.scrollX;
      let previousY = view.scrollY;
      let stableFrames = 0;
      const observe = (): void => {
        const currentX = view.scrollX;
        const currentY = view.scrollY;
        stableFrames = currentX === previousX && currentY === previousY
          ? stableFrames + 1
          : 0;
        previousX = currentX;
        previousY = currentY;
        if (stableFrames >= 2) resolve();
        else view.requestAnimationFrame(observe);
      };
      view.requestAnimationFrame(observe);
    });
  });
}

/** Preserve a scroll position unless a smaller range requires browser clamping. */
export function clampedScrollPosition(
  previous: number,
  maximum: number,
): number {
  return Math.min(Math.max(0, previous), Math.max(0, maximum));
}

/** Run one WCAG scan only after theme and layout paint caches have settled. */
export async function scanBrowserAccessibility(
  page: Page,
  selector: string | readonly string[],
): Promise<AxeResults> {
  const selectors = typeof selector === "string" ? [selector] : selector;
  if (selectors.length === 0) {
    throw new Error("Accessibility scan has no targets");
  }
  // Axe accepts a union when includes are added separately. Check each member:
  // a missing include must not disappear inside an otherwise nonempty union.
  const missing = await page.evaluate(
    (selectors) =>
      selectors.filter((selector) => !document.querySelector(selector)),
    [...selectors],
  );
  if (missing.length > 0) {
    throw new Error(`Accessibility targets missing: ${missing.join(", ")}`);
  }
  await waitForPaintedFrames(page);
  const scan = new AxeBuilder({ page }).withTags([...WCAG_TAGS]);
  for (const selector of selectors) scan.include(selector);
  return await scan.analyze();
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

/** Fresh forward Tab stops, including one eligible member of each native radio group. */
export async function visibleEnabledTargets(root: Locator): Promise<Locator[]> {
  const candidates = root.locator(FOCUSABLE_SELECTOR);
  const eligible: number[] = [];
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (!await candidate.isVisible() || !await candidate.isEnabled()) continue;
    if (
      await candidate.evaluate((element) =>
        !element.closest("[inert]") &&
        !(element instanceof HTMLElement && element.tabIndex < 0)
      )
    ) eligible.push(index);
  }
  const sequential = await candidates.evaluateAll((nodes, eligible) => {
    return eligible.filter((index) => {
      const element = nodes[index]!;
      if (
        !(element instanceof HTMLInputElement) || element.type !== "radio" ||
        element.name === ""
      ) return true;
      // A checked peer can belong to this group outside the inspected container.
      const peers = Array.from(
        (element.getRootNode() as Document | ShadowRoot)
          .querySelectorAll<HTMLInputElement>('input[type="radio"]'),
      ).filter((radio) => {
        if (
          radio.name !== element.name || radio.form !== element.form ||
          radio.tabIndex < 0 || radio.matches(":disabled") ||
          radio.closest("[inert]")
        ) return false;
        const rect = radio.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 &&
          getComputedStyle(radio).visibility === "visible";
      });
      const checked = peers.find((radio) => radio.checked);
      const firstLocal = eligible.map((index) => nodes[index]).find((node) =>
        peers.includes(node as HTMLInputElement)
      );
      return element === (checked ?? firstLocal);
    });
  }, eligible);
  return sequential.map((index) => candidates.nth(index));
}
