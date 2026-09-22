import { assert, assertEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { browserBehaviorSources } from "../src/generated/behaviors.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  DocsHeader,
  DocsLayout,
  DocsNav,
  IconButton,
  SearchPalette,
  SearchPaletteList,
  SearchPaletteOption,
} from "../src/react.ts";

const ORIGIN = "http://search-palette.test";
const NARROW = { width: 720, height: 800 };

function Shell() {
  return (
    <>
      <DocsHeader
        brand={<a id="brand" href="#top">Manual</a>}
        actions={
          <IconButton
            id="toggle"
            icon="≡"
            label="Open navigation"
            hidden
            data-discern-docs-drawer-toggle=""
            data-discern-open-label="Open navigation"
            data-discern-close-label="Close navigation"
            aria-controls="navigation"
            aria-expanded={false}
          />
        }
      >
        <button
          type="button"
          id="opener"
          data-discern-search-palette-open=""
          aria-controls="palette"
        >
          Search
        </button>
      </DocsHeader>
      <DocsLayout
        navigationId="navigation"
        navigationLabel="Manual navigation"
        navigation={
          <DocsNav
            label="Manual"
            sections={[{
              items: [
                { label: "Overview", href: "#overview", current: true },
                { label: "Setup", href: "#setup" },
              ],
            }]}
          />
        }
      >
        <h1>Overview</h1>
        <label>
          Note <input id="outside" />
        </label>
      </DocsLayout>
      <SearchPalette
        id="palette"
        shortcuts
        inputProps={{
          role: "combobox",
          "aria-controls": "results",
          "aria-expanded": false,
        }}
      >
        <SearchPaletteList id="results">
          <SearchPaletteOption id="result" title="Overview" />
        </SearchPaletteList>
      </SearchPalette>
    </>
  );
}

async function withConsumer(
  run: (page: Page) => Promise<void>,
  options: { readonly modal?: boolean } = {},
): Promise<void> {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    const runtime = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/runtime/`),
      components: ["docs-layout", "docs-header", "docs-nav", "search-palette"],
    });
    assertEquals(runtime.manifest.outputs.scripts, ["discern.js"]);
    await Deno.writeTextFile(
      join(output, "index.html"),
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Search palette consumer</title><link rel="stylesheet" href="runtime/discern.css"><body data-discern-root="">${
        renderToStaticMarkup(<Shell />)
      }<script type="module" src="runtime/discern.js"></script></body></html>`,
    );
    const page = await browser.newPage({ viewport: NARROW });
    if (options.modal === false) {
      await page.addInitScript(() => {
        delete (HTMLDialogElement.prototype as { showModal?: unknown })
          .showModal;
      });
    }
    await page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() =>
      (document as unknown as Record<symbol, unknown>)[
        Symbol.for("discern.search-palette")
      ] === true
    );
    await page.evaluate(() => {
      const counts = { open: 0, close: 0 };
      (globalThis as unknown as { counts: typeof counts }).counts = counts;
      document.addEventListener("discern:search-palette:open", () => {
        counts.open += 1;
      });
      document.addEventListener("discern:search-palette:close", () => {
        counts.close += 1;
      });
    });
    await run(page);
    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
}

interface PaletteState {
  readonly open: boolean;
  readonly fallback: boolean;
  readonly expanded: string | null;
  readonly active: string | null;
  readonly overflow: string;
  readonly outsideInert: boolean;
  readonly opens: number;
  readonly closes: number;
}

function state(page: Page): Promise<PaletteState> {
  return page.evaluate(() => {
    const palette = document.getElementById("palette") as HTMLDialogElement;
    const counts = (globalThis as unknown as {
      counts: { open: number; close: number };
    }).counts;
    return {
      open: palette.open,
      fallback: palette.hasAttribute("data-discern-search-palette-fallback"),
      expanded: palette.querySelector("input")?.getAttribute(
        "aria-expanded",
      ) ?? null,
      active: document.activeElement?.id ||
        document.activeElement?.getAttribute("role") || null,
      overflow: document.body.style.overflow,
      outsideInert:
        document.getElementById("opener")?.closest("[inert]") !== null,
      opens: counts.open,
      closes: counts.close,
    };
  });
}

