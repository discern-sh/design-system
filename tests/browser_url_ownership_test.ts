import { assert, assertEquals, assertRejects } from "@std/assert";
import { launchBrowser } from "../scripts/browser.ts";
import {
  describeUrlExpectation,
  expectUrl,
  followFragment,
  urlMatches,
} from "../scripts/browser-url.ts";
import {
  trackedTypeScriptSources,
  type TypeScriptSource,
} from "./support/tracked-typescript.ts";

const URL_AUTHORITY = "scripts/browser-url.ts";

/**
 * Unwaited page URL reads that no pending navigation can change, named by the
 * function that owns them. Add one only with a reason a reviewer can verify.
 */
const SETTLED_URL_READS: readonly {
  readonly path: string;
  readonly owner: string;
  readonly reason: string;
}[] = [{
  path: "scripts/conformance/builder/support.ts",
  owner: "resetBuilderStorage",
  reason:
    "Uses only the document origin. A same-document URL write never changes it, and the gate awaits every cross-document navigation before the next phase starts.",
}];

/** A request or response carries a fixed URL; only page and frame URLs move. */
const EXCHANGE_RECEIVER = /(?:\brequest\(\s*\)|\b(?:request|response))\s*$/u;

interface PageUrlRead {
  readonly path: string;
  readonly line: number;
  readonly owner: string | undefined;
}

/** Every page or frame URL read, with its enclosing named function. */
function pageUrlReads(sources: readonly TypeScriptSource[]): PageUrlRead[] {
  return sources.flatMap(({ path, source }) =>
    [...source.matchAll(/\.url\(\s*\)/gu)].flatMap((match) => {
      const before = source.slice(0, match.index);
      if (EXCHANGE_RECEIVER.test(before)) return [];
      const owners = [...before.matchAll(/\bfunction\s+([\w$]+)/gu)];
      return [{
        path,
        line: before.split("\n").length,
        owner: owners.at(-1)?.[1],
      }];
    })
  );
}

function unwaitedUrlReads(
  sources: readonly TypeScriptSource[],
): readonly string[] {
  return pageUrlReads(sources).flatMap((read) =>
    read.path === URL_AUTHORITY ||
      SETTLED_URL_READS.some(({ path, owner }) =>
        path === read.path && owner === read.owner
      )
      ? []
      : [`${read.path}:${read.line}`]
  );
}

Deno.test("page URL reads wait for the state their action produces", async () => {
  const sources = await trackedTypeScriptSources();
  assertEquals(
    unwaitedUrlReads(sources),
    [],
    "Read the page URL through expectUrl from scripts/browser-url.ts, which waits for the expected state; Playwright can resolve a navigating action before the URL changes",
  );
  const reads = pageUrlReads(sources);
  assertEquals(
    SETTLED_URL_READS.filter(({ path, owner }) =>
      !reads.some((read) => read.path === path && read.owner === owner)
    ),
    [],
    "Remove settled URL allowances whose read no longer exists",
  );
});

Deno.test("a planted raw page URL read fails the guard", () => {
  const read = ".url" + "()";
  const planted: TypeScriptSource[] = [
    {
      path: "tests/future_history_test.ts",
      source: `
        await page.goBack();
        assertEquals(new URL(page${read}).hash, "#note");
      `,
    },
    {
      path: "scripts/conformance/future/popup.ts",
      source: `
        async function followPopup(context) {
          const popup = await context.waitForEvent("page");
          return (await popup.waitForLoadState(), popup)${read};
        }
      `,
    },
    {
      path: "scripts/conformance/builder/workspace.ts",
      source: `
        export async function resetBuilderStorage(page) {
          return page${read};
        }
      `,
    },
    {
      path: "scripts/conformance/builder/support.ts",
      source: `
        export async function resetBuilderStorage(page) {
          return page${read};
        }
        page.route("**", (route) => route.request()${read});
        page.on("response", (response) => response
          ${read});
      `,
    },
  ];
  assertEquals(unwaitedUrlReads(planted), [
    "tests/future_history_test.ts:3",
    "scripts/conformance/future/popup.ts:4",
    "scripts/conformance/builder/workspace.ts:3",
  ]);
});

