import { AxeBuilder } from "@axe-core/playwright";
import { fromFileUrl } from "@std/path";
import { Buffer } from "node:buffer";
import type {
  Browser,
  BrowserContext,
  Dialog,
  Locator,
  Page,
} from "playwright-core";
import { BUILDER_STORAGE_KEYS } from "../catalogue/builder/persistence.ts";
import {
  addPageFailureListeners,
  FOCUSABLE_SELECTOR,
  visibleEnabledTargets,
  WCAG_TAGS,
} from "./browser-conformance-support.ts";
import { type ViewportSize, withViewport } from "./viewport.ts";

const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const INTERMEDIATE_VIEWPORT = { width: 900, height: 800 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;
const ZOOMED_VIEWPORT = { width: 320, height: 256 } as const;
const ACTION_TIMEOUT = 4_000;
const BUILDER_READY = '[data-discern-builder-ready="true"]';
const BUILDER_SHELL = ".discern-builder-shell";
const CANVAS_PAGE = ".discern-builder-canvas__page";
const OUTLINE_ITEM = "[data-discern-builder-outline-id]";
const OUTLINE_ROW = `${OUTLINE_ITEM} > button`;

type BuilderTheme = "light" | "dark";
type BuilderPane = "palette" | "canvas" | "inspector";

const PANES: readonly BuilderPane[] = ["palette", "canvas", "inspector"];
const THEMES: readonly BuilderTheme[] = ["light", "dark"];
const STORAGE_KEYS = Object.values(BUILDER_STORAGE_KEYS);

interface AdaptiveCase {
  readonly label: string;
  readonly viewport: ViewportSize;
  readonly constrained: boolean;
}

const ADAPTIVE_CASES: readonly AdaptiveCase[] = [
  { label: "wide", viewport: WIDE_VIEWPORT, constrained: false },
  {
    label: "intermediate",
    viewport: INTERMEDIATE_VIEWPORT,
    constrained: true,
  },
  { label: "narrow", viewport: NARROW_VIEWPORT, constrained: true },
  { label: "400%-zoom", viewport: ZOOMED_VIEWPORT, constrained: true },
];

export interface BuilderConformanceOptions {
  readonly browser: Browser;
  readonly page: Page;
  readonly origin: string;
  readonly failures: string[];
  readonly outputRoot: URL;
}

/** Measured browser populations exercised for the Catalogue-only builder. */
export interface BuilderConformanceSummary {
  readonly adaptiveCases: number;
  readonly paneTransitions: number;
  readonly axeScans: number;
  readonly keyboardStops: number;
  readonly authoringChecks: number;
  readonly shortcutIsolationChecks: number;
  readonly touchChecks: number;
  readonly containedFailures: number;
  readonly forcedColourFocusChecks: number;
  readonly screenshots: readonly string[];
}

interface AdaptiveSummary {
  readonly cases: number;
  readonly paneTransitions: number;
  readonly axeScans: number;
}

interface KeyboardSummary {
  readonly stops: number;
  readonly focusIndicators: number;
}

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function attempt<Result>(
  failures: string[],
  label: string,
  fallback: Result,
  operation: () => Promise<Result>,
): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    failures.push(`Builder ${label}: ${errorMessage(error)}`);
    return fallback;
  }
}

function builderUrl(origin: string): string {
  return new URL("/catalogue/builder/", origin).href;
}

async function loadBuilderPage(page: Page, origin: string): Promise<void> {
  await page.goto(builderUrl(origin), { waitUntil: "networkidle" });
  await page.locator(BUILDER_READY).waitFor({ timeout: ACTION_TIMEOUT });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  invariant(
    await page.getByText("Beta", { exact: true }).isVisible(),
    "builder chrome must identify the interface builder as Beta",
  );
  const leakingHeadings = await page.locator(
    `${BUILDER_SHELL} :is(h1, h2, h3, h4, h5, h6)`,
  ).evaluateAll((headings) =>
    headings.flatMap((heading) => {
      if (
        heading.closest(
          ".discern-builder-canvas__page, .discern-builder-palette__preview",
        ) !== null
      ) {
        return [];
      }
      const features = getComputedStyle(heading).fontFeatureSettings;
      return features === "normal"
        ? []
        : [`${heading.textContent?.trim() ?? heading.tagName}: ${features}`];
    })
  );
  invariant(
    leakingHeadings.length === 0,
    `builder chrome headings inherited UI-only OpenType features: ${
      leakingHeadings.join(", ")
    }`,
  );
}

async function resetBuilderStorage(page: Page, origin: string): Promise<void> {
  if (new URL(page.url()).origin !== new URL(origin).origin) {
    await page.goto(new URL("/catalogue/", origin).href, {
      waitUntil: "domcontentloaded",
    });
  }
  await page.evaluate((keys) => {
    for (const key of keys) localStorage.removeItem(key);
  }, STORAGE_KEYS);
}

