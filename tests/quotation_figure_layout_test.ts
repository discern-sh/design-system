import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locator, Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { withViewport } from "../scripts/viewport.ts";
import { registry } from "../catalogue/generated/registry.ts";
import { DataFigure, VoiceBreak } from "../src/react.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { componentGroups } from "../src/types/component-meta.ts";

async function quotationOverlaps(page: Page) {
  return await page.evaluate(() => {
    const overlaps: string[] = [];
    for (const quote of document.querySelectorAll("blockquote")) {
      const walker = document.createTreeWalker(quote, NodeFilter.SHOW_TEXT);
      let first: Text | undefined;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (
          node.textContent?.trim() &&
          !node.parentElement?.closest('[aria-hidden="true"]')
        ) {
          first = node;
          break;
        }
      }
      if (!first) continue;
      const range = document.createRange();
      const offset = first.textContent!.search(/\S/u);
      range.setStart(first, offset);
      range.setEnd(first, offset + 1);
      const letter = range.getBoundingClientRect();
      const markers = [
        ...quote.querySelectorAll('[aria-hidden="true"]'),
        ...quote.parentElement!.querySelectorAll(
          ':scope > [aria-hidden="true"]',
        ),
      ]
        .filter((node) => node.textContent === "“")
        .map((node) => node.getBoundingClientRect());
      const before = getComputedStyle(quote, "::before");
      if (before.position === "absolute" && before.content.includes("“")) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font =
          `${before.fontWeight} ${before.fontSize} ${before.fontFamily}`;
        const box = quote.getBoundingClientRect();
        const width = context.measureText("“").width;
        const left = before.left === "auto"
          ? box.right - parseFloat(before.right) - width
          : box.left + parseFloat(before.left);
        const top = box.top + parseFloat(before.top);
        markers.push(
          new DOMRect(left, top, width, parseFloat(before.lineHeight)),
        );
      }
      if (
        markers.some((mark) =>
          mark.left < letter.right - 0.5 &&
          mark.right > letter.left + 0.5 && mark.top < letter.bottom &&
          mark.bottom > letter.top
        )
      ) {
        overlaps.push(quote.textContent!.trim());
      }
      if (
        markers.some((mark) =>
          mark.bottom <= letter.top || mark.top >= letter.bottom
        )
      ) {
        overlaps.push(
          `${quote.textContent!.trim()}: opening mark detached from first line`,
        );
      }
    }
    return overlaps;
  });
}

Deno.test("opening quotation marks stay clear of the first letter and voice breaks respect the display hierarchy", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: componentGroups,
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const examples = registry.flatMap((entry) =>
      entry.webExamples.map((example) =>
        renderToStaticMarkup(createElement(example.Example))
      )
    ).filter((html) => html.includes("<blockquote"));
    examples.push(renderToStaticMarkup(createElement(VoiceBreak, {
      quote: "A good plan leaves room for the people doing the work.",
      attribution: "A maker",
    })));
    examples.push(renderToStaticMarkup(createElement(VoiceBreak, {
      quote: createElement(
        "p",
        null,
        "A paragraph with ",
        createElement("em", null, "careful emphasis"),
        ".",
      ),
      attribution: "A writer",
    })));
    const page = await browser.newPage();
    for (const width of [390, 1120, 2200]) {
      await withViewport(page, { width, height: 900 }, async () => {
        for (const rootSize of [16, 24]) {
          await page.setContent(
            `<html data-discern-root><style>${css}html{font-size:${rootSize}px}</style><body>${
              examples.join("")
            }</body></html>`,
          );
          assertEquals(
            await quotationOverlaps(page),
            [],
            `quotation overlap at ${width}/${rootSize}`,
          );
          const sizes = await page.locator(".discern-voice-break__quote")
            .evaluateAll((nodes) =>
              nodes.map((node) => ({
                size: parseFloat(getComputedStyle(node).fontSize),
                ceiling: parseFloat(
                  getComputedStyle(document.documentElement).fontSize,
                ) *
                  parseFloat(
                    getComputedStyle(node).getPropertyValue(
                      "--discern-font-size-display-lg",
                    ),
                  ),
              }))
            );
          assert(
            sizes.every(({ size, ceiling }) => size <= ceiling + 0.1),
            "a voice break must not exceed the large display role",
          );
        }
      });
    }
    await page.setContent(
      '<style>.future-remark{position:relative;font:64px Georgia}.future-remark::before{content:"“";position:absolute;left:-2px;top:0;line-height:1}</style><blockquote class="future-remark">A future quotation</blockquote>',
    );
    assertEquals(await quotationOverlaps(page), ["A future quotation"]);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

async function emptyVisualSpace(slot: Locator): Promise<number> {
  return await slot.evaluate((node) => {
    const style = getComputedStyle(node);
    return node.getBoundingClientRect().height -
      node.firstElementChild!.getBoundingClientRect().height -
      parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  });
}

Deno.test("figure visual slots follow their content height without reserving an empty stage", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["data-figure"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage();
    for (const height of [32, 480]) {
      const html = renderToStaticMarkup(createElement(DataFigure, {
        title: "A content-sized figure",
        caption: "The content owns its height.",
        visual: createElement("div", { style: { height } }, "Figure content"),
      }));
      await page.setContent(
        `<html data-discern-root><style>${css}</style><body>${html}</body></html>`,
      );
      const emptyHeight = await emptyVisualSpace(
        page.locator(".discern-data-figure__visual"),
      );
      assert(
        Math.abs(emptyHeight) < 1,
        `visual slot reserved ${emptyHeight}px beyond its content and padding`,
      );
    }
    await page.setContent(
      '<figure><section class="future-stage" style="min-height:256px;padding:24px"><div style="height:32px">A short visual</div></section></figure>',
    );
    assert(
      await emptyVisualSpace(page.locator(".future-stage")) > 100,
      "the geometry detector rejects an unrelated stage with the same reserved-space mechanism",
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
