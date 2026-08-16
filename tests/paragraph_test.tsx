import { assert, assertMatch, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Paragraph } from "../src/components/editorial/paragraph/paragraph.tsx";
import paragraphMeta from "../src/components/editorial/paragraph/paragraph.meta.ts";

Deno.test("Paragraph renders one native paragraph with ordinary phrasing semantics", () => {
  const html = renderToStaticMarkup(
    <Paragraph
      id="summary"
      className="consumer-paragraph"
      data-reading-order="first"
    >
      A <strong>clear claim</strong> with <em>supporting nuance</em>,{" "}
      <s>old wording</s>, <code>inline detail</code>, and{" "}
      <a href="#note-1">one reference</a>.
      <img src="/diagram.svg" alt="Measured line diagram" />
      <sup id="note-1">1</sup>
    </Paragraph>,
  );

  assertMatch(html, /^<p /);
  assertStringIncludes(
    html,
    'class="discern-paragraph consumer-paragraph"',
  );
  assertStringIncludes(html, 'id="summary"');
  assertStringIncludes(html, 'data-reading-order="first"');
  assertStringIncludes(html, "<strong>clear claim</strong>");
  assertStringIncludes(html, "<em>supporting nuance</em>");
  assertStringIncludes(html, "<s>old wording</s>");
  assertStringIncludes(html, "<code>inline detail</code>");
  assertStringIncludes(html, '<a href="#note-1">one reference</a>');
  assertStringIncludes(html, 'alt="Measured line diagram"');
  assert(!html.includes("<div"));
  assertMatch(html, /<\/p>$/);
});

Deno.test("Paragraph metadata guards its neighbouring semantic choices", () => {
  const alternatives = paragraphMeta.notWhen?.join(" ") ?? "";
  for (const name of ["Prose", "Callout", "Heading", "preformatted"]) {
    assert(
      alternatives.includes(name),
      `Paragraph metadata does not distinguish ${name}`,
    );
  }
  assert(
    paragraphMeta.useWhen?.some((guidance) =>
      guidance.includes("semantic unit")
    ),
  );
  assert(
    paragraphMeta.accessibility?.some((note) =>
      note.includes("native paragraph")
    ),
  );
});
