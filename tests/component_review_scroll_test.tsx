import { assert, assertEquals } from "@std/assert";
import { Buffer } from "node:buffer";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import {
  addPageFailureListeners,
  clampedScrollPosition,
  loadReadyBrowserPage,
  scanBrowserAccessibility,
  waitForStableWindowScroll,
} from "../scripts/browser-conformance-support.ts";
import { buildDesignSystem } from "../scripts/build.ts";
import server from "../scripts/serve.ts";
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

Deno.test("live review frames preserve keyboard scrolling and stylesheet URLs during accessibility scans", async () => {
  await buildDesignSystem();
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.route("http://component-review.test/**", async (route) => {
      const response = await server.fetch(new Request(route.request().url()));
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
    });
    const page = await context.newPage();
    const failures: string[] = [];
    addPageFailureListeners(page, failures);
    await loadReadyBrowserPage(
      page,
      "http://component-review.test/catalogue/reviews/components/?group=Core&width=medium&theme=light&accent=none&motion=reduced&mode=contact",
      'html[data-discern-review-status="ready"]',
    );
    const scan = await scanBrowserAccessibility(page, ".discern-review-shell");
    assertEquals({
      failures,
      violations: scan.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      })),
    }, { failures: [], violations: [] });
    const viewports = page.locator(".discern-review-scroller");
    assert(await viewports.count() > 0);
    for (const viewport of await viewports.all()) {
      await viewport.focus();
      const state = await viewport.evaluate((element) => ({
        tabindex: (element as HTMLElement).tabIndex,
        role: element.getAttribute("role"),
        label: element.getAttribute("aria-label"),
        focused: element.ownerDocument.activeElement === element,
        outline: Number.parseFloat(getComputedStyle(element).outlineWidth),
      }));
      assertEquals(state.tabindex, 0);
      assertEquals(state.role, "group");
      assert(state.label !== null && state.label.trim() !== "");
      assert(state.focused && state.outline >= 2);
    }
    const first = viewports.first();
    assert(
      await first.evaluate((element) =>
        element.scrollWidth > element.clientWidth
      ),
    );
    await first.evaluate((element) => {
      element.scrollLeft = 0;
    });
    assertEquals(await first.evaluate((element) => element.scrollLeft), 0);
    await first.press("ArrowRight");
    await page.waitForFunction(() =>
      document.querySelector(".discern-review-scroller")!.scrollLeft > 0
    );
    await page.emulateMedia({ forcedColors: "active" });
    await first.focus();
    assert(
      await first.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).outlineWidth) >= 2
      ),
    );

    // A new static overflow region must fail without adding its name to a list.
    await page.setContent(
      '<main id="future"><div class="archive-window" style="width:100px;overflow:auto"><p style="width:400px">Archive excerpt</p></div></main>',
    );
    const future = await scanBrowserAccessibility(page, "#future");
    assert(
      future.violations.some(({ id }) => id === "scrollable-region-focusable"),
    );
    await context.close();
  } finally {
    await browser.close();
  }
});

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
