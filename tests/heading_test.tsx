import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Heading,
  HeadingAccent,
} from "../src/components/display/heading/heading.tsx";
import headingMeta from "../src/components/display/heading/heading.meta.ts";

Deno.test("Heading preserves levels 1–6 and ordinary React phrasing semantics", () => {
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    const html = renderToStaticMarkup(
      <Heading
        level={level}
        id={`section-${level}`}
        className="consumer-heading"
      >
        Rich <em>phrasing</em>, <code>inline code</code>, and{" "}
        <a href="#reference">one reference</a>{" "}
        <HeadingAccent>accented</HeadingAccent>
      </Heading>,
    );

    assertMatch(html, new RegExp(`^<h${level} `));
    assertMatch(html, new RegExp(`</h${level}>$`));
    assertStringIncludes(
      html,
      'class="discern-heading consumer-heading"',
    );
    assertStringIncludes(html, `<em>phrasing</em>`);
    assertStringIncludes(html, `<code>inline code</code>`);
    assertStringIncludes(html, '<a href="#reference">one reference</a>');
    assertStringIncludes(
      html,
      '<span class="discern-heading__accent">accented</span>',
    );
    assert(!html.includes("<div"));
    assert(!html.includes("<p"));
  }
});

Deno.test("Heading metadata distinguishes outline headings from lead text", () => {
  assertEquals(headingMeta.cli, { stance: "rendered" });
  assert(
    headingMeta.useWhen?.some((guidance) => guidance.includes("outline")),
  );
  assert(
    headingMeta.notWhen?.some((guidance) => guidance.includes("lead text")),
  );
  assert(
    headingMeta.accessibility?.some((note) => note.includes("levels 1–6")),
  );
});
