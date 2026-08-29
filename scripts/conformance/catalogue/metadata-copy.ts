import type { Locator, Page } from "playwright-core";
import {
  catalogueCopyRoleAttribute,
  catalogueDecisionCopyRole,
  catalogueDecisionCopySelector,
} from "../../../catalogue/metadata-copy.ts";
import { invariant } from "./support.ts";

interface DecisionCopyStyle {
  readonly text: string;
  readonly fontSize: number;
  readonly xsFontSize: number;
  readonly color: string;
  readonly faintColor: string;
  readonly whiteSpace: string;
  readonly textOverflow: string;
  readonly overflowX: string;
  readonly clientWidth: number;
  readonly scrollWidth: number;
  readonly lineClamp: string;
}

/** Ensure every copy node in a semantic projection enrols in the shared role. */
export async function verifyDecisionCopyEnrollment(
  root: Page | Locator,
  projectionSelector: string,
  label: string,
): Promise<number> {
  const candidates = root.locator(projectionSelector);
  const count = await candidates.count();
  invariant(count > 0, `${label} rendered no semantic copy witness`);
  for (let index = 0; index < count; index += 1) {
    invariant(
      await candidates.nth(index).getAttribute(catalogueCopyRoleAttribute) ===
        catalogueDecisionCopyRole,
      `${label} escaped the decision-copy role`,
    );
  }
  return count;
}

/**
 * Guard the semantic role, not a route-specific selector or CSS declaration.
 * Any future projection opts in through the authored decision-copy marker and
 * joins the same legibility contract automatically.
 */
export async function verifyDecisionCopyLegibility(
  root: Page | Locator,
  label: string,
): Promise<number> {
  const candidates = root.locator(catalogueDecisionCopySelector);
  const count = await candidates.count();
  const styles: DecisionCopyStyle[] = [];
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!await candidate.isVisible()) continue;
    styles.push(
      await candidate.evaluate((node) => {
        const element = node as HTMLElement;
        const documentElement = element.ownerDocument.documentElement;
        const tokenScope = element.closest("[data-discern-root]") ??
          documentElement;
        const tokenProbe = element.ownerDocument.createElement("span");
        tokenProbe.style.color = "var(--discern-color-ink-faint)";
        tokenProbe.style.fontSize = "var(--discern-font-size-xs)";
        tokenProbe.style.position = "absolute";
        tokenProbe.style.visibility = "hidden";
        tokenScope.append(tokenProbe);
        const probeStyle = getComputedStyle(tokenProbe);
        const faintColor = probeStyle.color;
        const xsFontSize = Number.parseFloat(probeStyle.fontSize);
        tokenProbe.remove();
        const style = getComputedStyle(element);
        return {
          text: element.textContent?.trim().replaceAll(/\s+/g, " ") ?? "",
          fontSize: Number.parseFloat(style.fontSize),
          xsFontSize,
          color: style.color,
          faintColor,
          whiteSpace: style.whiteSpace,
          textOverflow: style.textOverflow,
          overflowX: style.overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          lineClamp: style.webkitLineClamp,
        };
      }),
    );
  }
  invariant(styles.length > 0, `${label} enrolled no visible decision copy`);
  for (const style of styles) {
    const witness = style.text.slice(0, 90);
    invariant(
      style.fontSize > style.xsFontSize + 0.1,
      `${label} assigns decision copy to the xs floor (${witness})`,
    );
    invariant(
      style.color !== style.faintColor,
      `${label} assigns decision copy to faint ink (${witness})`,
    );
    invariant(
      style.whiteSpace !== "nowrap" && style.textOverflow !== "ellipsis" &&
        style.lineClamp === "none",
      `${label} truncates decision copy (${witness})`,
    );
    invariant(
      style.overflowX !== "hidden" ||
        style.scrollWidth <= style.clientWidth + 1,
      `${label} clips decision copy (${witness})`,
    );
  }
  return styles.length;
}

/** A 1280px-wide page viewed at 400% exposes a 320 CSS-pixel reflow width. */
export const CATALOGUE_400_PERCENT_REFLOW_VIEWPORT = {
  width: 320,
  height: 720,
} as const;
