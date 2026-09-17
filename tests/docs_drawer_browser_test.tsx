import { assert, assertEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { withViewport } from "../scripts/viewport.ts";
import { browserBehaviorSources } from "../src/generated/behaviors.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  DocsHeader,
  DocsLayout,
  DocsNav,
  IconButton,
  SkipLink,
} from "../src/react.ts";

const ORIGIN = "http://docs-drawer.test";
const NARROW = { width: 720, height: 800 };
const WIDE = { width: 1400, height: 800 };

function Shell({ suffix = "" }: { readonly suffix?: string }) {
  const navigationId = `navigation${suffix}`;
  return (
    <>
      <SkipLink id={`skip${suffix}`} href={`#main${suffix}`}>
        Skip to content
      </SkipLink>
      <DocsHeader
        id={`header${suffix}`}
        brand={<a id={`brand${suffix}`} href="#top">Manual</a>}
        actions={
          <IconButton
            id={`toggle${suffix}`}
            icon="≡"
            label="Open navigation"
            hidden
            data-discern-docs-drawer-toggle=""
            data-discern-open-label="Open navigation"
            data-discern-close-label="Close navigation"
            aria-controls={navigationId}
            aria-expanded={false}
          />
        }
      >
        <button type="button" id={`search${suffix}`}>Search</button>
      </DocsHeader>
      <DocsLayout
        id={`layout${suffix}`}
        navigationId={navigationId}
        navigationLabel="Manual navigation"
        mainId={`main${suffix}`}
        navigation={
          <DocsNav
            label="Manual"
            sections={[{
              items: [
                { label: "Overview", href: "#overview", current: true },
                { label: "Setup", href: "#setup" },
                { label: "Reference", href: "#reference" },
              ],
            }]}
          />
        }
        rail={<a id={`rail-link${suffix}`} href="#top">Back to top</a>}
      >
        <h1 id={`title${suffix}`}>Overview</h1>
        <p>
          <a id={`body-link${suffix}`} href="#setup">Continue</a>
        </p>
      </DocsLayout>
    </>
  );
}

/** Build the served document with the selected runtime, without it, and pre-marked. */
async function buildConsumer(output: string): Promise<void> {
  const runtime = await emitDesignSystemRuntime({
    outputRoot: toFileUrl(`${output}/runtime/`),
    components: ["docs-layout", "docs-header", "docs-nav", "skip-link"],
  });
  assertEquals(runtime.manifest.outputs.scripts, ["discern.js"]);
  const markup = renderToStaticMarkup(<Shell />);
  const scripts = runtime.manifest.outputs.scripts.map((path) =>
    `<script type="module" src="runtime/${path}"></script>`
  ).join("");
  const document = (body: string, root = "") =>
    `<!doctype html><html lang="en"${root}><meta charset="utf-8"><title>Docs drawer consumer</title><link rel="stylesheet" href="runtime/discern.css"><body data-discern-root="">${body}</body></html>`;
  await Deno.writeTextFile(
    join(output, "index.html"),
    document(`${markup}${scripts}`),
  );
  await Deno.writeTextFile(join(output, "inert.html"), document(markup));
  await Deno.writeTextFile(
    join(output, "premarked.html"),
    document(markup, ' data-discern-docs-drawer-enhanced=""'),
  );
}

async function withConsumer(
  run: (page: Page, output: string) => Promise<void>,
): Promise<void> {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildConsumer(output);
    const page = await browser.newPage({ viewport: NARROW });
    await page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await run(page, output);
    await page.close();
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
}

interface DrawerState {
  readonly expanded: string | null;
  readonly label: string | null;
  readonly toggleHidden: boolean;
  readonly role: string | null;
  readonly modal: string | null;
  readonly navLabel: string | null;
  readonly navInert: boolean;
  readonly state: string | null;
  readonly enhanced: boolean;
  readonly position: string;
  readonly offCanvas: boolean;
  readonly veilVisible: boolean;
  readonly bodyOverflow: string;
  readonly backgroundInert: boolean;
  readonly active: string | null;
}

