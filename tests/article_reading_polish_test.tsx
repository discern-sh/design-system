import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { toFileUrl } from "@std/path";
import { launchBrowser } from "../scripts/browser.ts";
import { followFragment } from "../scripts/browser-url.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import type { Page } from "playwright-core";
import {
  AnchorHeading,
  ArticleHeader,
  Blockquote,
  Button,
  Callout,
  Chart,
  CodeListing,
  DataFigure,
  Diagram,
  Footnotes,
  KeyPoints,
  List,
  Markdown,
  Paragraph,
  Prose,
  RelatedContent,
  TableOfContents,
  Timeline,
} from "../src/react.ts";
import { FeedbackMark } from "../src/components/feedback/feedback-marks.tsx";
import type { FeedbackMarkName } from "../src/components/feedback/feedback-marks.tsx";
import ArticleLayoutExamples from "../src/components/editorial/article-layout/article-layout.examples.tsx";
import { markdownDeepNestingExampleSource } from "../src/components/editorial/markdown/markdown.example-sources.ts";
import { getGlyph } from "../src/glyphs/mod.ts";
import barFixtures from "../src/chart/kinds/bar/bar.fixtures.ts";
import flowFixtures from "../src/diagram/kinds/flow/flow.fixtures.ts";

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
          await followFragment(
            page,
            link.href,
            () => candidate.press("Enter"),
            `${link.label} did not navigate to ${link.href}`,
          );
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
        await followFragment(
          page,
          "#fn-1",
          () => page.locator("#fnref-1-2").press("Enter"),
          "The second reference did not open its note",
        );
        await followFragment(
          page,
          "#fnref-1-2",
          () => page.locator('a[href="#fnref-1-2"]').press("Enter"),
          "The note did not return to its second reference",
        );
        await followFragment(
          page,
          "#fn-1",
          () => page.goBack(),
          "Back did not reopen the note",
        );
        assert(
          await page.locator("#fn-1").evaluate((element) =>
            document.activeElement === element
          ),
        );
        await followFragment(
          page,
          "#fnref-1-2",
          () => page.goForward(),
          "Forward did not return to the second reference",
        );
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

async function inspectReading<T>(
  markup: string,
  inspect: (page: Page) => Promise<T>,
  width = 720,
  theme: "light" | "dark" = "light",
  accent = false,
): Promise<T> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    const accentScope = accent ? ' data-discern-accent="" ' : " ";
    const accentHue = accent ? "--discern-accent-hue:255;" : "";
    await page.setContent(
      `<style>${await readingCss()}</style><main data-discern-root data-discern-theme="${theme}"${accentScope}style="${accentHue}width:${width}px">${markup}</main>`,
    );
    return await inspect(page);
  } finally {
    await browser.close();
  }
}

Deno.test("Callout draws the stroke-matched feedback mark for its tone unless artwork is supplied", () => {
  const marks = {
    note: "neutral",
    insight: "accent",
    warning: "warning",
    success: "success",
  } as const satisfies Record<string, FeedbackMarkName>;
  for (const [tone, name] of Object.entries(marks)) {
    const html = renderToStaticMarkup(
      <Callout tone={tone as keyof typeof marks} title="Context">
        Body.
      </Callout>,
    );
    assertStringIncludes(
      html,
      renderToStaticMarkup(<FeedbackMark name={name} />),
      `${tone} draws the ${name} mark`,
    );
  }
  const supplied = renderToStaticMarkup(
    <Callout icon="◇" title="Context">Body.</Callout>,
  );
  assert(!supplied.includes("<svg"), "supplied artwork replaces the mark");
});

