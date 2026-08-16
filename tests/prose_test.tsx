import { assert, assertMatch, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Prose } from "../src/components/editorial/prose/prose.tsx";
import proseMeta from "../src/components/editorial/prose/prose.meta.ts";

Deno.test("Prose preserves caller-owned block and phrasing semantics inside its reading context", () => {
  const html = renderToStaticMarkup(
    <Prose
      id="reading-context"
      className="consumer-prose"
      data-purpose="guide"
      lead
      dropCap
      measure="wide"
    >
      <p>
        A <strong>clear opening</strong> with an <a href="#source">anchor</a>.
      </p>
      <h2 id="source">Evidence</h2>
      <ul>
        <li>One structural item</li>
      </ul>
      <blockquote>
        <p>A nested quotation.</p>
      </blockquote>
      <pre><code>const complete = true;</code></pre>
    </Prose>,
  );

  assertMatch(html, /^<div /);
  assertStringIncludes(
    html,
    "discern-prose discern-prose--wide discern-prose--drop-cap discern-prose--lead consumer-prose",
  );
  assertStringIncludes(html, 'id="reading-context"');
  assertStringIncludes(html, 'data-purpose="guide"');
  assertStringIncludes(html, "<strong>clear opening</strong>");
  assertStringIncludes(html, '<a href="#source">anchor</a>');
  assertStringIncludes(html, '<h2 id="source">Evidence</h2>');
  assertStringIncludes(html, "<ul><li>One structural item</li></ul>");
  assertStringIncludes(
    html,
    "<blockquote><p>A nested quotation.</p></blockquote>",
  );
  assertStringIncludes(html, "<pre><code>const complete = true;</code></pre>");
  assertMatch(html, /<\/div>$/);
});

Deno.test("Prose metadata distinguishes a reading context from its semantic children", () => {
  assert(
    proseMeta.useWhen?.some((guidance) => guidance.includes("Several")),
  );
  const alternatives = proseMeta.notWhen?.join(" ") ?? "";
  for (const name of ["Paragraph", "Heading"]) {
    assert(
      alternatives.includes(name),
      `Prose metadata does not distinguish ${name}`,
    );
  }
  assert(
    proseMeta.accessibility?.some((note) =>
      note.includes("child Component structure")
    ),
  );
});