function state(page: Page, suffix = ""): Promise<DrawerState> {
  return page.evaluate((suffix) => {
    const toggle = document.getElementById(`toggle${suffix}`) as HTMLElement;
    const nav = document.getElementById(`navigation${suffix}`) as HTMLElement;
    const layout = document.getElementById(`layout${suffix}`) as HTMLElement;
    const veil = layout.querySelector<HTMLElement>(
      "[data-discern-docs-drawer-veil]",
    );
    const rect = nav.getBoundingClientRect();
    const background = ["skip", "brand", "search", "main", "rail-link"].map((
      id,
    ) => document.getElementById(`${id}${suffix}`) as HTMLElement);
    return {
      expanded: toggle.getAttribute("aria-expanded"),
      label: toggle.getAttribute("aria-label"),
      toggleHidden: toggle.hidden === true,
      role: nav.getAttribute("role"),
      modal: nav.getAttribute("aria-modal"),
      navLabel: nav.getAttribute("aria-label"),
      navInert: nav.inert,
      state: layout.getAttribute("data-discern-docs-drawer"),
      enhanced: layout.hasAttribute("data-discern-docs-drawer-enhanced"),
      position: getComputedStyle(nav).position,
      offCanvas: rect.right <= 0,
      veilVisible: veil !== null && !veil.hidden &&
        veil.getClientRects().length > 0,
      bodyOverflow: document.body.style.overflow,
      backgroundInert: background.every((element) =>
        element.inert || element.closest("[inert]") !== null
      ),
      active: document.activeElement?.id ?? null,
    };
  }, suffix);
}

/** Wait for the drawer state and for its slide, a real transition, to settle. */
async function settled(page: Page, open: boolean): Promise<void> {
  await page.waitForFunction(
    ([open]) => {
      const layout = document.getElementById("layout");
      const rect = document.getElementById("navigation")
        ?.getBoundingClientRect();
      if (!layout || !rect) return false;
      return layout.dataset.discernDocsDrawer === (open ? "open" : "closed") &&
        (open ? rect.left >= 0 : rect.right <= 0);
    },
    [open],
    { timeout: 2000 },
  );
}

const CLOSED_NARROW = {
  expanded: "false",
  label: "Open navigation",
  toggleHidden: false,
  role: null,
  modal: null,
  navLabel: null,
  navInert: true,
  state: "closed",
  enhanced: true,
  position: "fixed",
  offCanvas: true,
  veilVisible: false,
  bodyOverflow: "",
  backgroundInert: false,
} as const;

Deno.test("the docs drawer performs the complete modal focus contract", async () => {
  await withConsumer(async (page) => {
    // Without the selected script the navigation stays in flow above the
    // document, and nothing is inert, hidden, or positioned off-canvas.
    await page.goto(`${ORIGIN}/inert.html`);
    const inert = await state(page);
    assertEquals(inert, {
      expanded: "false",
      label: "Open navigation",
      toggleHidden: true,
      role: null,
      modal: null,
      navLabel: null,
      navInert: false,
      state: null,
      enhanced: false,
      position: "static",
      offCanvas: false,
      veilVisible: false,
      bodyOverflow: "",
      backgroundInert: false,
      active: "",
    });
    assert(
      await page.evaluate(() =>
        (document.getElementById("navigation")?.getBoundingClientRect()
          .bottom ?? 0) <=
          (document.getElementById("title")?.getBoundingClientRect().top ?? 0)
      ),
      "the navigation reads above the document without the script",
    );

    await page.goto(`${ORIGIN}/`);
    // Activation snaps the navigation off-canvas: in the frame the behaviour
    // makes it inert, nothing is sliding and the marker is already stamped.
    const activation = await page.evaluate(() =>
      new Promise<{ right: number; sliding: boolean; enhanced: boolean }>(
        (resolve) => {
          const nav = document.getElementById("navigation") as HTMLElement;
          const check = () => {
            if (!nav.inert) {
              requestAnimationFrame(check);
              return;
            }
            resolve({
              right: nav.getBoundingClientRect().right,
              sliding: nav.getAnimations().length > 0,
              enhanced: document.getElementById("layout")?.hasAttribute(
                "data-discern-docs-drawer-enhanced",
              ) === true,
            });
          };
          check();
        },
      )
    );
    assertEquals(
      [activation.right <= 0, activation.sliding, activation.enhanced],
      [true, false, true],
      `activation animated the navigation away: ${JSON.stringify(activation)}`,
    );
    assertEquals(await state(page), { ...CLOSED_NARROW, active: "" });

    await page.locator("#toggle").focus();
    await page.locator("#toggle").click();
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("href") === "#overview",
      undefined,
      { timeout: 2000 },
    );
    await settled(page, true);
    const opened = await state(page);
    assertEquals(opened, {
      expanded: "true",
      label: "Close navigation",
      toggleHidden: false,
      role: "dialog",
      modal: "true",
      navLabel: "Manual navigation",
      navInert: false,
      state: "open",
      enhanced: true,
      position: "fixed",
      offCanvas: false,
      veilVisible: true,
      bodyOverflow: "hidden",
      backgroundInert: true,
      active: "",
    });
    assertEquals(
      await page.evaluate(() =>
        document.activeElement?.closest("#navigation") !== null
      ),
      true,
      "focus moved into the navigation",
    );

    // Tab wraps between the toggle and the navigation's focusables.
    await page.locator('#navigation a[href="#reference"]').focus();
    await page.keyboard.press("Tab");
    assertEquals(
      await page.evaluate(() => document.activeElement?.id),
      "toggle",
    );
    await page.keyboard.press("Shift+Tab");
    assertEquals(
      await page.evaluate(() => document.activeElement?.getAttribute("href")),
      "#reference",
    );

    await page.keyboard.press("Escape");
    await settled(page, false);
    assertEquals(await state(page), { ...CLOSED_NARROW, active: "toggle" });

    // The veil closes on click and returns focus too.
    await page.locator("#toggle").click();
    await settled(page, true);
    await page.mouse.click(700, 400);
    await settled(page, false);
    assertEquals(await state(page), { ...CLOSED_NARROW, active: "toggle" });
    // The toggle itself closes as well.
    await page.locator("#toggle").click();
    await settled(page, true);
    await page.locator("#toggle").click();
    await settled(page, false);
    assertEquals((await state(page)).state, "closed");
  });
});

