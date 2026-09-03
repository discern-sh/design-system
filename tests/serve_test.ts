import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import server, {
  catalogueFilePath,
  catalogueReviewRoutes,
} from "../scripts/serve.ts";
import {
  canonicalCatalogueShellPathname,
  catalogueComponentPath,
  catalogueNavigation,
} from "../catalogue/routes.ts";
import { componentExampleImageManifest } from "../catalogue/generated/example-images-manifest.ts";
import { componentExampleImageThemes } from "../catalogue/example-images/contract.ts";

interface ModuleGraphDependency {
  readonly specifier: string;
  readonly code?: { readonly specifier: string };
}

interface ModuleGraphModule {
  readonly specifier: string;
  readonly dependencies?: readonly ModuleGraphDependency[] | null;
}

interface ModuleGraph {
  readonly roots: readonly string[];
  readonly modules: readonly ModuleGraphModule[];
}

function runtimeReactEdges(
  graph: ModuleGraph,
): readonly string[] {
  const modules = new Map(graph.modules.map((module) => [
    module.specifier,
    module,
  ]));
  const pending = [...graph.roots];
  const visited = new Set<string>();
  const reactEdges: string[] = [];
  while (pending.length > 0) {
    const specifier = pending.pop();
    if (specifier === undefined || visited.has(specifier)) continue;
    visited.add(specifier);
    const module = modules.get(specifier);
    for (const dependency of module?.dependencies ?? []) {
      if (dependency.code === undefined) continue;
      if (/^react(?:\/|$)/u.test(dependency.specifier)) {
        reactEdges.push(`${specifier} -> ${dependency.specifier}`);
      }
      pending.push(dependency.code.specifier);
    }
  }
  return reactEdges.toSorted();
}

Deno.test("the static serve graph never resolves React at runtime", async () => {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "info",
      "--json",
      "--config",
      "deno.json",
      "scripts/serve.ts",
    ],
    cwd: new URL("../", import.meta.url),
    stdout: "piped",
    stderr: "piped",
  }).output();
  const output = new TextDecoder().decode(result.stdout);
  assertEquals(
    result.code,
    0,
    `deno info failed:\n${new TextDecoder().decode(result.stderr)}`,
  );
  const graph = JSON.parse(output) as ModuleGraph;
  assertEquals(runtimeReactEdges(graph), []);
});

Deno.test("the static serve graph guard catches a future indirect React edge", () => {
  const fixture: ModuleGraph = {
    roots: ["file:///scripts/static-server.ts"],
    modules: [
      {
        specifier: "file:///scripts/static-server.ts",
        dependencies: [{
          specifier: "../catalogue/future/static-review.ts",
          code: { specifier: "file:///catalogue/future/static-review.ts" },
        }],
      },
      {
        specifier: "file:///catalogue/future/static-review.ts",
        dependencies: [{
          specifier: "react/jsx-runtime",
          code: { specifier: "file:///vendor/react/jsx-runtime.js" },
        }],
      },
    ],
  };
  assertEquals(runtimeReactEdges(fixture), [
    "file:///catalogue/future/static-review.ts -> react/jsx-runtime",
  ]);
});

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
  assertEquals(
    catalogueFilePath("/catalogue/example-images/"),
    "./catalogue/example-images/index.html",
  );
  assertEquals(
    catalogueFilePath("/catalogue/dist/example-image-capture.js"),
    "./dist/example-image-capture.js",
  );

  const index = await Deno.readTextFile(
    new URL("../catalogue/index.html", import.meta.url),
  );
  assertStringIncludes(index, 'href="/catalogue/catalogue.css"');
  assertStringIncludes(index, 'src="/catalogue/dist/catalogue.js"');
  assertEquals(index.includes("styleguide"), false);

  const stylesheet = await Deno.readTextFile(
    new URL("../catalogue/catalogue.css", import.meta.url),
  );
  const ownedStyles = [...stylesheet.matchAll(/@import url\("([^"]+)"\);/g)]
    .map((match) => match[1] ?? "");
  assertEquals(ownedStyles.length > 0, true);
  for (const pathname of ownedStyles) {
    assertEquals(pathname.startsWith("/catalogue/styles/"), true, pathname);
    const response = await server.fetch(
      new Request(`http://127.0.0.1:8010${pathname}`),
    );
    assertEquals(response.status, 200, pathname);
    assertStringIncludes(
      response.headers.get("content-type") ?? "",
      "text/css",
      pathname,
    );
  }

  const builder = await Deno.readTextFile(
    new URL("../catalogue/builder/index.html", import.meta.url),
  );
  assertStringIncludes(builder, 'href="builder.css"');
  assertStringIncludes(builder, 'src="../dist/builder.js"');
  assertStringIncludes(builder, "Discern interface builder — Beta");

  const capture = await Deno.readTextFile(
    new URL("../catalogue/example-images/index.html", import.meta.url),
  );
  assertStringIncludes(
    capture,
    'src="/catalogue/dist/example-image-capture.js"',
  );
  assertStringIncludes(capture, 'data-discern-capture-status="loading"');
});

