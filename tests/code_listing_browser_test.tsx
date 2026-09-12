import { assert, assertEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { launchBrowser } from "../scripts/browser.ts";
import {
  buildStaticCodeListing,
  sourceValues,
} from "./fixtures/static-code-listing.tsx";

Deno.test("static source copy and wrap preserve logical lines, exact clipboard text, and keyboard inspection", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildStaticCodeListing(toFileUrl(`${output}/`));
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    await page.route("http://127.0.0.1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await page.goto("http://127.0.0.1/");
    for (const width of [320, 390, 720, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"] as const) {
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        for (const variant of ["standard", "showcase"] as const) {
          for (const wrap of [false, true]) {
            for (const [index, source] of sourceValues.entries()) {
              const figure = page.locator(`#${variant}-${wrap}-${index}`);
              const code = figure.locator("code");
              if (index === 0) {
                const selected = await code.evaluate((element) => {
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  const selection = getSelection()!;
                  selection.removeAllRanges();
                  selection.addRange(range);
                  const text = selection.toString();
                  selection.removeAllRanges();
                  return text;
                });
                assertEquals(selected, source);
              }
              // HTML parsing normalizes CRLF in visible text; the clipboard transport does not.
              assertEquals(
                await code.textContent(),
                source.replaceAll("\r\n", "\n"),
              );
              assertEquals(
                await figure.locator("[data-line]").evaluateAll((lines) =>
                  lines.map((line) => line.getAttribute("data-line"))
                ),
                source.split("\n").map((_, index) => String(index + 1)),
              );
              assertEquals(
                await figure.locator(".discern-code-listing__line--highlighted")
                  .evaluateAll((lines) =>
                    lines.map((line) => line.getAttribute("data-line"))
                  ),
                source.split("\n").flatMap((_, index) =>
                  [1, 3].includes(index + 1) ? [String(index + 1)] : []
                ),
              );
              const body = figure.locator("pre");
              await page.keyboard.press("Tab");
              await body.focus();
              const geometry = await body.evaluate((element) => {
                const line = element.querySelector('[data-line="3"]');
                return {
                  focused: document.activeElement === element,
                  outline: getComputedStyle(element).outlineStyle,
                  overflow: element.scrollWidth - element.clientWidth,
                  lineHeight: line?.getBoundingClientRect().height ?? 0,
                  leading: parseFloat(getComputedStyle(element).lineHeight),
                };
              });
              assert(
                geometry.focused && geometry.outline !== "none",
                JSON.stringify({
                  width,
                  theme,
                  variant,
                  wrap,
                  index,
                  geometry,
                }),
              );
              if (index === 0) {
                assert(wrap ? geometry.overflow <= 1 : geometry.overflow > 1);
                assert(
                  wrap
                    ? geometry.lineHeight > geometry.leading * 2
                    : Math.abs(geometry.lineHeight - geometry.leading) < 1,
                );
                if (!wrap) {
                  await body.press("ArrowRight");
                  await page.waitForFunction(
                    (id) =>
                      document.querySelector(`#${id} pre`)!.scrollLeft > 0,
                    `${variant}-${wrap}-${index}`,
                  );
                }
              }
              const button = figure.getByRole("button", {
                name: "Copy",
                exact: true,
              });
              await button.click();
              await figure.locator("[data-discern-copied]").waitFor();
              assertEquals(
                await page.evaluate(() => navigator.clipboard.readText()),
                source,
              );
              // Let the next matrix item find the idle label without depending on a timer.
              await page.evaluate(() => navigator.clipboard.writeText(""));
            }
          }
        }
        assert(
          await page.evaluate(() =>
            document.documentElement.scrollWidth <= innerWidth
          ),
        );
        // Reset feedback between repeated viewport/theme passes.
        await page.reload();
      }
    }
    assertEquals(await page.locator("#manual button").count(), 0);
    for (const wrap of [false, true]) {
      const block = page.locator(`#block-${wrap}`);
      assertEquals(await block.locator("code").textContent(), sourceValues[0]);
      const overflow = await block.evaluate((element) =>
        element.scrollWidth - element.clientWidth
      );
      assert(wrap ? overflow <= 1 : overflow > 1);
    }
    await page.emulateMedia({ forcedColors: "active" });
    await page.keyboard.press("Tab");
    await page.locator("#standard-true-0 pre").focus();
    await page.waitForFunction(() =>
      matchMedia("(forced-colors: active)").matches &&
      getComputedStyle(document.querySelector("#standard-true-0 pre")!)
          .outlineOffset === "-2px"
    );
    assert(
      await page.locator("#standard-true-0 pre").evaluate((element) =>
        getComputedStyle(element).outlineStyle !== "none" &&
        parseFloat(getComputedStyle(element).outlineOffset) < 0
      ),
    );
    assert(
      await page.locator('#standard-true-0 [data-line="3"]').evaluate((
        element,
      ) =>
        getComputedStyle(element).borderInlineStartStyle === "solid" &&
        parseFloat(getComputedStyle(element).borderInlineStartWidth) > 0
      ),
    );
    await page.emulateMedia({ forcedColors: "none" });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
      });
    });
    for (const variant of ["standard", "showcase"]) {
      const figure = page.locator(`#${variant}-true-0`);
      await figure.getByRole("button", { name: "Copy", exact: true }).click();
      await figure.locator("[data-discern-copy-failed]").waitFor();
      assertEquals(await figure.locator("[data-discern-copied]").count(), 0);
      assert(
        await figure.getByText("Copy failed — select text manually", {
          exact: true,
        }).isVisible(),
      );
      assert(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
      );
    }
    await context.close();
    const noScript = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 900 },
    });
    const staticPage = await noScript.newPage();
    await staticPage.route("http://127.0.0.1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await staticPage.goto("http://127.0.0.1/");
    assertEquals(
      await staticPage.locator("#standard-true-0 code").textContent(),
      sourceValues[0],
    );
    assertEquals(
      await staticPage.locator("#standard-true-0 button").getAttribute("inert"),
      "",
    );
    assert(
      await staticPage.locator("#standard-true-0 pre").evaluate((element) =>
        element.scrollWidth <= element.clientWidth + 1
      ),
    );
    await noScript.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
