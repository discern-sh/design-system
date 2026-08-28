import type { Page } from "playwright-core";
import {
  BUILDER_SHELL,
  CANVAS_PAGE,
  FOCUSABLE_SELECTOR,
  invariant,
  type KeyboardSummary,
  visibleEnabledTargets,
} from "./support.ts";

export async function focusState(page: Page): Promise<{
  readonly canvas: boolean;
  readonly focusVisible: boolean;
  readonly indicator: boolean;
  readonly description: string;
}> {
  return await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return {
        canvas: false,
        focusVisible: false,
        indicator: false,
        description: "no HTMLElement",
      };
    }
    const candidates = [
      active,
      active.nextElementSibling,
      active.parentElement,
      active.closest("label"),
    ].filter((candidate): candidate is Element => candidate instanceof Element);
    const indicator = candidates.some((candidate) => {
      const style = getComputedStyle(candidate);
      return (style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) >= 2) ||
        style.boxShadow !== "none";
    });
    return {
      canvas: active.closest("#discern-builder-pane-canvas") !== null &&
        active.id !== "discern-builder-pane-canvas",
      focusVisible: active.matches(":focus-visible"),
      indicator,
      description: active.outerHTML.replace(/\s+/g, " ").slice(0, 180),
    };
  });
}

export async function verifyKeyboardTraversal(
  page: Page,
  label: string,
): Promise<KeyboardSummary> {
  const shell = page.locator(BUILDER_SHELL);
  const candidates = await visibleEnabledTargets(shell);
  await shell.evaluate((node) => {
    for (
      const [id, position] of [
        ["discern-builder-focus-before", "beforebegin"],
        ["discern-builder-focus-after", "afterend"],
      ] as const
    ) {
      const sentinel = document.createElement("button");
      sentinel.id = id;
      sentinel.type = "button";
      sentinel.textContent = `${id} sentinel`;
      sentinel.style.cssText =
        "position:fixed;inline-size:1px;block-size:1px;opacity:0;";
      node.insertAdjacentElement(position, sentinel);
    }
  });
  let stops = 0;
  let focusIndicators = 0;
  try {
    await page.locator("#discern-builder-focus-before").focus();
    const cap = candidates.length + 8;
    let escaped = false;
    for (let index = 0; index < cap; index += 1) {
      await page.keyboard.press("Tab");
      if (
        await page.locator("#discern-builder-focus-after").evaluate((node) =>
          node.ownerDocument.activeElement === node
        )
      ) {
        escaped = true;
        break;
      }
      const state = await focusState(page);
      invariant(
        !state.canvas,
        `${label} tabbed into canvas: ${state.description}`,
      );
      invariant(
        state.focusVisible,
        `${label} stop does not match :focus-visible: ${state.description}`,
      );
      invariant(
        state.indicator,
        `${label} stop has no visible focus indicator: ${state.description}`,
      );
      stops += 1;
      focusIndicators += 1;
    }
    invariant(escaped, `${label} keyboard traversal did not terminate`);
    const canvas = page.locator(CANVAS_PAGE);
    const canvasTargets = canvas.locator(FOCUSABLE_SELECTOR);
    invariant(
      await canvasTargets.count() > 0,
      `${label} canvas inertness check has no interactive witness`,
    );
    const exposed = await canvasTargets.evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        if (!(node instanceof HTMLElement)) return [];
        return node.tabIndex >= 0 && node.closest("[inert]") === null
          ? [node.outerHTML.replace(/\s+/g, " ").slice(0, 180)]
          : [];
      })
    );
    invariant(
      exposed.length === 0,
      `${label} canvas exposes sequential controls: ${exposed.join("; ")}`,
    );
    return { stops, focusIndicators };
  } finally {
    await page.locator(
      "#discern-builder-focus-before, #discern-builder-focus-after",
    ).evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  }
}
