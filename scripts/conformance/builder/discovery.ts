import type { Page } from "playwright-core";
import { ACTION_TIMEOUT, activatePane, OUTLINE_ROW } from "./support.ts";

export async function placeNamedComponent(
  page: Page,
  name: string,
): Promise<void> {
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