Deno.test("Catalogue source actions open TypeScript as readable browser text", async () => {
  for (
    const pathname of [
      "/catalogue/src/components/workflow/command/command.tsx",
      "/catalogue/src/components/workflow/command/command.cli.ts",
    ]
  ) {
    const response = await server.fetch(
      new Request(`http://127.0.0.1:8010${pathname}`),
    );
    assertEquals(response.status, 200, pathname);
    assertEquals(
      response.headers.get("content-type"),
      "text/plain; charset=utf-8",
      pathname,
    );
    assertStringIncludes(await response.text(), "Command", pathname);
  }
});

Deno.test("Catalogue explorer routes serve one canonical shell", async () => {
  const shellPaths = [
    ...catalogueNavigation.map(({ path }) => path),
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

Deno.test("unknown Catalogue pages reach the client not-found route without hiding missing assets", async () => {
  const route = await server.fetch(
    new Request("http://127.0.0.1:8010/catalogue/unknown/future-page/"),
  );
  assertEquals(route.status, 200);
  assertStringIncludes(await route.text(), '<div id="root"></div>');

  const asset = await server.fetch(
    new Request("http://127.0.0.1:8010/catalogue/styles/missing.css"),
  );
  assertEquals(asset.status, 404);
});

Deno.test("Catalogue review routes stay outside replaceable build output", async () => {
  assertEquals(
    catalogueReviewRoutes.map(({ pathname }) => pathname),
    [
      "/catalogue/example-images/review/",
      "/catalogue/reviews/markdown-browser/",
    ],
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

  const imageReview = await server.fetch(
    new Request(
      "http://127.0.0.1:8010/catalogue/example-images/review/",
    ),
  );
  assertEquals(imageReview.status, 200);
  const imageHtml = await imageReview.text();
  assertStringIncludes(
    imageHtml,
    `${componentExampleImageManifest.entries.length} exact-bounds, high-density theme entries`,
  );
  assertStringIncludes(
    imageHtml,
    "checkerboard exposes transparent crop edges",
  );
  const firstImage = componentExampleImageManifest.entries[0];
  assert(firstImage !== undefined);
  assertStringIncludes(
    imageHtml,
    `${firstImage.width}×${firstImage.height} CSS · ${firstImage.pixelWidth}×${firstImage.pixelHeight} px · ${firstImage.density}×`,
  );
  assertStringIncludes(imageHtml, 'data-representative="true"');
  assertStringIncludes(imageHtml, "240×150 consumer frame");
  assertStringIncludes(
    imageHtml,
    "border: 1px solid color-mix(in srgb, CanvasText 24%, transparent); background: Canvas; color: CanvasText; }",
  );
  for (const theme of componentExampleImageThemes) {
    assertStringIncludes(
      imageHtml,
      `class="thumbnail" data-theme="${theme}"`,
    );
    assertStringIncludes(
      imageHtml,
      `.thumbnail[data-theme="${theme}"] { color-scheme: ${theme}; }`,
    );
  }

  const imageResponse = await server.fetch(
    new Request(`http://127.0.0.1:8010${firstImage.assetUrl}`),
  );
  assertEquals(imageResponse.status, 200);
  assertEquals(imageResponse.headers.get("content-type"), "image/png");
});
