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

Deno.test(
  "every future metric case loads its target and fallback before measurement",
  async () => {
    const probes: string[] = [];
    const page = {
      evaluate: (
        _evaluate: unknown,
        candidate: { readonly font: string },
      ): Promise<boolean> => {
        probes.push(candidate.font);
        return Promise.resolve(true);
      },
    } as unknown as Page;
    const candidate = {
      name: "Future Typeface italic",
      target: '"Future Primary"',
      fallback: '"Future Substitute"',
      style: "italic",
      weights: [350, 725],
    } as const;
    const result = await availableFontMetricCases(page, [candidate]);

    assertEquals(probes, [
      'italic 350 64px "Future Primary"',
      'italic 350 64px "Future Substitute"',
      'italic 725 64px "Future Primary"',
      'italic 725 64px "Future Substitute"',
    ]);
    assertEquals(result.available, [candidate]);
    assertEquals(result.failures, []);
    assertEquals(result.skipped, []);
  },
);

Deno.test("an unavailable optional fallback skips a fully loaded target", async () => {
  const page = {
    evaluate: (
      _evaluate: unknown,
      candidate: { readonly font: string },
    ): Promise<boolean> =>
      Promise.resolve(!candidate.font.includes('600 64px "Optional Alias"')),
  } as unknown as Page;
  const result = await availableFontMetricCases(page, [{
    name: "Optional Alias normal",
    target: '"Target"',
    fallback: '"Optional Alias"',
    style: "normal",
    weights: [400, 600],
  }]);

  assertEquals(result.available, []);
  assertEquals(result.failures, []);
  assertEquals(result.skipped, ["Optional Alias normal"]);
});

Deno.test(
  "an unavailable required target fails instead of becoming an optional skip",
  async () => {
    const page = {
      evaluate: (
        _evaluate: unknown,
        candidate: { readonly font: string },
      ): Promise<boolean> =>
        Promise.resolve(
          !candidate.font.includes('700 64px "Required Target"'),
        ),
    } as unknown as Page;
    const result = await availableFontMetricCases(page, [{
      name: "Required Target/Local Stand-in normal",
      target: '"Required Target"',
      fallback: '"Local Stand-in"',
      style: "normal",
      weights: [400, 700],
    }]);

    assertEquals(result.available, []);
    assertEquals(result.failures, [
      'Required Target/Local Stand-in normal target "Required Target" did not load at 700',
    ]);
    assertEquals(result.skipped, []);
  },
);
