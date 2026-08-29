import { fromFileUrl } from "@std/path";
import type { Browser, Page } from "playwright-core";
import { BUILDER_STORAGE_KEYS } from "../../../catalogue/builder/persistence.ts";
import { withViewport } from "../../viewport.ts";
import { placeNamedComponent } from "./discovery.ts";
import {
  verifyMalformedRetry,
  verifySaveFile,
  verifyStructuredEditing,
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
  OUTLINE_ITEM,
  OUTLINE_ROW,
  resetBuilderStorage,
  useScopedTheme,
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

async function outlineItem(page: Page, label: string) {
  const row = await findOutlineRow(page, label);
  const id = await row.evaluate((element) =>
    element.closest("[data-discern-builder-outline-id]")?.getAttribute(
      "data-discern-builder-outline-id",
    )
  );
  invariant(id !== null && id !== undefined, `${label} has no stable layer id`);
  return page.locator(`[data-discern-builder-outline-id="${id}"]`);
}

/** Compose the shared discovery, placement, preview, and export authorities. */
export async function verifyIntegratedCompositionJourney(
  page: Page,
  origin: string,
): Promise<number> {
  return await withViewport(page, WIDE_VIEWPORT, async () => {
    await resetBuilderStorage(page, origin);
    await loadBuilderPage(page, origin);
    let checks = 0;
    invariant(
      await page.locator(OUTLINE_ROW).count() === 0,
      "clean integrated journey did not start from a blank composition",
    );
    checks += 1;

    const categories = page.getByRole("navigation", {
      name: "Discovery categories",
    });
    await categories.getByRole("button", { name: "Starters", exact: true })
      .click();
    const landingEntry = page.locator(
      '[data-discern-builder-directory-entry="builder-starter:landing-page"]',
    );
    const landing = landingEntry.getByRole("button", {
      name: "Start with Landing page",
      exact: true,
    });
    invariant(
      await landingEntry.getAttribute("data-discern-builder-entry-kind") ===
          "starter" &&
        (await landingEntry.innerText()).includes("Components") &&
        (await landing.locator("img").getAttribute("src"))?.includes(
            "/catalogue/generated/example-images/",
          ) === true,
      "Landing starter did not identify editable multi-Component data with generated imagery",
    );
    await landing.click();
    await (await findOutlineRow(page, "Hero block")).waitFor({
      timeout: ACTION_TIMEOUT,
    });
    const roots = await page.locator(`${OUTLINE_ITEM}[aria-level="1"]`)
      .evaluateAll(
        (items) =>
          items.map((item) =>
            item.querySelector(".discern-builder-layers__select")
              ?.textContent?.trim() ?? ""
          ),
      );
    invariant(
      roots.slice(0, 3).join("|") ===
        "Hero block|Feature bento|CTA band",
      `Landing starter projected unexpected sections: ${roots.join(" → ")}`,
    );
    checks += 2;

    await categories.getByRole("button", { name: "Components", exact: true })
      .click();
    await page.locator("#discern-builder-layers-end").click();
    const search = page.getByRole("searchbox", { name: "Search components" });
    await search.fill("call to action");
    const ctaEntry = page.locator(
      '[data-discern-builder-directory-entry="builder-component:cta-band"]',
    );
    invariant(
      await page.locator(
            "[data-discern-builder-search-results] [data-discern-builder-directory-entry]",
          ).first().getAttribute("data-discern-builder-directory-entry") ===
          "builder-component:cta-band" &&
        (await ctaEntry.innerText()).includes("Name matches “cta”"),
      "call to action did not preserve shared CTA ranking and match reason",
    );
    const favourite = ctaEntry.getByRole("button", {
      name: "Add CTA band to favourites",
      exact: true,
    });
    await favourite.click();
    invariant(
      await ctaEntry.locator(".discern-builder-card__favourite").getAttribute(
        "aria-pressed",
      ) === "true",
      "CTA favourite did not remain visible before placement",
    );
    await ctaEntry.getByRole("button", {
      name: "Place CTA band",
      exact: true,
    }).click();
    await page.getByRole("status").filter({ hasText: "Placed CTA band" })
      .waitFor({ timeout: ACTION_TIMEOUT });
    invariant(
      (await outlineLabels(page)).filter((label) => label === "CTA band")
        .length === 2,
      "visible end cursor did not place the second CTA band in Layers",
    );
    checks += 3;

    await page.getByRole("button", { name: "Cancel placement", exact: true })
      .click();
    await page.locator(".discern-builder-purpose select").selectOption(
      "marketing-site",
    );
    const hero = await outlineItem(page, "Hero block");
    await hero.getByRole("button", { name: "Actions", exact: true }).click();
    await search.fill("Button");
    const buttonEntry = page.locator(
      '[data-discern-builder-directory-entry="builder-component:button"]',
    ).first();
    invariant(
      (await page.locator(".discern-builder-filter-note").innerText()).includes(
        "Marketing site is paused",
      ) &&
        (await buttonEntry.innerText()).includes("Fits target"),
      "Hero Actions did not suspend Marketing-site filtering for compatible Button discovery",
    );
    await buttonEntry.getByRole("button", {
      name: "Place Button",
      exact: true,
    }).click();
    const heroActions = page.locator(`${OUTLINE_ITEM}[aria-level="2"]`).filter({
      has: page.locator(".discern-builder-layers__select", {
        hasText: "Button",
      }),
    }).filter({ hasText: "Actions" });
    const heroActionLabels = await heroActions.allInnerTexts();
    invariant(
      await heroActions.count() >= 2 &&
        heroActionLabels.every((label) =>
          label.includes("Actions") && label.includes("Button")
        ),
      `Button did not join Hero's human-labelled Actions slot: ${
        heroActionLabels.join(" | ")
      }`,
    );
    checks += 2;

    await page.getByRole("button", { name: "Cancel placement", exact: true })
      .click();
    await page.locator("#discern-builder-layers-end").click();
    await search.fill("Tabs");
    await page.getByRole("button", { name: "Place Tabs", exact: true })
      .click();
    const tabsInspector = page.locator("#discern-builder-pane-inspector");
    const rows = tabsInspector.locator(".discern-builder-object__row");
    invariant(
      await rows.count() === 2,
      "integrated Tabs did not start with two meaningful seeded items",
    );
    const first = rows.nth(0);
    await first.locator("summary").click();
    await first.locator(
      '[data-discern-builder-object-member="value"] input',
    ).fill("overview");
    await first.locator(
      '[data-discern-builder-object-member="label"] input',
    ).fill("Overview");
    await first.locator(
      '[data-discern-builder-object-member="content"] input',
    ).fill("Summary");
    const second = rows.nth(1);
    await second.locator("summary").click();
    await second.locator(
      '[data-discern-builder-object-member="value"] input',
    ).fill("details");
    await second.locator(
      '[data-discern-builder-object-member="label"] input',
    ).fill("Details");
    await second.locator(
      '[data-discern-builder-object-member="content"] input',
    ).fill("Detailed content");
    await second.getByRole("button", { name: "Move TabItem 2 up" }).click();
    invariant(
      (await rows.first().locator("summary").innerText()).includes("Details"),
      "seeded Tabs row editing and reorder did not compose",
    );
    checks += 2;

    await page.getByRole("button", { name: "Interact", exact: true }).click();
    const preview = page.frameLocator(
      "iframe[data-discern-builder-preview-frame]",
    );
    await preview.getByRole("tab", { name: "Details", exact: true }).click();
    await page.getByRole("list", { name: "Preview event log" }).getByText(
      'onValueChange("details")',
    ).waitFor({ timeout: ACTION_TIMEOUT });
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const tabs = await outlineItem(page, "Tabs");
    invariant(
      await tabs.getAttribute("aria-selected") === "true" &&
        await tabs.locator(".discern-builder-layers__select")
            .getAttribute("aria-current") === "true",
      "Edit did not restore the Tabs selection after real interaction",
    );
    await selectComposition(page);
    const exportHeadings = await tabsInspector.getByRole("heading", {
      name: "Export",
      exact: true,
    }).count();
    const readyMessages = await tabsInspector.getByText(
      "Ready from the currently accepted composition.",
      { exact: true },
    ).count();
    const tsx = await tabsInspector.locator(".discern-code-listing").first()
      .innerText();
    invariant(
      exportHeadings === 1 && readyMessages === 1 && tsx.includes("Tabs"),
      `composed journey preflight/export was headings=${
        String(exportHeadings)
      }, ready=${String(readyMessages)}, source=${
        JSON.stringify(tsx.slice(0, 180))
      }`,
    );
    await tabs.locator(".discern-builder-layers__select").click();
    checks += 3;
    return checks;
  });
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

    checks += await verifyStructuredEditing(page);
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
  const capture = async (name: string): Promise<void> => {
    const path = fromFileUrl(new URL(name, outputRoot));
    await page.screenshot({
      path,
      fullPage: true,
      animations: "disabled",
    });
    screenshots.push(path);
  };

  await verifyIntegratedCompositionJourney(page, origin);
  await useTheme(page, "light");
  await capture("builder-light-wide.png");

  await page.getByLabel("Preview width").selectOption("phone");
  await page.getByRole("button", { name: "Fit preview" }).click();
  await useScopedTheme(page, "Preview", "dark");
  await page.waitForFunction(() =>
    document.querySelector<HTMLIFrameElement>(
      "iframe[data-discern-builder-preview-frame]",
    )?.contentWindow?.innerWidth === 390
  );
  await capture("builder-responsive-390.png");

  await page.getByLabel("Preview width").selectOption("tablet");
  await page.getByRole("button", { name: "Interact", exact: true }).click();
  const preview = page.frameLocator(
    "iframe[data-discern-builder-preview-frame]",
  );
  const tabs = preview.getByRole("tablist");
  await tabs.getByRole("tab", { name: "Overview", exact: true }).click();
  await tabs.getByRole("tab", { name: "Details", exact: true }).click();
  await page.getByRole("list", { name: "Preview event log" }).getByText(
    'onValueChange("details")',
  ).waitFor({ timeout: ACTION_TIMEOUT });
  await capture("builder-interactive-events.png");
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const nestedButton = page.locator(`${OUTLINE_ITEM}[aria-level="2"]`)
    .filter({ hasText: "Actions" }).filter({ hasText: "Button" }).first();
  await nestedButton.locator(".discern-builder-layers__select").click();
  await nestedButton.getByRole("button", { name: "Content", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Search components" }).fill(
    "Button",
  );
  await page.getByRole("button", { name: "Place Button", exact: true })
    .click();
  await page.locator(".discern-builder-layers__refusal").waitFor({
    timeout: ACTION_TIMEOUT,
  });
  await capture("builder-invalid-placement.png");

  const acceptedSource = await page.evaluate(
    (key) => localStorage.getItem(key),
    BUILDER_STORAGE_KEYS.document,
  );
  invariant(acceptedSource !== null, "review composition was not persisted");
  await page.evaluate(
    ({ key, source }) => localStorage.setItem(key, source),
    {
      key: BUILDER_STORAGE_KEYS.document,
      source: "{review recovery source",
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(BUILDER_SHELL).waitFor({ timeout: ACTION_TIMEOUT });
  await page.getByRole("alert").filter({ hasText: "could not be restored" })
    .waitFor({ timeout: ACTION_TIMEOUT });
  await page.getByText("Rejected composition recovery source", {
    exact: true,
  }).click();
  await capture("builder-recovery.png");

  await page.evaluate(
    ({ documentKey, recoveryKey, source }) => {
      localStorage.setItem(documentKey, source);
      localStorage.removeItem(recoveryKey);
    },
    {
      documentKey: BUILDER_STORAGE_KEYS.document,
      recoveryKey: BUILDER_STORAGE_KEYS.recovery,
      source: acceptedSource,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(BUILDER_SHELL).waitFor({ timeout: ACTION_TIMEOUT });
  await selectComposition(page);
  await page.locator(".discern-builder-export").scrollIntoViewIfNeeded();
  await capture("builder-export.png");

  await withViewport(page, NARROW_VIEWPORT, async () => {
    await loadBuilderPage(page, origin);
    await useTheme(page, "dark");
    await activatePane(page, "inspector");
    await capture("builder-dark-narrow.png");
  });
  return screenshots;
}
