import { assert, assertMatch, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Blockquote } from "../src/components/editorial/blockquote/blockquote.tsx";
import blockquoteMeta from "../src/components/editorial/blockquote/blockquote.meta.ts";
import { Paragraph } from "../src/components/editorial/paragraph/paragraph.tsx";

Deno.test("Blockquote renders a native quotation around arbitrary semantic blocks", () => {
  const html = renderToStaticMarkup(
    <Blockquote
      id="ordinary-quotation"
      className="consumer-quotation"
      data-reading-order="second"
    >
      <Paragraph>
        Quoted <strong>prose</strong> keeps its phrasing semantics.
      </Paragraph>
      <ul>
        <li>One supporting item</li>
      </ul>
      <h3>A heading inside the quotation</h3>
      <pre><code>const complete = true;</code></pre>
      <Blockquote>
        <p>A quotation may itself be quoted.</p>
      </Blockquote>
    </Blockquote>,
  );

  assertMatch(html, /^<blockquote /);
  assertStringIncludes(
    html,
    'class="discern-blockquote consumer-quotation"',
  );
  assertStringIncludes(html, 'id="ordinary-quotation"');
  assertStringIncludes(html, 'data-reading-order="second"');
  assertStringIncludes(html, '<p class="discern-paragraph">');
  assertStringIncludes(html, "<ul><li>One supporting item</li></ul>");
  assertStringIncludes(html, "<h3>A heading inside the quotation</h3>");
  assertStringIncludes(html, "<pre><code>const complete = true;</code></pre>");
  assertStringIncludes(html, '<blockquote class="discern-blockquote">');
  assert(!html.includes("<figure"));
  assert(!html.includes("<cite"));
  assert(!html.includes("“"));
  assert(!html.includes("”"));
  assertMatch(html, /<\/blockquote>$/);
});

Deno.test("Blockquote forwards ordinary blockquote attributes without inventing presentation semantics", () => {
  const html = renderToStaticMarkup(
    <Blockquote lang="fr" dir="ltr" title="Source excerpt">
      <p>Une citation ordinaire.</p>
    </Blockquote>,
  );

  assertStringIncludes(html, 'lang="fr"');
  assertStringIncludes(html, 'dir="ltr"');
  assertStringIncludes(html, 'title="Source excerpt"');
  assert(!html.includes('role="'));
  assert(!html.includes("figcaption"));
});

Deno.test("Blockquote metadata guards Pull quote and Callout boundaries", () => {
  assert(
    blockquoteMeta.useWhen?.some((guidance) =>
      guidance.includes("ordinary semantic blocks")
    ),
  );
  const alternatives = blockquoteMeta.notWhen?.join(" ") ?? "";
  for (const name of ["Pull quote", "Callout"]) {
    assert(
      alternatives.includes(name),
      `Blockquote metadata does not distinguish ${name}`,
    );
  }
  assert(
    blockquoteMeta.accessibility?.some((note) =>
      note.includes("native blockquote")
    ),
  );
});
