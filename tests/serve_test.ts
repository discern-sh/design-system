import { assertEquals, assertStringIncludes } from "@std/assert";
import server from "../scripts/serve.ts";

Deno.test("the serve task resolves the worktree's deterministic port with a fixed fallback", async () => {
  const config = JSON.parse(
    await Deno.readTextFile(new URL("../deno.json", import.meta.url)),
  ) as { tasks: Record<string, string> };
  const serve = config.tasks["serve"] ?? "";
  assertStringIncludes(serve, "$(discern identity --port");
  assertStringIncludes(serve, "echo 8010");
});

Deno.test("catalogue entry routes redirect to the canonical style guide URL", async () => {
  const cases = [
    {
      request: "http://127.0.0.1:8010/",
      location: "http://127.0.0.1:8010/style-guide/",
    },
    {
      request: "https://catalogue.example/?theme=dark",
      location: "https://catalogue.example/style-guide/?theme=dark",
    },
    {
      request: "http://127.0.0.1:8010/style-guide",
      location: "http://127.0.0.1:8010/style-guide/",
    },
  ] as const;

  for (const testCase of cases) {
    const response = await server.fetch(new Request(testCase.request));

    assertEquals(response.status, 307, testCase.request);
    assertEquals(response.headers.get("location"), testCase.location);
  }
});
