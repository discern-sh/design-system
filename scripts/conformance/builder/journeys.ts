import { fromFileUrl } from "@std/path";
import type { Browser, Page } from "playwright-core";
import { withViewport } from "../../viewport.ts";
import { placeNamedComponent } from "./discovery.ts";
import {
  verifyMalformedRetry,
  verifySaveFile,
  verifySuccessfulLoad,
} from "./inspector.ts";
import { findOutlineRow, outlineLabels, selectComposition } from "./tree.ts";
import {
  ACTION_TIMEOUT,
  activatePane,
  assertNoPageOverflow,
  BUILDER_SHELL,
  invariant,
  loadBuilderPage,
  NARROW_VIEWPORT,
  OUTLINE_ROW,
  useTheme,
  WIDE_VIEWPORT,
  withAuxiliaryPage,
} from "./support.ts";

async function previewText(page: Page): Promise<string> {
  return await page
    .frameLocator("iframe[data-discern-builder-preview-frame]")
    .locator(".discern-builder-frame-document")
    .innerText();
}

async function waitForPreviewText(
  page: Page,
  includes: string,
  excludes?: string,
): Promise<string> {
  await page.waitForFunction(
    ({ includes, excludes }) => {
      const iframe = document.querySelector<HTMLIFrameElement>(
        "iframe[data-discern-builder-preview-frame]",
      );
      const value = iframe?.contentDocument?.querySelector(
        ".discern-builder-frame-document",
      )?.textContent ?? "";
      return value.includes(includes) &&
        (excludes === undefined || !value.includes(excludes));
    },
    { includes, excludes },
    { timeout: ACTION_TIMEOUT },
  );
  return await previewText(page);
}

export async function verifyAuthoringJourney(
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
      (await waitForPreviewText(page, "Browser proof heading")).includes(
        "Browser proof heading",
      ),
      "Inspector text edit did not reach the canvas",
    );
    checks += 1;

    await page.getByRole("button", { name: /Undo/ }).click();
    const undonePreviewText = await waitForPreviewText(
      page,
      previousText,
      "Browser proof heading",
    );
    invariant(
      !undonePreviewText.includes("Browser proof heading") &&
        undonePreviewText.includes(previousText),
      "Undo did not restore the prior text",
    );
    await page.getByRole("button", { name: /Redo/ }).click();
    invariant(
      (await waitForPreviewText(page, "Browser proof heading")).includes(
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

export async function verifyTouchWorkflow(
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

export async function captureBuilderScreenshots(
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
