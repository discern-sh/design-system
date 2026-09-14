import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { buildSignatureConsumer } from "../scripts/signature-consumer.tsx";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { componentGroups } from "../src/types/component-meta.ts";
import { SignatureSpecimen } from "../catalogue/review/signature-specimens.tsx";

Deno.test("complete purpose specimens fit their allocation with enlarged fallback text", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: componentGroups,
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const compositionCss = await Deno.readTextFile(
      new URL("../catalogue/review/signature.css", import.meta.url),
    );
    const page = await browser.newPage();
    for (const purpose of ["reading", "operations", "marketing"] as const) {
      const html = renderToStaticMarkup(createElement(SignatureSpecimen, {
        purpose,
        id: "specimen",
        treatments: {
          depth: true,
          ambient: true,
          shimmer: true,
          relief: true,
          tint: false,
          motion: false,
        },
      }));
      for (const theme of ["light", "dark"]) {
        for (const width of [390, 720, 1120]) {
          await page.setViewportSize({ width, height: 900 });
          // No font asset is selected: these are the actual public fallbacks.
          await page.setContent(
            `<html data-discern-root data-discern-theme="${theme}">
            <style>${css}${compositionCss}html{font-size:24px}</style>
            <body><div class="discern-signature-specimen">${html}</div></body></html>`,
          );
          const geometry = await page.locator("html").evaluate((root) => ({
            available: root.clientWidth,
            content: root.scrollWidth,
          }));
          assertEquals(
            geometry.content,
            geometry.available,
            `${purpose}/${theme}/${width}`,
          );
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("the standalone consumer uses emitted assets and an independent marketing font role", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildSignatureConsumer(toFileUrl(`${output}/`));
    const page = await browser.newPage();
    await page.goto(toFileUrl(`${output}/index.html`).href);
    await page.evaluate(() => document.fonts.ready);
    assertEquals(await page.locator("script").count(), 0);
    assertEquals(
      await page.locator('link[rel="stylesheet"]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("href"))
      ),
      ["./discern.css", "./fonts.css"],
    );
    const headline = page.locator(".discern-hero-block__title");
    const loadedFaces = await page.evaluate(async () =>
      (await document.fonts.load('600 32px "Discern Inter Marketing"'))
        .map((face) => ({ family: face.family, status: face.status }))
    );
    assert(loadedFaces.length > 0, "the emitted marketing WOFF2 must load");
    assert(loadedFaces.every((face) => face.status === "loaded"));
    assert(
      (await headline.evaluate((node) => getComputedStyle(node).fontFamily))
        .includes("Discern Inter Marketing"),
    );
    const button = page.locator(".discern-button").first();
    const originalUi = await button.evaluate((node) =>
      getComputedStyle(node).fontFamily
    );
    await page.locator("html").evaluate((root) =>
      root.style.setProperty("--discern-font-marketing", "Georgia, serif")
    );
    assertEquals(
      await headline.evaluate((node) => getComputedStyle(node).fontFamily),
      "Georgia, serif",
    );
    assertEquals(
      await button.evaluate((node) => getComputedStyle(node).fontFamily),
      originalUi,
      "changing the consumer's marketing face must not rebrand UI text",
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
