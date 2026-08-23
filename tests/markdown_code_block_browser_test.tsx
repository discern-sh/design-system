import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { Markdown } from "../src/react.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + 32_768)),
    );
  }
  return btoa(chunks.join(""));
}

Deno.test("Markdown code blocks pin Unicode advances to terminal cells", async () => {
  const lines = [
    "┌──────────────────┐",
    "│ ASCII content    │",
    "└──────────────────┘",
    "╭──────────────────╮",
    "│ sibling 界🎨     │",
    "╰──────────────────╯",
  ];
  const code = lines.join("\n");
  const markup = renderToStaticMarkup(
    <Markdown source={`\`\`\`text\n${code}\n\`\`\``} />,
  );
  const font = encodeBase64(
    await Deno.readFile(`${PACKAGE_ROOT}/assets/fonts/jetbrains-mono.woff2`),
  );
  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(`
      <style>
        @font-face {
          font-family: "Fixture Mono";
          src: url(data:font/woff2;base64,${font}) format("woff2");
        }
        code {
          font: 16px/1.5 "Fixture Mono", serif;
          white-space: pre;
        }
      </style>
      <main data-discern-root>${markup}</main>
    `);
    await page.evaluate(async () => await document.fonts.ready);
    const facts = await page.locator(".discern-code-block > code").evaluate(
      (element, expectedLines) => {
        const text = element.textContent ?? "";
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
        );
        for (
          let node = walker.nextNode();
          node !== null;
          node = walker.nextNode()
        ) {
          textNodes.push(node as Text);
        }
        const boundary = (offset: number): { node: Text; offset: number } => {
          let consumed = 0;
          for (const node of textNodes) {
            const next = consumed + node.data.length;
            if (offset <= next) return { node, offset: offset - consumed };
            consumed = next;
          }
          const finalNode = textNodes.at(-1);
          if (finalNode === undefined) throw new Error("missing code text");
          return { node: finalNode, offset: finalNode.data.length };
        };
        let start = 0;
        const widths = expectedLines.map((line) => {
          const from = boundary(start);
          const to = boundary(start + line.length);
          const range = document.createRange();
          range.setStart(from.node, from.offset);
          range.setEnd(to.node, to.offset);
          start += line.length + 1;
          return range.getBoundingClientRect().width;
        });
        return {
          text,
          widths,
          cells: element.querySelectorAll("[data-discern-terminal-cell]")
            .length,
        };
      },
      lines,
    );

    assertEquals(facts.text, code);
    assert(facts.cells > 0, "Unicode graphemes need explicit cell boxes");
    for (const [index, width] of facts.widths.entries()) {
      assert(
        Math.abs(width - (facts.widths[0] ?? 0)) <= 0.5,
        `logical ${lines[index]?.length}-cell row ${
          index + 1
        } drifted to ${width}px`,
      );
    }
  } finally {
    await browser.close();
  }
});
