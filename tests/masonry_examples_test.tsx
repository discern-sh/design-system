import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  catalogueExamples,
  conformance,
} from "../src/components/layout/masonry/masonry.examples.tsx";

Deno.test("the variable-height Masonry example passes every peer as a direct child", () => {
  const example = catalogueExamples.find(({ id }) => id === "default");
  assert(example !== undefined);
  const markup = renderToStaticMarkup(createElement(example.Example));

  assertStringIncludes(markup, "data-example-masonry");
  assertEquals(
    (markup.match(/class="discern-masonry__item"/gu) ?? []).length,
    4,
  );
  assert(
    markup.indexOf("A concise observation") <
        markup.indexOf("A developed explanation") &&
      markup.indexOf("A developed explanation") <
        markup.indexOf("A visual note") &&
      markup.indexOf("A visual note") < markup.indexOf("A compact aside"),
    "Masonry changed the authored peer order",
  );
});

Deno.test("Masonry geometry conformance covers wide packing and narrow collapse", () => {
  const wide = conformance.find(({ viewport }) => viewport?.width === 1440);
  const narrow = conformance.find(({ viewport }) => viewport?.width === 390);
  assert(wide !== undefined);
  assert(narrow !== undefined);
  assert(
    wide.steps.some((step) =>
      "expect" in step && step.expect === "x-position-count" &&
      step.minimum >= 2
    ),
  );
  assert(
    narrow.steps.some((step) =>
      "expect" in step && step.expect === "x-position-count" &&
      step.minimum === 1 && "maximum" in step && step.maximum === 1
    ),
  );
});
