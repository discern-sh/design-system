/**
 * The static contracts a server-rendered documentation shell composes from
 * the Docs adapters: markup a consumer's own accessibility tests bind to
 * without recreating any package anatomy.
 */

import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import type { CSSProperties, ReactNode } from "react";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { testTerminalCapabilities } from "../src/cli/interactive/testing.ts";
import { IconButton } from "../src/components/core/icon-button/icon-button.tsx";
import { AnchorHeading } from "../src/components/docs/anchor-heading/anchor-heading.tsx";
import { CopyButton } from "../src/components/docs/copy-button/copy-button.tsx";
import { DocsHeader } from "../src/components/docs/docs-header/docs-header.tsx";
import { DocsLayout } from "../src/components/docs/docs-layout/docs-layout.tsx";
import { DocsNav } from "../src/components/docs/docs-nav/docs-nav.tsx";
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
import { FeedbackMark } from "../src/components/feedback/feedback-marks.tsx";
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

Deno.test("Docs shell shares one edge per side, marks current apart from hover, and shows unavailable copy", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/runtime/`),
      components: ["docs-header", "docs-layout", "docs-nav", "copy-button"],
    });
    const css = await Deno.readTextFile(`${output}/runtime/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const header = (actions: ReactNode) => (
      <DocsHeader
        style={{
          position: "static",
          "--discern-docs-header-max":
            "calc(var(--discern-page-max) + 10rem + 2 * var(--discern-space-5))",
        } as CSSProperties}
        brand={<a href="#top">Brand</a>}
        actions={actions}
      >
        <button type="button" data-trigger="">Search</button>
      </DocsHeader>
    );
    await page.setContent(
      `<style>${css}</style><div data-discern-root>${
        renderToStaticMarkup(
          <>
            {header(<IconButton icon="=" label="Menu" hidden />)}
            <DocsLayout
              navigationId="navigation"
              navigation={
                <DocsNav
                  sections={[{
                    title: "Section",
                    items: [
                      { label: "Current", href: "#current", current: true },
                      { label: "Other", href: "#other" },
                    ],
                  }]}
                />
              }
            >
              <p>Body</p>
            </DocsLayout>
            <div id="visible-action">
              {header(<IconButton icon="=" label="Menu" />)}
            </div>
            <CopyButton id="inert" value="a" label="Copy" />
            <CopyButton id="live" value="b" label="Copy" />
          </>,
        )
      }</div>`,
    );
    await page.locator("#live").evaluate((button: HTMLButtonElement) => {
      button.inert = false;
    });
    await page.hover('.discern-docs-nav a[href="#other"]');
    const measured = await page.evaluate(() => {
      const textLeft = (selector: string) => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(selector)!);
        return range.getBoundingClientRect().left;
      };
      const style = (selector: string) =>
        getComputedStyle(document.querySelector(selector)!);
      const paint = (selector: string) => {
        const { color, borderColor, backgroundColor } = style(selector);
        return { color, borderColor, backgroundColor };
      };
      return {
        triggerEnd: document.querySelector("[data-trigger]")!
          .getBoundingClientRect().right,
        layoutEnd: document.querySelector(".discern-docs-layout")!
          .getBoundingClientRect().right,
        brandStart: textLeft(".discern-docs-header__brand a"),
        navStart: textLeft('.discern-docs-nav a[href="#current"]'),
        visibleActions:
          style("#visible-action .discern-docs-header__actions").display,
        currentEdge: style('.discern-docs-nav a[href="#current"]')
          .borderInlineStartColor,
        hoveredEdge: style('.discern-docs-nav a[href="#other"]')
          .borderInlineStartColor,
        inert: paint("#inert"),
        live: paint("#live"),
      };
    });
    assertEquals(
      measured.triggerEnd,
      measured.layoutEnd,
      "a slot holding only hidden controls must not offset the middle's end",
    );
    assertEquals(measured.brandStart, measured.navStart);
    assert(
      measured.visibleActions !== "none",
      "a visible action keeps its slot",
    );
    assertEquals(measured.hoveredEdge, "rgba(0, 0, 0, 0)");
    assert(
      measured.currentEdge !== measured.hoveredEdge,
      "the current destination needs a cue hover lacks",
    );
    for (const key of ["color", "borderColor", "backgroundColor"] as const) {
      assert(
        measured.inert[key] !== measured.live[key],
        `unavailable copy must differ from live copy in ${key}`,
      );
    }
    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Copy button never shows its action glyph beside failure guidance", () => {
  const icons = (html: string) =>
    [...html.matchAll(
      /class="discern-copy-button__icon" aria-hidden="true" data-discern-copy-feedback="([^"]+)"(?: hidden="")?>([^<]*)</g,
    )].map(([, states, glyph]) => `${glyph}:${states}`);
  assertEquals(
    icons(renderToStaticMarkup(<CopyButton value="a" icon="C" />)),
    ["C:idle copied"],
  );
  assertEquals(
    icons(
      renderToStaticMarkup(
        <CopyButton value="a" icon="C" copiedIcon="D" failedIcon="F" />,
      ),
    ),
    ["C:idle", "D:copied", "F:failed"],
  );
  assertEquals(
    icons(
      renderToStaticMarkup(
        <CopyButton value="a" icon="C" copiedIcon="D" failedIcon="D" />,
      ),
    ),
    ["C:idle", "D:copied failed"],
  );
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
  // The close draws the one dismiss mark every overlay's close shares.
  const dismiss = renderToStaticMarkup(<FeedbackMark name="dismiss" />);
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
    `<dialog aria-label="Search" class="discern-search-palette consumer" id="palette" data-discern-floating-surface="surface"><div class="discern-search-palette__field"><span class="discern-search-palette__icon" aria-hidden="true">⌕</span><input class="discern-search-palette__input" type="search" aria-label="Search" placeholder="Type to search…" autofocus="" id="field" value="q"/><button type="button" aria-label="Close search" class="discern-icon-button discern-icon-button--quiet discern-icon-button--sm discern-search-palette__close"><span class="discern-icon-button__glyph" aria-hidden="true">${dismiss}</span></button></div><div class="discern-search-palette__results"><ul class="discern-search-palette__list"><li><a class="discern-search-palette__result" href="#a"><span class="discern-search-palette__result-title">A</span><span class="discern-search-palette__result-context">B</span></a></li></ul></div><div class="discern-search-palette__hint">hint</div></dialog>`,
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
  assertStringIncludes(
    html,
    `<button type="button" aria-label="Close search" class="discern-icon-button discern-icon-button--quiet discern-icon-button--sm discern-search-palette__close" data-discern-search-palette-close=""><span class="discern-icon-button__glyph" aria-hidden="true">${dismiss}</span></button>`,
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