async function useTheme(page: Page, theme: BuilderTheme): Promise<void> {
  const switcher = page.getByRole("group", { name: "Builder colour theme" });
  await switcher.getByRole("radio", {
    name: theme === "light" ? "Light" : "Dark",
    exact: true,
  }).check({ timeout: ACTION_TIMEOUT });
  await page.waitForFunction(
    ({ selector, theme }) =>
      document.querySelector(selector)?.getAttribute("data-discern-theme") ===
        theme,
    { selector: BUILDER_SHELL, theme },
    { timeout: ACTION_TIMEOUT },
  );
}

function paneLocator(page: Page, pane: BuilderPane): Locator {
  return page.locator(`#discern-builder-pane-${pane}`);
}

async function activatePane(page: Page, pane: BuilderPane): Promise<void> {
  const tab = page.getByRole("tab", {
    name: pane === "palette"
      ? "Palette"
      : pane === "canvas"
      ? "Canvas"
      : "Inspector",
    exact: true,
  });
  if (!await tab.isVisible()) {
    invariant(
      await paneLocator(page, pane).isVisible(),
      `${pane} pane is hidden without adaptive pane navigation`,
    );
    return;
  }
  await tab.click({ timeout: ACTION_TIMEOUT });
  await page.waitForFunction(
    ({ selector, pane }) =>
      document.querySelector(selector)?.getAttribute(
        "data-discern-builder-pane",
      ) === pane,
    { selector: BUILDER_SHELL, pane },
    { timeout: ACTION_TIMEOUT },
  );
  invariant(
    await tab.getAttribute("aria-selected") === "true",
    `${pane} tab did not expose aria-selected=true`,
  );
  invariant(
    await paneLocator(page, pane).isVisible(),
    `${pane} pane is hidden`,
  );
}

async function assertNoPageOverflow(page: Page, label: string): Promise<void> {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      rootClient: root.clientWidth,
      rootScroll: root.scrollWidth,
      bodyClient: body.clientWidth,
      bodyScroll: body.scrollWidth,
      visiblePanes: [
        "palette",
        "canvas",
        "inspector",
      ].flatMap((pane) => {
        const element = document.getElementById(`discern-builder-pane-${pane}`);
        if (
          !(element instanceof HTMLElement) || element.offsetParent === null
        ) {
          return [];
        }
        const bounds = element.getBoundingClientRect();
        return [{ pane, left: bounds.left, right: bounds.right }];
      }),
    };
  });
  invariant(
    result.rootScroll <= result.rootClient + 1,
    `${label} document is ${result.rootScroll}px wide for ${result.rootClient}px`,
  );
  invariant(
    result.bodyScroll <= result.bodyClient + 1,
    `${label} body is ${result.bodyScroll}px wide for ${result.bodyClient}px`,
  );
  for (const pane of result.visiblePanes) {
    invariant(
      pane.left >= -1 && pane.right <= result.rootClient + 1,
      `${label} ${pane.pane} pane spans ${pane.left.toFixed(1)}–${
        pane.right.toFixed(1)
      }px outside the ${result.rootClient}px viewport`,
    );
  }
}

async function scanBuilderAccessibility(
  page: Page,
  label: string,
  failures: string[],
): Promise<void> {
  try {
    const results = await new AxeBuilder({ page })
      .include(BUILDER_SHELL)
      .withTags([...WCAG_TAGS])
      .analyze();
    for (const violation of results.violations) {
      failures.push(
        `Builder axe ${label}: ${violation.id} (${
          violation.impact ?? "unknown impact"
        }) at ${
          violation.nodes.map((node) => JSON.stringify(node.target)).join("; ")
        }`,
      );
    }
  } catch (error) {
    failures.push(`Builder axe ${label}: ${errorMessage(error)}`);
  }
}