Deno.test("the docs drawer follows the allocation, re-initialises once, activates additions, and tears down", async () => {
  await withConsumer(async (page) => {
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(
      () => (document.getElementById("navigation") as HTMLElement).inert,
      undefined,
      { timeout: 2000 },
    );
    await page.locator("#toggle").click();
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("href") === "#overview",
      undefined,
      { timeout: 2000 },
    );

    // Crossing the breakpoint while open closes without moving focus, and a
    // wide navigation is never inert, off-canvas, or toggled.
    await withViewport(page, WIDE, async () => {
      await page.waitForFunction(
        () =>
          document.getElementById("layout")?.dataset.discernDocsDrawer ===
            undefined,
        undefined,
        { timeout: 2000 },
      );
      const wide = await state(page);
      assertEquals(wide, {
        expanded: "false",
        label: "Open navigation",
        toggleHidden: true,
        role: null,
        modal: null,
        navLabel: null,
        navInert: false,
        state: null,
        enhanced: true,
        position: "sticky",
        offCanvas: false,
        veilVisible: false,
        bodyOverflow: "",
        backgroundInert: false,
        active: "",
      });
      assertEquals(
        await page.evaluate(() => document.activeElement?.getAttribute("href")),
        "#overview",
        "focus stayed where it was",
      );
      assertEquals(
        await page.evaluate(() =>
          getComputedStyle(
            document.getElementById("rail-link")?.parentElement as Element,
          ).display
        ),
        "block",
        "the rail shows at the wide allocation",
      );
    });
    await page.waitForFunction(
      () =>
        document.getElementById("layout")?.dataset.discernDocsDrawer ===
          "closed",
      undefined,
      { timeout: 2000 },
    );
    assertEquals((await state(page)).navInert, true);

    // Evaluating the behaviour again must not bind a second listener, which
    // would open and immediately close the drawer.
    await page.evaluate(browserBehaviorSources["docs-drawer"]);
    await page.locator("#toggle").click();
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("href") === "#overview",
      undefined,
      { timeout: 2000 },
    );
    assertEquals((await state(page)).state, "open");
    await page.keyboard.press("Escape");

    // A shell added later activates on its own.
    await page.evaluate((markup) => {
      document.body.insertAdjacentHTML("beforeend", markup);
    }, renderToStaticMarkup(<Shell suffix="-later" />));
    await page.waitForFunction(
      () => (document.getElementById("navigation-later") as HTMLElement).inert,
      undefined,
      { timeout: 2000 },
    );
    assertEquals((await state(page, "-later")).toggleHidden, false);

    await page.evaluate(() =>
      document.dispatchEvent(new Event("discern:docs-drawer:teardown"))
    );
    for (const suffix of ["", "-later"]) {
      const released = await state(page, suffix);
      assertEquals(
        [
          released.toggleHidden,
          released.navInert,
          released.state,
          released.enhanced,
          released.position,
        ],
        [true, false, null, false, "static"],
        `teardown released the shell${suffix}`,
      );
    }
  });
});

Deno.test("a consumer's early marker positions the drawer before the script runs", async () => {
  await withConsumer(async (page) => {
    await page.goto(`${ORIGIN}/premarked.html`);
    const premarked = await state(page);
    assertEquals(
      [
        premarked.position,
        premarked.offCanvas,
        premarked.toggleHidden,
        premarked.navInert,
      ],
      ["fixed", true, true, false],
      "the marker alone moves the navigation off-canvas; only the script reveals the toggle",
    );
  });
});
