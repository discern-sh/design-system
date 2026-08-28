import type { Page } from "playwright-core";
import { catalogueComponentPath } from "../../../catalogue/routes.ts";
import { withViewport } from "../../viewport.ts";
import {
  CATALOGUE_NARROW_VIEWPORT,
  CATALOGUE_WIDE_VIEWPORT,
  eventually,
  invariant,
  loadCataloguePage,
} from "./support.ts";

const ROOT = "[data-discern-overflow-cue]";
const TARGET = "[data-discern-overflow-cue-target]";

function stateSelector(example: string): string {
  return `#component-overflow-cue--${example}`;
}

async function expectEdge(
  page: Page,
  example: string,
  edge: "block-start" | "block-end" | "inline-start" | "inline-end",
  value: boolean,
): Promise<void> {
  const root = page.locator(stateSelector(example)).locator(ROOT);
  await eventually(
    async () =>
      await root.getAttribute(`data-discern-overflow-cue-${edge}`) ===
        String(value),
    `${example} did not report ${edge}=${value}`,
  );
}

/** Exercise the reusable browser behavior independently of its Terminal use. */
export async function verifyOverflowCueCatalogue(
  page: Page,
  origin: string,
): Promise<number> {
  return await withViewport(page, CATALOGUE_WIDE_VIEWPORT, async () => {
    const url = new URL(catalogueComponentPath("overflow-cue"), origin);
    url.searchParams.set("theme", "light");
    await loadCataloguePage(page, url.href);

    await expectEdge(page, "vertical-start", "block-start", false);
    await expectEdge(page, "vertical-start", "block-end", true);
    const vertical = page.locator(stateSelector("vertical-start")).locator(
      TARGET,
    );
    await vertical.hover();
    await page.mouse.wheel(0, 180);
    await eventually(
      async () => await vertical.evaluate((node) => node.scrollTop > 0),
      "wheel scrolling did not move the native OverflowCue viewport",
    );
    await expectEdge(page, "vertical-start", "block-start", true);
    await vertical.focus();
    await page.keyboard.press("End");
    await expectEdge(page, "vertical-start", "block-end", false);

    const nativeScroll = await vertical.evaluate((node) => {
      const target = node as HTMLElement;
      const cue = target.closest("[data-discern-overflow-cue]")?.querySelector(
        "[data-discern-overflow-cue-edge]",
      );
      const style = getComputedStyle(target);
      return {
        overflowY: style.overflowY,
        touchAction: style.touchAction,
        cuePointerEvents: cue === null || cue === undefined
          ? "missing"
          : getComputedStyle(cue).pointerEvents,
      };
    });
    invariant(
      nativeScroll.overflowY !== "hidden" &&
        nativeScroll.touchAction !== "none" &&
        nativeScroll.cuePointerEvents === "none",
      "OverflowCue must preserve native wheel, touch, and pointer behavior",
    );

    const dynamic = page.locator(stateSelector("dynamic-content"));
    await expectEdge(page, "dynamic-content", "block-end", false);
    await dynamic.getByRole("button", { name: "Add content" }).click();
    await expectEdge(page, "dynamic-content", "block-end", true);
    await dynamic.locator(ROOT).evaluate((node) => {
      const root = node as HTMLElement;
      const target = root.querySelector<HTMLElement>(
        "[data-discern-overflow-cue-target]",
      );
      if (target === null) throw new Error("dynamic target missing");
      root.style.blockSize = `${target.scrollHeight + 24}px`;
    });
    await expectEdge(page, "dynamic-content", "block-end", false);

    await expectEdge(page, "rtl-inline", "inline-start", true);
    await expectEdge(page, "rtl-inline", "inline-end", true);
    const rtlTarget = page.locator(stateSelector("rtl-inline")).locator(TARGET);
    await rtlTarget.evaluate((node) => {
      (node as HTMLElement).scrollLeft = 0;
    });
    await expectEdge(page, "rtl-inline", "inline-start", false);
    await expectEdge(page, "rtl-inline", "inline-end", true);
    await rtlTarget.evaluate((node) => {
      const target = node as HTMLElement;
      target.scrollLeft = -target.scrollWidth;
    });
    await expectEdge(page, "rtl-inline", "inline-start", true);
    await expectEdge(page, "rtl-inline", "inline-end", false);

    for (
      const edge of [
        "block-start",
        "block-end",
        "inline-start",
        "inline-end",
      ] as const
    ) {
      await expectEdge(page, "no-overflow", edge, false);
    }

    await page.emulateMedia({ forcedColors: "active" });
    const forcedColorCue = await page.locator(
      `${stateSelector("horizontal-start")} ` +
        '[data-discern-overflow-cue-edge="inline-end"]',
    ).evaluate((node) => ({
      background: getComputedStyle(node).backgroundImage,
      border: getComputedStyle(node).borderInlineEndStyle,
    }));
    invariant(
      forcedColorCue.background === "none" &&
        forcedColorCue.border !== "none",
      "Forced colours must replace OverflowCue gradients with a system edge",
    );
    await page.emulateMedia({ forcedColors: "none" });

    await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
      const documentOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      );
      invariant(
        documentOverflow <= 1,
        `OverflowCue examples overflowed the narrow document by ${documentOverflow}px`,
      );
    });
    return 19;
  });
}
