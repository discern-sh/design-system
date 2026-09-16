import { assertEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { browserBehaviorSources } from "../src/generated/behaviors.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { ThemeToggle } from "../src/react.ts";

const STORAGE_KEY = "consumer-theme";
const ORIGIN = "http://static-theme.test";

/** Build the served document twice: with the selected runtime, and without it. */
async function buildConsumer(output: string): Promise<void> {
  const runtime = await emitDesignSystemRuntime({
    outputRoot: toFileUrl(`${output}/runtime/`),
    components: ["theme-toggle"],
  });
  const markup = renderToStaticMarkup(
    <>
      <main data-discern-root="" data-discern-theme-storage-key={STORAGE_KEY}>
        <ThemeToggle id="primary" />
        <ThemeToggle id="secondary" variant="quiet" />
        <ThemeToggle id="cancelled" />
        <ThemeToggle id="unavailable" disabled />
        <ThemeToggle
          id="controlled"
          theme="light"
          onThemeChange={() => undefined}
        />
        <section data-discern-root="" id="nested">
          <ThemeToggle id="scoped" />
        </section>
      </main>
      <aside data-discern-root="" id="unsaved-root">
        <ThemeToggle id="unsaved" />
      </aside>
      <ThemeToggle id="outside-root" />
    </>,
  );
  const scripts = runtime.manifest.outputs.scripts.map((path) =>
    `<script type="module" src="runtime/${path}"></script>`
  ).join("");
  const document = (body: string) =>
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Static theme consumer</title><link rel="stylesheet" href="runtime/discern.css"><body>${body}</body></html>`;
  await Deno.writeTextFile(
    join(output, "index.html"),
    document(`${markup}${scripts}`),
  );
  await Deno.writeTextFile(join(output, "inert.html"), document(markup));
}

Deno.test("static Theme toggles activate, agree, and stay inside their own root", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildConsumer(output);
    const page = await browser.newPage();
    await page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await page.emulateMedia({ colorScheme: "light" });

    // Without the selected script nothing can act, so every control stays
    // visibly unavailable and out of the accessibility tree.
    await page.goto(`${ORIGIN}/inert.html`);
    assertEquals(
      await page.locator("#primary").evaluate((element: HTMLElement) =>
        element.inert
      ),
      true,
    );

    await page.goto(`${ORIGIN}/`);
    const label = (id: string) =>
      page.locator(`#${id}`).getAttribute("aria-label");
    const rootTheme = (id: string) =>
      page.locator(`#${id}`).getAttribute("data-discern-theme");
    const visibleGlyph = (id: string) =>
      page.locator(`#${id} [data-discern-theme-destination]:not([hidden])`)
        .getAttribute("data-discern-theme-destination");

    await page.waitForFunction(
      () => !(document.getElementById("primary") as HTMLElement).inert,
      undefined,
      { timeout: 2000 },
    );
    assertEquals(await label("primary"), "Switch to the dark theme");
    assertEquals(await visibleGlyph("primary"), "dark");
    // A control outside every opted-in root is never activated.
    assertEquals(
      await page.locator("#outside-root").evaluate((element: HTMLElement) =>
        element.inert
      ),
      true,
    );

    await page.locator("#primary").click();
    assertEquals(await rootTheme("unsaved-root"), null);
    assertEquals(
      await page.evaluate(() =>
        document.querySelector("main")?.getAttribute("data-discern-theme")
      ),
      "dark",
    );
    // Every control in the root agrees, whatever was pressed.
    for (const id of ["primary", "secondary", "cancelled"]) {
      assertEquals(await label(id), "Switch to the light theme");
      assertEquals(await visibleGlyph(id), "light");
    }
    assertEquals(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      "dark",
    );
    // A nested root and the control it contains move on their own: an
    // unstamped root follows the media query rather than the root around it.
    assertEquals(await rootTheme("nested"), null);
    await page.locator("#scoped").click();
    assertEquals(await rootTheme("nested"), "dark");
    await page.locator("#scoped").click();
    assertEquals(await rootTheme("nested"), "light");
    assertEquals(
      await page.evaluate(() =>
        document.querySelector("main")?.getAttribute("data-discern-theme")
      ),
      "dark",
      "a nested control never reaches the root around it",
    );
    // Persistence follows the same root, so the nested control stores nothing.
    assertEquals(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      "dark",
    );

    // Controlled React markup carries no static opt-in, so one activation is
    // never handled twice.
    assertEquals(
      await page.locator("#controlled").getAttribute(
        "data-discern-theme-toggle",
      ),
      null,
    );
    assertEquals(await label("controlled"), "Switch to the dark theme");

    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("static theme activation honours cancellation, disabled state, storage, and teardown", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildConsumer(output);
    const page = await browser.newPage();
    await page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${ORIGIN}/`);
    const mainTheme = () =>
      page.evaluate(() =>
        document.querySelector("main")?.getAttribute("data-discern-theme") ??
          null
      );
    await page.waitForFunction(
      () => !(document.getElementById("primary") as HTMLElement).inert,
      undefined,
      { timeout: 2000 },
    );

    await page.evaluate(() => {
      document.getElementById("cancelled")?.addEventListener(
        "click",
        (event) => event.preventDefault(),
      );
    });
    await page.locator("#cancelled").click();
    assertEquals(
      await mainTheme(),
      null,
      "cancellation leaves the theme alone",
    );
    await page.locator("#unavailable").click({ force: true });
    assertEquals(await mainTheme(), null, "a disabled control never activates");

    // Evaluating the behavior again must not bind a second listener, which
    // would flip the theme twice and land back where it started.
    await page.evaluate(browserBehaviorSources["theme-toggle"]);
    await page.locator("#primary").click();
    assertEquals(await mainTheme(), "dark");

    // A saved preference survives a reload even though the served markup
    // carries no theme of its own.
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("data-discern-theme") ===
          "dark",
      undefined,
      { timeout: 2000 },
    );
    assertEquals(
      await page.locator("#primary").getAttribute("aria-label"),
      "Switch to the light theme",
    );

    // A root with no storage key changes for this visit only.
    await page.locator("#unsaved").click();
    assertEquals(
      await page.locator("#unsaved-root").getAttribute("data-discern-theme"),
      "dark",
    );
    assertEquals(
      await page.evaluate(() => Object.keys(localStorage).length),
      1,
    );

    await page.evaluate(() =>
      document.dispatchEvent(new Event("discern:theme-toggle:teardown"))
    );
    assertEquals(
      await page.locator("#primary").evaluate((element: HTMLElement) =>
        element.inert
      ),
      true,
    );

    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("system preference resolves the label while nothing is saved", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildConsumer(output);
    const page = await browser.newPage();
    await page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(
      () =>
        document.getElementById("unsaved")?.getAttribute("aria-label") ===
          "Switch to the light theme",
      undefined,
      { timeout: 2000 },
    );
    // Nothing is stamped: the emitted CSS already follows the media query, and
    // only the control's own name has to keep up.
    assertEquals(
      await page.locator("#unsaved-root").getAttribute("data-discern-theme"),
      null,
    );
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForFunction(
      () =>
        document.getElementById("unsaved")?.getAttribute("aria-label") ===
          "Switch to the dark theme",
      undefined,
      { timeout: 2000 },
    );
    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
