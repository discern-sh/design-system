import { assertEquals } from "@std/assert";
import { launchBrowser } from "../scripts/browser.ts";
import { waitForPreviewEvent } from "../scripts/conformance/builder/support.ts";

Deno.test("preview event waits accept repeated summaries and wait past stale history", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    for (
      const summary of [
        'onValueChange("details")',
        'onSelectionChange("archive")',
      ]
    ) {
      await page.setContent('<ul aria-label="Preview event log"></ul>');
      await page.getByRole("list").evaluate((list, summary) => {
        for (const text of [summary, "Another event", summary]) {
          const item = document.createElement("li");
          item.textContent = text;
          list.append(item);
        }
      }, summary);
      await waitForPreviewEvent(page, summary);
      await page.getByRole("list").evaluate((list, summary) => {
        list.firstElementChild!.textContent = "Pending event";
        setTimeout(() => {
          const item = document.createElement("li");
          item.textContent = summary;
          list.prepend(item);
        }, 150);
      }, summary);
      await waitForPreviewEvent(page, summary);
      assertEquals(
        await page.getByRole("listitem").first().innerText(),
        summary,
      );
    }
  } finally {
    await browser.close();
  }
});
