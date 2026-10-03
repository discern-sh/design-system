import { assert, assertEquals, assertRejects } from "@std/assert";
import { launchBrowser } from "../scripts/browser.ts";
import {
  describeUrlExpectation,
  expectUrl,
  followFragment,
  urlMatches,
} from "../scripts/browser-url.ts";

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
