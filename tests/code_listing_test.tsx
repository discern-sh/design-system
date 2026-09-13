import { assertEquals } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { CodeListing } from "../src/components/editorial/code-listing/code-listing.tsx";

Deno.test("Code listing preserves source whitespace and logical separators in both treatments", () => {
  for (const variant of ["standard", "showcase"] as const) {
    for (
      const code of ["", "\n", "\t  first  \n\n終 🎨\n  \n", "long".repeat(100)]
    ) {
      const html = renderToStaticMarkup(
        <CodeListing code={code} variant={variant} />,
      );
      const source = html.match(/<code>([\s\S]*?)<\/code>/)![1]!.replace(
        /<[^>]+>/g,
        "",
      );
      assertEquals(source, code);
    }
  }
});
