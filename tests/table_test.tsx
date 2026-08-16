import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Table } from "../src/components/display/table/table.tsx";
import tableMeta from "../src/components/display/table/table.meta.ts";

Deno.test("Table preserves native relational markup and rich phrasing", () => {
  const html = renderToStaticMarkup(
    <Table
      caption={
        <>
          <strong>Reference</strong> coverage
        </>
      }
      striped
      numeric
      id="coverage"
      className="consumer-table"
      data-purpose="evidence"
    >
      <thead>
        <tr>
          <th scope="col">Topic</th>
          <th scope="col">Evidence</th>
          <th scope="col">Score</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            Inline <code>semantics</code>
          </td>
          <td>
            <a href="#source">Source</a>
          </td>
          <td>98</td>
        </tr>
        <tr>
          <td>Empty evidence</td>
          <td></td>
          <td>0</td>
        </tr>
      </tbody>
    </Table>,
  );

  assertMatch(html, /^<div /);
  assertStringIncludes(
    html,
    'class="discern-table discern-table--striped discern-table--numeric consumer-table"',
  );
  assertStringIncludes(html, 'id="coverage"');
  assertStringIncludes(html, 'data-purpose="evidence"');
  assertStringIncludes(
    html,
    "<table><caption><strong>Reference</strong> coverage</caption>",
  );
  assertEquals(html.match(/<th scope="col">/g)?.length, 3);
  assertEquals(html.match(/<tr>/g)?.length, 3);
  assertStringIncludes(html, "Inline <code>semantics</code>");
  assertStringIncludes(html, '<a href="#source">Source</a>');
  assertStringIncludes(html, "<td></td>");
  assertMatch(html, /<\/table><\/div>$/);
});

Deno.test("Table metadata distinguishes relational data from Comparison table", () => {
  assert(
    tableMeta.useWhen?.some((guidance) =>
      guidance.includes("relational data") && guidance.includes("empty values")
    ),
  );
  assert(
    tableMeta.notWhen?.some((guidance) =>
      guidance.includes("Comparison table") && guidance.includes("marketing")
    ),
  );
  assert(
    tableMeta.accessibility?.some((note) =>
      note.includes("header/value relationship") && note.includes("colour")
    ),
  );
});