Deno.test("footnote references keep their paragraph on its own leading with a full target", async () => {
  const geometry = await inspectReading(
    renderToStaticMarkup(
      <Markdown
        source="A repeated note[^a] remains linked[^a].

[^a]: Evidence."
      />,
    ),
    (page) =>
      page.locator(".discern-markdown__footnote-reference").first().evaluate(
        (reference) => {
          const paragraph = reference.closest("p")!;
          const link = reference.querySelector("a")!;
          const target = getComputedStyle(link, "::after");
          const box = link.getBoundingClientRect();
          return {
            height: paragraph.getBoundingClientRect().height,
            leading: parseFloat(getComputedStyle(paragraph).lineHeight),
            target: box.height - parseFloat(target.top) -
              parseFloat(target.bottom),
          };
        },
      ),
  );
  assert(
    Math.abs(geometry.height - geometry.leading) < 0.5,
    `a reference loosens its line: ${JSON.stringify(geometry)}`,
  );
  assert(
    geometry.target >= 24,
    `reference target too short: ${JSON.stringify(geometry)}`,
  );
});

Deno.test("task markers share one first-line offset and hang so every label shares a column", async () => {
  const rows = await inspectReading(
    renderToStaticMarkup(
      <List
        kind="task"
        items={[
          { content: "Reviewed source material", checked: true },
          { content: "Verify the final frame", checked: false },
          { content: "A contextual note without task state" },
        ]}
      />,
    ),
    (page) =>
      page.locator(".discern-list__item").evaluateAll((items) =>
        items.map((item) => {
          const label = item.querySelector(".discern-list__content > span")!;
          const text = label.getBoundingClientRect();
          const marker = item.querySelector("input")?.getBoundingClientRect();
          const leading = parseFloat(getComputedStyle(label).lineHeight);
          return {
            left: text.left,
            height: item.getBoundingClientRect().height,
            offset: marker === undefined
              ? null
              : marker.top + marker.height / 2 - (text.top + leading / 2),
          };
        })
      ),
  );
  const [checked, unchecked, plain] = rows;
  assert(checked && unchecked && plain);
  for (const row of [checked, unchecked]) {
    assert(
      Math.abs(row.height - plain.height) < 0.5,
      `task rows loosen the list rhythm: ${JSON.stringify(rows)}`,
    );
  }
  assert(
    Math.abs(checked.offset! - unchecked.offset!) < 0.5,
    `checked and unchecked markers drift: ${JSON.stringify(rows)}`,
  );
  assert(
    Math.abs(checked.offset!) < 1,
    `marker is not centred on the first line: ${JSON.stringify(rows)}`,
  );
  for (const row of rows) {
    assert(
      Math.abs(row.left - plain.left) < 1,
      `labels do not share one column: ${JSON.stringify(rows)}`,
    );
  }
});

Deno.test("Footnotes gives every block in a note one compact gap and leaves phrasing inline", async () => {
  const notes = await inspectReading(
    renderToStaticMarkup(
      <Footnotes
        items={[
          {
            id: "rich",
            content: (
              <>
                <Paragraph>First block of the note.</Paragraph>
                <Blockquote>
                  <p>A quotation inside the note.</p>
                </Blockquote>
                <Callout title="An aside">Context for the note.</Callout>
                <KeyPoints
                  title="Points"
                  items={[{ title: "One", description: "Evidence." }]}
                />
              </>
            ),
          },
          {
            id: "phrasing",
            content: (
              <>
                See <a href="#source">the source</a> and <em>its notes</em>.
              </>
            ),
          },
        ]}
      />,
    ),
    (page) =>
      page.locator(".discern-footnotes > ol > li > div").evaluateAll(
        (notes) => {
          const probe = document.createElement("div");
          probe.style.marginBlockStart = "var(--discern-space-3)";
          notes[0]!.parentElement!.append(probe);
          const compact = parseFloat(getComputedStyle(probe).marginBlockStart);
          probe.remove();
          const [rich, phrasing] = notes;
          const blocks = [...rich!.children].map((child) =>
            child.getBoundingClientRect()
          );
          return {
            compact,
            gaps: blocks.slice(1).map((box, index) =>
              box.top - blocks[index]!.bottom
            ),
            phrasingHeight: phrasing!.getBoundingClientRect().height,
            leading: parseFloat(getComputedStyle(phrasing!).lineHeight),
          };
        },
      ),
  );
  for (const gap of notes.gaps) {
    assert(
      Math.abs(gap - notes.compact) < 1,
      `note blocks keep page-scale margins: ${JSON.stringify(notes)}`,
    );
  }
  assert(
    Math.abs(notes.phrasingHeight - notes.leading) < 1,
    `phrasing note no longer flows inline: ${JSON.stringify(notes)}`,
  );
});

