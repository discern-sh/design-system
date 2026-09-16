/**
 * The static contracts a server-rendered documentation shell composes from
 * the Docs adapters: markup a consumer's own accessibility tests bind to
 * without recreating any package anatomy.
 */

import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Pager } from "../src/components/docs/pager/pager.tsx";

Deno.test("Pager names the reading sequence with rel on both links", () => {
  const html = renderToStaticMarkup(
    <Pager
      previous={{ label: "Earlier", href: "/earlier" }}
      next={{ label: "Later", href: "/later" }}
    />,
  );
  assertMatch(html, /<a [^>]*href="\/earlier"[^>]*rel="prev"/);
  assertMatch(html, /<a [^>]*href="\/later"[^>]*rel="next"/);
  assertEquals(html.match(/rel="/g)?.length, 2);
  assertStringIncludes(
    renderToStaticMarkup(<Pager next={{ label: "Later", href: "/later" }} />),
    'rel="next"',
  );
});
