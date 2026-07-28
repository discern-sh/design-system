import { assertEquals } from "@std/assert";
import type { Page } from "playwright-core";
import {
  availableFontMetricCases,
  fontLoadsWithin,
} from "../scripts/font-availability.ts";

const request = { font: 'normal 400 64px "Optional Alias"', timeoutMs: 1 };

Deno.test("an available optional font is covered", async () => {
  assertEquals(
    await fontLoadsWithin(request, () => Promise.resolve([{}])),
    true,
  );
  assertEquals(
    await fontLoadsWithin(request, () => Promise.resolve([])),
    false,
  );
});

Deno.test("a failed optional font load is skipped", async () => {
  assertEquals(
    await fontLoadsWithin(
      request,
      () => Promise.reject(new DOMException("Unavailable", "NetworkError")),
    ),
    false,
  );
});

Deno.test("an unresolved optional font load is bounded", async () => {
  const result = await Promise.race([
    fontLoadsWithin(request, () => new Promise<never>(() => undefined)),
    new Promise<"outer-timeout">((resolve) =>
      setTimeout(() => resolve("outer-timeout"), 100)
    ),
  ]);
  assertEquals(result, false);
});

Deno.test("a metric case needs every measured weight to load", async () => {
  const probes: string[] = [];
  const page = {
    evaluate: (
      _evaluate: unknown,
      candidate: { readonly font: string },
    ): Promise<boolean> => {
      probes.push(candidate.font);
      return Promise.resolve(!candidate.font.includes("600"));
    },
  } as unknown as Page;
  const result = await availableFontMetricCases(page, [{
    name: "Optional Alias normal",
    target: '"Target"',
    fallback: '"Optional Alias"',
    style: "normal",
    weights: [400, 600],
  }]);

  assertEquals(probes, [
    'normal 400 64px "Optional Alias"',
    'normal 600 64px "Optional Alias"',
  ]);
  assertEquals(result.available, []);
  assertEquals(result.skipped, ["Optional Alias normal"]);
});