Deno.test("Data figure paints swatches only in its legend", async () => {
  const paint = await inspectReading(
    renderToStaticMarkup(
      <DataFigure
        eyebrow={
          <>
            Figure <span>04</span>
          </>
        }
        title={
          <>
            Growth of <i>Solanum lycopersicum</i>
          </>
        }
        legend={[{
          label: (
            <>
              Sunny <i>plot</i>
            </>
          ),
          tone: "ink",
        }]}
        visual={<div>Visual</div>}
        caption="Caption."
      />,
    ),
    (page) =>
      page.locator(".discern-data-figure").evaluate((figure) => {
        const background = (selector: string) =>
          [...figure.querySelectorAll(selector)].map((element) =>
            getComputedStyle(element).backgroundColor
          );
        return {
          consumer: background(
            "h3 i, li > i:not(.discern-data-figure__swatch)",
          ),
          eyebrow: background("header > div > span span"),
          swatches: background(".discern-data-figure__swatch"),
        };
      }),
  );
  for (const color of [...paint.consumer, ...paint.eyebrow]) {
    assertEquals(color, "rgba(0, 0, 0, 0)", JSON.stringify(paint));
  }
  assertEquals(paint.swatches.length, 1);
  assert(paint.swatches[0] !== "rgba(0, 0, 0, 0)", JSON.stringify(paint));
});

Deno.test("Key points stacks its numerals in multi-column rows and hangs them in one column", async () => {
  const items = [
    { title: "Lead with the main idea", description: "State it first." },
    { title: "Add useful context", description: "Explain what matters." },
    { title: "End with direction", description: "Make the next step easy." },
  ];
  for (const [width, columns] of [[720, 3], [390, 1]] as const) {
    const rows = await inspectReading(
      renderToStaticMarkup(<KeyPoints title="Summary" items={items} />),
      (page) =>
        page.locator(".discern-key-points li").evaluateAll((entries) =>
          entries.map((entry) => {
            const numeral = entry.querySelector(":scope > span")!
              .getBoundingClientRect();
            const title = entry.querySelector("h3")!.getBoundingClientRect();
            return {
              top: entry.getBoundingClientRect().top,
              stacked: numeral.bottom <= title.top + 0.5,
              measure: title.width,
            };
          })
        ),
      width,
    );
    assertEquals(new Set(rows.map((row) => row.top)).size, 3 / columns);
    for (const row of rows) {
      assertEquals(
        row.stacked,
        columns > 1,
        `${width}px ${JSON.stringify(rows)}`,
      );
      assert(row.measure >= 160, `${width}px measure ${JSON.stringify(rows)}`);
    }
  }
});

