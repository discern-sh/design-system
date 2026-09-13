import { assert, assertEquals } from "@std/assert";
import { launchBrowser } from "../scripts/browser.ts";
import { loadConformancePage } from "../scripts/conformance/catalogue/component-conformance-page.ts";

Deno.test("browser readiness waits for the application without waiting for idle background traffic", async () => {
  const requested = Promise.withResolvers<void>();
  const ready = Promise.withResolvers<void>();
  const background = Promise.withResolvers<void>();
  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("http://readiness.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/ready") {
      requested.resolve();
      await ready.promise;
      return await route.fulfill({ body: "ready" });
    }
    if (path === "/background") {
      await background.promise;
      return await route.fulfill({ body: "complete" });
    }
    await route.fulfill({
      contentType: "text/html",
      body: `<script>
      fetch('/background');
      fetch('/ready').then(() => document.documentElement.dataset.discernConformanceReady = 'true');
    </script>`,
    });
  });
  page.setDefaultNavigationTimeout(3_000);
  let settled = false;
  const loading = loadConformancePage(
    page,
    "http://readiness.test/",
  )
    .then(() => {
      settled = true;
    });
  try {
    await requested.promise;
    assertEquals(
      settled,
      false,
      "navigation returned before the application became ready",
    );
    ready.resolve();
    await loading;
    assert(settled);
  } finally {
    ready.resolve();
    background.resolve();
    await loading.catch(() => {});
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
    await browser.close();
  }
});
