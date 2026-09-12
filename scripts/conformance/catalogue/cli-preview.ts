import type { Page } from "playwright-core";
import { catalogueComponentPath } from "../../../catalogue/routes.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  invariant,
  loadCataloguePage,
} from "./support.ts";
import { verifyInlineOverflowCueEdges } from "./overflow-cue.ts";

/** The shared CLI host keeps its scroll affordance inside narrow detail pages. */
export async function verifyCliPreview(
  page: Page,
  origin: string,
): Promise<void> {
  await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
    const commandUrl = new URL(catalogueComponentPath("command"), origin);
    commandUrl.searchParams.set("surface", "cli");
    commandUrl.searchParams.set("example", "overflow");
    await loadCataloguePage(page, commandUrl.href);
    invariant(
      await page.locator("[data-discern-terminal-inspector]").count() === 0,
      "Component CLI default is not clean",
    );
    const canonical = await page.locator(".discern-catalogue-cli-output")
      .textContent();
    await page.getByRole("radio", { name: "Inspect", exact: true }).check();
    await page.getByRole("spinbutton", { name: "Columns" }).fill("40");
    await page.getByRole("combobox", { name: "Character set" }).selectOption(
      "ascii",
    );
    await page.getByRole("combobox", { name: "Colour depth" }).selectOption(
      "none",
    );
    invariant(
      await page.locator("[data-discern-terminal-inspector]").getAttribute(
        "data-discern-terminal-columns",
      ) === "40",
      "Component capability controls did not reach the renderer",
    );
    await page.getByRole("radio", { name: "Clean", exact: true }).check();
    const adapted = await page.locator(".discern-catalogue-cli-output")
      .textContent();
    invariant(
      adapted !== canonical,
      "Component inspection ignored its capability state",
    );
    await page.getByRole("radio", { name: "Inspect", exact: true }).check();
    await page.getByRole("combobox", { name: "Viewport preset" }).selectOption(
      "standard",
    );
    await page.getByRole("combobox", { name: "Character set" }).selectOption(
      "unicode",
    );
    await page.getByRole("combobox", { name: "Colour depth" }).selectOption(
      "truecolor",
    );
    await page.getByRole("radio", { name: "Clean", exact: true }).check();
    invariant(
      await page.locator(".discern-catalogue-cli-output").textContent() ===
        canonical,
      "Component reset changed canonical example facts",
    );
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-cli-preview").first(),
      "CLI Component preview",
    );
  });
}