Deno.test("Related content gives keyboard focus the card feedback hover gives", async () => {
  const states = await inspectReading(
    renderToStaticMarkup(
      <RelatedContent
        title="Further reading"
        items={[
          { title: "First", href: "#first" },
          { title: "Second", href: "#second" },
        ]}
      />,
    ),
    async (page) => {
      const cards = page.locator(".discern-related-content article");
      const fill = (index: number) =>
        cards.nth(index).evaluate((card) =>
          getComputedStyle(card).backgroundColor
        );
      const idle = await fill(1);
      await page.keyboard.press("Tab");
      const focused = await fill(0);
      const ring = await page.locator(":focus").evaluate((link) =>
        getComputedStyle(link).outlineStyle
      );
      await cards.nth(1).hover();
      await page.waitForFunction(
        (target) =>
          getComputedStyle(
            document.querySelectorAll(".discern-related-content article")[1]!,
          ).backgroundColor === target,
        focused,
        { timeout: 2000 },
      ).catch(() => undefined);
      return { idle, focused, hovered: await fill(1), ring };
    },
  );
  assert(states.focused !== states.idle, JSON.stringify(states));
  assertEquals(states.focused, states.hovered, JSON.stringify(states));
  assert(states.ring !== "none", "the focused link keeps its own ring");
});

Deno.test("Timeline status marks hold non-text contrast and leave hollow rings transparent", async () => {
  for (const theme of ["light", "dark"] as const) {
    const marks = await inspectReading(
      renderToStaticMarkup(
        <Timeline
          title="History"
          items={(["complete", "current", "upcoming"] as const).map((
            status,
          ) => ({
            date: status,
            title: status,
            description: "Detail.",
            status,
          }))}
        />,
      ),
      (page) =>
        page.locator(".discern-timeline__marker").evaluateAll((markers) => {
          const canvas = document.createElement("canvas").getContext("2d")!;
          const rgb = (value: string) => {
            canvas.clearRect(0, 0, 1, 1);
            canvas.fillStyle = value;
            canvas.fillRect(0, 0, 1, 1);
            return [...canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)];
          };
          const luminance = (value: string) => {
            const [r, g, b] = rgb(value).map((channel) => {
              const c = channel / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
          };
          const ground = getComputedStyle(document.querySelector("main")!)
            .backgroundColor;
          return markers.map((marker) => {
            const dot = getComputedStyle(marker, "::after");
            const [lighter, darker] = [
              luminance(dot.borderTopColor),
              luminance(ground),
            ].sort((a, b) => b - a);
            return {
              contrast: (lighter! + 0.05) / (darker! + 0.05),
              fill: dot.backgroundColor,
            };
          });
        }),
      720,
      theme,
    );
    for (const mark of marks) {
      assert(
        mark.contrast >= 3,
        `${theme} status mark contrast ${JSON.stringify(marks)}`,
      );
    }
    assert(marks[0]!.fill !== "rgba(0, 0, 0, 0)", "complete stays filled");
    for (const hollow of marks.slice(1)) {
      assertEquals(hollow.fill, "rgba(0, 0, 0, 0)", JSON.stringify(marks));
    }
  }
});

Deno.test("Table of contents indents nested entries beyond unnumbered framing entries", async () => {
  const lefts = await inspectReading(
    renderToStaticMarkup(
      <TableOfContents
        items={[
          { label: "Overview", href: "#overview", number: false },
          { label: "Prepare", href: "#prepare" },
          { label: "A closer look", href: "#closer", nested: true },
        ]}
      />,
    ),
    (page) =>
      page.locator(".discern-table-of-contents a").evaluateAll((links) =>
        links.map((link) => {
          const range = document.createRange();
          const text = [...link.childNodes].find((node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
          ) ?? link.lastChild!;
          range.selectNodeContents(text);
          return range.getBoundingClientRect().left;
        })
      ),
  );
  const [framing, numbered, nested] = lefts;
  assert(Math.abs(framing! - numbered!) < 1, JSON.stringify(lefts));
  assert(nested! > framing! + 4, JSON.stringify(lefts));
});

Deno.test("Prose links share one quiet underline in paragraphs, lists, and quotations", async () => {
  const links = await inspectReading(
    renderToStaticMarkup(
      <Prose>
        <p>
          A <a href="#p">paragraph link</a>.
        </p>
        <ul>
          <li>
            A <a href="#li">list link</a>.
          </li>
        </ul>
        <blockquote>
          <p>
            A <a href="#quote">quoted link</a>.
          </p>
        </blockquote>
      </Prose>,
    ),
    (page) =>
      page.locator(".discern-prose a").evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            decoration: style.textDecorationColor,
            ink: style.color,
            transition: style.transitionProperty,
          };
        })
      ),
  );
  assertEquals(links.length, 3);
  assertEquals(new Set(links.map((link) => link.decoration)).size, 1);
  for (const link of links) {
    assert(link.decoration !== link.ink, JSON.stringify(links));
    assertStringIncludes(link.transition, "text-decoration-color");
  }
});