async function verifyAdaptiveMatrix(
  page: Page,
  origin: string,
  failures: string[],
): Promise<AdaptiveSummary> {
  let cases = 0;
  let paneTransitions = 0;
  let axeScans = 0;
  for (const adaptive of ADAPTIVE_CASES) {
    for (const theme of THEMES) {
      await withViewport(page, adaptive.viewport, async () => {
        const label = `${theme}/${adaptive.label}`;
        const completed = await attempt(
          failures,
          `adaptive ${label}`,
          false,
          async () => {
            await loadBuilderPage(page, origin);
            await useTheme(page, theme);
            await assertNoPageOverflow(page, label);
            const tabs = page.getByRole("tablist", { name: "Workspace panes" });
            if (!adaptive.constrained) {
              invariant(
                !await tabs.isVisible(),
                `${label} exposes redundant pane tabs`,
              );
              for (const pane of PANES) {
                invariant(
                  await paneLocator(page, pane).isVisible(),
                  `${label} hides the ${pane} pane at wide desktop`,
                );
              }
              await scanBuilderAccessibility(page, label, failures);
              axeScans += 1;
            } else {
              invariant(
                await tabs.isVisible(),
                `${label} has no pane navigation`,
              );
              for (const pane of PANES) {
                const transitioned = await attempt(
                  failures,
                  `adaptive ${label}/${pane}`,
                  false,
                  async () => {
                    await activatePane(page, pane);
                    const visible = await Promise.all(
                      PANES.map((candidate) =>
                        paneLocator(page, candidate).isVisible()
                      ),
                    );
                    invariant(
                      visible.filter(Boolean).length === 1 &&
                        visible[PANES.indexOf(pane)] === true,
                      `${label}/${pane} does not expose exactly one truthful pane`,
                    );
                    await assertNoPageOverflow(page, `${label}/${pane}`);
                    await scanBuilderAccessibility(
                      page,
                      `${label}/${pane}`,
                      failures,
                    );
                    axeScans += 1;
                    return true;
                  },
                );
                paneTransitions += Number(transitioned);
              }
            }
            return true;
          },
        );
        cases += Number(completed);
      });
    }
  }
  return { cases, paneTransitions, axeScans };
}

async function findOutlineRow(page: Page, label: string): Promise<Locator> {
  const rows = page.locator(OUTLINE_ROW);
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    if ((await row.textContent())?.trim() === label) return row;
  }
  throw new Error(`Outline has no exact ${JSON.stringify(label)} row`);
}

async function outlineLabels(page: Page): Promise<readonly string[]> {
  return await page.locator(OUTLINE_ROW).evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "")
  );
}

async function placeNamedComponent(page: Page, name: string): Promise<void> {
  await activatePane(page, "palette");
  const search = page.getByRole("searchbox", { name: "Search components" });
  await search.fill(name);
  await page.getByRole("button", { name: `Place ${name}`, exact: true }).click({
    timeout: ACTION_TIMEOUT,
  });
  await page.waitForFunction(
    ({ selector, name }) =>
      [...document.querySelectorAll(selector)].some((element) =>
        element.textContent?.trim() === name
      ),
    { selector: OUTLINE_ROW, name },
    { timeout: ACTION_TIMEOUT },
  );
}

async function selectComposition(page: Page): Promise<void> {
  const breadcrumb = page.getByRole("navigation", { name: "Selection path" });
  if (await breadcrumb.count()) {
    await breadcrumb.getByRole("button", {
      name: "Composition",
      exact: true,
    }).click({ timeout: ACTION_TIMEOUT });
  }
  await activatePane(page, "inspector");
  await page.getByRole("heading", { name: "Composition", exact: true }).waitFor(
    {
      timeout: ACTION_TIMEOUT,
    },
  );
}

async function documentWitness(page: Page): Promise<string> {
  const history = page.getByRole("group", { name: "History" });
  return JSON.stringify({
    name: await page.getByRole("textbox", { name: "Composition name" })
      .inputValue(),
    outline: await page.locator(OUTLINE_ROW).evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.closest("[data-discern-builder-outline-id]")?.getAttribute(
          "data-discern-builder-outline-id",
        ),
        text: node.textContent?.trim() ?? "",
      }))
    ),
    canvas: await page.locator(CANVAS_PAGE).innerText(),
    selection: await page.locator(`${OUTLINE_ITEM} [aria-current="true"]`)
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          node.closest("[data-discern-builder-outline-id]")?.getAttribute(
            "data-discern-builder-outline-id",
          ) ?? ""
        )
      ),
    undoDisabled: await history.getByRole("button", { name: /Undo/ })
      .isDisabled(),
    redoDisabled: await history.getByRole("button", { name: /Redo/ })
      .isDisabled(),
  });
}

async function verifyMalformedRetry(page: Page): Promise<number> {
  await selectComposition(page);
  const input = page.locator(
    '#discern-builder-pane-inspector input[type="file"]',
  );
  const before = await documentWitness(page);
  const dialogs: string[] = [];
  const onDialog = async (dialog: Dialog): Promise<void> => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  };
  page.on("dialog", onDialog);
  try {
    const payload = {
      name: "malformed-composition.json",
      mimeType: "application/json",
      buffer: Buffer.from("{not valid json"),
    };
    await input.setInputFiles(payload);
    const firstAlert = page.getByRole("alert").last();
    await firstAlert.waitFor({ timeout: ACTION_TIMEOUT });
    const firstHandle = await firstAlert.elementHandle();
    invariant(firstHandle !== null, "malformed load alert has no DOM handle");
    invariant(
      await documentWitness(page) === before,
      "malformed load changed the document",
    );
    await input.setInputFiles(payload);
    await page.waitForFunction(
      (element) => element === null || !element.isConnected,
      firstHandle,
      { timeout: ACTION_TIMEOUT },
    );
    invariant(
      await documentWitness(page) === before,
      "same-file malformed retry changed the document",
    );
    invariant(dialogs.length === 0, "malformed load used a blocking dialog");
    return 2;
  } finally {
    page.off("dialog", onDialog);
  }
}

