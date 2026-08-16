import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type FootnoteItem,
  Footnotes,
} from "../src/components/editorial/footnotes/footnotes.tsx";
import footnotesMeta from "../src/components/editorial/footnotes/footnotes.meta.ts";

Deno.test("Footnotes retains ordered definitions, rich blocks, and its legacy return link", () => {
  const html = renderToStaticMarkup(
    <Footnotes
      id="sources"
      className="consumer-footnotes"
      data-reading-order="last"
      items={[{
        id: "note-alpha",
        content: (
          <>
            <p>
              Rich <strong>phrasing</strong> stays in its paragraph.
            </p>
            <ul>
              <li>A nested item.</li>
            </ul>
            <blockquote>
              <p>A qualification.</p>
            </blockquote>
            <pre><code>sample = complete</code></pre>
          </>
        ),
        backHref: "#note-alpha-ref",
      }]}
    />,
  );

  assertMatch(html, /^<section /);
  assertStringIncludes(
    html,
    'class="discern-footnotes consumer-footnotes"',
  );
  assertStringIncludes(html, 'id="sources"');
  assertStringIncludes(html, 'data-reading-order="last"');
  assertStringIncludes(html, "<h2>Notes &amp; sources</h2>");
  assertStringIncludes(html, '<ol><li id="note-alpha">');
  assertStringIncludes(
    html,
    "<p>Rich <strong>phrasing</strong> stays in its paragraph.</p>",
  );
  assertStringIncludes(html, "<ul><li>A nested item.</li></ul>");
  assertStringIncludes(
    html,
    "<blockquote><p>A qualification.</p></blockquote>",
  );
  assertStringIncludes(html, "<pre><code>sample = complete</code></pre>");
  assertStringIncludes(
    html,
    '<a href="#note-alpha-ref" aria-label="Return from note 1">↩</a>',
  );
  assertMatch(html, /<\/section>$/);
});

Deno.test("Footnotes exposes every repeated return target in source order", () => {
  const html = renderToStaticMarkup(
    <Footnotes
      title={<em>Detailed notes</em>}
      items={[{
        id: "repeated-note",
        content: <p>One definition serves both references.</p>,
        backReferences: [
          { href: "#repeated-note-ref-1", label: "a" },
          { href: "#repeated-note-ref-2", label: "b" },
        ],
      }]}
    />,
  );

  assertStringIncludes(html, "<h2><em>Detailed notes</em></h2>");
  assertStringIncludes(html, 'class="discern-footnotes__returns"');
  assertStringIncludes(
    html,
    '<a href="#repeated-note-ref-1" aria-label="Return from note 1 to reference 1">↩a</a>',
  );
  assertStringIncludes(
    html,
    '<a href="#repeated-note-ref-2" aria-label="Return from note 1 to reference 2">↩b</a>',
  );
  assertEquals(html.match(/Return from note 1 to reference/g)?.length, 2);
  assert(
    html.indexOf("#repeated-note-ref-1") <
      html.indexOf("#repeated-note-ref-2"),
  );
});

Deno.test("Footnotes rejects missing and duplicate ids or ambiguous return contracts", () => {
  assertThrows(
    () =>
      renderToStaticMarkup(
        <Footnotes
          items={[
            { content: <p>Missing identity.</p> } as unknown as FootnoteItem,
          ]}
        />,
      ),
    TypeError,
    "valid stable id",
  );
  assertThrows(
    () =>
      renderToStaticMarkup(
        <Footnotes
          items={[
            { id: "same", content: <p>First.</p> },
            { id: "same", content: <p>Second.</p> },
          ]}
        />,
      ),
    TypeError,
    "duplicate footnotes id",
  );
  assertThrows(
    () =>
      renderToStaticMarkup(
        <Footnotes
          items={[{
            id: "unsafe-return",
            content: <p>Definition.</p>,
            backReferences: [{ href: "javascript:alert(1)" }],
          }]}
        />,
      ),
    TypeError,
    "safe href and label",
  );
  assertThrows(
    () =>
      renderToStaticMarkup(
        <Footnotes
          items={[{
            id: "ambiguous-return",
            content: <p>Definition.</p>,
            backHref: "#first",
            backReferences: [{ href: "#second" }],
          }]}
        />,
      ),
    TypeError,
    "cannot combine",
  );
  assertThrows(
    () =>
      renderToStaticMarkup(
        <Footnotes
          items={[{
            id: "empty-returns",
            content: <p>Definition.</p>,
            backReferences: [],
          }]}
        />,
      ),
    TypeError,
    "non-empty array",
  );
});

Deno.test("Footnotes metadata distinguishes definitions from an ordinary List", () => {
  assert(
    footnotesMeta.useWhen?.some((guidance) =>
      guidance.includes("footnote references")
    ),
  );
  const alternatives = footnotesMeta.notWhen?.join(" ") ?? "";
  for (const name of ["List", "Prose", "Paragraph"]) {
    assert(
      alternatives.includes(name),
      "Footnotes metadata does not distinguish " + name,
    );
  }
  assert(
    footnotesMeta.accessibility?.some((note) =>
      note.includes("Repeated references")
    ),
  );
});