Deno.test("Lists declare their own marker ladder wherever they are nested", async () => {
  const markers = await inspectReading(
    renderToStaticMarkup(
      <>
        <List
          id="standalone"
          items={[{
            content: "Outer",
            blocks: [<List key="inner" items={[{ content: "Inner" }]} />],
          }]}
        />
        <List id="ordered" kind="ordered" items={[{ content: "First" }]} />
        <Footnotes
          items={[{
            id: "note",
            content: <List items={[{ content: "Inside a note" }]} />,
          }]}
        />
      </>,
    ),
    (page) =>
      page.evaluate(() => {
        const type = (selector: string) =>
          getComputedStyle(document.querySelector(selector)!).listStyleType;
        return {
          standalone: type("#standalone"),
          nested: type("#standalone .discern-list"),
          ordered: type("#ordered"),
          footnote: type(".discern-footnotes .discern-list"),
        };
      }),
  );
  assertEquals(markers, {
    standalone: "disc",
    nested: "circle",
    ordered: "decimal",
    footnote: "disc",
  });
});

Deno.test("Prose headings step down in size as well as face", async () => {
  const sizes = await inspectReading(
    renderToStaticMarkup(
      <Prose>
        <h4>Strong subsection</h4>
        <p>Body.</p>
        <h5>Quiet subsection</h5>
        <p>Body.</p>
        <h6>Supporting note</h6>
        <p>Body.</p>
      </Prose>,
    ),
    (page) =>
      page.locator(".discern-prose > :is(h4, h5, h6)").evaluateAll((
        headings,
      ) =>
        headings.map((heading) =>
          parseFloat(getComputedStyle(heading).fontSize)
        )
      ),
  );
  const [h4, h5, h6] = sizes;
  assert(
    h4! > h5! && h5! > h6!,
    `heading sizes must descend: ${JSON.stringify(sizes)}`,
  );
});