async function verifySaveFile(page: Page): Promise<number> {
  await selectComposition(page);
  await page.evaluate(() => {
    const evidence = {
      created: [] as string[],
      revoked: [] as string[],
      downloads: [] as { readonly href: string; readonly name: string }[],
    };
    Object.defineProperty(globalThis, "__discernBuilderDownloadEvidence", {
      configurable: true,
      value: evidence,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => {
        const url = `blob:builder-conformance-${
          String(evidence.created.length)
        }`;
        evidence.created.push(url);
        return url;
      },
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: (url: string) => evidence.revoked.push(url),
    });
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value(this: HTMLAnchorElement) {
        evidence.downloads.push({ href: this.href, name: this.download });
      },
    });
  });
  await page.getByRole("button", { name: "Save file", exact: true }).click();
  await page.waitForFunction(() => {
    const scope = globalThis as typeof globalThis & {
      __discernBuilderDownloadEvidence?: {
        readonly revoked: readonly string[];
      };
    };
    return scope.__discernBuilderDownloadEvidence?.revoked.length === 1;
  });
  const evidence = await page.evaluate(() => {
    const scope = globalThis as typeof globalThis & {
      __discernBuilderDownloadEvidence?: {
        readonly created: readonly string[];
        readonly revoked: readonly string[];
        readonly downloads: readonly {
          readonly href: string;
          readonly name: string;
        }[];
      };
    };
    return scope.__discernBuilderDownloadEvidence;
  });
  invariant(evidence !== undefined, "save-file evidence was not recorded");
  invariant(
    evidence.created.length === 1 &&
      evidence.revoked.length === 1 &&
      evidence.created[0] === evidence.revoked[0],
    `save-file object URL lifecycle was ${JSON.stringify(evidence)}`,
  );
  invariant(
    evidence.downloads.length === 1 &&
      evidence.downloads[0]?.name === "untitled-page.json",
    `save-file name was ${JSON.stringify(evidence.downloads)}`,
  );
  invariant(
    await page.getByRole("status").filter({
      hasText: "Saved the composition file",
    }).count() === 1,
    "save-file completion was not announced",
  );
  return 3;
}

async function verifySuccessfulLoad(page: Page): Promise<number> {
  await selectComposition(page);
  const input = page.locator(
    '#discern-builder-pane-inspector input[type="file"]',
  );
  await input.setInputFiles({
    name: "browser-loaded.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      version: 1,
      name: "Loaded by browser proof",
      children: [],
    })),
  });
  await page.getByRole("status").filter({
    hasText: "Loaded browser-loaded.json",
  }).waitFor({ timeout: ACTION_TIMEOUT });
  invariant(
    await page.getByRole("textbox", { name: "Composition name" })
      .inputValue() ===
      "Loaded by browser proof",
    "successful file load did not replace the document",
  );
  invariant(
    await page.locator(OUTLINE_ROW).count() === 0,
    "successful empty file load retained previous children",
  );
  return 3;
}