Deno.test("URL expectations name exact parameters, absences, and fragments", () => {
  const url = new URL("https://catalogue.test/components/?theme=dark#notes");
  assert(urlMatches(url, {
    pathname: "/components/",
    hash: "#notes",
    searchParams: { theme: "dark", surfaces: null },
  }));
  assert(!urlMatches(url, { searchParams: { theme: null } }));
  assert(!urlMatches(url, { hash: "" }));
  assert(urlMatches(new URL("https://catalogue.test/"), { hash: "" }));
  assert(urlMatches(url, (candidate) => candidate.host === "catalogue.test"));
  assertEquals(
    describeUrlExpectation({
      pathname: "/components/",
      hash: "",
      searchParams: { theme: "dark", surfaces: null },
    }),
    "path /components/, hash (none), theme=dark, no surfaces",
  );
  assertEquals(describeUrlExpectation(() => true), "a matching URL");
});

Deno.test("expectUrl waits through deferred URL writes and history traversal", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.route("http://url-state.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<button>Next</button><script>
          document.querySelector("button").addEventListener("click", () => {
            setTimeout(() => history.pushState({}, "", "/next?step=2#done"), 150);
          });
        </script>`,
      }));
    await page.goto("http://url-state.test/start");
    await page.getByRole("button", { name: "Next" }).click();
    const next = await expectUrl(
      page,
      { pathname: "/next", hash: "#done", searchParams: { step: "2" } },
      "The deferred write did not settle",
    );
    assertEquals(next.href, "http://url-state.test/next?step=2#done");
    await page.goBack();
    assertEquals(
      (await expectUrl(
        page,
        { pathname: "/start", hash: "" },
        "Back did not restore the start",
      )).href,
      "http://url-state.test/start",
    );
    await assertRejects(
      () =>
        expectUrl(
          page,
          { searchParams: { step: "3" } },
          "Step three never arrived",
        ),
      Error,
      "Step three never arrived: expected step=3 within 2000ms, observed http://url-state.test/start",
    );
  } finally {
    await browser.close();
  }
});

Deno.test("followFragment waits for exactly the hashchange a navigation queues", async () => {
  const browser = await launchBrowser();
  try {
    for (const javaScriptEnabled of [true, false]) {
      const page = await browser.newPage({ javaScriptEnabled });
      await page.route("http://fragment.test/**", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<a id="note" href="#note-target">Note</a>
            <a id="routed" href="#routed-target">Routed</a>
            <h2 id="note-target" tabindex="-1">Note</h2>
            <h2 id="routed-target" tabindex="-1">Routed</h2>
            <div style="height:2000px"></div>
            <script>
              const handled = [];
              document.body.dataset.handled = "";
              addEventListener("hashchange", () => {
                handled.push(location.hash);
                document.body.dataset.handled = handled.join(" ");
              });
              document.getElementById("routed").addEventListener("click", (event) => {
                event.preventDefault();
                history.pushState(null, "", "#routed-target");
              });
            </script>`,
        }));
      await page.goto("http://fragment.test/");
      const steps = [
        ["#note-target", () => page.locator("#note").press("Enter")],
        ["#note-target", () => page.locator("#note").press("Enter")],
        ["#routed-target", () => page.locator("#routed").press("Enter")],
        ["#note-target", () => page.goBack()],
        ["", () => page.goBack()],
        ["#note-target", () => page.goForward()],
      ] as const;
      for (const [hash, action] of steps) {
        const url = await followFragment(
          page,
          hash,
          action,
          `${hash || "The document"} did not settle`,
        );
        assertEquals(url.hash, hash);
      }
      // The repeated press and the routed history write queue no hashchange;
      // each traversal between fragments of one document queues one.
      assertEquals(
        await page.evaluate(() => document.body.dataset.handled ?? null),
        javaScriptEnabled
          ? ["#note-target", "#note-target", "", "#note-target"].join(" ")
          : null,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
