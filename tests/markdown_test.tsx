import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../src/cli/ansi.ts";
import { testTerminalCapabilities } from "../src/cli/interactive/testing.ts";
import { renderMarkdownCli } from "../src/cli/mod.ts";
import type { SemanticInlineContent } from "../src/cli/semantic-inline.ts";
import {
  type MarkdownBlock,
  parseMarkdown,
} from "../src/components/editorial/markdown/markdown.model.ts";
import { markdownFixtures } from "../src/fixtures/markdown.ts";
import {
  Markdown,
  MarkdownParseError,
  type MarkdownProps,
} from "../src/react.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";

const markdownAcceptsDangerousHtml: "dangerouslySetInnerHTML" extends
  keyof MarkdownProps ? true : false = false;

function assertNever(value: never): never {
  throw new TypeError(
    "unhandled semantic test node: " + JSON.stringify(value),
  );
}

function collectInlineFacts(
  content: SemanticInlineContent,
  facts: string[],
): void {
  const nodes = typeof content === "string" ? [content] : content;
  for (const node of nodes) {
    if (typeof node === "string") {
      facts.push(node);
      continue;
    }
    switch (node.kind) {
      case "text":
      case "literal":
      case "code":
        facts.push(node.text);
        break;
      case "emphasis":
      case "strong":
      case "strikethrough":
        collectInlineFacts(node.content, facts);
        break;
      case "link":
        collectInlineFacts(node.label, facts);
        facts.push(node.destination);
        break;
      case "image":
        facts.push(node.alt, node.source);
        break;
      case "footnote-reference":
        facts.push(node.label ?? node.identifier);
        break;
      case "soft-break":
      case "hard-break":
        break;
      default:
        assertNever(node);
    }
  }
}

function collectBlockFacts(block: MarkdownBlock, facts: string[]): void {
  switch (block.kind) {
    case "paragraph":
    case "heading":
      collectInlineFacts(block.content, facts);
      break;
    case "list":
      for (const item of block.items) {
        if (item.content !== undefined) {
          collectInlineFacts(item.content, facts);
        }
        for (const child of item.blocks) collectBlockFacts(child, facts);
      }
      break;
    case "blockquote":
      for (const child of block.children) collectBlockFacts(child, facts);
      break;
    case "callout":
      facts.push(block.title);
      for (const child of block.children) collectBlockFacts(child, facts);
      break;
    case "code":
      facts.push(block.code);
      if (block.language !== undefined) facts.push(block.language);
      if (block.info !== undefined) facts.push(block.info);
      break;
    case "thematic-break":
      break;
    case "table":
      for (const column of block.columns) {
        collectInlineFacts(column.header, facts);
      }
      for (const row of block.rows) {
        for (const cell of row) collectInlineFacts(cell, facts);
      }
      break;
    case "footnotes":
      for (const item of block.items) {
        facts.push(item.label);
        for (const child of item.children) collectBlockFacts(child, facts);
        for (const returnId of item.returnIds) {
          facts.push("#" + returnId);
        }
      }
      break;
    case "diagram":
    case "chart":
      facts.push(block.source, block.spec.title, block.spec.summary);
      break;
    default:
      assertNever(block);
  }
}

