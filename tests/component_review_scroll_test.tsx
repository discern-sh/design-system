import { assert, assertEquals } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import {
  clampedScrollPosition,
  waitForStableWindowScroll,
} from "../scripts/browser-conformance-support.ts";
import {
  cssDeclarations,
  cssQualifiedRuleBlocks,
} from "../scripts/css-syntax.ts";
import { withViewport } from "../scripts/viewport.ts";
import { VerificationReport } from "../src/react.ts";
import { denseVerificationReport } from "../src/components/agents/operational-examples.ts";

function blockedPageScroll(css: string): string[] {
  const parsed = cssQualifiedRuleBlocks(css);
  assertEquals(parsed.failures, []);
  return parsed.rules.flatMap(({ selector, block }) =>
    cssDeclarations(block).flatMap(({ name, value }) => {
      const words = value.split(/\s+/u);
      const vertical = name === "overscroll-behavior"
        ? words[1] ?? words[0]
        : ["overscroll-behavior-y", "overscroll-behavior-block"].includes(name)
        ? words[0]
        : undefined;
      return vertical === "contain" || vertical === "none" ? [selector] : [];
    })
  );
}

async function reviewStyles(directory: URL): Promise<string[]> {
  const styles: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = new URL(
      entry.name + (entry.isDirectory ? "/" : ""),
      directory,
    );
    if (entry.isDirectory) styles.push(...await reviewStyles(path));
    else if (entry.isFile && entry.name.endsWith(".css")) {
      styles.push(await Deno.readTextFile(path));
    }
  }
  return styles;
}

Deno.test("review layout leaves vertical scrolling with the document", async () => {
  const styles = await reviewStyles(
    new URL("../catalogue/review/", import.meta.url),
  );
  assertEquals(styles.flatMap(blockedPageScroll), []);
});

Deno.test("review scroll guard detects a future container without enrolment", () => {
  assertEquals(
    blockedPageScroll(
      "@layer future { .field-notes { overflow: auto; overscroll-behavior: contain; } }",
    ),
    [".field-notes"],
  );
  assertEquals(
    blockedPageScroll(".field-notes { overscroll-behavior: contain auto; }"),
    [],
  );
});

Deno.test("wheel input over a review specimen or its surround scrolls the page and retains horizontal inspection", async () => {
  const css =
    (await reviewStyles(new URL("../catalogue/review/", import.meta.url))).join(
      "\n",
    );
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    for (const width of [390, 1440]) {
      await withViewport(page, { width, height: 800 }, async () => {
        for (const evidenceOpen of [false, true]) {
          const report = renderToStaticMarkup(
            <VerificationReport
              {...denseVerificationReport}
              evidenceOpen={evidenceOpen}
            />,
          );
          await page.setContent(
            `<style>${css}</style><div style="height:400px">Review controls</div><article class="discern-review-card"><header>Review case</header><div class="discern-review-scroller"><div class="discern-review-specimen" style="width:1120px">${report}</div></div></article><footer style="height:1200px">Further review</footer>`,
          );
          const scroller = page.locator(".discern-review-scroller");
          for (
            const selector of [
              ".discern-review-scroller",
              ".discern-verification-report",
            ]
          ) {
            await scroller.evaluate((element) => {
              globalThis.scrollTo(
                0,
                globalThis.scrollY + element.getBoundingClientRect().top - 100,
              );
            });
            await waitForStableWindowScroll(scroller);
            const box = await page.locator(selector).boundingBox();
            assert(box !== null);
            const before = await page.evaluate(() => globalThis.scrollY);
            await page.mouse.move(box.x + 8, box.y + 8);
            await page.mouse.wheel(0, 180);
            await page.waitForFunction(
              (before) => globalThis.scrollY > before + 50,
              before,
              { timeout: 1500 },
            );
            await waitForStableWindowScroll(scroller);
          }
          if (width === 390) {
            await scroller.scrollIntoViewIfNeeded();
            await waitForStableWindowScroll(scroller);
            const box = await scroller.boundingBox();
            assert(box !== null);
            const before = await page.evaluate(() => globalThis.scrollY);
            await page.mouse.move(box.x + 8, Math.max(8, box.y + 8));
            await page.mouse.wheel(240, 0);
            await page.waitForFunction(() =>
              document.querySelector(".discern-review-scroller")!.scrollLeft > 0
            );
            await waitForStableWindowScroll(scroller);
            const maximum = await page.evaluate(() =>
              document.documentElement.scrollHeight - globalThis.innerHeight
            );
            assertEquals(
              await page.evaluate(() => globalThis.scrollY),
              clampedScrollPosition(before, maximum),
            );
          }
        }
      });
    }
  } finally {
    await browser.close();
  }
});
