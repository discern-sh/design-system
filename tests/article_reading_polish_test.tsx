import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { toFileUrl } from "@std/path";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  AnchorHeading,
  Footnotes,
  KeyPoints,
  List,
  Markdown,
  Prose,
  TableOfContents,
} from "../src/react.ts";
import ArticleLayoutExamples from "../src/components/editorial/article-layout/article-layout.examples.tsx";

Deno.test("Markdown heading destinations cannot collide with note and reference destinations", () => {
  const source = `## fn-1

First[^proof].

## fnref-1

Again[^proof].

## fn-1-1

[^proof]: Evidence.`;
  const html = renderToStaticMarkup(
    <Markdown source={source} />,
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assertEquals(new Set(ids).size, ids.length);
  assertStringIncludes(html, 'id="fn-1-1" tabindex="-1">fn-1-1</h2>');
});

let readingStylesheet: string | undefined;
async function readingCss(): Promise<string> {
  if (readingStylesheet !== undefined) return readingStylesheet;
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/runtime/`),
      all: true,
    });
    readingStylesheet = await Deno.readTextFile(
      `${output}/runtime/discern.css`,
    );
    return readingStylesheet;
  } finally {
    await Deno.remove(output, { recursive: true });
  }
}

Deno.test("article allocation protects the reading column in nested narrow and wide containers", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    for (const theme of ["light", "dark"]) {
      for (const width of [320, 390, 720, 1120, 1440]) {
        await page.setContent(
          `<style>${await readingCss()}</style><main data-discern-root data-discern-theme="${theme}" style="width:${width}px">${
            renderToStaticMarkup(<ArticleLayoutExamples />)
          }</main>`,
        );
        const geometry = await page.locator(".discern-article-layout").evaluate(
          (element) => {
            const body = element.querySelector("article")!;
            return {
              width: element.clientWidth,
              scroll: element.scrollWidth,
              body: body.clientWidth,
            };
          },
        );
        assert(
          geometry.scroll <= geometry.width + 1,
          `article overflows ${width}px: ${JSON.stringify(geometry)}`,
        );
        assert(
          geometry.body >= Math.min(500, width - 48),
          `reading column squeezed at ${width}px: ${JSON.stringify(geometry)}`,
        );
        const rhythm = await page.locator(
          ".discern-article-layout__body > .discern-prose",
        ).evaluate((element) =>
          Array.from(element.children).map((child, index, children) => {
            const style = getComputedStyle(child);
            const previous = children[index - 1];
            return {
              tag: child.tagName,
              start: parseFloat(style.marginBlockStart),
              end: parseFloat(style.marginBlockEnd),
              gap: previous
                ? child.getBoundingClientRect().top -
                  previous.getBoundingClientRect().bottom
                : 0,
            };
          })
        );
        assertEquals(rhythm[0]?.start, 0);
        for (const block of rhythm) {
          assertEquals(block.end, 0, `double margin on ${block.tag}`);
          assert(
            Math.abs(block.gap - block.start) < 1,
            `unexpected outer gap on ${block.tag}`,
          );
        }
        assertEquals(
          rhythm[1]?.start,
          16,
          "heading stays closer to its content than a paragraph group",
        );
      }
    }
  } finally {
    await browser.close();
  }
});

Deno.test("Prose preserves embedded block internals, including a future unrelated block", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const blocks = (
      <>
        <KeyPoints
          title="Findings"
          items={[{ title: "First", description: "Evidence" }, {
            title: "Second",
            description: "More evidence",
          }]}
        />
        <section className="discern-future-observation">
          <ol>
            <li>First</li>
            <li>Second</li>
          </ol>
        </section>
      </>
    );
    await page.setContent(
      `<style>${await readingCss()}.discern-future-observation ol { padding: 0; }.discern-future-observation li { padding: 12px; }</style><main data-discern-root>${
        renderToStaticMarkup(
          <>
            <div id="standalone">{blocks}</div>
            <Prose id="embedded">{blocks}</Prose>
          </>,
        )
      }</main>`,
    );
    const inspect = (id: string) =>
      page.locator(`#${id} :is(ol, li)`).evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return { padding: style.padding, margin: style.margin };
        })
      );
    assertEquals(await inspect("embedded"), await inspect("standalone"));
  } finally {
    await browser.close();
  }
});