function decodeHtmlText(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

function semanticFingerprint(value: string): string {
  return value.normalize("NFKC").toLowerCase().replaceAll(
    /[^\p{L}\p{N}]+/gu,
    "",
  );
}

Deno.test("Markdown is public and composes complete native browser semantics", () => {
  assert(MarkdownParseError.prototype instanceof TypeError);
  const hardBreakSuffix = "  ";
  const source = `# Document **title**

Paragraph with *emphasis*, \`code\`, a [link](https://example.test), and a hard break.${hardBreakSuffix}
Next line.

> Quotation

> [!TIP]
> Helpful alert.

3. [x] Ordered task
4. Plain item

\`\`\`ts module
const ready = true;
\`\`\`

| Name | Status | Value |
| :--- | :----: | ----: |
| state | ready | 1 |

---

A note[^proof].

[^proof]: Evidence.`;
  const html = renderToStaticMarkup(
    <Markdown source={source} id="document" className="consumer-markdown" />,
  );

  assertMatch(html, /^<div /);
  assertStringIncludes(
    html,
    'class="discern-prose discern-prose--default discern-markdown consumer-markdown"',
  );
  assertStringIncludes(
    html,
    '<h1 class="discern-heading" id="document-title">',
  );
  assertStringIncludes(html, "<strong>title</strong>");
  assertStringIncludes(html, '<p class="discern-paragraph">');
  assertStringIncludes(html, "<em>emphasis</em>");
  assertStringIncludes(html, "<code>code</code>");
  assertStringIncludes(html, '<a href="https://example.test">link</a>');
  assertStringIncludes(html, "<br/>");
  assertStringIncludes(html, '<blockquote class="discern-blockquote">');
  assertStringIncludes(
    html,
    'class="discern-callout discern-callout--success"',
  );
  assertStringIncludes(html, "<h3>Tip</h3>");
  assertStringIncludes(html, '<ol class="discern-list discern-list--ordered');
  assertStringIncludes(html, 'start="3"');
  assertStringIncludes(html, 'type="checkbox"');
  assertStringIncludes(
    html,
    '<pre class="discern-code-block" role="group" aria-label="Scrollable code block: ts · module" tabindex="0"><code',
  );
  assertStringIncludes(html, 'data-discern-code-block-language="ts"');
  assertStringIncludes(html, 'data-discern-code-block-info="module"');
  assertStringIncludes(
    html,
    '<div class="discern-table" role="group" aria-label="Scrollable table viewport" tabindex="0"><table>',
  );
  assertStringIncludes(
    html,
    '<th scope="col" data-discern-table-align="start">',
  );
  assertStringIncludes(
    html,
    '<th scope="col" data-discern-table-align="center">',
  );
  assertStringIncludes(
    html,
    '<td data-discern-table-align="center">ready</td>',
  );
  assertStringIncludes(
    html,
    '<td data-discern-table-align="end">1</td>',
  );
  assertStringIncludes(html, 'role="separator"');
  assertStringIncludes(html, '<section class="discern-footnotes">');
  assertStringIncludes(html, 'id="fnref-1"');
  assertStringIncludes(html, 'href="#fn-1"');
  assertStringIncludes(html, 'id="fn-1"');
  assertStringIncludes(html, 'href="#fnref-1"');
  assertStringIncludes(html, 'aria-label="See note 1, reference 1"');
  assertStringIncludes(html, 'aria-label="Return from note 1 to reference 1"');
});

Deno.test("Markdown selection generates every real Component dependency", () => {
  const markdown = componentRegistry.find(({ meta }) =>
    meta.slug === "markdown"
  );
  assert(markdown !== undefined);
  assertEquals(markdown.dependencies, [
    "divider",
    "heading",
    "table",
    "prose",
    "paragraph",
    "list",
    "blockquote",
    "callout",
    "code-block",
    "chart",
    "diagram",
    "footnotes",
  ]);
});

Deno.test("Markdown heading ids share rich visible content and duplicate-safe GitHub slugs", () => {
  const html = renderToStaticMarkup(
    <Markdown
      source={[
        "# Your **files** / Yours",
        "## Bookkeeping & integration",
        "## public_doc_leaf_density",
        "## Repeat",
        "## Repeat",
      ].join("\n")}
    />,
  );
  for (
    const id of [
      "your-files--yours",
      "bookkeeping--integration",
      "public_doc_leaf_density",
      "repeat",
      "repeat-1",
    ]
  ) {
    assertStringIncludes(html, `id="${id}"`);
  }
  assertStringIncludes(html, "Your <strong>files</strong> / Yours");
});

Deno.test("Markdown keeps raw HTML and hostile controls literal and destinations inert", async () => {
  const source = [
    '<script data-action="run">alert("no")</script>',
    "",
    "Before <!-- private comment --> after.",
    "",
    "<!-- adjacent comment --><b>adjacent literal</b>",
    "",
    "[Unsafe](javascript:alert(1)) ![Unsafe](data:text/html,boom)",
    "",
    "Control [31mred[0m‮",
  ].join("\n");
  const html = renderToStaticMarkup(<Markdown source={source} />);

  assertEquals(markdownAcceptsDangerousHtml, false);
  assert(!html.includes("<script"));
  assertStringIncludes(
    html,
    "&lt;script data-action=&quot;run&quot;&gt;alert(&quot;no&quot;)&lt;/script&gt;",
  );
  assert(!html.includes("private comment"));
  assert(!html.includes("adjacent comment"));
  assertStringIncludes(html, "&lt;b&gt;adjacent literal&lt;/b&gt;");
  assert(!html.includes('href="javascript:'));
  assert(!html.includes('src="data:'));
  assertStringIncludes(html, "Unsafe (javascript:alert(1))");
  assertStringIncludes(html, "Image: Unsafe (data:text/html,boom)");
  assertStringIncludes(html, "\\u{1B}[31mred\\u{1B}[0m\\u{202E}");
  assert(!/[\p{Cc}\p{Cf}]/u.test(html));

  const implementation = await Deno.readTextFile(
    new URL(
      "../src/components/editorial/markdown/markdown.tsx",
      import.meta.url,
    ),
  );
  assert(!/dangerouslySetInnerHTML\s*=/u.test(implementation));
});

Deno.test("Markdown emits only validated link and image attributes with required alt semantics", () => {
  const html = renderToStaticMarkup(
    <Markdown
      source={[
        "[Fragment](#part) [Relative](../guide?q=1)",
        "",
        '![Diagram](https://例.test/図.png "A source diagram")',
        "",
        "![](./decorative.png)",
      ].join("\n")}
    />,
  );
  assertStringIncludes(html, 'href="#part"');
  assertStringIncludes(html, 'href="../guide?q=1"');
  assertStringIncludes(
    html,
    'src="https://%E4%BE%8B.test/%E5%9B%B3.png"',
  );
  assertStringIncludes(html, 'alt="Diagram"');
  assertStringIncludes(html, 'title="A source diagram"');
  assertStringIncludes(html, 'src="./decorative.png" alt=""');
  assertEquals(html.match(/<img/g)?.length, html.match(/ alt=/g)?.length);
});

Deno.test("Markdown repeated footnotes keep ordered references and descriptive returns", () => {
  const html = renderToStaticMarkup(
    <Markdown
      source={[
        "First[^proof], second[^proof].",
        "",
        "[^proof]: Paragraph one.",
        "",
        "    Paragraph two.",
      ].join("\n")}
    />,
  );
  assertStringIncludes(html, 'id="fnref-1"');
  assertStringIncludes(html, 'id="fnref-1-2"');
  assertEquals(html.match(/href="#fn-1"/g)?.length, 2);
  assertStringIncludes(html, 'href="#fnref-1"');
  assertStringIncludes(html, 'href="#fnref-1-2"');
  assertStringIncludes(html, "Paragraph one.");
  assertStringIncludes(html, "Paragraph two.");
});

Deno.test("shared fixture documents retain the same semantic facts in React and CLI", () => {
  const capabilities = testTerminalCapabilities({
    columns: 160,
    colorDepth: "none",
    unicode: false,
    hyperlinks: false,
  });
  for (const fixture of markdownFixtures) {
    const document = parseMarkdown(fixture.source);
    const html = renderToStaticMarkup(<Markdown source={fixture.source} />);
    const terminal = renderMarkdownCli({
      source: fixture.source,
      maxWidth: 160,
    }, capabilities);
    assertEquals(
      html === "",
      document.children.length === 0,
      fixture.id + ": React emptiness diverged from the neutral document",
    );
    assertEquals(
      terminal === "",
      document.children.length === 0,
      fixture.id + ": CLI emptiness diverged from the neutral document",
    );

    const facts: string[] = [];
    for (const block of document.children) collectBlockFacts(block, facts);
    const browserFingerprint = semanticFingerprint(decodeHtmlText(html));
    const terminalFingerprint = semanticFingerprint(stripAnsi(terminal));
    for (const rawFact of new Set(facts)) {
      const fact = semanticFingerprint(rawFact);
      if (fact.length < 2) continue;
      assertStringIncludes(
        browserFingerprint,
        fact,
        fixture.id + ": React omitted the shared fact " + rawFact,
      );
      assertStringIncludes(
        terminalFingerprint,
        fact,
        fixture.id + ": CLI omitted the shared fact " + rawFact,
      );
    }
  }
});

Deno.test("empty headings and marker-only alerts remain valid semantic blocks", () => {
  const source = "#\n\n> [!NOTE]\n";
  const html = renderToStaticMarkup(<Markdown source={source} />);
  assertStringIncludes(
    html,
    '<h1 class="discern-heading" id="section"></h1>',
  );
  assertStringIncludes(
    html,
    '<aside class="discern-callout discern-callout--note" role="note">',
  );
  assertStringIncludes(html, "<h3>Note</h3>");

  assertEquals(
    renderMarkdownCli(
      { source },
      testTerminalCapabilities({
        columns: 40,
        colorDepth: "none",
        unicode: true,
        hyperlinks: false,
      }),
    ),
    [
      "# ",
      "",
      "┌ Note ────────────────────────────────┐",
      "│                                      │",
      "└──────────────────────────────────────┘",
    ].join("\n"),
  );
});

Deno.test("empty or whitespace-only Markdown renders no browser wrapper", () => {
  const whitespaceSource = " \n\t\n";
  assertEquals(renderToStaticMarkup(<Markdown source="" />), "");
  assertEquals(
    renderToStaticMarkup(<Markdown source={whitespaceSource} />),
    "",
  );
});
