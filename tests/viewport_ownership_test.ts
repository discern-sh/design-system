import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import type { Page } from "playwright-core";
import { withViewport } from "../scripts/viewport.ts";
import {
  PACKAGE_ROOT,
  trackedTypeScriptSources,
} from "./support/tracked-typescript.ts";

const VIEWPORT_AUTHORITY = "scripts/viewport.ts";
type Viewport = { readonly height: number; readonly width: number };

function fakePage(initial: Viewport | null): {
  readonly calls: Viewport[];
  current: Viewport | null;
  readonly page: Page;
} {
  const state: {
    readonly calls: Viewport[];
    current: Viewport | null;
  } = {
    calls: [],
    current: initial,
  };
  const page = {
    setViewportSize: (viewport: Viewport): Promise<void> => {
      state.calls.push(viewport);
      state.current = viewport;
      return Promise.resolve();
    },
    viewportSize: (): Viewport | null => state.current,
  } as unknown as Page;
  return {
    get current(): Viewport | null {
      return state.current;
    },
    calls: state.calls,
    page,
  };
}

Deno.test("temporary viewport changes have one transactional authority", async () => {
  const rawViewportMutation = ".setViewport" + "Size(";
  const violations: string[] = [];
  for (const { path, source } of await trackedTypeScriptSources()) {
    if (path === VIEWPORT_AUTHORITY) continue;
    source.split("\n").forEach((line, index) => {
      if (line.includes(rawViewportMutation)) {
        violations.push(`${path}:${index + 1}`);
      }
    });
  }
  assertEquals(
    violations,
    [],
    "Use withViewport so temporary viewport state is restored in finally",
  );

  const authority = await Deno.readTextFile(
    join(PACKAGE_ROOT, VIEWPORT_AUTHORITY),
  );
  assertStringIncludes(authority, "export async function withViewport");
  assertEquals(
    authority.split(rawViewportMutation).length - 1,
    2,
    "withViewport must own both the temporary change and exact restoration",
  );
});

Deno.test("withViewport restores exact state after success and failure", async () => {
  const original = { height: 1000, width: 1440 };
  const temporary = { height: 256, width: 320 };
  const successful = fakePage(original);
  const result = await withViewport(
    successful.page,
    temporary,
    () => {
      assertEquals(successful.current, temporary);
      return Promise.resolve("complete");
    },
  );
  assertEquals(result, "complete");
  assertEquals(successful.current, original);
  assertEquals(successful.calls, [temporary, original]);

  const failing = fakePage(original);
  await assertRejects(
    () =>
      withViewport(failing.page, temporary, () => {
        throw new Error("operation failed");
      }),
    Error,
    "operation failed",
  );
  assertEquals(failing.current, original);
  assertEquals(failing.calls, [temporary, original]);
});

Deno.test("withViewport refuses state it cannot restore", async () => {
  const unbounded = fakePage(null);
  await assertRejects(
    () =>
      withViewport(
        unbounded.page,
        { height: 256, width: 320 },
        () => Promise.resolve(),
      ),
    Error,
    "requires a restorable viewport",
  );
  assertEquals(unbounded.calls, []);
});