Deno.test("Footnotes keeps definition layout out of nested lists", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const list = (
      <List
        kind="ordered"
        items={[{ content: "First observation" }, {
          content: "Second observation",
        }]}
      />
    );
    await page.setContent(
      `<style>${await readingCss()}</style><main data-discern-root>${
        renderToStaticMarkup(
          <>
            <div id="standalone">{list}</div>
            <Footnotes id="notes" items={[{ id: "evidence", content: list }]} />
          </>,
        )
      }</main>`,
    );
    const inspect = (id: string) =>
      page.locator(`#${id} .discern-list__item`).evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            display: style.display,
            columns: style.gridTemplateColumns,
            border: style.borderBottomWidth,
            padding: style.padding,
          };
        })
      );
    assertEquals(await inspect("notes"), await inspect("standalone"));
  } finally {
    await browser.close();
  }
});

Deno.test("static article journeys preserve native fallback and selected history focus", async () => {
  const output = await Deno.makeTempDir();
  await emitDesignSystemRuntime({
    outputRoot: toFileUrl(`${output}/runtime/`),
    components: ["markdown", "anchor-heading", "table-of-contents"],
  });
  const browser = await launchBrowser();
  try {
    for (const enhanced of [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 1000, height: 700 },
        javaScriptEnabled: enhanced,
        reducedMotion: "reduce",
      });
      const source =
        "## Repeated heading\n\nFirst[^evidence].\n\n## Repeated heading\n\nAgain[^evidence].\n\n[^evidence]: Supporting evidence.";
      const markup = renderToStaticMarkup(
        <>
          <TableOfContents items={[{ label: "Opening", href: "#opening" }]} />
          <AnchorHeading id="opening">Opening</AnchorHeading>
          <Markdown source={source} />
          <Footnotes
            items={[{
              id: "manual-note",
              content: "Manual note",
              backHref: "#opening",
            }]}
          />
        </>,
      );
      const css = await Deno.readTextFile(`${output}/runtime/discern.css`);
      const script = enhanced
        ? await Deno.readTextFile(`${output}/runtime/discern.js`)
        : "";
      await page.route("http://article.test/**", (route) => {
        const nested = new URL(route.request().url()).pathname === "/nested";
        return route.fulfill({
          contentType: "text/html",
          body: `<style>${css}body {margin:0;} ${
            nested ? "main" : "html"
          } {scroll-padding-block-start:80px;} main {${
            nested ? "height:600px;overflow:auto;" : ""
          }} h2 {margin-block-start:700px;} .reading-header {position:${
            nested ? "sticky" : "fixed"
          };top:0;height:80px;background:white;z-index:1;} .reading-end {height:800px;}</style><main data-discern-root><header class="reading-header">Consumer header</header>${markup}<div class="reading-end"></div></main><script>${script}</script>`,
        });
      });
      for (const pathname of ["/", "/nested"]) {
        await page.goto(`http://article.test${pathname}`);
        const ids = await page.locator("[id]").evaluateAll((elements) =>
          elements.map((element) => element.id)
        );
        assertEquals(new Set(ids).size, ids.length);
        const links = await page.locator('a[href^="#"]').evaluateAll((
          elements,
        ) =>
          elements.map((element) => ({
            href: element.getAttribute("href")!,
            label: element.getAttribute("aria-label") ?? element.textContent!,
          }))
        );
        for (const [index, link] of links.entries()) {
          const target = page.locator(link.href);
          assertEquals(await target.count(), 1, link.href);
          const candidate = page.locator('a[href^="#"]').nth(index);
          await candidate.focus();
          await candidate.press("Enter");
          assert(
            await target.evaluate((element) =>
              document.activeElement === element
            ),
            `${link.label} must move focus to ${link.href}`,
          );
          const top = await target.evaluate((element) =>
            element.getBoundingClientRect().top
          );
          assert(
            top >= 79 && top < 140,
            `${link.href} should honor its scroll container: ${top}`,
          );
        }
        await page.locator("#fnref-1-2").press("Enter");
        await page.locator('a[href="#fnref-1-2"]').press("Enter");
        await page.goBack();
        assertEquals(new URL(page.url()).hash, "#fn-1");
        assert(
          await page.locator("#fn-1").evaluate((element) =>
            document.activeElement === element
          ),
        );
        await page.goForward();
        assertEquals(new URL(page.url()).hash, "#fnref-1-2");
        if (enhanced) {
          await page.waitForFunction(
            () => document.activeElement?.id === "fnref-1-2",
            undefined,
            { timeout: 2000 },
          );
        }
        if (enhanced || pathname === "/") {
          await page.waitForFunction(
            () => {
              const box = document.getElementById("fnref-1-2")!
                .getBoundingClientRect();
              return box.top >= 79 && box.bottom <= 600;
            },
            undefined,
            { timeout: 2000 },
          );
        }
        await page.emulateMedia({ forcedColors: "active" });
        await page.locator("#fnref-1-2").press("Tab");
        const focus = await page.locator(":focus").evaluate((element) =>
          getComputedStyle(element).outlineStyle
        );
        assert(focus !== "none", "forced colours preserve keyboard focus");
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
