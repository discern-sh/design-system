import { assertEquals, assertStringIncludes } from "@std/assert";
import server, {
  catalogueFilePath,
  catalogueReviewRoutes,
} from "../scripts/serve.ts";
import {
  canonicalCatalogueShellPathname,
  catalogueComponentPath,
  catalogueRoutePaths,
} from "../catalogue/routes.ts";

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

Deno.test("the site root serves the built landing page directly", () => {
  assertEquals(catalogueFilePath("/"), "./dist/landing/index.html");
  assertEquals(
    catalogueFilePath("/dist/landing/discern.css"),
    "./dist/landing/discern.css",
  );
});

Deno.test("the Catalogue owns one canonical source, bundle, and mounted path", async () => {
  assertEquals(catalogueFilePath("/catalogue/"), "./catalogue/index.html");
  assertEquals(
    catalogueFilePath("/catalogue/dist/catalogue.js"),
    "./dist/catalogue.js",
  );
  assertEquals(
    catalogueFilePath("/catalogue/builder/"),
    "./catalogue/builder/index.html",
  );
  assertEquals(
    catalogueFilePath("/catalogue/dist/builder.js"),
    "./dist/builder.js",
  );

  const index = await Deno.readTextFile(
    new URL("../catalogue/index.html", import.meta.url),
  );
  assertStringIncludes(index, 'href="/catalogue/catalogue.css"');
  assertStringIncludes(index, 'src="/catalogue/dist/catalogue.js"');
  assertEquals(index.includes("styleguide"), false);

  const builder = await Deno.readTextFile(
    new URL("../catalogue/builder/index.html", import.meta.url),
  );
  assertStringIncludes(builder, 'href="builder.css"');
  assertStringIncludes(builder, 'src="../dist/builder.js"');
  assertStringIncludes(builder, "Discern interface builder — Beta");
});

Deno.test("Catalogue explorer routes serve one canonical shell", async () => {
  const shellPaths = [
    ...Object.values(catalogueRoutePaths),
    catalogueComponentPath("command-group"),
  ];
  for (const pathname of shellPaths) {
    assertEquals(canonicalCatalogueShellPathname(pathname), pathname);
    const response = await server.fetch(
      new Request(`http://127.0.0.1:8010${pathname}`),
    );
    assertEquals(response.status, 200, pathname);
    assertStringIncludes(
      await response.text(),
      '<div id="root"></div>',
      pathname,
    );
  }

  const redirect = await server.fetch(
    new Request("http://127.0.0.1:8010/catalogue/components/command-group"),
  );
  assertEquals(redirect.status, 307);
  assertEquals(
    redirect.headers.get("location"),
    "http://127.0.0.1:8010/catalogue/components/command-group/",
  );
  assertEquals(
    canonicalCatalogueShellPathname("/catalogue/dist/catalogue.js"),
    null,
  );
  assertEquals(canonicalCatalogueShellPathname("/catalogue/unknown/"), null);
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
      "Keyboard-focused internal link",
      "Mouse-targeted document link",
      "Mouse-focused picker pane",
      "Resolved internal fragment destination",
      "Single-pane document fallback",
      "No-colour ASCII reader",
      "Resize result · 40×24 to 120×30",
    ] as const
  ) {
    assertStringIncludes(html, title);
  }
});
