import { assert, assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import type { Page } from "playwright-core";
import { waitForPaintedFrames } from "../scripts/browser-conformance-support.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));
const SCRIPTS_ROOT = join(PACKAGE_ROOT, "scripts");
const AXE_AUTHORITY = "browser-conformance-support.ts";

async function typescriptFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) files.push(...await typescriptFiles(path));
    else if (entry.isFile && path.endsWith(".ts")) files.push(path);
  }
  return files.toSorted();
}

function importsAxePlaywright(source: string): boolean {
  return /["']@axe-core\/playwright["']/u.test(source);
}

Deno.test("the direct axe import detector catches a future conformance container", () => {
  assert(
    importsAxePlaywright(
      'import { AxeBuilder as Audit } from "@axe-core/playwright";',
    ),
  );
});

Deno.test("the accessibility authority waits for two painted frames", async () => {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "requestAnimationFrame",
  );
  let frames = 0;
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback): number => {
      frames += 1;
      callback(frames);
      return frames;
    },
  });
  const page = {
    evaluate: async (operation: () => Promise<void>): Promise<void> => {
      await operation();
    },
  } as unknown as Page;
  try {
    await waitForPaintedFrames(page);
    assertEquals(frames, 2);
  } finally {
    if (original === undefined) {
      delete (globalThis as {
        requestAnimationFrame?: (callback: FrameRequestCallback) => number;
      }).requestAnimationFrame;
    } else {
      Object.defineProperty(globalThis, "requestAnimationFrame", original);
    }
  }
});

Deno.test("browser accessibility scans share one painted-frame authority", async () => {
  const directImporters: string[] = [];
  for (const path of await typescriptFiles(SCRIPTS_ROOT)) {
    const source = await Deno.readTextFile(path);
    if (importsAxePlaywright(source)) {
      directImporters.push(relative(SCRIPTS_ROOT, path));
    }
  }
  assertEquals(directImporters, [AXE_AUTHORITY]);
});