Deno.test("the Prose drop cap sits on the third line's baseline", async () => {
  const lead =
    "Honest long-form design gives the opening paragraph enough presence to begin the argument without turning every sentence into display type, so the first letter can mark the start of the reading while the rest of the paragraph settles into its measure.";
  const geometry = await inspectReading(
    renderToStaticMarkup(
      <Prose lead dropCap>
        <p>{lead}</p>
      </Prose>,
    ),
    async (page) => {
      const box = await page.locator(".discern-prose > p").evaluate((p) => {
        const text = p.firstChild!;
        const range = document.createRange();
        range.setStart(text, 1);
        range.setEnd(text, 2);
        const following = range.getBoundingClientRect();
        const probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:0;height:0";
        p.append(probe);
        const lastBaseline = probe.getBoundingClientRect().bottom;
        probe.remove();
        const bounds = p.getBoundingClientRect();
        const leading = parseFloat(getComputedStyle(p).lineHeight);
        const lines = Math.round(bounds.height / leading);
        return {
          x: bounds.left,
          y: bounds.top,
          width: following.left - bounds.left - 2,
          height: bounds.height,
          leading,
          lines,
          baseline: lastBaseline - (lines - 3) * leading - bounds.top,
        };
      });
      // Scan only the sunk lines, so text that wraps beneath the cap is
      // never mistaken for the letter itself.
      const shot = await page.screenshot({
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: Math.min(box.height, 3 * box.leading + 2),
        },
      });
      let binary = "";
      for (const byte of new Uint8Array(shot)) {
        binary += String.fromCharCode(byte);
      }
      const capBottom = await page.evaluate(async (source) => {
        const image = new Image();
        image.src = `data:image/png;base64,${source}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, image.width, image.height)
          .data;
        let bottom = -1;
        for (let y = 0; y < image.height; y++) {
          for (let x = 0; x < image.width; x++) {
            if (pixels[(y * image.width + x) * 4]! < 128) {
              bottom = y + 1;
              break;
            }
          }
        }
        return bottom;
      }, btoa(binary));
      return { ...box, capBottom };
    },
  );
  assert(geometry.lines >= 4, JSON.stringify(geometry));
  assert(
    Math.abs(geometry.capBottom - geometry.baseline) <= 2,
    `drop cap floats between lines: ${JSON.stringify(geometry)}`,
  );
});

Deno.test("blocks nested in list items keep the compact list rhythm", async () => {
  const gaps = await inspectReading(
    renderToStaticMarkup(
      <>
        <Markdown source={markdownDeepNestingExampleSource} />
        <Prose id="raw">
          <ul>
            <li>
              Item
              <blockquote>
                <p>Quoted inside the item.</p>
              </blockquote>
            </li>
          </ul>
        </Prose>
      </>,
    ),
    (page) =>
      page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.transition = "none";
        document.querySelector("main")!.append(probe);
        const space = (step: number) => {
          probe.style.marginBlockStart = `var(--discern-space-${step})`;
          return parseFloat(getComputedStyle(probe).marginBlockStart);
        };
        const nested = document.querySelector(
          ".discern-markdown .discern-list .discern-list__item .discern-list__item",
        )!;
        const content = nested.querySelector(".discern-list__content")!
          .getBoundingClientRect();
        const quote = nested.querySelector("blockquote")!
          .getBoundingClientRect();
        return {
          list: quote.top - content.bottom,
          listStep: space(2),
          raw: parseFloat(
            getComputedStyle(document.querySelector("#raw blockquote")!)
              .marginBlockStart,
          ),
          rawStep: space(3),
        };
      }),
  );
  assert(Math.abs(gaps.list - gaps.listStep) < 1, JSON.stringify(gaps));
  assertEquals(gaps.raw, gaps.rawStep, JSON.stringify(gaps));
});

Deno.test("reading timestamps and pager counts use tabular figures", async () => {
  const numerals = await inspectReading(
    renderToStaticMarkup(
      <>
        <Timeline
          title="History"
          items={[{ date: "Week 01", title: "Draft", description: "Done." }]}
        />
        <TableOfContents
          items={[{ label: "Opening", href: "#opening" }]}
          progress="1 of 4"
        />
      </>,
    ),
    (page) =>
      page.evaluate(() =>
        [".discern-timeline__date", ".discern-table-of-contents__progress"]
          .map((selector) =>
            getComputedStyle(document.querySelector(selector)!)
              .fontVariantNumeric
          )
      ),
  );
  for (const value of numerals) assertStringIncludes(value, "tabular-nums");
});

Deno.test("Related content collapses to its own container and aligns its header with the cards", async () => {
  const layout = await inspectReading(
    renderToStaticMarkup(
      <RelatedContent
        eyebrow="Continue reading"
        title="Further reading"
        items={["First", "Second", "Third"].map((title) => ({
          eyebrow: "Essay",
          title,
          href: `#${title}`,
        }))}
      />,
    ),
    (page) =>
      page.evaluate(() => {
        const grid = document.querySelector(".discern-related-content__grid")!;
        return {
          columns: getComputedStyle(grid).gridTemplateColumns.split(" ")
            .length,
          header: document.querySelector(
            ".discern-related-content__inner > header > span",
          )!.getBoundingClientRect().left,
          eyebrow: document.querySelector(
            ".discern-related-content article > span",
          )!.getBoundingClientRect().left,
        };
      }),
    390,
  );
  assertEquals(layout.columns, 1, JSON.stringify(layout));
  assert(
    Math.abs(layout.header - layout.eyebrow) < 1,
    `header and card eyebrows do not share a column: ${JSON.stringify(layout)}`,
  );
});