async function verifyAuthoringJourney(
  page: Page,
  origin: string,
): Promise<number> {
  return await withViewport(page, NARROW_VIEWPORT, async () => {
    await loadBuilderPage(page, origin);
    await placeNamedComponent(page, "Heading");
    let checks = 1;
    const placement = page.getByRole("status").filter({
      hasText: "Placed Heading",
    });
    invariant(
      await placement.count() === 1,
      "Heading placement was not announced",
    );
    checks += 1;

    await selectComposition(page);
    await placeNamedComponent(page, "Paragraph");
    const initialLabels = await outlineLabels(page);
    invariant(
      initialLabels.indexOf("Heading") >= 0 &&
        initialLabels.indexOf("Heading") < initialLabels.indexOf("Paragraph"),
      `Unexpected initial outline order: ${initialLabels.join(" → ")}`,
    );
    checks += 1;

    await activatePane(page, "inspector");
    await (await findOutlineRow(page, "Heading")).click();
    const headingIndex = (await outlineLabels(page)).indexOf("Heading");
    invariant(headingIndex >= 0, "Heading disappeared from the outline");
    const headingText = page.locator(OUTLINE_ROW).nth(headingIndex + 1);
    await headingText.click();
    const content = page.getByRole("textbox", { name: "Content" });
    const previousText = await content.inputValue();
    await content.fill("Browser proof heading");
    invariant(
      (await page.locator(CANVAS_PAGE).innerText()).includes(
        "Browser proof heading",
      ),
      "Inspector text edit did not reach the canvas",
    );
    checks += 1;

    await page.getByRole("button", { name: /Undo/ }).click();
    invariant(
      !(await page.locator(CANVAS_PAGE).innerText()).includes(
        "Browser proof heading",
      ) && (await page.locator(CANVAS_PAGE).innerText()).includes(previousText),
      "Undo did not restore the prior text",
    );
    await page.getByRole("button", { name: /Redo/ }).click();
    invariant(
      (await page.locator(CANVAS_PAGE).innerText()).includes(
        "Browser proof heading",
      ),
      "Redo did not restore the edited text",
    );
    checks += 2;

    await (await findOutlineRow(page, "Heading")).click();
    await page.getByRole("button", {
      name: "Move Heading down",
      exact: true,
    }).click();
    const movedLabels = await outlineLabels(page);
    invariant(
      movedLabels.indexOf("Heading") > movedLabels.indexOf("Paragraph"),
      `Move down did not reorder roots: ${movedLabels.join(" → ")}`,
    );
    checks += 1;
    await activatePane(page, "palette");
    invariant(
      await page.getByRole("searchbox", { name: "Search components" })
        .inputValue() === "Paragraph",
      "pane transition lost the palette search state",
    );
    await activatePane(page, "inspector");
    invariant(
      await page.getByRole("heading", { name: "Heading", exact: true })
        .isVisible(),
      "pane transition lost the selected inspector state",
    );
    checks += 2;

    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Deleted Heading" })
      .waitFor({ timeout: ACTION_TIMEOUT });
    invariant(
      !(await outlineLabels(page)).includes("Heading"),
      "delete left the selected Heading in the outline",
    );
    await page.waitForFunction(
      (selector) => {
        const active = document.activeElement;
        return active instanceof HTMLElement &&
          active.matches(selector) &&
          active.textContent?.trim() === "Paragraph";
      },
      OUTLINE_ROW,
      { timeout: ACTION_TIMEOUT },
    );
    checks += 3;

    checks += await verifySaveFile(page);
    checks += await verifyMalformedRetry(page);
    checks += await verifySuccessfulLoad(page);
    return checks;
  });
}

async function focusState(page: Page): Promise<{
  readonly canvas: boolean;
  readonly focusVisible: boolean;
  readonly indicator: boolean;
  readonly description: string;
}> {
  return await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return {
        canvas: false,
        focusVisible: false,
        indicator: false,
        description: "no HTMLElement",
      };
    }
    const candidates = [
      active,
      active.nextElementSibling,
      active.parentElement,
      active.closest("label"),
    ].filter((candidate): candidate is Element => candidate instanceof Element);
    const indicator = candidates.some((candidate) => {
      const style = getComputedStyle(candidate);
      return (style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) >= 2) ||
        style.boxShadow !== "none";
    });
    return {
      canvas: active.closest("#discern-builder-pane-canvas") !== null &&
        active.id !== "discern-builder-pane-canvas",
      focusVisible: active.matches(":focus-visible"),
      indicator,
      description: active.outerHTML.replace(/\s+/g, " ").slice(0, 180),
    };
  });
}

async function verifyKeyboardTraversal(
  page: Page,
  label: string,
): Promise<KeyboardSummary> {
  const shell = page.locator(BUILDER_SHELL);
  const candidates = await visibleEnabledTargets(shell);
  await shell.evaluate((node) => {
    for (
      const [id, position] of [
        ["discern-builder-focus-before", "beforebegin"],
        ["discern-builder-focus-after", "afterend"],
      ] as const
    ) {
      const sentinel = document.createElement("button");
      sentinel.id = id;
      sentinel.type = "button";
      sentinel.textContent = `${id} sentinel`;
      sentinel.style.cssText =
        "position:fixed;inline-size:1px;block-size:1px;opacity:0;";
      node.insertAdjacentElement(position, sentinel);
    }
  });
  let stops = 0;
  let focusIndicators = 0;
  try {
    await page.locator("#discern-builder-focus-before").focus();
    const cap = candidates.length + 8;
    let escaped = false;
    for (let index = 0; index < cap; index += 1) {
      await page.keyboard.press("Tab");
      if (
        await page.locator("#discern-builder-focus-after").evaluate((node) =>
          node.ownerDocument.activeElement === node
        )
      ) {
        escaped = true;
        break;
      }
      const state = await focusState(page);
      invariant(
        !state.canvas,
        `${label} tabbed into canvas: ${state.description}`,
      );
      invariant(
        state.focusVisible,
        `${label} stop does not match :focus-visible: ${state.description}`,
      );
      invariant(
        state.indicator,
        `${label} stop has no visible focus indicator: ${state.description}`,
      );
      stops += 1;
      focusIndicators += 1;
    }
    invariant(escaped, `${label} keyboard traversal did not terminate`);
    const canvas = page.locator(CANVAS_PAGE);
    const canvasTargets = canvas.locator(FOCUSABLE_SELECTOR);
    invariant(
      await canvasTargets.count() > 0,
      `${label} canvas inertness check has no interactive witness`,
    );
    const exposed = await canvasTargets.evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        if (!(node instanceof HTMLElement)) return [];
        return node.tabIndex >= 0 && node.closest("[inert]") === null
          ? [node.outerHTML.replace(/\s+/g, " ").slice(0, 180)]
          : [];
      })
    );
    invariant(
      exposed.length === 0,
      `${label} canvas exposes sequential controls: ${exposed.join("; ")}`,
    );
    return { stops, focusIndicators };
  } finally {
    await page.locator(
      "#discern-builder-focus-before, #discern-builder-focus-after",
    ).evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  }
}

