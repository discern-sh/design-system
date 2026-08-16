import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { CodeBlock } from "../src/components/editorial/code-block/code-block.tsx";
import codeBlockMeta from "../src/components/editorial/code-block/code-block.meta.ts";

Deno.test("Code block renders literal source as native preformatted code", () => {
  const code = "\n\tconst markup = `<tag>&`;\n\n";
  const html = renderToStaticMarkup(
    <CodeBlock
      id="literal-source"
      className="consumer-code"
      data-reading-order="first"
      code={code}
      language="html"
      info="example"
    />,
  );

  assertMatch(html, /^<pre /);
  assertStringIncludes(html, 'class="discern-code-block consumer-code"');
  assertStringIncludes(html, 'id="literal-source"');
  assertStringIncludes(html, 'data-reading-order="first"');
  assertStringIncludes(
    html,
    '<code data-discern-code-block-language="html" data-discern-code-block-info="example">',
  );
  assertStringIncludes(html, "\n\tconst markup = `&lt;tag&gt;&amp;`;\n\n");
  assert(!html.includes("<figure"));
  assert(!html.includes("data-line"));
  assertMatch(html, /<pre [^>]*><code [^>]*>[\s\S]*<\/code><\/pre>$/);
});

Deno.test("Code block keeps empty source and omits absent information hooks", () => {
  assertEquals(
    renderToStaticMarkup(<CodeBlock code="" />),
    '<pre class="discern-code-block"><code></code></pre>',
  );
});

Deno.test("Code block metadata guards neighbouring source and output semantics", () => {
  assertEquals(codeBlockMeta.order, 75);
  assertEquals(codeBlockMeta.cli, { stance: "rendered" });
  const alternatives = codeBlockMeta.notWhen?.join(" ") ?? "";
  for (const name of ["Code listing", "Terminal", "Raw output"]) {
    assert(
      alternatives.includes(name),
      `Code block metadata does not distinguish ${name}`,
    );
  }
  assert(
    codeBlockMeta.useWhen?.some((guidance) =>
      guidance.includes("every code character")
    ),
  );
  assert(
    codeBlockMeta.accessibility?.some((note) =>
      note.includes("four-cell tab stops")
    ),
  );
});