Deno.test("Chart and Diagram paint no canvas box and focus with the foundation group ring", async () => {
  const chart = barFixtures[1];
  const diagram = flowFixtures[1];
  assert(chart !== undefined && diagram !== undefined);
  for (const theme of ["light", "dark"] as const) {
    const plots = await inspectReading(
      renderToStaticMarkup(
        <>
          <Chart spec={chart} />
          <Diagram spec={diagram} />
        </>,
      ),
      async (page) => {
        const fills = await page.evaluate(() =>
          [".discern-chart__canvas", ".discern-diagram__canvas"].map(
            (selector) =>
              getComputedStyle(document.querySelector(selector)!).fill,
          )
        );
        const rings = [];
        for (let index = 0; index < 2; index++) {
          await page.keyboard.press("Tab");
          // Reduced motion still runs a 0.01ms transition; let it settle.
          await page.evaluate(() =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
          );
          rings.push(
            await page.locator(":focus").evaluate((element) => {
              const style = getComputedStyle(element);
              return {
                viewport: element.className,
                style: style.outlineStyle,
                offset: style.outlineOffset,
              };
            }),
          );
        }
        return { fills, rings };
      },
      720,
      theme,
    );
    for (const fill of plots.fills) {
      assertEquals(
        fill,
        "rgba(0, 0, 0, 0)",
        `${theme} ${JSON.stringify(plots)}`,
      );
    }
    assertEquals(
      plots.rings.map(({ viewport }) => viewport),
      ["discern-chart__viewport", "discern-diagram__viewport"],
    );
    for (const ring of plots.rings) {
      assertEquals(ring.style, "solid", JSON.stringify(plots));
      assertEquals(ring.offset, "-2px", JSON.stringify(plots));
    }
  }
});

Deno.test("Callout tones carry their edge, stay calm in dark, and keep actions raised", async () => {
  const tones = ["note", "insight", "warning", "success"] as const;
  for (const theme of ["light", "dark"] as const) {
    for (const accent of [false, true]) {
      const paint = await inspectReading(
        renderToStaticMarkup(
          <>
            {tones.map((tone) => (
              <Callout
                key={tone}
                tone={tone}
                title="Context"
                actions={<Button variant="secondary" size="sm">Review</Button>}
              >
                <p>Body.</p>
              </Callout>
            ))}
            <KeyPoints
              title="Summary"
              items={[{ title: "One", description: "Evidence." }]}
            />
          </>,
        ),
        (page) =>
          page.evaluate(() => {
            const main = document.querySelector("main")!;
            const canvas = document.createElement("canvas").getContext("2d")!;
            const paintOver = (...layers: string[]) => {
              canvas.clearRect(0, 0, 1, 1);
              for (const layer of layers) {
                canvas.fillStyle = layer;
                canvas.fillRect(0, 0, 1, 1);
              }
              return [...canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)];
            };
            const luminance = (rgb: number[]) => {
              const [r, g, b] = rgb.map((channel) => {
                const c = channel / 255;
                return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
              });
              return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
            };
            const ratio = (a: number[], b: number[]) => {
              const [lighter, darker] = [luminance(a), luminance(b)].sort((
                x,
                y,
              ) => y - x);
              return (lighter! + 0.05) / (darker! + 0.05);
            };
            const probe = document.createElement("div");
            probe.style.transition = "none";
            main.append(probe);
            const role = (name: string) => {
              probe.style.color = `var(--discern-color-${name})`;
              return getComputedStyle(probe).color;
            };
            const ground = getComputedStyle(main).backgroundColor;
            const surface = paintOver(ground, role("surface"));
            const panels = [
              ...document.querySelectorAll(".discern-callout"),
              document.querySelector(".discern-key-points")!,
            ];
            return {
              hairline: role("border"),
              panels: panels.map((panel) => {
                const style = getComputedStyle(panel);
                const fill = paintOver(ground, style.backgroundColor);
                const button = panel.querySelector(".discern-button");
                return {
                  edge: style.borderTopColor,
                  slab: ratio(fill, surface),
                  raised: button === null ? null : luminance(
                    paintOver(
                      ground,
                      style.backgroundColor,
                      getComputedStyle(button).backgroundColor,
                    ),
                  ) > luminance(fill),
                };
              }),
            };
          }),
        720,
        theme,
        accent,
      );
      const label = `${theme}${accent ? " accent" : ""} ${
        JSON.stringify(paint)
      }`;
      const [note, ...toned] = paint.panels.slice(0, tones.length);
      assertEquals(note!.edge, paint.hairline, label);
      for (const panel of toned) assert(panel.edge !== paint.hairline, label);
      for (const panel of paint.panels) {
        assert(
          panel.slab < 1.3,
          `a reading-block fill reads as a slab: ${label}`,
        );
        if (panel.raised !== null) {
          assert(panel.raised, `an action sinks into its panel: ${label}`);
        }
      }
    }
  }
});