async function assertInteractiveShortcutIsolation(
  page: Page,
  target: Locator,
  label: string,
): Promise<number> {
  invariant(await target.isVisible(), `${label} shortcut witness is hidden`);
  const before = await documentWitness(page);
  await target.focus();
  await page.keyboard.press("Delete");
  invariant(
    await documentWitness(page) === before,
    `${label} Delete shortcut changed the document`,
  );
  await page.keyboard.press("Control+z");
  invariant(
    await documentWitness(page) === before,
    `${label} undo shortcut changed the document`,
  );
  return 2;
}

async function verifyShortcutIsolation(page: Page): Promise<number> {
  let checks = 0;
  await activatePane(page, "inspector");
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.locator(".discern-builder-brand"),
    "focused link",
  );
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByRole("button", { name: "Duplicate", exact: true }),
    "focused action button",
  );
  checks += await assertInteractiveShortcutIsolation(
    page,
    await findOutlineRow(page, "Button"),
    "focused outline button",
  );

  await activatePane(page, "palette");
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByRole("searchbox", { name: "Search components" }),
    "focused search field",
  );

  await selectComposition(page);
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByLabel("Load file", { exact: true }),
    "focused file control",
  );
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByText("Shipped components", { exact: true }),
    "focused disclosure",
  );
  return checks;
}

type ContextOptions = Parameters<Browser["newContext"]>[0];

async function withAuxiliaryPage<Result>(
  browser: Browser,
  failures: string[],
  options: ContextOptions,
  prepare: ((context: BrowserContext) => Promise<void>) | undefined,
  operation: (page: Page) => Promise<Result>,
): Promise<Result> {
  const context = await browser.newContext(options);
  try {
    await prepare?.(context);
    const page = await context.newPage();
    addPageFailureListeners(page, failures);
    return await operation(page);
  } finally {
    await context.close();
  }
}

async function verifyTouchWorkflow(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  return await withAuxiliaryPage(
    browser,
    failures,
    {
      viewport: NARROW_VIEWPORT,
      reducedMotion: "reduce",
      hasTouch: true,
    },
    undefined,
    async (page) => {
      await loadBuilderPage(page, origin);
      let checks = 0;
      for (const name of ["Heading", "Paragraph"] as const) {
        if (name === "Paragraph") {
          const composition = page.getByRole("navigation", {
            name: "Selection path",
          }).getByRole("button", { name: "Composition", exact: true });
          await composition.tap({ timeout: ACTION_TIMEOUT });
        }
        const paletteTab = page.getByRole("tab", {
          name: "Palette",
          exact: true,
        });
        await paletteTab.tap({ timeout: ACTION_TIMEOUT });
        await page.waitForFunction(
          (selector) =>
            document.querySelector(selector)?.getAttribute(
              "data-discern-builder-pane",
            ) === "palette",
          BUILDER_SHELL,
          { timeout: ACTION_TIMEOUT },
        );
        await page.getByRole("searchbox", { name: "Search components" })
          .fill(name);
        await page.getByRole("button", { name: `Place ${name}`, exact: true })
          .tap({ timeout: ACTION_TIMEOUT });
        await page.getByRole("status").filter({ hasText: `Placed ${name}` })
          .waitFor({ timeout: ACTION_TIMEOUT });
        checks += 1;
      }
      const initial = await outlineLabels(page);
      invariant(
        initial.indexOf("Heading") < initial.indexOf("Paragraph"),
        `touch placement order was ${initial.join(" → ")}`,
      );
      checks += 1;
      await (await findOutlineRow(page, "Heading")).tap({
        timeout: ACTION_TIMEOUT,
      });
      await page.getByRole("button", {
        name: "Move Heading down",
        exact: true,
      }).tap({ timeout: ACTION_TIMEOUT });
      const moved = await outlineLabels(page);
      invariant(
        moved.indexOf("Heading") > moved.indexOf("Paragraph"),
        `touch move order was ${moved.join(" → ")}`,
      );
      checks += 1;
      await assertNoPageOverflow(page, "touch/narrow");
      return checks + 1;
    },
  );
}

