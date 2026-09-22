import { assert, assertEquals, assertThrows } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { withViewport } from "../scripts/viewport.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { SiteFooter } from "../src/react.ts";

const groups = ["Product", "Learn", "Community", "Company"].map((title) => ({
  title,
  links: [{ label: `${title} overview`, href: `#${title.toLowerCase()}` }],
}));

Deno.test("Site footer columns carry the count beside the consumer's own style", () => {
  const markup = renderToStaticMarkup(
    <SiteFooter
      brand="Example"
      groups={groups}
      columns={4}
      style={{ color: "red" }}
    />,
  );
  assert(markup.includes("discern-site-footer--columns"));
  assert(markup.includes("--discern-site-footer-columns:4"));
  assert(markup.includes("color:red"));
  assert(
    !renderToStaticMarkup(<SiteFooter brand="Example" groups={groups} />)
      .includes("discern-site-footer--columns"),
  );
  for (const columns of [0, -1, 2.5, Number.NaN]) {
    assertThrows(
      () =>
        renderToStaticMarkup(
          <SiteFooter brand="Example" groups={groups} columns={columns} />,
        ),
      RangeError,
    );
  }
});

Deno.test("Site footer columns hold one row when there is room and never squeeze a group", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["site-footer"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const markup = renderToStaticMarkup(
      <SiteFooter brand="Example" groups={groups} frame="wide" columns={4} />,
    );
    const page = await browser.newPage();
    for (const width of [390, 800, 1100, 1440]) {
      await withViewport(page, { width, height: 900 }, async () => {
        await page.setContent(
          `<html data-discern-root><style>${css}</style><style>body{margin:0}</style><body>${markup}</body></html>`,
        );
        const facts = await page.evaluate(() => {
          const rem = parseFloat(
            getComputedStyle(document.documentElement).fontSize,
          );
          const boxes = [
            ...document.querySelectorAll(".discern-site-footer__nav > div"),
          ].map((group) => group.getBoundingClientRect());
          return {
            rows: new Set(boxes.map(({ top }) => Math.round(top))).size,
            narrowest: Math.min(...boxes.map(({ width }) => width)) / rem,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assertEquals(facts.overflow, false, `${width}px overflows`);
        assert(facts.narrowest >= 8 - 0.01, `${width}px squeezes a group`);
        // Four groups fit on one row beside the brand, or on one row beneath it.
        if (width >= 800) assertEquals(facts.rows, 1, `${width}px wraps`);
      });
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