Deno.test("reading blocks route owned labels and copy glyphs through their authorities", () => {
  const header = renderToStaticMarkup(
    <ArticleHeader eyebrow="Field note" title="Title" standfirst="Lead." />,
  );
  assertStringIncludes(
    header,
    '<span class="discern-kicker discern-article-header__eyebrow">',
  );
  const supplied = renderToStaticMarkup(
    <ArticleHeader
      eyebrow={<em>Issue 08</em>}
      title="Title"
      standfirst="Lead."
    />,
  );
  assertStringIncludes(
    supplied,
    '<div class="discern-article-header__eyebrow"><em>Issue 08</em></div>',
  );
  const listing = renderToStaticMarkup(
    <CodeListing filename="example.ts" code="const value = 1;" />,
  );
  for (const glyph of ["copy", "status-complete"] as const) {
    assertStringIncludes(listing, getGlyph(glyph).unicode);
  }
  const points = renderToStaticMarkup(
    <KeyPoints
      title="Summary"
      items={[{ title: "One", description: <div>Consumer block</div> }]}
    />,
  );
  assertStringIncludes(
    points,
    '<div class="discern-key-points__description"><div>Consumer block</div></div>',
  );
});

Deno.test("standalone reading blocks share the quiet Prose link underline", async () => {
  const links = await inspectReading(
    renderToStaticMarkup(
      <>
        <Prose>
          <p>
            A <a href="#prose">prose link</a>.
          </p>
        </Prose>
        <Paragraph>
          A <a href="#paragraph">paragraph link</a>.
        </Paragraph>
        <Footnotes
          items={[{
            id: "source",
            content: (
              <>
                See <a href="#note">the source</a>.
              </>
            ),
          }]}
        />
      </>,
    ),
    (page) =>
      page.locator('a[href="#prose"], a[href="#paragraph"], a[href="#note"]')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const style = getComputedStyle(element);
            return {
              decoration: style.textDecorationColor,
              ink: style.color,
              thickness: parseFloat(style.textDecorationThickness) /
                parseFloat(style.fontSize),
            };
          })
        ),
  );
  assertEquals(links.length, 3);
  assertEquals(
    new Set(links.map((link) => link.decoration)).size,
    1,
    JSON.stringify(links),
  );
  for (const link of links) {
    assert(link.decoration !== link.ink, JSON.stringify(links));
    assert(
      Math.abs(link.thickness - links[0]!.thickness) < 0.005,
      JSON.stringify(links),
    );
  }
});