async function verifyCorruptStorage(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  const source = "{corrupt saved composition";
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    async (context) => {
      await context.addInitScript(
        ({ key, source }) => {
          if (!location.pathname.endsWith("/catalogue/builder/")) return;
          localStorage.setItem(key, source);
        },
        { key: BUILDER_STORAGE_KEYS.document, source },
      );
    },
    async (page) => {
      await loadBuilderPage(page, origin);
      const alert = page.getByRole("alert").filter({
        hasText: "could not be restored",
      });
      await alert.waitFor({ timeout: ACTION_TIMEOUT });
      await page.getByText("Rejected composition recovery source", {
        exact: true,
      }).first().click({ timeout: ACTION_TIMEOUT });
      invariant(
        await page.getByRole("textbox", {
          name: "Rejected composition recovery source",
        }).inputValue() === source,
        "corrupt source was not exposed for recovery",
      );
      invariant(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          BUILDER_STORAGE_KEYS.recovery,
        ) === source,
        "corrupt source was not preserved in recovery storage",
      );
      const name = page.getByRole("textbox", { name: "Composition name" });
      await name.fill("Recovered editing session");
      await name.press("Enter");
      invariant(
        await name.inputValue() === "Recovered editing session",
        "recovery fallback is not editable",
      );
    },
  );
}

async function verifyStorageReadDenial(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    async (context) => {
      await context.addInitScript((keys) => {
        if (!location.pathname.endsWith("/catalogue/builder/")) return;
        const original = Storage.prototype.getItem;
        Object.defineProperty(Storage.prototype, "getItem", {
          configurable: true,
          value(this: Storage, key: string): string | null {
            if ((keys as readonly string[]).includes(key)) {
              throw new DOMException("Storage denied", "SecurityError");
            }
            return original.call(this, key);
          },
        });
      }, STORAGE_KEYS);
    },
    async (page) => {
      await loadBuilderPage(page, origin);
      await page.getByRole("alert").filter({
        hasText: "storage is unavailable",
      })
        .waitFor({ timeout: ACTION_TIMEOUT });
      const name = page.getByRole("textbox", { name: "Composition name" });
      await name.fill("Still editable");
      await name.press("Enter");
      invariant(
        await name.inputValue() === "Still editable",
        "read denial disabled editing",
      );
      await useTheme(page, "dark");
      invariant(
        await page.locator(BUILDER_SHELL).getAttribute("data-discern-theme") ===
          "dark",
        "read denial prevented an in-memory theme change",
      );
    },
  );
}

async function verifyQuotaFailure(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    undefined,
    async (page) => {
      await loadBuilderPage(page, origin);
      await page.evaluate((keys) => {
        const original = Storage.prototype.setItem;
        let writes = 0;
        Object.defineProperty(globalThis, "__discernBuilderQuotaWrites", {
          configurable: true,
          get: () => writes,
        });
        Object.defineProperty(Storage.prototype, "setItem", {
          configurable: true,
          value(this: Storage, key: string, value: string): void {
            if ((keys as readonly string[]).includes(key)) {
              writes += 1;
              throw new DOMException("Quota exceeded", "QuotaExceededError");
            }
            original.call(this, key, value);
          },
        });
      }, STORAGE_KEYS);
      await placeNamedComponent(page, "Heading");
      await page.getByRole("alert").filter({ hasText: "could not save" })
        .waitFor({
          timeout: ACTION_TIMEOUT,
        });
      invariant(
        await (await findOutlineRow(page, "Heading")).isVisible(),
        "quota failure lost the edit",
      );
      const writes = await page.evaluate(() =>
        (globalThis as typeof globalThis & {
          __discernBuilderQuotaWrites?: number;
        }).__discernBuilderQuotaWrites ?? 0
      );
      await page.waitForTimeout(150);
      const laterWrites = await page.evaluate(() =>
        (globalThis as typeof globalThis & {
          __discernBuilderQuotaWrites?: number;
        }).__discernBuilderQuotaWrites ?? 0
      );
      invariant(
        writes === 1 && laterWrites === writes,
        `quota circuit attempted ${writes} then ${laterWrites} writes`,
      );
    },
  );
}

async function verifyFileReadFailure(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    async (context) => {
      await context.addInitScript(() => {
        if (!location.pathname.endsWith("/catalogue/builder/")) return;
        Object.defineProperty(File.prototype, "text", {
          configurable: true,
          value: () =>
            Promise.reject(new DOMException("Read failed", "NotReadableError")),
        });
      });
    },
    async (page) => {
      await loadBuilderPage(page, origin);
      await placeNamedComponent(page, "Heading");
      await selectComposition(page);
      const before = await documentWitness(page);
      const input = page.locator(
        '#discern-builder-pane-inspector input[type="file"]',
      );
      const payload = {
        name: "unreadable.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":1,"name":"Unreadable","children":[]}'),
      };
      await input.setInputFiles(payload);
      const first = page.getByRole("alert").filter({
        hasText: "could not be read",
      });
      await first.waitFor({ timeout: ACTION_TIMEOUT });
      const firstHandle = await first.elementHandle();
      invariant(firstHandle !== null, "file-read alert has no DOM handle");
      invariant(
        await documentWitness(page) === before,
        "file read rejection changed the document",
      );
      await input.setInputFiles(payload);
      await page.waitForFunction(
        (element) => element === null || !element.isConnected,
        firstHandle,
        { timeout: ACTION_TIMEOUT },
      );
      invariant(
        await documentWitness(page) === before,
        "file read retry changed the document",
      );
    },
  );
}

