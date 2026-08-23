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
      (element, expectedLineCount) => {
        const rightEdges: Array<number | undefined> = Array.from(
          { length: expectedLineCount },
          () => undefined,
        );
        let row = 0;
        for (const node of element.childNodes) {
          if (
            node instanceof HTMLElement &&
            node.hasAttribute("data-discern-terminal-cell")
          ) {
            const right = node.getBoundingClientRect().right;
            const current = rightEdges[row];
            rightEdges[row] = current === undefined
              ? right
              : Math.max(current, right);
          } else if (node instanceof Text) {
            row += node.data.split("\n").length - 1;
          }
        }
        return {
          text: element.textContent ?? "",
          rightEdges,
          cells: element.querySelectorAll("[data-discern-terminal-cell]")
            .length,
        };
      },
      lines.length,
    );

    assertEquals(facts.text, code);
    assert(facts.cells > 0, "Unicode graphemes need explicit cell boxes");
    const firstRight = facts.rightEdges[0];
    if (firstRight === undefined) throw new Error("missing first code row");
    for (const [index, right] of facts.rightEdges.entries()) {
      if (right === undefined) {
        throw new Error(`missing terminal cell for code row ${index + 1}`);
      }
      assert(
        Math.abs(right - firstRight) <= 0.5,
        // A Range can include a fallback glyph's ink overhang; the terminal
        // cell span's border box is the layout geometry that must align.
        `logical terminal row ${index + 1} ended at ${right}px`,
      );
    }
  } finally {
    await browser.close();
  }
});
