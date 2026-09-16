/**
 * The static contracts a server-rendered documentation shell composes from
 * the Docs adapters: markup a consumer's own accessibility tests bind to
 * without recreating any package anatomy.
 */

import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { testTerminalCapabilities } from "../src/cli/interactive/testing.ts";
import { AnchorHeading } from "../src/components/docs/anchor-heading/anchor-heading.tsx";
import { Pager } from "../src/components/docs/pager/pager.tsx";
import {
  SearchPalette,
  SearchPaletteEmpty,
  SearchPaletteList,
  SearchPaletteOption,
  SearchPaletteResult,
  SearchPaletteStatus,
} from "../src/components/docs/search-palette/search-palette.tsx";
import { Prose } from "../src/components/editorial/prose/prose.tsx";
import renderTableOfContentsCli from "../src/components/editorial/table-of-contents/table-of-contents.cli.ts";
import { TableOfContents } from "../src/components/editorial/table-of-contents/table-of-contents.tsx";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

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

Deno.test("Docs header measures its row against a component token before the page maximum", async () => {
  const css = await Deno.readTextFile(
    new URL(
      "../src/components/docs/docs-header/docs-header.css",
      import.meta.url,
    ),
  );
  assertStringIncludes(
    css,
    "max-inline-size: var(--discern-docs-header-max, var(--discern-page-max));",
  );
  assertEquals(css.match(/--discern-page-max/g)?.length, 1);
});

Deno.test("Anchor heading keeps the permalink out of the heading's accessible name", () => {
  const html = renderToStaticMarkup(
    <AnchorHeading id="alpha-surface" level={3} className="consumer-row">
      Alpha surface
    </AnchorHeading>,
  );
  assertMatch(
    html,
    /^<div class="discern-anchor-heading consumer-row"><h3 [^>]*id="alpha-surface"[^>]*tabindex="-1"[^>]*>Alpha surface<\/h3><a class="discern-anchor-heading__anchor" href="#alpha-surface" aria-label="Link to this section">§<\/a><\/div>$/,
  );
});

Deno.test("Prose gives an anchor-heading row the rhythm and section rule of a bare heading", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/runtime/`),
      components: ["prose", "anchor-heading"],
    });
    const css = await Deno.readTextFile(`${output}/runtime/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1000, height: 800 },
    });
    await page.setContent(
      `<style>${css}</style><main data-discern-root>${
        renderToStaticMarkup(
          <Prose>
            <h2 id="bare-first">Bare first</h2>
            <p>After the first heading.</p>
            <h2 id="bare">Bare</h2>
            <p>After a bare heading.</p>
            <AnchorHeading id="row">Row</AnchorHeading>
            <p>After a heading row.</p>
            <h3 id="bare-minor">Bare minor</h3>
            <p>After a minor heading.</p>
            <AnchorHeading id="row-minor" level={3}>Row minor</AnchorHeading>
            <p>After a minor row.</p>
          </Prose>,
        )
      }</main><main data-discern-root>${
        renderToStaticMarkup(
          <Prose>
            <AnchorHeading id="row-first">Row first</AnchorHeading>
            <p>After the first row.</p>
          </Prose>,
        )
      }</main>`,
    );
    const rhythm = await page.locator(".discern-prose").evaluateAll((
      proses,
    ) =>
      proses.flatMap((prose) =>
        Array.from(prose.children).map((child) => {
          const style = getComputedStyle(child);
          return {
            id: child.id || child.querySelector("[id]")?.id || child.tagName,
            start: style.marginBlockStart,
            padding: style.paddingBlockStart,
            border: style.borderBlockStartWidth,
          };
        })
      )
    );
    const byId = new Map(
      rhythm.map(({ id, ...block }) => [id, JSON.stringify(block)]),
    );
    assertEquals(byId.get("row"), byId.get("bare"));
    assertEquals(byId.get("row-minor"), byId.get("bare-minor"));
    assertEquals(byId.get("row-first"), byId.get("bare-first"));
    const paragraphs = rhythm.filter((block) => block.id === "P");
    assertEquals(paragraphs.length, 6);
    assertEquals(
      new Set(paragraphs.map((block) => block.start)).size,
      1,
      "the gap after a heading row differs from the gap after a bare heading",
    );
    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

const numberedItems = [
  { label: "Starting state", href: "#start", number: false },
  { label: "Find the source", href: "#find", number: "1" },
  { label: "A closer look", href: "#look", nested: true },
  { label: "Prepare", href: "#prepare" },
  { label: "Appendix", href: "#appendix", number: "A" },
  { label: "Apply", href: "#apply" },
] as const;