async function verifyContainedFailures(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  const scenarios = [
    ["corrupt storage", verifyCorruptStorage],
    ["storage read denial", verifyStorageReadDenial],
    ["storage quota", verifyQuotaFailure],
    ["file read rejection", verifyFileReadFailure],
  ] as const;
  let passed = 0;
  for (const [label, scenario] of scenarios) {
    passed += Number(
      await attempt(failures, label, false, async () => {
        await scenario(browser, origin, failures);
        return true;
      }),
    );
  }
  return passed;
}

async function verifyForcedColours(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  return await withAuxiliaryPage(
    browser,
    failures,
    {
      viewport: NARROW_VIEWPORT,
      reducedMotion: "reduce",
      forcedColors: "active",
    },
    undefined,
    async (page) => {
      await loadBuilderPage(page, origin);
      await placeNamedComponent(page, "Button");
      await activatePane(page, "palette");
      const result = await verifyKeyboardTraversal(page, "forced colours");
      return result.focusIndicators;
    },
  );
}

async function captureBuilderScreenshots(
  page: Page,
  origin: string,
  outputRoot: URL,
): Promise<readonly string[]> {
  await Deno.mkdir(outputRoot, { recursive: true });
  const screenshots: string[] = [];
  for (
    const [name, viewport, theme, pane] of [
      ["builder-light-wide.png", WIDE_VIEWPORT, "light", undefined],
      ["builder-dark-narrow.png", NARROW_VIEWPORT, "dark", "inspector"],
    ] as const
  ) {
    await withViewport(page, viewport, async () => {
      await loadBuilderPage(page, origin);
      await useTheme(page, theme);
      if (pane !== undefined) await activatePane(page, pane);
      const path = fromFileUrl(new URL(name, outputRoot));
      await page.screenshot({
        path,
        fullPage: true,
        animations: "disabled",
      });
      screenshots.push(path);
    });
  }
  return screenshots;
}

/** Exercise the interface builder through the existing browser-gate lifecycle. */
export async function runBuilderConformance(
  options: BuilderConformanceOptions,
): Promise<BuilderConformanceSummary> {
  await attempt(options.failures, "storage reset", undefined, async () => {
    await resetBuilderStorage(options.page, options.origin);
  });
  const adaptive = await verifyAdaptiveMatrix(
    options.page,
    options.origin,
    options.failures,
  );
  const authoringChecks = await attempt(
    options.failures,
    "390px authoring journey",
    0,
    () => verifyAuthoringJourney(options.page, options.origin),
  );
  await attempt(
    options.failures,
    "interactive canvas witness",
    undefined,
    async () => {
      await withViewport(options.page, NARROW_VIEWPORT, async () => {
        await placeNamedComponent(options.page, "Button");
      });
    },
  );
  const shortcutIsolationChecks = await attempt(
    options.failures,
    "interactive shortcut isolation",
    0,
    () => verifyShortcutIsolation(options.page),
  );
  const keyboard = await attempt(
    options.failures,
    "keyboard traversal",
    { stops: 0, focusIndicators: 0 },
    async () =>
      await withViewport(options.page, WIDE_VIEWPORT, async () => {
        await loadBuilderPage(options.page, options.origin);
        return await verifyKeyboardTraversal(options.page, "wide builder");
      }),
  );
  const containedFailures = await verifyContainedFailures(
    options.browser,
    options.origin,
    options.failures,
  );
  const touchChecks = await attempt(
    options.failures,
    "touch workflow",
    0,
    () =>
      verifyTouchWorkflow(options.browser, options.origin, options.failures),
  );
  const forcedColourFocusChecks = await attempt(
    options.failures,
    "forced-colour focus",
    0,
    () =>
      verifyForcedColours(options.browser, options.origin, options.failures),
  );
  const screenshots = await attempt(
    options.failures,
    "review screenshots",
    [] as readonly string[],
    () =>
      captureBuilderScreenshots(
        options.page,
        options.origin,
        options.outputRoot,
      ),
  );

  return {
    adaptiveCases: adaptive.cases,
    paneTransitions: adaptive.paneTransitions,
    axeScans: adaptive.axeScans,
    keyboardStops: keyboard.stops,
    authoringChecks,
    shortcutIsolationChecks,
    touchChecks,
    containedFailures,
    forcedColourFocusChecks,
    screenshots,
  };
}
