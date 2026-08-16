import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { List } from "../src/components/editorial/list/list.tsx";
import listMeta from "../src/components/editorial/list/list.meta.ts";

Deno.test("List renders native unordered and ordered structures with forwarded attributes", () => {
  const unordered = renderToStaticMarkup(
    <List
      id="evidence"
      className="consumer-list"
      data-purpose="summary"
      items={[
        {
          content: (
            <>
              First <strong>claim</strong>
            </>
          ),
        },
        { content: <>Second claim</> },
      ]}
    />,
  );
  assertMatch(unordered, /^<ul /);
  assertStringIncludes(
    unordered,
    'class="discern-list discern-list--unordered discern-list--tight consumer-list"',
  );
  assertStringIncludes(unordered, 'id="evidence"');
  assertStringIncludes(unordered, 'data-purpose="summary"');
  assertStringIncludes(unordered, "First <strong>claim</strong>");
  assertEquals(unordered.match(/<li/g)?.length, 2);
  assertMatch(unordered, /<\/ul>$/);

  const ordered = renderToStaticMarkup(
    <List
      kind="ordered"
      start={9}
      spacing="loose"
      items={[{ content: <>Ninth</> }, { content: <>Tenth</> }]}
    />,
  );
  assertMatch(ordered, /^<ol /);
  assertStringIncludes(ordered, 'start="9"');
  assertStringIncludes(ordered, "discern-list--ordered");
  assertStringIncludes(ordered, "discern-list--loose");
  assertMatch(ordered, /<\/ol>$/);
});

Deno.test("List task items use disabled read-only checkboxes while unmarked items stay ordinary", () => {
  const html = renderToStaticMarkup(
    <List
      kind="task"
      items={[
        { content: <>Reviewed</>, checked: true },
        { content: <>Pending</>, checked: false },
        { content: <>Context only</> },
      ]}
    />,
  );

  assertMatch(html, /^<ul /);
  assertEquals(html.match(/type="checkbox"/g)?.length, 2);
  assertEquals(html.match(/ disabled=""/g)?.length, 2);
  assertEquals(html.match(/ readonly=""/g)?.length, 2);
  assertEquals(html.match(/ checked=""/g)?.length, 1);
  assertStringIncludes(html, 'aria-label="Completed"');
  assertStringIncludes(html, 'aria-label="Not completed"');
  assertEquals(html.match(/discern-list__item--task/g)?.length, 2);
  assertMatch(
    html,
    /<li class="discern-list__item"><span class="discern-list__content"><span>Context only<\/span>/,
  );
});

Deno.test("List preserves ordered task starts and structurally empty items", () => {
  const html = renderToStaticMarkup(
    <List
      kind="ordered"
      start={3}
      items={[
        { content: <>Reviewed</>, checked: true },
        { checked: false },
        {},
      ]}
    />,
  );

  assertMatch(html, /^<ol /);
  assertStringIncludes(html, 'start="3"');
  assertEquals(html.match(/type="checkbox"/g)?.length, 2);
  assertEquals(html.match(/<li/g)?.length, 3);
  assert(!html.includes("discern-list__item--task"));
});

Deno.test("List keeps continuation paragraphs and recursively mixed lists structural", () => {
  const html = renderToStaticMarkup(
    <List
      items={[
        {
          content: <>Parent item</>,
          blocks: [
            <p key="continuation">Continuation paragraph.</p>,
            <List
              key="nested"
              kind="ordered"
              start={3}
              items={[
                { content: <>Nested ordered item</> },
                {
                  content: <>Nested task list</>,
                  blocks: [
                    <List
                      key="tasks"
                      kind="task"
                      items={[
                        { content: <>Checked state</>, checked: true },
                      ]}
                    />,
                  ],
                },
              ]}
            />,
          ],
        },
      ]}
    />,
  );

  assertStringIncludes(html, "<p>Continuation paragraph.</p>");
  assertStringIncludes(html, '<ol class="discern-list discern-list--ordered');
  assertStringIncludes(html, 'start="3"');
  assertStringIncludes(html, '<ul class="discern-list discern-list--task');
  assertStringIncludes(html, "Nested ordered item");
  assertStringIncludes(html, "Checked state");
  assertEquals(html.match(/<li/g)?.length, 4);
  assert(!html.includes("Parent item Continuation paragraph"));
});

Deno.test("List metadata guards ordinary lists from narrower semantic components", () => {
  const alternatives = listMeta.notWhen?.join(" ") ?? "";
  for (
    const name of [
      "Procedure",
      "Prerequisite list",
      "Key points",
      "Checkbox",
    ]
  ) {
    assert(
      alternatives.includes(name),
      `List metadata does not distinguish ${name}`,
    );
  }
  assert(
    listMeta.useWhen?.some((guidance) => guidance.includes("ordinary")),
  );
  assert(
    listMeta.accessibility?.some((note) => note.includes("native")),
  );
});
