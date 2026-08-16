import { assertEquals, assertStringIncludes } from "@std/assert";
import server, { catalogueFilePath } from "../scripts/serve.ts";

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
