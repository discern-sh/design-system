import type { Page } from "playwright-core";
import {
  ACTION_TIMEOUT,
  activatePane,
  invariant,
  OUTLINE_ROW,
} from "./support.ts";

const checkedDiscoveryPages = new WeakSet<Page>();

export interface BuilderDiscoveryBrowserMeasurements {
  readonly componentCount: number;
  readonly initialMilliseconds: number;
  readonly searchMilliseconds: number;
  readonly scrollMilliseconds: number;
}

/**
 * Exercise the generated-image directory as a population. The ordinary
 * placement helper calls this once for every browser page that reaches the
 * palette, so future conformance journeys inherit the discovery guard.
 */
export async function verifyDiscoverySurface(
  page: Page,
): Promise<BuilderDiscoveryBrowserMeasurements> {
  await activatePane(page, "palette");
  const palette = page.locator("#discern-builder-pane-palette");
  const density = page.getByRole("group", { name: "Palette density" });
  const search = page.getByRole("searchbox", { name: "Search components" });

  await density.getByRole("button", { name: "Visual", exact: true }).click();
  await search.fill("");
  for (
    const toggle of await palette.locator(
      "[data-discern-builder-component-group] h3 > button[aria-expanded=false]",
    ).all()
  ) {
    await toggle.click();
  }

  const directory = palette.locator(
    "[data-discern-builder-component-group] [data-discern-builder-directory-entry]",
  );
  const componentCount = await directory.count();
  invariant(componentCount > 0, "Builder Component directory is empty");
  const structure = await directory.evaluateAll((entries) =>
    entries.map((entry) => {
      const add = entry.querySelector<HTMLButtonElement>(
        ".discern-builder-card__add",
      );
      const image = entry.querySelector<HTMLImageElement>("img");
      const favourite = entry.querySelector<HTMLButtonElement>(
        ".discern-builder-card__favourite",
      );
      return {
        addOwnsImage: image?.closest("button") === add,
        generated: image?.getAttribute("src")?.includes(
          "/catalogue/generated/example-images/",
        ) ?? false,
        intrinsic: Number(image?.getAttribute("width")) > 0 &&
          Number(image?.getAttribute("height")) > 0,
        nestedInteractive: favourite?.closest("button") === add,
      };
    })
  );
  invariant(
    structure.every((entry) =>
      entry.addOwnsImage && entry.generated && entry.intrinsic &&
      !entry.nestedInteractive
    ),
    "Builder directory regressed from whole-card generated image actions",
  );

  const visualImageCount = await directory.locator("img").count();
  invariant(
    visualImageCount === componentCount,
    `Visual density rendered ${visualImageCount}/${componentCount} images`,
  );
  await density.getByRole("button", { name: "Compact", exact: true }).click();
  invariant(
    await directory.locator("img").count() === 0,
    "Compact density retained visual previews",
  );
  invariant(
    await directory.locator("strong").count() === componentCount,
    "Compact density discarded Component names",
  );
  await density.getByRole("button", { name: "Visual", exact: true }).click();

  const firstGroup = palette.locator(
    "[data-discern-builder-component-group] h3 > button",
  ).first();
  await firstGroup.click();
  invariant(
    await firstGroup.getAttribute("aria-expanded") === "false",
    "Component Group did not collapse",
  );
  await firstGroup.focus();
  await page.keyboard.press("Enter");
  invariant(
    await firstGroup.getAttribute("aria-expanded") === "true",
    "Component Group was not keyboard-expandable",
  );

  const searchStarted = performance.now();
  await search.fill("call to action");
  const cta = page.getByRole("button", { name: "Place CTA band", exact: true });
  await cta.waitFor({ timeout: ACTION_TIMEOUT });
  const searchMilliseconds = performance.now() - searchStarted;
  invariant(
    await palette.locator(
      "[data-discern-builder-search-results] [data-discern-builder-directory-entry]",
    ).first().getAttribute("data-discern-builder-directory-entry") ===
      "builder-component:cta-band",
    "Builder regrouped and replaced the shared search ranking",
  );
  invariant(
    await cta.locator("em").filter({ hasText: "Name matches “cta”" })
      .count() ===
      1,
    "Shared intent match reason was not shown for call to action",
  );
  invariant(
    searchMilliseconds < 1_000,
    `Builder intent search took ${searchMilliseconds.toFixed(1)}ms`,
  );
  await search.fill("");

  const scrollMilliseconds = await palette.evaluate(async (element) => {
    const started = performance.now();
    element.scrollTop = element.scrollHeight;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    element.scrollTop = 0;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    return performance.now() - started;
  });
  invariant(
    scrollMilliseconds < 500,
    `Builder directory scroll took ${scrollMilliseconds.toFixed(1)}ms`,
  );

  const initialMilliseconds = Number(
    await palette.getAttribute("data-discern-builder-discovery-ready-ms"),
  );
  invariant(
    Number.isFinite(initialMilliseconds) && initialMilliseconds < 4_000,
    `Builder initial discovery render took ${String(initialMilliseconds)}ms`,
  );
  return {
    componentCount,
    initialMilliseconds,
    searchMilliseconds,
    scrollMilliseconds,
  };
}

export async function placeNamedComponent(
  page: Page,
  name: string,
): Promise<void> {
  await activatePane(page, "palette");
  if (!checkedDiscoveryPages.has(page)) {
    await verifyDiscoverySurface(page);
    checkedDiscoveryPages.add(page);
  }
  const components = page.getByRole("navigation", {
    name: "Discovery categories",
  }).getByRole("button", { name: "Components", exact: true });
  if (await components.isVisible()) await components.click();
  const search = page.getByRole("searchbox", { name: "Search components" });
  await search.fill(name);
  const place = page.getByRole("button", {
    name: `Place ${name}`,
    exact: true,
  });
  const context = page.locator(".discern-builder-context");
  if (await context.isVisible()) {
    invariant(
      (await context.innerText()).startsWith("Add to "),
      "Contextual discovery did not name its explicit target",
    );
    invariant(
      await page.locator(".discern-builder-purpose").count() === 0,
      "Contextual discovery retained an unrelated purpose control",
    );
    invariant(
      (await place.locator("small").innerText()).includes("Fits target"),
      `${name} did not project the tree authority's positive compatibility`,
    );
    const cancellation = context.getByRole("button", {
      name: "Cancel placement",
      exact: true,
    });
    invariant(
      await cancellation.count() === 1 &&
        await context.getByRole("button").count() === 1,
      "Contextual discovery exposed competing actions for one cancellation",
    );
  }
  await place.click({
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
