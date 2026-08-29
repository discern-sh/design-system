import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsNav } from "../src/components/docs/docs-nav/docs-nav.tsx";

Deno.test("Docs nav gives every future destination a contiguous pointer run", async () => {
  const html = renderToStaticMarkup(
    <DocsNav
      sections={[{
        title: "Unrelated section",
        items: [
          { label: "Amber", href: "#amber" },
          { label: "Cobalt", href: "#cobalt" },
          { label: "Violet", href: "#violet" },
        ],
      }]}
    />,
  );
  assertEquals(html.match(/<li><a /g)?.length, 3);

  const css = await Deno.readTextFile(
    new URL(
      "../src/components/docs/docs-nav/docs-nav.css",
      import.meta.url,
    ),
  );
  assertStringIncludes(
    css,
    ".discern-docs-nav ul {\n    display: grid;\n    gap: 0;",
  );
});
