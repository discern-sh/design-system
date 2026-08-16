import { assertEquals, assertStringIncludes } from "@std/assert";
import server, {
  catalogueFilePath,
  catalogueReviewRoutes,
} from "../scripts/serve.ts";

Deno.test("the serve task resolves the worktree's deterministic port with a fixed fallback", async () => {
  const config = JSON.parse(
    await Deno.readTextFile(new URL("../deno.json", import.meta.url)),
  ) as { tasks: Record<string, string> };
  const serve = config.tasks["serve"] ?? "";
  assertStringIncludes(serve, "$(discern identity --port");
  assertStringIncludes(serve, "echo 8010");
});

Deno.test("catalogue entry routes redirect to the canonical Catalogue URL", async () => {
  const cases = [
    {
      request: "http://127.0.0.1:8010/",
      location: "http://127.0.0.1:8010/catalogue/",
    },
    {
      request: "https://catalogue.example/?theme=dark",
      location: "https://catalogue.example/catalogue/?theme=dark",
    },
    {
      request: "http://127.0.0.1:8010/catalogue",
      location: "http://127.0.0.1:8010/catalogue/",
    },
    {
      request: "http://127.0.0.1:8010/style-guide/?surface=cli",
      location: "http://127.0.0.1:8010/catalogue/?surface=cli",
    },
    {
      request: "http://127.0.0.1:8010/styleguide",
      location: "http://127.0.0.1:8010/catalogue/",
    },
  ] as const;

  for (const testCase of cases) {
    const response = await server.fetch(new Request(testCase.request));

    assertEquals(response.status, 307, testCase.request);
    assertEquals(response.headers.get("location"), testCase.location);
  }
});

Deno.test("the Catalogue owns one canonical source, bundle, and mounted path", async () => {
  assertEquals(catalogueFilePath("/catalogue/"), "./catalogue/index.html");
  assertEquals(
    catalogueFilePath("/catalogue/dist/catalogue.js"),
    "./dist/catalogue.js",
  );

  const index = await Deno.readTextFile(
    new URL("../catalogue/index.html", import.meta.url),
  );
  assertStringIncludes(index, 'href="catalogue.css"');
  assertStringIncludes(index, 'src="dist/catalogue.js"');
  assertEquals(index.includes("styleguide"), false);
});

Deno.test("Catalogue review routes stay outside replaceable build output", async () => {
  assertEquals(
    catalogueReviewRoutes.map(({ pathname }) => pathname),
    ["/catalogue/reviews/markdown-browser/"],
  );
  for (const route of catalogueReviewRoutes) {
    assertEquals(
      route.pathname.startsWith("/catalogue/dist/"),
      false,
      `${route.pathname} must not depend on replaceable build output`,
    );
    const response = await server.fetch(
      new Request(`http://127.0.0.1:8010${route.pathname}`),
    );
    assertEquals(response.status, 200, route.pathname);
    assertStringIncludes(
      response.headers.get("content-type") ?? "",
      "text/html",
    );
  }

  const legacy = await server.fetch(
    new Request(
      "http://127.0.0.1:8010/catalogue/dist/markdown-browser-review.html",
    ),
  );
  assertEquals(legacy.status, 307);
  assertEquals(
    legacy.headers.get("location"),
    "http://127.0.0.1:8010/catalogue/reviews/markdown-browser/",
  );

  const review = await server.fetch(
    new Request(
      "http://127.0.0.1:8010/catalogue/reviews/markdown-browser/",
    ),
  );
  assertEquals(review.status, 200);
  const html = await review.text();
  for (
    const title of [
      "Initial full-height picker",
      "Split picker and Markdown reader",
      "Single-pane document fallback",
      "No-colour ASCII reader",
      "Resize result · 40×24 to 120×30",
    ] as const
  ) {
    assertStringIncludes(html, title);
  }
});
