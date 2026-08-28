import type { Locator, Page } from "playwright-core";
import {
  ACTION_TIMEOUT,
  activatePane,
  CANVAS_PAGE,
  invariant,
  OUTLINE_ITEM,
  OUTLINE_ROW,
} from "./support.ts";

export async function findOutlineRow(
  page: Page,
  label: string,
): Promise<Locator> {
  const rows = page.locator(OUTLINE_ROW);
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    if ((await row.textContent())?.trim() === label) return row;
  }
  throw new Error(`Outline has no exact ${JSON.stringify(label)} row`);
}

export async function outlineLabels(page: Page): Promise<readonly string[]> {
  return await page.locator(OUTLINE_ROW).evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "")
  );
}

export async function selectComposition(page: Page): Promise<void> {
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

export async function documentWitness(page: Page): Promise<string> {
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

export async function assertInteractiveShortcutIsolation(
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

export async function verifyShortcutIsolation(page: Page): Promise<number> {
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