Deno.test("Table of contents honours authored numbers and counts only the sequential items", () => {
  const html = renderToStaticMarkup(<TableOfContents items={numberedItems} />);
  const slots = [
    ...html.matchAll(/<li[^>]*><a [^>]*>(?:<span>([^<]*)<\/span>)?/g),
  ]
    .map((match) => match[1]);
  assertEquals(slots, ["", "1", undefined, "01", "A", "02"]);
  assertEquals(html.match(/__item--nested/g)?.length, 1);

  const terminal = renderTableOfContentsCli(
    { items: numberedItems },
    testTerminalCapabilities({ columns: 60, unicode: false }),
  ).split("\n").slice(1);
  assertEquals(terminal, [
    "     Starting state",
    "  1  Find the source",
    "  \\- A closer look",
    "  01 Prepare",
    "  A  Appendix",
    "  02 Apply",
  ]);
});

Deno.test("Search palette keeps its controlled markup and gains hooks only in static mode", () => {
  const results = (
    <ul className="discern-search-palette__list">
      <li>
        <SearchPaletteResult href="#a" title="A" context="B" />
      </li>
    </ul>
  );
  const controlled = renderToStaticMarkup(
    <SearchPalette
      open={false}
      onOpenChange={() => undefined}
      value="q"
      onValueChange={() => undefined}
      icon="⌕"
      hint="hint"
      id="palette"
      className="consumer"
      inputProps={{ id: "field" }}
    >
      {results}
    </SearchPalette>,
  );
  assertEquals(
    controlled,
    '<dialog aria-label="Search" class="discern-search-palette consumer" id="palette" data-discern-floating-surface="surface"><div class="discern-search-palette__field"><span class="discern-search-palette__icon" aria-hidden="true">⌕</span><input class="discern-search-palette__input" type="search" aria-label="Search" placeholder="Type to search…" autofocus="" id="field" value="q"/><button class="discern-search-palette__close" type="button" aria-label="Close search">Close</button></div><div class="discern-search-palette__results"><ul class="discern-search-palette__list"><li><a class="discern-search-palette__result" href="#a"><span class="discern-search-palette__result-title">A</span><span class="discern-search-palette__result-context">B</span></a></li></ul></div><div class="discern-search-palette__hint">hint</div></dialog>',
  );

  const html = renderToStaticMarkup(
    <SearchPalette
      label="the manual"
      closeAriaLabel="Close search"
      inputProps={{ role: "combobox", "aria-controls": "results" }}
    >
      <SearchPaletteList id="results" data-consumer-list="">
        <SearchPaletteOption id="r0" title="First" context="Where" selected />
        <SearchPaletteOption id="r1" title="Second" />
      </SearchPaletteList>
      <SearchPaletteEmpty data-consumer-empty="">
        Nothing yet.
      </SearchPaletteEmpty>
      <SearchPaletteStatus data-consumer-status="" />
    </SearchPalette>,
  );
  assertMatch(
    html,
    /^<dialog aria-label="the manual" class="discern-search-palette" data-discern-search-palette="" data-discern-floating-surface="surface">/,
  );
  assertMatch(
    html,
    /<input class="discern-search-palette__input" type="search" aria-label="the manual" placeholder="Type to search…" data-discern-search-palette-input="" role="combobox" aria-controls="results"\/>/,
  );
  assertMatch(
    html,
    /<button class="discern-search-palette__close" type="button" aria-label="Close search" data-discern-search-palette-close="">Close<\/button>/,
  );
  assertMatch(
    html,
    /<ul role="listbox" aria-label="Search results" class="discern-search-palette__list" id="results" data-consumer-list=""><li role="option" aria-selected="true" class="discern-search-palette__result" id="r0"><span class="discern-search-palette__result-title">First<\/span><span class="discern-search-palette__result-context">Where<\/span><\/li><li role="option" aria-selected="false" class="discern-search-palette__result" id="r1">/,
  );
  assertStringIncludes(
    html,
    '<p hidden="" class="discern-search-palette__empty" data-consumer-empty="">Nothing yet.</p>',
  );
  assertStringIncludes(
    html,
    '<div role="status" aria-live="polite" aria-atomic="true" class="discern-search-palette__status discern-visually-hidden" data-consumer-status=""></div>',
  );
  for (const forbidden of ["autofocus", " open", "value="]) {
    assertEquals(
      html.includes(forbidden),
      false,
      `static mode emits ${forbidden}`,
    );
  }
  assertEquals(
    renderToStaticMarkup(<SearchPalette>{null}</SearchPalette>).includes(
      'aria-label="Close search"',
    ),
    true,
  );
});