/** The native close event is dispatched after the dialog closes; wait for it. */
async function closed(page: Page, count: number): Promise<PaletteState> {
  await page.waitForFunction(
    (count) =>
      (globalThis as unknown as { counts: { close: number } }).counts.close >=
        count,
    count,
  );
  return await state(page);
}

const closedAt = (active: string, opens: number) => ({
  open: false,
  fallback: false,
  expanded: "false",
  active,
  overflow: "",
  outsideInert: false,
  opens,
  closes: opens,
});

const openedAt = (opens: number, closes: number, fallback = false) => ({
  open: true,
  fallback,
  expanded: "true",
  active: "combobox",
  overflow: "hidden",
  outsideInert: fallback,
  opens,
  closes,
});

Deno.test("the static palette opens, dismisses, and returns focus through every route", async () => {
  await withConsumer(async (page) => {
    await page.click("#opener");
    assertEquals(await state(page), openedAt(1, 0));
    await page.keyboard.press("Escape");
    assertEquals(await closed(page, 1), closedAt("opener", 1));

    await page.click("#opener");
    await page.click("[data-discern-search-palette-close]");
    assertEquals(await closed(page, 2), closedAt("opener", 2));

    await page.click("#opener");
    await page.mouse.click(4, 4);
    assertEquals(await closed(page, 3), closedAt("opener", 3));

    await page.keyboard.press("ControlOrMeta+k");
    assertEquals(await state(page), openedAt(4, 3));
    await page.keyboard.press("ControlOrMeta+k");
    assertEquals((await closed(page, 4)).open, false);

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.keyboard.press("/");
    assertEquals(await state(page), openedAt(5, 4));
    await page.keyboard.press("Escape");
    await closed(page, 5);

    await page.focus("#outside");
    await page.keyboard.press("/");
    assertEquals((await state(page)).open, false, "a field keeps its slash");

    await page.evaluate(() =>
      document.getElementById("opener")?.addEventListener(
        "click",
        (event) => event.preventDefault(),
      )
    );
    await page.click("#opener");
    assertEquals((await state(page)).open, false, "the consumer cancelled");
  });
});

Deno.test("an open drawer yields to the palette and takes focus back", async () => {
  await withConsumer(async (page) => {
    await page.click("#toggle");
    await page.waitForFunction(() =>
      document.getElementById("toggle")?.getAttribute("aria-expanded") ===
        "true"
    );
    await page.keyboard.press("ControlOrMeta+k");
    await page.waitForFunction(() =>
      (document.getElementById("palette") as HTMLDialogElement).open
    );
    assertEquals(
      await page.evaluate(() =>
        document.getElementById("toggle")?.getAttribute("aria-expanded")
      ),
      "false",
    );
    assertEquals(await state(page), openedAt(1, 0));
    await page.keyboard.press("Escape");
    assertEquals(await closed(page, 1), closedAt("toggle", 1));
  });
});

Deno.test("without showModal the palette keeps its modal contract", async () => {
  await withConsumer(async (page) => {
    await page.click("#opener");
    assertEquals(await state(page), openedAt(1, 0, true));
    assertEquals(
      await page.evaluate(() =>
        getComputedStyle(document.getElementById("palette") as Element)
          .position
      ),
      "fixed",
    );
    await page.focus("[data-discern-search-palette-close]");
    await page.keyboard.press("Tab");
    assertEquals((await state(page)).active, "combobox", "Tab wraps");
    await page.keyboard.press("Shift+Tab");
    assertEquals(
      await page.evaluate(() =>
        document.activeElement?.hasAttribute(
          "data-discern-search-palette-close",
        )
      ),
      true,
      "Shift+Tab wraps",
    );
    await page.keyboard.press("Escape");
    assertEquals(await closed(page, 1), closedAt("opener", 1));
  }, { modal: false });
});

Deno.test("the palette behaviour binds once and releases on teardown", async () => {
  await withConsumer(async (page) => {
    await page.evaluate(browserBehaviorSources["search-palette"]);
    await page.click("#opener");
    assertEquals(
      (await state(page)).opens,
      1,
      "a second evaluation bound twice",
    );
    await page.evaluate(() =>
      document.dispatchEvent(new Event("discern:search-palette:teardown"))
    );
    const torn = await state(page);
    assert(!torn.open, "teardown leaves the palette open");
    assertEquals(torn.overflow, "");
    await page.click("#opener");
    assertEquals((await state(page)).open, false, "teardown left a binding");
  });
});
