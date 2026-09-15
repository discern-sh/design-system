import { assert, assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import type { Locator, Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import {
  clampedScrollPosition,
  visibleEnabledTargets,
  waitForPaintedFrames,
  waitForStableWindowScroll,
} from "../scripts/browser-conformance-support.ts";
import { trackedTypeScriptSources } from "./support/tracked-typescript.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));
const SCRIPTS_ROOT = join(PACKAGE_ROOT, "scripts");
const AXE_AUTHORITY = "browser-conformance-support.ts";

Deno.test("sequential focus predictions match native radio traversal and live selection", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <form id="external"><input type="radio" name="shared" checked></form>
      <input type="radio" name="spanning">
      <button id="before">Before</button>
      <main id="fixture">
        <input id="first" type="radio" name="chosen">
        <button id="middle">Between group members</button>
        <input id="second" type="radio" name="chosen" checked>
        <input id="unselected" type="radio" name="unselected">
        <input type="radio" name="unselected">
        <input type="radio" name="disabled" checked disabled>
        <input id="enabled" type="radio" name="disabled">
        <input type="radio" name="hidden" checked hidden>
        <input id="shown" type="radio" name="hidden">
        <input type="radio" name="negative" checked tabindex="-1">
        <input id="sequential" type="radio" name="negative">
        <fieldset disabled><input type="radio" name="fieldset" checked></fieldset>
        <input id="outside-fieldset" type="radio" name="fieldset">
        <div inert><input type="radio" name="inert" checked></div>
        <input id="outside-inert" type="radio" name="inert">
        <form id="one">
          <input id="one-selected" type="radio" name="shared" checked>
          <input type="radio" name="shared">
          <input type="radio" name="shared" form="external">
        </form>
        <form id="two"><input id="two-selected" type="radio" name="shared" checked></form>
        <input type="radio" name="shared" form="two">
        <input id="local-spanning" type="radio" name="spanning">
        <input type="radio" name="spanning">
        <input id="unnamed-one" type="radio"><input id="unnamed-two" type="radio" name="">
        <span id="custom-one" role="radio" tabindex="0">Custom one</span>
        <span id="custom-two" role="radio" tabindex="0">Custom two</span>
      </main>
      <button id="after">After</button>
    `);
    for (const selection of ["second", "first"]) {
      await page.locator(`#${selection}`).check();
      const predicted = await visibleEnabledTargets(page.locator("#fixture"));
      await page.locator("#before").focus();
      const actual = [];
      for (let index = 0; index < 30; index += 1) {
        await page.keyboard.press("Tab");
        const id = await page.evaluate(() => document.activeElement?.id ?? "");
        if (id === "after") break;
        actual.push(id);
      }
      assertEquals(actual, [
        ...(selection === "second"
          ? ["middle", "second"]
          : ["first", "middle"]),
        "unselected",
        "enabled",
        "shown",
        "sequential",
        "outside-fieldset",
        "outside-inert",
        "one-selected",
        "two-selected",
        "local-spanning",
        "unnamed-one",
        "unnamed-two",
        "custom-one",
        "custom-two",
      ]);
      assertEquals(
        await Promise.all(predicted.map((node) => node.getAttribute("id"))),
        actual,
      );
    }
  } finally {
    await browser.close();
  }
});

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

function hasUnsettledWheelGeometry(source: string): boolean {
  const wheel = /\.mouse\.wheel\s*\(/gu;
  for (const match of source.matchAll(wheel)) {
    const tail = source.slice((match.index ?? 0) + match[0].length);
    const pointer = tail.search(/\.mouse\.(?:click|dblclick)\s*\(/u);
    if (pointer < 0) continue;
    const journey = tail.slice(0, pointer);
    const geometry = journey.search(
      /(?:getBoundingClientRect|\.boundingBox)\s*\(/u,
    );
    if (geometry < 0) continue;
    const settled = journey.search(/waitForStableWindowScroll\s*\(/u);
    if (settled < 0 || settled > geometry) return true;
  }
  return false;
}

function hasUnclampedWheelScrollWitness(source: string): boolean {
  const wheel = /\.mouse\.wheel\s*\(/gu;
  for (const match of source.matchAll(wheel)) {
    const index = match.index ?? 0;
    const before = source.slice(Math.max(0, index - 600), index);
    const after = source.slice(index, index + 2_500);
    if (!/scroll(?:Top|Left)/u.test(before)) continue;
    if (!/scroll(?:Top|Left)/u.test(after)) continue;
    if (!/clampedScrollPosition\s*\(/u.test(after)) return true;
  }
  return false;
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

Deno.test("the wheel-geometry detector catches an unrelated future container", () => {
  assert(
    hasUnsettledWheelGeometry(`
      await operator.mouse.wheel(0, 999);
      const bounds = await unrelatedPanel.boundingBox();
      await operator.mouse.click(bounds.x, bounds.y);
    `),
  );
});

Deno.test("the wheel-clamp detector catches an unrelated future container", () => {
  assert(
    hasUnclampedWheelScrollWitness(`
      const before = await unrelatedViewport.evaluate((node) => node.scrollTop);
      await operator.mouse.wheel(0, 999);
      const after = await unrelatedViewport.evaluate((node) => node.scrollTop);
      assert(after === before);
    `),
  );
});

Deno.test("wheel scroll witnesses account for post-layout clamping", async () => {
  const offenders = (await trackedTypeScriptSources())
    .filter(({ path, source }) =>
      path.startsWith("scripts/") && hasUnclampedWheelScrollWitness(source)
    )
    .map(({ path }) => path);
  assertEquals(offenders, []);
});

Deno.test("wheel-driven pointer geometry waits for scrolling to settle", async () => {
  const offenders = (await trackedTypeScriptSources())
    .filter(({ path, source }) =>
      path.startsWith("scripts/") && hasUnsettledWheelGeometry(source)
    )
    .map(({ path }) => path);
  assertEquals(offenders, []);
});

Deno.test("the scroll authority observes two stable frames after movement", async () => {
  const positions = [40, 80, 80, 80];
  let frames = 0;
  const view = {
    scrollX: 0,
    scrollY: 0,
    requestAnimationFrame(callback: FrameRequestCallback): number {
      frames += 1;
      this.scrollY = positions.shift() ?? this.scrollY;
      callback(frames);
      return frames;
    },
  };
  const target = {
    evaluate: async (
      operation: (element: Element) => Promise<void>,
    ): Promise<void> => {
      await operation({
        ownerDocument: { defaultView: view },
      } as unknown as Element);
    },
  } as unknown as Locator;

  await waitForStableWindowScroll(target);

  assertEquals(frames, 4);
  assertEquals(view.scrollY, 80);
});

Deno.test("scroll witnesses preserve offsets within the new legal range", () => {
  assertEquals(clampedScrollPosition(25, 224), 25);
  assertEquals(clampedScrollPosition(25, 0), 0);
  assertEquals(clampedScrollPosition(-5, 224), 0);
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
