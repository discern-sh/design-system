import { AxeBuilder } from "@axe-core/playwright";
import type { Browser, Locator, Page } from "playwright-core";
import { themeTokens } from "../src/tokens/tokens.ts";
import {
  auditBundledFontMetricAssets,
  auditFontMetricOverrides,
  bundledFontMetricSources,
} from "./font-metric-overrides.ts";

const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;
const ZOOMED_REFLOW_VIEWPORT = { width: 320, height: 256 } as const;
const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;
const SURFACE_SELECTOR =
  ".discern-catalogue-component__canvas, [data-discern-journey]";
const FOCUSABLE_SELECTOR =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, " +
  "[tabindex]:not([tabindex='-1'])";
const INTERACTIVE_SELECTOR =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, " +
  "[role='button'], [role='link'], [role='checkbox'], [role='radio'], " +
  "[role='switch'], [tabindex]:not([tabindex='-1'])";
const TARGET_SELECTOR =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, " +
  "[role='button'], [role='link'], [role='checkbox'], [role='radio'], " +
  "[role='switch']";

interface JourneyStructureResult {
  readonly journeys: number;
  readonly stages: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface DisclosureResult {
  readonly disclosures: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface NestedControlResult {
  readonly controls: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface TargetResult {
  readonly targets: number;
  readonly inlineTextExceptions: number;
  readonly labelledControlBoxes: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface ReflowResult {
  readonly surfaces: number;
  readonly containedOverflow: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface MotionTarget {
  readonly surface: number;
  readonly element: number;
  readonly pseudo: "" | "::before" | "::after";
  readonly animation: boolean;
  readonly transition: boolean;
  readonly smoothScroll: boolean;
}

interface ReducedMotionResult {
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface ThemeResult {
  readonly consumers: number;
  readonly geometryChecks: number;
  readonly fontFallbackChecks: number;
  readonly fontFallbackAliasesCovered: readonly string[];
  readonly fontFallbackAliasesSkipped: readonly string[];
  readonly fontMetricOverrideFaces: number;
  readonly maxFontLineBoxDeltaPixels: number;
  readonly maxFontWidthDeltaPercent: number;
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface SemanticFocusResult {
  readonly targets: number;
  readonly roles: readonly string[];
  readonly failures: readonly string[];
  readonly futureProof: boolean;
}

interface FocusRect {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
}

interface FocusIndicatorStyle {
  readonly backgroundColor: string;
  readonly candidate: "target" | "next-sibling" | "parent";
  readonly effectiveOpacity: number;
  readonly outlineColor: string;
  readonly outlineOffset: string;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly boxShadow: string;
  readonly boxShadowColors: readonly string[];
  readonly paintKnown: boolean;
  readonly rect: FocusRect;
  readonly semanticallyAssociated: boolean;
  readonly sharedParentRect: FocusRect | undefined;
  readonly targetRect: FocusRect;
  readonly textDecorationColor: string;
  readonly textDecorationLine: string;
  readonly textDecorationThickness: string;
  readonly visible: boolean;
}

interface FocusFixtureOracle {
  readonly color: string;
  readonly effectiveOpacity: number;
  readonly filterKnown: boolean;
  readonly filters: readonly string[];
  readonly geometricallyAssociated: boolean;
  readonly semanticallyAssociated: boolean;
  readonly style: string;
  readonly visible: boolean;
  readonly width: string;
}

interface ColorChannels {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

interface SemanticSurfaceToken {
  readonly role: string;
  readonly token: string;
}

interface SemanticFocusTarget {
  readonly surface: number;
  readonly element: number;
  readonly role: string;
  readonly surfaceColor: string;
  readonly proofKind: string;
}

function computedColor(value: string): ColorChannels | undefined {
  if (value === "transparent") {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }
  const match = value.match(/^rgba?\(([^)]+)\)$/);
  if (match === null) return undefined;
  const channels = (match[1] ?? "").match(/[\d.]+/g)?.map(Number) ?? [];
  const red = channels[0];
  const green = channels[1];
  const blue = channels[2];
  if (red === undefined || green === undefined || blue === undefined) {
    return undefined;
  }
  return {
    red,
    green,
    blue,
    alpha: channels[3] ?? 1,
  };
}

function contrastRatio(
  foregroundValue: string,
  backgroundValue: string,
  effectiveOpacity = 1,
): number | undefined {
  const foreground = computedColor(foregroundValue);
  const background = computedColor(backgroundValue);
  if (foreground === undefined || background === undefined) return undefined;
  const alpha = foreground.alpha *
    Math.max(0, Math.min(1, effectiveOpacity));
  const composite = {
    red: foreground.red * alpha + background.red * (1 - alpha),
    green: foreground.green * alpha + background.green * (1 - alpha),
    blue: foreground.blue * alpha + background.blue * (1 - alpha),
  };
  const luminance = (
    color: {
      readonly red: number;
      readonly green: number;
      readonly blue: number;
    },
  ): number => {
    const channels = [color.red, color.green, color.blue].map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (channels[0] ?? 0) +
      0.7152 * (channels[1] ?? 0) +
      0.0722 * (channels[2] ?? 0);
  };
  const foregroundLuminance = luminance(composite);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function paintedBackground(
  foregroundValue: string,
  backgroundValue: string,
  effectiveOpacity = 1,
): string {
  const foreground = computedColor(foregroundValue);
  const background = computedColor(backgroundValue);
  if (foreground === undefined || background === undefined) {
    return backgroundValue;
  }
  const alpha = foreground.alpha *
    Math.max(0, Math.min(1, effectiveOpacity));
  const red = foreground.red * alpha + background.red * (1 - alpha);
  const green = foreground.green * alpha + background.green * (1 - alpha);
  const blue = foreground.blue * alpha + background.blue * (1 - alpha);
  return `rgb(${red}, ${green}, ${blue})`;
}

function rectContains(outer: FocusRect, inner: FocusRect): boolean {
  const tolerance = 1;
  return outer.left <= inner.left + tolerance &&
    outer.top <= inner.top + tolerance &&
    outer.right >= inner.right - tolerance &&
    outer.bottom >= inner.bottom - tolerance;
}

function rectsOverlap(left: FocusRect, right: FocusRect): boolean {
  return left.left < right.right && left.right > right.left &&
    left.top < right.bottom && left.bottom > right.top;
}

function rectGap(left: FocusRect, right: FocusRect): number {
  const horizontal = Math.max(
    0,
    left.left - right.right,
    right.left - left.right,
  );
  const vertical = Math.max(
    0,
    left.top - right.bottom,
    right.top - left.bottom,
  );
  return Math.hypot(horizontal, vertical);
}

function focusCandidateAssociated(style: FocusIndicatorStyle): boolean {
  if (style.candidate === "target") return true;
  if (style.candidate === "parent") {
    return rectContains(style.rect, style.targetRect) ||
      rectsOverlap(style.rect, style.targetRect) ||
      rectGap(style.rect, style.targetRect) <= Math.max(
          style.rect.width,
          style.rect.height,
          style.targetRect.width,
          style.targetRect.height,
        );
  }
  if (!style.semanticallyAssociated) return false;
  if (rectsOverlap(style.rect, style.targetRect)) return true;
  const sharedParent = style.sharedParentRect;
  if (
    sharedParent === undefined ||
    !rectContains(sharedParent, style.targetRect) ||
    !rectContains(sharedParent, style.rect)
  ) {
    return false;
  }
  return rectGap(style.rect, style.targetRect) <=
    Math.max(sharedParent.width, sharedParent.height);
}

function paintAppearanceContrast(
  color: string,
  background: string,
  previous: FocusIndicatorStyle,
  current: FocusIndicatorStyle,
): number {
  if (!previous.paintKnown || !current.paintKnown) return 0;
  const beforePaint = paintedBackground(
    color,
    background,
    previous.visible ? previous.effectiveOpacity : 0,
  );
  const afterPaint = paintedBackground(
    color,
    background,
    current.visible ? current.effectiveOpacity : 0,
  );
  return contrastRatio(afterPaint, beforePaint) ?? 0;
}

function focusIndicatorContrast(
  before: readonly FocusIndicatorStyle[],
  after: readonly FocusIndicatorStyle[],
  surfaceColor: string,
): {
  readonly colors: readonly string[];
  readonly maxContrast: number;
} {
  const indicators: Array<
    {
      readonly color: string;
      readonly background: string;
      readonly effectiveOpacity: number;
    }
  > = [];
  for (let index = 0; index < after.length; index += 1) {
    const current = after[index];
    const previous = before[index];
    if (
      current === undefined || !current.visible || !current.paintKnown ||
      !focusCandidateAssociated(current)
    ) {
      continue;
    }
    const insideBackground = paintedBackground(
      current.backgroundColor,
      surfaceColor,
      current.effectiveOpacity,
    );
    const opacityOrVisibilityChanged = previous !== undefined &&
      (
        current.effectiveOpacity !== previous.effectiveOpacity ||
        current.visible !== previous.visible
      );
    const outlineAppearanceChanged = previous !== undefined &&
      opacityOrVisibilityChanged &&
      paintAppearanceContrast(
          current.outlineColor,
          Number.parseFloat(current.outlineOffset) < 0
            ? insideBackground
            : surfaceColor,
          previous,
          current,
        ) >= 3;
    const outlineChanged = previous === undefined ||
      outlineAppearanceChanged ||
      current.outlineColor !== previous.outlineColor ||
      current.outlineOffset !== previous.outlineOffset ||
      current.outlineStyle !== previous.outlineStyle ||
      current.outlineWidth !== previous.outlineWidth;
    if (
      outlineChanged && current.outlineStyle !== "none" &&
      Number.parseFloat(current.outlineWidth) >= 2
    ) {
      indicators.push({
        color: current.outlineColor,
        background: Number.parseFloat(current.outlineOffset) < 0
          ? insideBackground
          : surfaceColor,
        effectiveOpacity: current.effectiveOpacity,
      });
    }
    if (
      current.boxShadow !== "none" &&
      (
        previous === undefined ||
        current.boxShadow !== previous.boxShadow ||
        (
          opacityOrVisibilityChanged &&
          current.boxShadowColors.some((color) =>
            previous !== undefined &&
            paintAppearanceContrast(
                color,
                current.boxShadow.includes("inset")
                  ? insideBackground
                  : surfaceColor,
                previous,
                current,
              ) >= 3
          )
        )
      )
    ) {
      const background = current.boxShadow.includes("inset")
        ? insideBackground
        : surfaceColor;
      indicators.push(
        ...current.boxShadowColors.map((color) => ({
          color,
          background,
          effectiveOpacity: current.effectiveOpacity,
        })),
      );
    }
    const underlineAppearanceChanged = previous !== undefined &&
      opacityOrVisibilityChanged &&
      paintAppearanceContrast(
          current.textDecorationColor,
          insideBackground,
          previous,
          current,
        ) >= 3;
    const underlineChanged = previous === undefined ||
      underlineAppearanceChanged ||
      current.textDecorationColor !== previous.textDecorationColor ||
      current.textDecorationLine !== previous.textDecorationLine ||
      current.textDecorationThickness !== previous.textDecorationThickness;
    if (
      underlineChanged &&
      current.textDecorationLine.split(/\s+/).includes("underline")
    ) {
      indicators.push({
        color: current.textDecorationColor,
        background: insideBackground,
        effectiveOpacity: current.effectiveOpacity,
      });
    }
  }
  const contrasts = indicators.map((
    { color, background, effectiveOpacity },
  ) => contrastRatio(color, background, effectiveOpacity))
    .filter((ratio): ratio is number => ratio !== undefined);
  return {
    colors: indicators.map(({ color }) => color),
    maxContrast: contrasts.length === 0 ? 0 : Math.max(...contrasts),
  };
}

async function focusStyles(target: Locator): Promise<FocusIndicatorStyle[]> {
  return await target.evaluate((node) => {
    type Candidate = {
      readonly element: Element;
      readonly kind: "target" | "next-sibling" | "parent";
    };
    type Rect = {
      readonly bottom: number;
      readonly height: number;
      readonly left: number;
      readonly right: number;
      readonly top: number;
      readonly width: number;
    };
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const pixelColor = (value: string): string => {
      if (value === "transparent") return "rgba(0, 0, 0, 0)";
      if (/^rgba?\(/.test(value)) return value;
      if (context === null) return value;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "rgba(0, 0, 0, 0)";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${
        (pixel[3] ?? 0) / 255
      })`;
    };
    const rect = (element: Element): Rect => {
      const current = element.getBoundingClientRect();
      return {
        bottom: current.bottom,
        height: current.height,
        left: current.left,
        right: current.right,
        top: current.top,
        width: current.width,
      };
    };
    const filterOpacity = (
      value: string,
    ): { readonly known: boolean; readonly opacity: number } => {
      if (value === "none") return { known: true, opacity: 1 };
      let position = 0;
      let opacity = 1;
      while (position < value.length) {
        while (/\s/.test(value[position] ?? "")) position += 1;
        if (position >= value.length) break;
        const name = value.slice(position).match(/^[-a-z]+/i)?.[0];
        if (name === undefined) return { known: false, opacity };
        position += name.length;
        while (/\s/.test(value[position] ?? "")) position += 1;
        if (value[position] !== "(") return { known: false, opacity };
        position += 1;
        const argumentStart = position;
        let depth = 1;
        let escaped = false;
        let quote: "'" | '"' | undefined;
        while (position < value.length && depth > 0) {
          const character = value[position];
          if (character === undefined) break;
          if (escaped) {
            escaped = false;
          } else if (character === "\\") {
            escaped = true;
          } else if (quote !== undefined) {
            if (character === quote) quote = undefined;
          } else if (character === "'" || character === '"') {
            quote = character;
          } else if (character === "(") {
            depth += 1;
          } else if (character === ")") {
            depth -= 1;
          }
          position += 1;
        }
        if (depth !== 0 || quote !== undefined) {
          return { known: false, opacity };
        }
        const argument = value.slice(argumentStart, position - 1).trim();
        if (name.toLowerCase() !== "opacity") {
          return { known: false, opacity };
        }
        if (
          !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
            argument,
          )
        ) {
          return { known: false, opacity };
        }
        const factor = Number(argument);
        if (!Number.isFinite(factor)) return { known: false, opacity };
        opacity *= Math.max(0, Math.min(1, factor));
      }
      return { known: true, opacity };
    };
    const references = (element: Element, attribute: string): string[] =>
      (element.getAttribute(attribute) ?? "").trim().split(/\s+/).filter(
        Boolean,
      );
    const semanticAssociation = (
      candidate: Element,
    ): boolean => {
      const parent = node.parentElement;
      if (parent === null || candidate.parentElement !== parent) return false;
      if (
        parent instanceof HTMLLabelElement &&
        parent.control === node
      ) {
        return true;
      }
      return [
        candidate.id !== "" &&
        references(node, "aria-controls").includes(candidate.id),
        candidate.id !== "" &&
        references(node, "aria-owns").includes(candidate.id),
        node.id !== "" &&
        references(candidate, "aria-controls").includes(node.id),
        node.id !== "" &&
        references(candidate, "aria-owns").includes(node.id),
      ].some(Boolean);
    };
    const candidates: Candidate[] = [
      { element: node, kind: "target" as const },
      ...(node.nextElementSibling === null ? [] : [{
        element: node.nextElementSibling,
        kind: "next-sibling" as const,
      }]),
      ...(node.parentElement === null
        ? []
        : [{ element: node.parentElement, kind: "parent" as const }]),
    ].filter(
      (candidate, index, all) =>
        all.findIndex(({ element }) => element === candidate.element) === index,
    );
    const targetRect = rect(node);
    const sharedParentRect = node.parentElement === null
      ? undefined
      : rect(node.parentElement);
    return candidates.map(({ element: candidate, kind }) => {
      const style = getComputedStyle(candidate);
      let effectiveOpacity = 1;
      let paintKnown = true;
      let ancestor: Element | null = candidate;
      while (ancestor !== null) {
        const ancestorStyle = getComputedStyle(ancestor);
        const opacity = Number.parseFloat(ancestorStyle.opacity);
        effectiveOpacity *= Number.isFinite(opacity) ? opacity : 1;
        const filtered = filterOpacity(ancestorStyle.filter);
        effectiveOpacity *= filtered.opacity;
        paintKnown &&= filtered.known;
        ancestor = ancestor.parentElement;
      }
      effectiveOpacity = Math.max(0, Math.min(1, effectiveOpacity));
      return {
        backgroundColor: pixelColor(style.backgroundColor),
        candidate: kind,
        effectiveOpacity,
        outlineColor: pixelColor(style.outlineColor),
        outlineOffset: style.outlineOffset,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        boxShadowColors: (
          style.boxShadow.match(
            /(?:rgba?|hsla?|oklab|oklch|color)\([^)]+\)/g,
          ) ?? []
        ).map(pixelColor),
        paintKnown,
        rect: rect(candidate),
        semanticallyAssociated: kind === "next-sibling" &&
          semanticAssociation(candidate),
        sharedParentRect,
        targetRect,
        textDecorationColor: pixelColor(style.textDecorationColor),
        textDecorationLine: style.textDecorationLine,
        textDecorationThickness: style.textDecorationThickness,
        visible: effectiveOpacity > 0 &&
          style.visibility === "visible" &&
          style.getPropertyValue("content-visibility") !== "hidden" &&
          candidate.getClientRects().length > 0,
      };
    });
  });
}

async function focusFixtureOracle(
  target: Locator,
  kind: string,
): Promise<FocusFixtureOracle | undefined> {
  return await target.evaluate((node, kind) => {
    const candidate = kind === "fixed-proxy" ||
        kind === "generic-parent-proxy"
      ? node.nextElementSibling
      : node;
    if (candidate === null) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const pixelColor = (value: string): string => {
      if (/^rgba?\(/.test(value) || context === null) return value;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "rgba(0, 0, 0, 0)";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${
        (pixel[3] ?? 0) / 255
      })`;
    };
    const style = getComputedStyle(candidate);
    let effectiveOpacity = 1;
    let filterKnown = true;
    const filters: string[] = [];
    let ancestor: Element | null = candidate;
    while (ancestor !== null) {
      const ancestorStyle = getComputedStyle(ancestor);
      const opacity = Number(ancestorStyle.opacity);
      effectiveOpacity *= Number.isFinite(opacity) ? opacity : 1;
      const filter = ancestorStyle.filter;
      if (filter !== "none") {
        filters.push(filter);
        const matches = [
          ...filter.matchAll(
            /opacity\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\)/gi,
          ),
        ];
        const remainder = filter.replace(
          /opacity\(\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*\)/gi,
          "",
        ).trim();
        if (remainder !== "") filterKnown = false;
        for (const match of matches) {
          const factor = Number(match[1]);
          if (Number.isFinite(factor)) effectiveOpacity *= factor;
        }
      }
      ancestor = ancestor.parentElement;
    }
    const current = candidate.getBoundingClientRect();
    const targetRect = node.getBoundingClientRect();
    const parent = node.parentElement?.getBoundingClientRect();
    const horizontal = Math.max(
      0,
      targetRect.left - current.right,
      current.left - targetRect.right,
    );
    const vertical = Math.max(
      0,
      targetRect.top - current.bottom,
      current.top - targetRect.bottom,
    );
    const gap = Math.hypot(horizontal, vertical);
    const contains = (outer: DOMRect, inner: DOMRect): boolean =>
      outer.left <= inner.left + 1 &&
      outer.top <= inner.top + 1 &&
      outer.right >= inner.right - 1 &&
      outer.bottom >= inner.bottom - 1;
    const overlaps = targetRect.left < current.right &&
      targetRect.right > current.left &&
      targetRect.top < current.bottom &&
      targetRect.bottom > current.top;
    const geometricallyAssociated = overlaps ||
      (
        parent !== undefined &&
        contains(parent, targetRect) &&
        contains(parent, current) &&
        gap <= Math.max(parent.width, parent.height)
      );
    return {
      color: pixelColor(style.outlineColor),
      effectiveOpacity: Math.max(0, Math.min(1, effectiveOpacity)),
      filterKnown,
      filters,
      geometricallyAssociated,
      semanticallyAssociated: node.parentElement instanceof
          HTMLLabelElement &&
        node.parentElement.control === node,
      style: style.outlineStyle,
      visible: effectiveOpacity > 0 &&
        style.visibility === "visible" &&
        candidate.getClientRects().length > 0,
      width: style.outlineWidth,
    };
  }, kind);
}

async function blurActiveElement(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

async function focusByKeyboard(page: Page, target: Locator): Promise<boolean> {
  const marker = crypto.randomUUID();
  await target.evaluate((node, marker) => {
    node.setAttribute("data-discern-semantic-focus-target", marker);
    const sentinel = document.createElement("span");
    sentinel.dataset.discernSemanticFocusSentinel = "";
    sentinel.tabIndex = 0;
    node.before(sentinel);
    sentinel.focus();
  }, marker);
  await page.keyboard.press("Tab");
  const stableTarget = page.locator(
    `[data-discern-semantic-focus-target="${marker}"]`,
  );
  return await stableTarget.evaluate((node) => {
    const focused = document.activeElement === node;
    const sentinel = node.previousElementSibling;
    if (
      sentinel?.matches("[data-discern-semantic-focus-sentinel]") === true
    ) {
      sentinel.remove();
    }
    node.removeAttribute("data-discern-semantic-focus-target");
    return focused;
  });
}

async function installSemanticRoleProbes(
  page: Page,
  surfaceTokens: readonly SemanticSurfaceToken[],
): Promise<void> {
  await page.evaluate(
    ({ surfaceSelector, surfaceTokens }) => {
      const host = document.querySelector<HTMLElement>(surfaceSelector);
      if (host === null) return;
      const probes = document.createElement("div");
      probes.dataset.discernSemanticRoleProbes = "";
      probes.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;padding:8px;";
      for (const { role, token } of surfaceTokens) {
        const surface = document.createElement("div");
        surface.style.cssText =
          `display:inline-block;padding:8px;background:var(${token});`;
        const target = document.createElement("button");
        target.type = "button";
        target.className = "discern-copy-button";
        target.dataset.discernFocusRoleProof = role;
        target.textContent = `${role} focus proof`;
        surface.append(target);
        probes.append(surface);
      }
      host.append(probes);
    },
    { surfaceSelector: SURFACE_SELECTOR, surfaceTokens },
  );
}

async function discoverSemanticTargets(
  page: Page,
  surfaceTokens: readonly SemanticSurfaceToken[],
): Promise<SemanticFocusTarget[]> {
  return await page.evaluate(
    ({ surfaceSelector, focusableSelector, surfaceTokens }) => {
      const root = document.querySelector<HTMLElement>("[data-discern-root]");
      if (root === null) return [];
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const pixelColor = (value: string): string => {
        if (context === null) return value;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = "rgba(0, 0, 0, 0)";
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const pixel = context.getImageData(0, 0, 1, 1).data;
        return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${
          (pixel[3] ?? 0) / 255
        })`;
      };
      const tokenColors: Array<
        { readonly role: string; readonly color: string }
      > = [];
      for (const { role, token } of surfaceTokens) {
        const value = getComputedStyle(root).getPropertyValue(token).trim();
        if (!value) continue;
        const probe = document.createElement("span");
        probe.style.color = value;
        root.append(probe);
        tokenColors.push({ role, color: getComputedStyle(probe).color });
        probe.remove();
      }
      const surfaces = Array.from(document.querySelectorAll(surfaceSelector));
      const result: Array<{
        readonly surface: number;
        readonly element: number;
        readonly role: string;
        readonly surfaceColor: string;
        readonly proofKind: string;
      }> = [];
      for (let surface = 0; surface < surfaces.length; surface += 1) {
        const container = surfaces[surface];
        if (!(container instanceof HTMLElement)) continue;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(focusableSelector),
        );
        for (let element = 0; element < focusable.length; element += 1) {
          const target = focusable[element];
          if (target === undefined) continue;
          let ancestor: HTMLElement | null = target;
          while (ancestor !== null && container.contains(ancestor)) {
            const surfaceColor = getComputedStyle(ancestor).backgroundColor;
            const semantic = tokenColors.find(({ color }) =>
              color === surfaceColor
            );
            if (semantic !== undefined) {
              result.push({
                surface,
                element,
                role: semantic.role,
                surfaceColor: pixelColor(surfaceColor),
                proofKind: target.dataset.discernFocusProof ??
                  target.dataset.discernFocusRoleProof ?? "",
              });
              break;
            }
            if (ancestor === container) break;
            ancestor = ancestor.parentElement;
          }
        }
      }
      return result;
    },
    {
      surfaceSelector: SURFACE_SELECTOR,
      focusableSelector: FOCUSABLE_SELECTOR,
      surfaceTokens,
    },
  );
}

/** Measured populations exercised by the journey and resilience browser gate. */
export interface ResilienceConformanceSummary {
  readonly journeys: number;
  readonly journeyStages: number;
  readonly journeyAxeScans: number;
  readonly journeyTabStops: number;
  readonly journeyCommandCopies: number;
  readonly disclosures: number;
  readonly disclosureToggles: number;
  readonly interactiveControls: number;
  readonly targets: number;
  readonly inlineTextTargetExceptions: number;
  readonly labelledControlBoxes: number;
  readonly reflowSurfaces: number;
  readonly containedOverflowRegions: number;
  readonly motionTargets: number;
  readonly themeConsumers: number;
  readonly themeGeometryChecks: number;
  readonly fontFallbackChecks: number;
  readonly fontFallbackAliasesCovered: readonly string[];
  readonly fontFallbackAliasesSkipped: readonly string[];
  readonly fontMetricOverrideFaces: number;
  readonly maxFontLineBoxDeltaPixels: number;
  readonly maxFontWidthDeltaPercent: number;
  readonly semanticFocusTargets: number;
  readonly semanticFocusRoles: readonly string[];
}

function conformanceUrl(origin: string, theme = "light"): string {
  const url = new URL("/style-guide/", origin);
  url.searchParams.set("conformance", "1");
  url.searchParams.set("theme", theme);
  return url.href;
}

async function loadPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('[data-discern-conformance-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function verifyJourneyStructure(
  page: Page,
  failures: string[],
): Promise<JourneyStructureResult> {
  const result = await page.evaluate(() => {
    const landmarkSelector = [
      "main",
      "nav",
      "aside",
      "[role='main']",
      "[role='navigation']",
      "[role='complementary']",
      "[role='region']",
      "section[aria-label]",
      "section[aria-labelledby]",
    ].join(",");

    function textForIds(root: Element, ids: string): string {
      return ids.split(/\s+/).map((id) =>
        root.ownerDocument.getElementById(id)?.textContent?.trim() ?? ""
      ).filter(Boolean).join(" ");
    }

    function accessibleName(element: Element): string {
      const label = element.getAttribute("aria-label")?.trim();
      if (label) return label;
      const labelledBy = element.getAttribute("aria-labelledby")?.trim();
      if (labelledBy) return textForIds(element, labelledBy);
      return "";
    }

    function inspect(root: HTMLElement): string[] {
      const problems: string[] = [];
      const id = root.dataset.discernJourney ?? "unnamed";
      const headings = Array.from(
        root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
      );
      if (headings.length === 0) {
        problems.push(`${id}: journey has no heading`);
      } else {
        const first = Number(headings[0]?.tagName.slice(1));
        if (first !== 2) {
          problems.push(`${id}: journey starts at h${first} instead of h2`);
        }
        for (let index = 1; index < headings.length; index += 1) {
          const previous = Number(headings[index - 1]?.tagName.slice(1));
          const current = Number(headings[index]?.tagName.slice(1));
          if (current > previous + 1) {
            problems.push(
              `${id}: heading skips from h${previous} to h${current}`,
            );
          }
        }
      }

      const headingIds = headings.map((heading) => heading.id).filter(Boolean);
      if (new Set(headingIds).size !== headingIds.length) {
        problems.push(`${id}: journey repeats a heading id`);
      }

      let stages: readonly string[] = [];
      try {
        const parsed = JSON.parse(root.dataset.discernJourneyStages ?? "[]");
        if (
          Array.isArray(parsed) &&
          parsed.every((value) => typeof value === "string")
        ) {
          stages = parsed;
        } else {
          problems.push(`${id}: stage contract is not a string array`);
        }
      } catch {
        problems.push(`${id}: stage contract is not valid JSON`);
      }
      if (stages.length === 0) {
        problems.push(`${id}: journey has no declared stages`);
      }
      if (new Set(stages).size !== stages.length) {
        problems.push(`${id}: journey repeats a stage selector`);
      }
      let previousStage: Element | undefined;
      for (const selector of stages) {
        const matches = root.querySelectorAll(selector);
        if (matches.length !== 1) {
          problems.push(
            `${id}: stage ${selector} matched ${matches.length} elements`,
          );
          continue;
        }
        const current = matches[0];
        if (
          previousStage !== undefined && current !== undefined &&
          (previousStage.compareDocumentPosition(current) &
              Node.DOCUMENT_POSITION_FOLLOWING) === 0
        ) {
          problems.push(`${id}: stage ${selector} is out of order`);
        }
        if (current !== undefined) previousStage = current;
      }

      const landmarks = [
        ...(root.matches(landmarkSelector) ? [root] : []),
        ...root.querySelectorAll<HTMLElement>(landmarkSelector),
      ];
      const namedLandmarks = new Set<string>();
      for (const landmark of landmarks) {
        const role = landmark.getAttribute("role") ??
          (landmark.tagName === "NAV"
            ? "navigation"
            : landmark.tagName === "ASIDE"
            ? "complementary"
            : landmark.tagName === "MAIN"
            ? "main"
            : "region");
        const name = accessibleName(landmark);
        if (
          (role === "navigation" || role === "complementary" ||
            role === "region") && !name
        ) {
          problems.push(`${id}: ${role} landmark has no accessible name`);
        }
        const identity = `${role}:${name}`;
        if (namedLandmarks.has(identity)) {
          problems.push(`${id}: repeats landmark ${identity}`);
        }
        namedLandmarks.add(identity);
      }

      for (
        const target of root.querySelectorAll<HTMLElement>("[tabindex]")
      ) {
        if (target.tabIndex > 0) {
          problems.push(`${id}: positive tabindex changes DOM focus order`);
        }
      }
      return problems;
    }

    const journeys = Array.from(
      document.querySelectorAll<HTMLElement>("[data-discern-journey]"),
    );
    const currentFailures = journeys.flatMap(inspect);
    if (journeys.length === 0) {
      currentFailures.push("no composition journeys enrolled");
    }
    const ids = journeys.map((journey) => journey.dataset.discernJourney ?? "");
    if (new Set(ids).size !== ids.length) {
      currentFailures.push("journey ids are not unique");
    }

    const future = document.createElement("section");
    future.dataset.discernJourney = "future-resilience-journey";
    future.dataset.discernJourneyStages = JSON.stringify([
      "[data-future-stage='first']",
      "[data-future-stage='second']",
    ]);
    future.setAttribute("aria-label", "Future resilience journey");
    future.innerHTML = [
      "<h2>Future journey</h2>",
      "<div data-future-stage='second'></div>",
      "<h4>Skipped heading</h4>",
      "<div data-future-stage='first'></div>",
      "<nav aria-label='Repeated route'></nav>",
      "<nav aria-label='Repeated route'></nav>",
      "<button tabindex='2'>Late in DOM, early in focus</button>",
    ].join("");
    document.querySelector("[data-discern-root]")?.append(future);
    const futureFailures = inspect(future);
    future.remove();

    return {
      journeys: journeys.length,
      stages: journeys.reduce((count, journey) => {
        try {
          const parsed = JSON.parse(
            journey.dataset.discernJourneyStages ?? "[]",
          );
          return count + (Array.isArray(parsed) ? parsed.length : 0);
        } catch {
          return count;
        }
      }, 0),
      failures: currentFailures,
      futureProof: futureFailures.some((failure) =>
        failure.includes("out of order")
      ) &&
        futureFailures.some((failure) => failure.includes("heading skips")) &&
        futureFailures.some((failure) =>
          failure.includes("repeats landmark")
        ) &&
        futureFailures.some((failure) => failure.includes("positive tabindex")),
    };
  });
  failures.push(
    ...result.failures.map((failure) => `Journey structure: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      "Journey structure: synthetic future journey escaped the detector",
    );
  }
  return result;
}

async function scanJourneyAccessibility(
  page: Page,
  origin: string,
  failures: string[],
): Promise<number> {
  let scans = 0;
  for (const theme of ["light", "dark"] as const) {
    await loadPage(page, conformanceUrl(origin, theme));
    const ids = await page.locator("[data-discern-journey]").evaluateAll((
      nodes,
    ) =>
      nodes.map((node) => (node as HTMLElement).dataset.discernJourney ?? "")
    );
    for (const id of ids) {
      try {
        const results = await new AxeBuilder({ page })
          .include(`[data-discern-journey="${id}"]`)
          .withTags([...WCAG_TAGS])
          .analyze();
        scans += 1;
        for (const violation of results.violations) {
          failures.push(
            `Journey axe ${theme}/${id}: ${violation.id} at ${
              violation.nodes.map((node) => JSON.stringify(node.target)).join(
                "; ",
              )
            }`,
          );
        }
      } catch (error) {
        failures.push(
          `Journey axe ${theme}/${id}: ${errorMessage(error)}`,
        );
      }
    }
  }
  return scans;
}

async function visibleEnabledTargets(root: Locator): Promise<Locator[]> {
  const candidates = root.locator(FOCUSABLE_SELECTOR);
  const targets: Locator[] = [];
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (!await candidate.isVisible() || !await candidate.isEnabled()) continue;
    targets.push(candidate);
  }
  return targets;
}

async function verifyJourneyKeyboard(
  page: Page,
  origin: string,
  failures: string[],
): Promise<{ readonly tabStops: number; readonly commandCopies: number }> {
  await page.setViewportSize(WIDE_VIEWPORT);
  await loadPage(page, conformanceUrl(origin));
  const journeys = page.locator("[data-discern-journey]");
  let tabStops = 0;
  let commandCopies = 0;
  for (
    let journeyIndex = 0;
    journeyIndex < await journeys.count();
    journeyIndex += 1
  ) {
    const journey = journeys.nth(journeyIndex);
    const id = await journey.getAttribute("data-discern-journey") ??
      `journey-${journeyIndex}`;
    const targets = await visibleEnabledTargets(journey);
    if (targets.length > 0) {
      const sentinelId = `discern-journey-sentinel-${journeyIndex}`;
      await journey.evaluate((node, id) => {
        const sentinel = document.createElement("button");
        sentinel.id = id;
        sentinel.type = "button";
        sentinel.textContent = "Journey focus sentinel";
        sentinel.style.cssText =
          "position:absolute;inline-size:1px;block-size:1px;opacity:0;";
        node.before(sentinel);
      }, sentinelId);
      await page.locator(`#${sentinelId}`).focus();
      for (const target of targets) {
        await page.keyboard.press("Tab");
        const state = await target.evaluate((node) => ({
          active: node.ownerDocument.activeElement === node,
          focusVisible: node.matches(":focus-visible"),
        }));
        if (!state.active) {
          failures.push(`${id}: Tab order diverged from DOM order`);
          break;
        }
        if (!state.focusVisible) {
          failures.push(`${id}: keyboard target did not match :focus-visible`);
        }
        tabStops += 1;
      }
      await page.keyboard.press("Tab");
      if (
        await journey.evaluate((node) =>
          node.contains(node.ownerDocument.activeElement)
        )
      ) {
        failures.push(`${id}: keyboard traversal is trapped in the journey`);
      }
      await page.locator(`#${sentinelId}`).evaluate((node) => node.remove());
    }

    const commands = journey.locator(".discern-command");
    for (let index = 0; index < await commands.count(); index += 1) {
      const command = commands.nth(index);
      const expected = await command.locator(
        ".discern-command__text code",
      ).innerText();
      const copy = command.locator(".discern-command__copy");
      if (await copy.count() !== 1) {
        failures.push(`${id}: command ${index + 1} has no single copy target`);
        continue;
      }
      await copy.focus();
      await page.keyboard.press("Enter");
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      if (copied !== expected) {
        failures.push(
          `${id}: command ${index + 1} copied ${JSON.stringify(copied)} ` +
            `instead of ${JSON.stringify(expected)}`,
        );
      }
      commandCopies += 1;
    }
  }
  return { tabStops, commandCopies };
}

async function verifyDisclosures(
  page: Page,
  origin: string,
  failures: string[],
): Promise<{ readonly result: DisclosureResult; readonly toggles: number }> {
  await loadPage(page, conformanceUrl(origin));
  const result = await page.evaluate((surfaceSelector) => {
    function describe(details: HTMLDetailsElement): string {
      const component = details.closest<HTMLElement>(
        "[data-discern-component]",
      )?.dataset.discernComponent;
      const journey = details.closest<HTMLElement>("[data-discern-journey]")
        ?.dataset.discernJourney;
      return component ?? journey ?? details.className ?? "details";
    }

    function inspect(details: HTMLDetailsElement): string[] {
      const problems: string[] = [];
      const summaries = details.querySelectorAll(":scope > summary");
      if (summaries.length !== 1) {
        problems.push(
          `${
            describe(details)
          }: details has ${summaries.length} direct summaries`,
        );
        return problems;
      }
      const summary = summaries[0];
      if (details.firstElementChild !== summary) {
        problems.push(`${describe(details)}: summary is not the first child`);
      }
      if (!summary?.textContent?.trim()) {
        problems.push(`${describe(details)}: summary has no accessible label`);
      }
      return problems;
    }

    const selector = `${
      surfaceSelector.split(",").map((surface) => `${surface.trim()} details`)
        .join(",")
    }`;
    const disclosures = Array.from(
      document.querySelectorAll<HTMLDetailsElement>(selector),
    );
    const currentFailures = disclosures.flatMap(inspect);
    const future = document.createElement("details");
    future.innerHTML = "<div>Future disclosure body</div>";
    document.querySelector(surfaceSelector)?.append(future);
    const futureFailures = inspect(future);
    future.remove();
    return {
      disclosures: disclosures.length,
      failures: currentFailures,
      futureProof: futureFailures.some((failure) =>
        failure.includes("0 direct summaries")
      ),
    };
  }, SURFACE_SELECTOR);
  failures.push(
    ...result.failures.map((failure) => `Disclosure integrity: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      "Disclosure integrity: synthetic future disclosure escaped the detector",
    );
  }

  const disclosures = page.locator(
    SURFACE_SELECTOR.split(",").map((surface) => `${surface.trim()} details`)
      .join(","),
  );
  let toggles = 0;
  for (let index = 0; index < await disclosures.count(); index += 1) {
    const details = disclosures.nth(index);
    if (!await details.isVisible()) continue;
    const summary = details.locator(":scope > summary");
    if (await summary.count() !== 1) continue;
    const before = await details.evaluate((node) =>
      (node as HTMLDetailsElement).open
    );
    await summary.focus();
    await page.keyboard.press("Enter");
    const after = await details.evaluate((node) => ({
      open: (node as HTMLDetailsElement).open,
      focusRetained: node.ownerDocument.activeElement ===
        node.querySelector(":scope > summary"),
    }));
    if (after.open === before) {
      failures.push(`Disclosure ${index + 1}: Enter did not toggle open state`);
    }
    if (!after.focusRetained) {
      failures.push(`Disclosure ${index + 1}: toggle moved focus`);
    }
    await page.keyboard.press("Enter");
    toggles += 1;
  }
  return { result, toggles };
}

async function verifyNestedControls(
  page: Page,
  origin: string,
  failures: string[],
): Promise<NestedControlResult> {
  await loadPage(page, conformanceUrl(origin));
  const result = await page.evaluate(
    ({ surfaceSelector, interactiveSelector }) => {
      function describe(node: Element): string {
        return node.outerHTML.replace(/\s+/g, " ").slice(0, 180);
      }

      function inspect(root: ParentNode): string[] {
        const problems: string[] = [];
        const controls = [
          ...(root instanceof HTMLElement && root.matches(interactiveSelector)
            ? [root]
            : []),
          ...root.querySelectorAll<HTMLElement>(interactiveSelector),
        ];
        for (const control of controls) {
          const nested = control.querySelector(interactiveSelector);
          if (nested !== null) {
            problems.push(
              `${describe(control)} contains ${describe(nested)}`,
            );
          }
        }
        return problems;
      }

      const surfaces = Array.from(document.querySelectorAll(surfaceSelector));
      const currentFailures = surfaces.flatMap(inspect);
      const future = document.createElement("button");
      future.type = "button";
      future.textContent = "Future card";
      const nested = document.createElement("a");
      nested.href = "#future";
      nested.textContent = "Nested action";
      future.append(nested);
      surfaces[0]?.append(future);
      const futureFailures = inspect(future);
      future.remove();
      return {
        controls: surfaces.reduce(
          (count, surface) =>
            count + surface.querySelectorAll(interactiveSelector).length,
          0,
        ),
        failures: currentFailures,
        futureProof: futureFailures.length > 0,
      };
    },
    {
      surfaceSelector: SURFACE_SELECTOR,
      interactiveSelector: INTERACTIVE_SELECTOR,
    },
  );
  failures.push(
    ...result.failures.map((failure) => `Nested controls: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      "Nested controls: synthetic future clickable container escaped the detector",
    );
  }
  return result;
}

async function verifyTargetSizes(
  page: Page,
  origin: string,
  failures: string[],
): Promise<TargetResult> {
  await page.setViewportSize(NARROW_VIEWPORT);
  await loadPage(page, conformanceUrl(origin));
  const result = await page.evaluate(
    ({ surfaceSelector, interactiveSelector }) => {
      interface Measurement {
        readonly failures: string[];
        targets: number;
        inlineTextExceptions: number;
        labelledControlBoxes: number;
      }

      function visible(element: HTMLElement): boolean {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" &&
          style.clipPath !== "inset(50%)" &&
          (style.clip === "auto" || style.clip === "") &&
          rect.width > 0 && rect.height > 0;
      }

      function description(element: HTMLElement): string {
        return element.outerHTML.replace(/\s+/g, " ").slice(0, 180);
      }

      function inlineTextLink(element: HTMLElement): boolean {
        if (!(element instanceof HTMLAnchorElement)) return false;
        if (getComputedStyle(element).display !== "inline") return false;
        const block = element.closest("p, li, dd, dt, figcaption");
        if (block === null) return false;
        return [...block.childNodes].some((node) =>
          node !== element && (node.textContent?.trim().length ?? 0) > 0
        );
      }

      function labelledRect(element: HTMLElement): DOMRect | undefined {
        if (!(element instanceof HTMLInputElement)) return undefined;
        if (element.type !== "checkbox" && element.type !== "radio") {
          return undefined;
        }
        const label = element.labels?.[0];
        if (label === undefined) return undefined;
        const rect = label.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 ? rect : undefined;
      }

      function inspect(root: ParentNode): Measurement {
        const result: Measurement = {
          failures: [],
          targets: 0,
          inlineTextExceptions: 0,
          labelledControlBoxes: 0,
        };
        const elements = [
          ...(root instanceof HTMLElement && root.matches(interactiveSelector)
            ? [root]
            : []),
          ...root.querySelectorAll<HTMLElement>(interactiveSelector),
        ];
        for (const element of elements) {
          if (!visible(element)) continue;
          if (
            "disabled" in element &&
            (element as HTMLButtonElement | HTMLInputElement).disabled
          ) {
            continue;
          }
          result.targets += 1;
          if (inlineTextLink(element)) {
            result.inlineTextExceptions += 1;
            if (
              !(element instanceof HTMLAnchorElement) ||
              ![
                ...(
                  element.closest("p, li, dd, dt, figcaption")?.childNodes ?? []
                ),
              ].some((node) =>
                node !== element && (node.textContent?.trim().length ?? 0) > 0
              )
            ) {
              result.failures.push(
                `invalid inline-text exception: ${description(element)}`,
              );
            }
            continue;
          }
          const labelBox = labelledRect(element);
          const rect = labelBox ?? element.getBoundingClientRect();
          if (labelBox !== undefined) {
            result.labelledControlBoxes += 1;
            if (
              !(element instanceof HTMLInputElement) ||
              (element.type !== "checkbox" && element.type !== "radio") ||
              element.labels?.[0] === undefined
            ) {
              result.failures.push(
                `invalid native-label exception: ${description(element)}`,
              );
            }
          }
          if (rect.width < 24 || rect.height < 24) {
            result.failures.push(
              `${description(element)} measures ${rect.width.toFixed(1)}×${
                rect.height.toFixed(1)
              }px`,
            );
          }
        }
        return result;
      }

      const surfaces = Array.from(document.querySelectorAll(surfaceSelector));
      const measurements = surfaces.map(inspect);
      const current: Measurement = {
        failures: measurements.flatMap((item) => item.failures),
        targets: measurements.reduce((sum, item) => sum + item.targets, 0),
        inlineTextExceptions: measurements.reduce(
          (sum, item) => sum + item.inlineTextExceptions,
          0,
        ),
        labelledControlBoxes: measurements.reduce(
          (sum, item) => sum + item.labelledControlBoxes,
          0,
        ),
      };

      const future = document.createElement("button");
      future.type = "button";
      future.textContent = "Tiny";
      future.style.cssText =
        "inline-size:12px!important;block-size:12px!important;" +
        "min-inline-size:0!important;min-block-size:0!important;" +
        "padding:0!important;border:0!important;";
      const futureRoot = surfaces[0];
      const failuresBeforeFuture = futureRoot === undefined
        ? 0
        : inspect(futureRoot).failures.length;
      futureRoot?.append(future);
      const futureMeasurement = inspect(futureRoot ?? future);
      const futureProof = futureMeasurement.failures.length >
        failuresBeforeFuture;
      future.remove();
      return { ...current, futureProof };
    },
    {
      surfaceSelector: SURFACE_SELECTOR,
      interactiveSelector: TARGET_SELECTOR,
    },
  );
  failures.push(...result.failures.map((failure) => `Target size: ${failure}`));
  if (!result.futureProof) {
    failures.push(
      "Target size: synthetic future target escaped the detector",
    );
  }
  return result;
}

async function reflowAt(
  page: Page,
  origin: string,
  viewport: { readonly width: number; readonly height: number },
  label: string,
  failures: string[],
): Promise<ReflowResult> {
  await page.setViewportSize(viewport);
  await loadPage(page, conformanceUrl(origin));
  const result = await page.evaluate((surfaceSelector) => {
    function inspect(): {
      readonly surfaces: number;
      readonly containedOverflow: number;
      readonly failures: readonly string[];
    } {
      const problems: string[] = [];
      const surfaces = Array.from(
        document.querySelectorAll<HTMLElement>(surfaceSelector),
      );
      if (
        document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1
      ) {
        problems.push(
          `page is ${document.documentElement.scrollWidth}px wide for a ` +
            `${document.documentElement.clientWidth}px viewport`,
        );
      }
      let containedOverflow = 0;
      const viewportWidth = document.documentElement.clientWidth;
      for (const surface of surfaces) {
        for (
          const element of [
            surface,
            ...surface.querySelectorAll<HTMLElement>("*"),
          ]
        ) {
          const rect = element.getBoundingClientRect();
          if (rect.left >= -1 && rect.right <= viewportWidth + 1) continue;
          let container: HTMLElement | null = element;
          let contained = false;
          while (container !== null && surface.contains(container)) {
            const overflow = getComputedStyle(container).overflowX;
            const containerRect = container.getBoundingClientRect();
            if (
              (overflow === "auto" || overflow === "scroll") &&
              container.scrollWidth > container.clientWidth + 1 &&
              containerRect.left >= -1 &&
              containerRect.right <= viewportWidth + 1
            ) {
              contained = true;
              break;
            }
            if (container === surface) break;
            container = container.parentElement;
          }
          if (contained) {
            containedOverflow += 1;
          } else {
            problems.push(
              element.outerHTML.replace(/\s+/g, " ").slice(0, 180) +
                " overflows without an internal horizontal scroller",
            );
          }
        }
      }
      return {
        surfaces: surfaces.length,
        containedOverflow,
        failures: problems,
      };
    }

    const current = inspect();
    const future = document.createElement("div");
    future.textContent = "Future wide surface";
    future.style.cssText = "inline-size:200vw;block-size:1px;";
    document.querySelector(surfaceSelector)?.append(future);
    const futureFailures = inspect().failures;
    future.remove();
    return {
      ...current,
      futureProof: futureFailures.length > current.failures.length,
    };
  }, SURFACE_SELECTOR);
  failures.push(
    ...result.failures.map((failure) => `Reflow ${label}: ${failure}`),
  );
  if (!result.futureProof) {
    failures.push(
      `Reflow ${label}: synthetic wide sibling escaped the detector`,
    );
  }
  return result;
}

async function discoverMotionTargets(page: Page): Promise<MotionTarget[]> {
  return await page.evaluate((surfaceSelector) => {
    function seconds(value: string): number[] {
      return value.split(",").map((part) => {
        const trimmed = part.trim();
        return trimmed.endsWith("ms")
          ? Number.parseFloat(trimmed) / 1000
          : Number.parseFloat(trimmed);
      }).filter(Number.isFinite);
    }

    function active(
      style: CSSStyleDeclaration,
    ): Omit<MotionTarget, "surface" | "element" | "pseudo"> {
      const animation = style.animationName.split(",").some((name) =>
        name.trim() !== "none"
      ) &&
        seconds(style.animationDuration).some((duration) => duration > 0);
      const transition = seconds(style.transitionDuration).some((duration) =>
        duration > 0
      );
      return {
        animation,
        transition,
        smoothScroll: style.scrollBehavior === "smooth",
      };
    }

    const targets: MotionTarget[] = [];
    const surfaces = Array.from(
      document.querySelectorAll<HTMLElement>(surfaceSelector),
    );
    for (let surface = 0; surface < surfaces.length; surface += 1) {
      const root = surfaces[surface];
      if (root === undefined) continue;
      const elements = [root, ...root.querySelectorAll<HTMLElement>("*")];
      for (let element = 0; element < elements.length; element += 1) {
        const node = elements[element];
        if (node === undefined) continue;
        for (const pseudo of ["", "::before", "::after"] as const) {
          const style = getComputedStyle(node, pseudo || null);
          if (pseudo && (style.content === "none" || style.content === "")) {
            continue;
          }
          const state = active(style);
          if (state.animation || state.transition || state.smoothScroll) {
            targets.push({ surface, element, pseudo, ...state });
          }
        }
      }
    }
    return targets;
  }, SURFACE_SELECTOR);
}

async function verifyReducedMotionTargets(
  page: Page,
  targets: readonly MotionTarget[],
): Promise<ReducedMotionResult> {
  return await page.evaluate(
    ({ surfaceSelector, targets }) => {
      function seconds(value: string): number[] {
        return value.split(",").map((part) => {
          const trimmed = part.trim();
          return trimmed.endsWith("ms")
            ? Number.parseFloat(trimmed) / 1000
            : Number.parseFloat(trimmed);
        }).filter(Number.isFinite);
      }

      function inspect(
        node: HTMLElement,
        pseudo: MotionTarget["pseudo"],
        target: MotionTarget,
      ): string[] {
        const problems: string[] = [];
        const style = getComputedStyle(node, pseudo || null);
        if (
          target.animation &&
          seconds(style.animationDuration).some((duration) => duration > 0.0001)
        ) {
          problems.push("animation duration exceeds 0.1ms");
        }
        if (
          target.animation &&
          style.animationIterationCount.split(",").some((value) =>
            value.trim() === "infinite" || Number.parseFloat(value) > 1
          )
        ) {
          problems.push("animation repeats under reduced motion");
        }
        if (
          target.transition &&
          seconds(style.transitionDuration).some((duration) =>
            duration > 0.0001
          )
        ) {
          problems.push("transition duration exceeds 0.1ms");
        }
        if (target.smoothScroll && style.scrollBehavior === "smooth") {
          problems.push("smooth scrolling remains enabled");
        }
        return problems;
      }

      const surfaces = Array.from(
        document.querySelectorAll<HTMLElement>(surfaceSelector),
      );
      const currentFailures: string[] = [];
      for (const target of targets) {
        const root = surfaces[target.surface];
        const node = root === undefined
          ? undefined
          : [root, ...root.querySelectorAll<HTMLElement>("*")][target.element];
        if (node === undefined) {
          currentFailures.push(
            `motion target ${target.surface}:${target.element} disappeared`,
          );
          continue;
        }
        currentFailures.push(
          ...inspect(node, target.pseudo, target).map((
            failure,
          ) =>
            `${target.surface}:${target.element}${target.pseudo} ${failure}`
          ),
        );
      }

      const future = document.createElement("div");
      future.textContent = "Future motion";
      future.style.setProperty("animation-name", "future-motion", "important");
      future.style.setProperty("animation-duration", "2s", "important");
      future.style.setProperty(
        "animation-iteration-count",
        "infinite",
        "important",
      );
      future.style.setProperty("transition-duration", "2s", "important");
      surfaces[0]?.append(future);
      const futureFailures = inspect(future, "", {
        surface: 0,
        element: 0,
        pseudo: "",
        animation: true,
        transition: true,
        smoothScroll: false,
      });
      future.remove();
      return {
        failures: currentFailures,
        futureProof: futureFailures.length >= 2,
      };
    },
    { surfaceSelector: SURFACE_SELECTOR, targets },
  );
}

async function verifyMotionPreferences(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  const normalContext = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    reducedMotion: "no-preference",
  });
  const reducedContext = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    reducedMotion: "reduce",
  });
  try {
    const normal = await normalContext.newPage();
    await loadPage(normal, conformanceUrl(origin));
    const targets = await discoverMotionTargets(normal);
    const reduced = await reducedContext.newPage();
    await loadPage(reduced, conformanceUrl(origin));
    const result = await verifyReducedMotionTargets(reduced, targets);
    failures.push(
      ...result.failures.map((failure) => `Reduced motion: ${failure}`),
    );
    if (!result.futureProof) {
      failures.push(
        "Reduced motion: synthetic future animation escaped the detector",
      );
    }
    return targets.length;
  } finally {
    await normalContext.close();
    await reducedContext.close();
  }
}

async function verifyThemeSystem(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<ThemeResult> {
  const fontCssUrl = new URL("../assets/fonts.css", import.meta.url);
  const fontMetricAudit = auditFontMetricOverrides(
    await Deno.readTextFile(fontCssUrl),
  );
  failures.push(
    ...fontMetricAudit.failures.map((failure) =>
      `Font metric overrides: ${failure}`
    ),
  );
  const fontMetricAssetFailures = await auditBundledFontMetricAssets(
    await Promise.all(
      bundledFontMetricSources().map(async (source) => ({
        source,
        bytes: await Deno.readFile(new URL(source, fontCssUrl)),
      })),
    ),
  );
  failures.push(
    ...fontMetricAssetFailures.map((failure) =>
      `Font metric authority: ${failure}`
    ),
  );
  const context = await browser.newContext({
    viewport: WIDE_VIEWPORT,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  try {
    await page.goto(new URL("/style-guide/", origin).href, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-discern-theme-consumer]").waitFor();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const inspect = async (): Promise<{
      readonly consumers: number;
      readonly failures: readonly string[];
    }> =>
      await page.evaluate(() => {
        const problems: string[] = [];
        const consumers = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-discern-theme-consumer]",
          ),
        );
        for (const consumer of consumers) {
          const mode = consumer.dataset.discernTheme;
          const controlSelector = consumer.dataset.discernThemeControl;
          const control = controlSelector === undefined
            ? null
            : consumer.querySelector(controlSelector);
          const checked = control?.querySelector<HTMLInputElement>(
            "input:checked",
          )?.value;
          const storageKey = consumer.dataset.discernThemeStorageKey;
          const stored = storageKey === undefined
            ? undefined
            : localStorage.getItem(storageKey);
          if (checked !== mode) {
            problems.push(
              `checked theme ${checked ?? "none"} disagrees with root ${mode}`,
            );
          }
          if (control === null) {
            problems.push("declared theme control is missing");
          }
          if (
            storageKey !== undefined &&
            (mode === "system" ? stored !== null : stored !== mode)
          ) {
            problems.push(
              `stored theme ${stored ?? "none"} disagrees with root ${mode}`,
            );
          }
        }
        return { consumers: consumers.length, failures: problems };
      });

    const initial = await inspect();
    const root = page.locator("[data-discern-theme-consumer]").first();
    const geometry = async (): Promise<
      Readonly<Record<string, readonly number[]>>
    > =>
      await page.evaluate(() => {
        const targets = {
          consumer: document.querySelector("[data-discern-theme-consumer]"),
          control: document.querySelector(
            "[data-discern-theme-consumer] [data-discern-mode]",
          ),
          sidebar: document.querySelector(".discern-catalogue-sidebar"),
          toolbar: document.querySelector(".discern-catalogue-toolbar"),
          main: document.querySelector("main"),
        };
        return Object.fromEntries(
          Object.entries(targets).map(([name, node]) => {
            if (!(node instanceof HTMLElement)) return [name, []];
            const rect = node.getBoundingClientRect();
            return [
              name,
              [
                rect.x,
                rect.y,
                rect.width,
                rect.height,
                node.scrollWidth,
                node.scrollHeight,
              ],
            ];
          }),
        );
      });
    const darkGeometry = await geometry();
    const initialMode = await root.getAttribute("data-discern-theme");
    if (initialMode !== "system") {
      failures.push(`Theme system: fresh consumer started in ${initialMode}`);
    }
    const darkCanvas = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("--discern-color-canvas").trim()
    );
    const controlSelector = await root.getAttribute(
      "data-discern-theme-control",
    );
    if (controlSelector === null) {
      throw new Error("Theme consumer has no control selector");
    }
    const control = root.locator(controlSelector);
    await control.getByRole("radio", { name: "Light", exact: true }).check();
    const lightGeometry = await geometry();
    let geometryChecks = 0;
    for (const [name, before] of Object.entries(darkGeometry)) {
      const after = lightGeometry[name] ?? [];
      if (before.length === 0 || after.length !== before.length) {
        failures.push(`Theme geometry: missing ${name} measurement`);
        continue;
      }
      for (let index = 0; index < before.length; index += 1) {
        const darkValue = before[index];
        const lightValue = after[index];
        if (
          darkValue === undefined || lightValue === undefined ||
          Math.abs(darkValue - lightValue) > 0.25
        ) {
          failures.push(
            `Theme geometry: ${name} metric ${index} moved from ${darkValue} to ${lightValue}`,
          );
        }
        geometryChecks += 1;
      }
    }
    failures.push(
      ...(await inspect()).failures.map((failure) =>
        `Theme system: ${failure}`
      ),
    );
    await control.getByRole("radio", { name: "System", exact: true }).check();
    failures.push(
      ...(await inspect()).failures.map((failure) =>
        `Theme system: ${failure}`
      ),
    );
    await page.emulateMedia({ colorScheme: "light" });
    const lightCanvas = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("--discern-color-canvas").trim()
    );
    if (darkCanvas === lightCanvas) {
      failures.push(
        "Theme system: System mode did not follow the operating-system scheme",
      );
    }

    const fontGeometry = await page.evaluate(async (metricCases) => {
      const consumer = document.querySelector<HTMLElement>(
        "[data-discern-theme-consumer]",
      );
      if (consumer === null) {
        return {
          checks: 0,
          coveredAliases: [] as string[],
          maxWidthDeltaPercent: 0,
          maxLineBoxDeltaPixels: 0,
          skippedAliases: [] as string[],
          failures: ["font role consumer is missing"],
        };
      }
      const roleStacks = {
        "--discern-font-display": [
          '"Crimson Pro"',
          '"Discern Crimson Fallback Iowan"',
          '"Discern Crimson Fallback Georgia"',
          "serif",
        ],
        "--discern-font-body": [
          '"Inter"',
          '"Discern Inter Fallback Helvetica"',
          '"Discern Inter Fallback Arial"',
          "sans-serif",
        ],
        "--discern-font-ui": [
          '"Inter"',
          '"Discern Inter Fallback Helvetica"',
          '"Discern Inter Fallback Arial"',
          "sans-serif",
        ],
        "--discern-font-mono": [
          '"JetBrains Mono"',
          "ui-monospace",
          "monospace",
        ],
      } as const;
      const current = getComputedStyle(consumer);
      const currentFailures: string[] = [];
      for (const [role, expected] of Object.entries(roleStacks)) {
        const stack = current.getPropertyValue(role).trim();
        let previous = -1;
        for (const family of expected) {
          const index = stack.indexOf(family);
          if (index <= previous) {
            currentFailures.push(
              `${role} does not preserve ${expected.join(" → ")}`,
            );
            break;
          }
          previous = index;
        }
      }

      const texts = [
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "Pack my box with five dozen liquor jugs. 0123456789",
        "System Light Dark Continue Cancel Retry Complete",
        "Deterministic interfaces guide reliable work",
      ];
      const cases = [
        ...metricCases.map((candidate) => ({
          ...candidate,
          metricAdjusted: true,
        })),
        {
          name: "JetBrains/terminal mono",
          target: '"JetBrains Mono"',
          fallback: 'ui-monospace, "SF Mono", Menlo, monospace',
          style: "normal",
          weights: [400, 600],
          metricAdjusted: false,
        },
      ];
      let checks = 0;
      const coveredAliases: string[] = [];
      let maxWidthDeltaPercent = 0;
      let maxLineBoxDeltaPixels = 0;
      const skippedAliases: string[] = [];
      for (const candidate of cases) {
        const loaded = await document.fonts.load(
          `${candidate.style} ${
            candidate.weights[0]
          } 64px ${candidate.fallback}`,
        );
        if (candidate.metricAdjusted && loaded.length === 0) {
          skippedAliases.push(candidate.name);
          continue;
        }
        if (candidate.metricAdjusted) {
          coveredAliases.push(candidate.name);
        }
        for (const weight of candidate.weights) {
          for (const text of texts) {
            const measure = (
              family: string,
            ): { readonly width: number; readonly height: number } => {
              const probe = document.createElement("span");
              probe.textContent = text;
              Object.assign(probe.style, {
                position: "absolute",
                display: "inline-block",
                whiteSpace: "nowrap",
                fontFamily: family,
                fontSize: "64px",
                fontStyle: candidate.style,
                fontWeight: String(weight),
                lineHeight: "normal",
              });
              consumer.append(probe);
              const rect = probe.getBoundingClientRect();
              probe.remove();
              return { width: rect.width, height: rect.height };
            };
            const target = measure(candidate.target);
            const fallback = measure(candidate.fallback);
            const delta = Math.abs(
              (target.width / fallback.width - 1) * 100,
            );
            maxWidthDeltaPercent = Math.max(
              maxWidthDeltaPercent,
              delta,
            );
            const lineBoxDelta = Math.abs(target.height - fallback.height);
            if (candidate.metricAdjusted) {
              maxLineBoxDeltaPixels = Math.max(
                maxLineBoxDeltaPixels,
                lineBoxDelta,
              );
            }
            if (delta > 2.5) {
              currentFailures.push(
                `${candidate.name} width differs by ${
                  delta.toFixed(2)
                }% at ${weight}`,
              );
            }
            if (candidate.metricAdjusted && lineBoxDelta > 0.25) {
              currentFailures.push(
                `${candidate.name} normal line box differs by ${
                  lineBoxDelta.toFixed(2)
                }px at ${weight}`,
              );
            }
            checks += 1;
          }
        }
      }
      return {
        checks,
        coveredAliases,
        maxWidthDeltaPercent,
        maxLineBoxDeltaPixels,
        skippedAliases,
        failures: currentFailures,
      };
    }, fontMetricAudit.browserCases);
    failures.push(
      ...fontGeometry.failures.map((failure) => `Font geometry: ${failure}`),
    );

    const futureProof = await page.evaluate(() => {
      function failuresFor(consumer: HTMLElement): string[] {
        const problems: string[] = [];
        const mode = consumer.dataset.discernTheme;
        const selector = consumer.dataset.discernThemeControl;
        const control = selector === undefined
          ? null
          : consumer.querySelector(selector);
        const checked = control?.querySelector<HTMLInputElement>(
          "input:checked",
        )?.value;
        const key = consumer.dataset.discernThemeStorageKey;
        const stored = key === undefined
          ? undefined
          : localStorage.getItem(key);
        if (checked !== mode) problems.push("checked/root mismatch");
        if (key !== undefined && stored !== mode) {
          problems.push("storage/root mismatch");
        }
        return problems;
      }

      const future = document.createElement("div");
      future.dataset.discernThemeConsumer = "";
      future.dataset.discernTheme = "dark";
      future.dataset.discernThemeControl = ".discern-theme-switcher";
      future.dataset.discernThemeStorageKey = "future-theme";
      future.innerHTML = "<fieldset class='discern-theme-switcher'>" +
        "<label><input type='radio' value='system' checked>System</label>" +
        "</fieldset>";
      localStorage.setItem("future-theme", "light");
      document.body.append(future);
      const caught = failuresFor(future).length === 2;
      future.remove();
      localStorage.removeItem("future-theme");
      return caught;
    });
    if (!futureProof) {
      failures.push(
        "Theme system: synthetic future consumer escaped the detector",
      );
    }
    return {
      consumers: initial.consumers,
      geometryChecks,
      fontFallbackChecks: fontGeometry.checks,
      fontFallbackAliasesCovered: fontGeometry.coveredAliases,
      fontFallbackAliasesSkipped: fontGeometry.skippedAliases,
      fontMetricOverrideFaces: fontMetricAudit.faces,
      maxFontLineBoxDeltaPixels: fontGeometry.maxLineBoxDeltaPixels,
      maxFontWidthDeltaPercent: fontGeometry.maxWidthDeltaPercent,
      failures: initial.failures,
      futureProof,
    };
  } finally {
    await context.close();
  }
}

async function verifySemanticFocus(
  page: Page,
  origin: string,
  failures: string[],
): Promise<SemanticFocusResult> {
  const requiredRoles = ["accent", "success", "warning", "danger"] as const;
  const surfaceTokens = themeTokens.flatMap(({ name }) => {
    const role = requiredRoles.find((candidate) =>
      name.includes(`-${candidate}-`)
    );
    if (
      role === undefined ||
      (role === "accent"
        ? name !== "--discern-color-accent-100"
        : name !== `--discern-color-${role}-soft`)
    ) {
      return [];
    }
    return [{ role, token: name }];
  });
  let targets = 0;
  const currentFailures: string[] = [];
  const coveredRoles = new Set<string>();
  for (const theme of ["light", "dark"] as const) {
    await loadPage(page, conformanceUrl(origin, theme));
    await installSemanticRoleProbes(page, surfaceTokens);
    const semanticTargets = await discoverSemanticTargets(page, surfaceTokens);
    const surfaces = page.locator(SURFACE_SELECTOR);
    const themeRoles = new Set<string>();
    for (const semanticTarget of semanticTargets) {
      const target = surfaces.nth(semanticTarget.surface).locator(
        FOCUSABLE_SELECTOR,
      ).nth(
        semanticTarget.element,
      );
      if (!await target.isVisible() || !await target.isEnabled()) continue;
      await blurActiveElement(page);
      const before = await focusStyles(target);
      const keyboardFocused = await focusByKeyboard(page, target);
      const after = await focusStyles(target);
      const indicator = focusIndicatorContrast(
        before,
        after,
        semanticTarget.surfaceColor,
      );
      if (!keyboardFocused) {
        currentFailures.push(
          `${theme}/${semanticTarget.role}: semantic target could not receive keyboard focus: ${await target
            .evaluate((node) =>
              node.outerHTML.replace(/\s+/g, " ").slice(0, 180)
            )}`,
        );
      } else if (indicator.maxContrast < 3) {
        currentFailures.push(
          `${theme}/${semanticTarget.role}: semantic-surface focus indicator contrasts ${
            indicator.maxContrast.toFixed(2)
          }:1 instead of 3:1: ${await target.evaluate((node) =>
            node.outerHTML.replace(/\s+/g, " ").slice(0, 180)
          )}`,
        );
      }
      themeRoles.add(semanticTarget.role);
      coveredRoles.add(semanticTarget.role);
      targets += 1;
    }
    for (const role of requiredRoles) {
      if (!themeRoles.has(role)) {
        currentFailures.push(
          `${theme}: no rendered focusable enrolled on the ${role} semantic surface`,
        );
      }
    }
  }

  await loadPage(page, conformanceUrl(origin));
  const negativeProofKinds = [
    "transparent",
    "same-colour",
    "target-opacity",
    "ancestor-opacity",
    "target-filter-opacity",
    "ancestor-filter-opacity",
    "ambiguous-filter",
    "hidden",
    "subtle-opacity",
    "subtle-filter-opacity",
    "fixed-proxy",
    "generic-parent-proxy",
  ] as const;
  const positiveProofKinds = ["revealed-indicator"] as const;
  const proofKinds = [...negativeProofKinds, ...positiveProofKinds] as const;
  const synthetic = await page.evaluate(
    ({ proofKinds, surfaceSelector, surfaceTokens }) => {
      const root = document.querySelector<HTMLElement>(
        "[data-discern-root]",
      );
      const container = document.querySelector<HTMLElement>(surfaceSelector);
      const accent = surfaceTokens.find(({ role }) => role === "accent");
      if (root === null || container === null || accent === undefined) {
        return { ready: false as const, surfaceColor: "" };
      }
      const futureSurface = document.createElement("div");
      futureSurface.dataset.discernFocusProofSurface = "";
      futureSurface.style.cssText =
        `display:grid;gap:8px;padding:8px;background:var(${accent.token});`;
      for (const kind of proofKinds) {
        const proxyKind = kind === "fixed-proxy" ||
          kind === "generic-parent-proxy";
        const wrapper = kind === "fixed-proxy"
          ? document.createElement("label")
          : document.createElement("span");
        wrapper.style.cssText = kind === "generic-parent-proxy"
          ? "display:flex;justify-content:space-between;inline-size:100%;" +
            "min-block-size:44px;"
          : "display:inline-block;position:relative;";
        const target = kind === "fixed-proxy"
          ? document.createElement("input")
          : document.createElement("button");
        if (target instanceof HTMLInputElement) target.type = "checkbox";
        if (target instanceof HTMLButtonElement) target.type = "button";
        target.dataset.discernFocusProof = kind;
        if (target instanceof HTMLButtonElement) {
          target.textContent = `Future ${kind} action`;
        }
        target.style.cssText =
          "min-inline-size:44px;min-block-size:44px;background:transparent;" +
          "border:0;box-shadow:none;outline:none;text-decoration:none;";
        if (
          kind === "subtle-opacity" ||
          kind === "subtle-filter-opacity" ||
          kind === "revealed-indicator"
        ) {
          target.style.outline = "2px solid var(--discern-color-ink)";
          target.style.outlineOffset = "2px";
        }
        if (kind === "revealed-indicator") target.style.opacity = "0";
        wrapper.append(target);
        if (proxyKind) {
          const proxy = document.createElement("span");
          proxy.dataset.discernFocusProxy = kind;
          proxy.style.cssText = kind === "fixed-proxy"
            ? "position:fixed;inset:8px auto auto 8px;inline-size:44px;" +
              "block-size:44px;"
            : "display:block;inline-size:44px;block-size:44px;";
          wrapper.append(proxy);
        }
        futureSurface.append(wrapper);
      }
      container.append(futureSurface);
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const value = getComputedStyle(futureSurface).backgroundColor;
      if (context === null) {
        return { ready: true as const, surfaceColor: value };
      }
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return {
        ready: true as const,
        surfaceColor: `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${
          (pixel[3] ?? 0) / 255
        })`,
      };
    },
    {
      proofKinds,
      surfaceSelector: SURFACE_SELECTOR,
      surfaceTokens,
    },
  );
  const syntheticFailures: string[] = [];
  if (!synthetic.ready) {
    syntheticFailures.push("fixture could not be installed");
  }
  if (synthetic.ready) {
    const discoveredProofs = new Set(
      (await discoverSemanticTargets(page, surfaceTokens))
        .map(({ proofKind }) => proofKind)
        .filter(Boolean),
    );
    for (const kind of proofKinds) {
      if (!discoveredProofs.has(kind)) {
        syntheticFailures.push(`${kind} target did not auto-enrol`);
      }
    }
    for (const kind of proofKinds) {
      const target = page.locator(`[data-discern-focus-proof="${kind}"]`);
      await blurActiveElement(page);
      const before = await focusStyles(target);
      const oracleBefore = await focusFixtureOracle(target, kind);
      const keyboardFocused = await focusByKeyboard(page, target);
      await target.evaluate(
        async (node, { kind, surfaceColor }) => {
          const proxyKind = kind === "fixed-proxy" ||
            kind === "generic-parent-proxy";
          const paint = proxyKind ? node.nextElementSibling : node;
          if (!(paint instanceof HTMLElement)) return;
          paint.style.setProperty(
            "outline-color",
            kind === "transparent" ? "transparent" : surfaceColor,
            "important",
          );
          if (
            kind === "target-opacity" || kind === "ancestor-opacity" ||
            kind === "target-filter-opacity" ||
            kind === "ancestor-filter-opacity" ||
            kind === "ambiguous-filter" || kind === "hidden" ||
            kind === "subtle-opacity" ||
            kind === "subtle-filter-opacity" ||
            kind === "revealed-indicator" || proxyKind
          ) {
            paint.style.setProperty(
              "outline-color",
              "var(--discern-color-ink)",
              "important",
            );
          }
          paint.style.setProperty("outline-style", "solid", "important");
          paint.style.setProperty("outline-width", "2px", "important");
          paint.style.setProperty("outline-offset", "2px", "important");
          if (kind === "target-opacity") {
            node.style.setProperty("opacity", "0", "important");
          } else if (kind === "ancestor-opacity") {
            node.parentElement?.style.setProperty(
              "opacity",
              "0.1",
              "important",
            );
          } else if (kind === "target-filter-opacity") {
            node.style.setProperty(
              "filter",
              "opacity(50%) opacity(.0)",
              "important",
            );
          } else if (kind === "ancestor-filter-opacity") {
            node.parentElement?.style.setProperty(
              "filter",
              "opacity(.2) opacity(50%)",
              "important",
            );
          } else if (kind === "ambiguous-filter") {
            node.style.setProperty(
              "filter",
              'url("#future-filter")',
              "important",
            );
          } else if (kind === "hidden") {
            node.style.setProperty("visibility", "hidden", "important");
          } else if (kind === "subtle-opacity") {
            node.style.setProperty("opacity", ".9999", "important");
          } else if (kind === "subtle-filter-opacity") {
            node.style.setProperty(
              "filter",
              "opacity(99.99%)",
              "important",
            );
          } else if (kind === "revealed-indicator") {
            node.style.setProperty("opacity", "1", "important");
          } else if (proxyKind) {
            paint.style.setProperty(
              "box-shadow",
              "0 0 0 4px var(--discern-color-canvas)",
              "important",
            );
          }
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        },
        { kind, surfaceColor: synthetic.surfaceColor },
      );
      const oracleAfter = await focusFixtureOracle(target, kind);
      const after = await focusStyles(target);
      const indicator = focusIndicatorContrast(
        before,
        after,
        synthetic.surfaceColor,
      );
      if (oracleBefore === undefined || oracleAfter === undefined) {
        syntheticFailures.push(`${kind} target lost its oracle candidate`);
        continue;
      }
      const computedFixtureContrast = contrastRatio(
        oracleAfter.color,
        synthetic.surfaceColor,
        oracleAfter.visible ? oracleAfter.effectiveOpacity : 0,
      );
      const appearanceContrast = contrastRatio(
        paintedBackground(
          oracleAfter.color,
          synthetic.surfaceColor,
          oracleAfter.visible ? oracleAfter.effectiveOpacity : 0,
        ),
        paintedBackground(
          oracleAfter.color,
          synthetic.surfaceColor,
          oracleBefore.visible ? oracleBefore.effectiveOpacity : 0,
        ),
      );
      const subtle = kind === "subtle-opacity" ||
        kind === "subtle-filter-opacity";
      const opacityFiltered = kind === "target-filter-opacity" ||
        kind === "ancestor-filter-opacity";
      const fixedProxy = kind === "fixed-proxy";
      const genericProxy = kind === "generic-parent-proxy";
      const ambiguous = kind === "ambiguous-filter";
      const expectedAccepted = kind === "revealed-indicator";
      const oracleSupportsExpectation = expectedAccepted
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          appearanceContrast !== undefined &&
          appearanceContrast >= 3
        : subtle
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          appearanceContrast !== undefined &&
          appearanceContrast < 3
        : fixedProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          oracleAfter.semanticallyAssociated &&
          !oracleAfter.geometricallyAssociated
        : genericProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          !oracleAfter.semanticallyAssociated &&
          oracleAfter.geometricallyAssociated
        : ambiguous
        ? !oracleAfter.filterKnown &&
          oracleAfter.filters.some((filter) => filter.includes("url("))
        : kind === "hidden"
        ? !oracleAfter.visible
        : computedFixtureContrast !== undefined &&
          computedFixtureContrast < 3;
      const productionMatchesExpectation = expectedAccepted
        ? indicator.maxContrast >= 3
        : indicator.maxContrast < 3;
      const serializedFilterMatches = !opacityFiltered ||
        oracleAfter.filters.flatMap((filter) =>
            filter.match(/opacity\([^)]*\)/g) ?? []
          ).length === 2;
      if (
        !keyboardFocused ||
        !productionMatchesExpectation ||
        oracleAfter.style !== "solid" ||
        Number.parseFloat(oracleAfter.width) < 2 ||
        !oracleSupportsExpectation ||
        !serializedFilterMatches
      ) {
        syntheticFailures.push(
          `${kind} target: keyboard=${keyboardFocused}, colours=${
            indicator.colors.join(", ") || "none"
          }, contrast=${
            indicator.maxContrast.toFixed(2)
          }:1, computed=${oracleAfter.color} (${
            computedFixtureContrast?.toFixed(2) ?? "unknown"
          }:1 at opacity ${
            oracleAfter.effectiveOpacity.toFixed(4)
          }), appearance=${
            appearanceContrast?.toFixed(2) ?? "unknown"
          }:1, filters=${
            oracleAfter.filters.join(", ") || "none"
          }, semantic=${oracleAfter.semanticallyAssociated}, geometry=${oracleAfter.geometricallyAssociated}`,
        );
      }
    }
    await page.evaluate(() => {
      document.querySelector("[data-discern-focus-proof-surface]")?.remove();
    });
  }
  const futureProof = syntheticFailures.length === 0;
  failures.push(
    ...currentFailures.map((failure) => `Semantic focus: ${failure}`),
  );
  if (!futureProof) {
    failures.push(
      `Semantic focus: synthetic indicator escaped composited contrast or post-focus visibility detection: ${
        syntheticFailures.join("; ")
      }`,
    );
  }
  return {
    targets,
    roles: [...coveredRoles].toSorted(),
    failures: currentFailures,
    futureProof,
  };
}

/** Run the journey and cross-component resilience predicates. */
export async function runResilienceConformance(
  browser: Browser,
  page: Page,
  origin: string,
  failures: string[],
): Promise<ResilienceConformanceSummary> {
  await page.setViewportSize(WIDE_VIEWPORT);
  await loadPage(page, conformanceUrl(origin));
  const journeyStructure = await verifyJourneyStructure(page, failures);
  const journeyAxeScans = await scanJourneyAccessibility(
    page,
    origin,
    failures,
  );
  const journeyKeyboard = await verifyJourneyKeyboard(
    page,
    origin,
    failures,
  );
  const disclosures = await verifyDisclosures(page, origin, failures);
  const nestedControls = await verifyNestedControls(page, origin, failures);
  const targets = await verifyTargetSizes(page, origin, failures);
  const narrowReflow = await reflowAt(
    page,
    origin,
    NARROW_VIEWPORT,
    "390px",
    failures,
  );
  const zoomedReflow = await reflowAt(
    page,
    origin,
    ZOOMED_REFLOW_VIEWPORT,
    "400% (1280px represented by a 320 CSS px viewport)",
    failures,
  );
  const motionTargets = await verifyMotionPreferences(
    browser,
    origin,
    failures,
  );
  const theme = await verifyThemeSystem(browser, origin, failures);
  failures.push(...theme.failures.map((failure) => `Theme system: ${failure}`));
  const semanticFocus = await verifySemanticFocus(
    page,
    origin,
    failures,
  );

  return {
    journeys: journeyStructure.journeys,
    journeyStages: journeyStructure.stages,
    journeyAxeScans,
    journeyTabStops: journeyKeyboard.tabStops,
    journeyCommandCopies: journeyKeyboard.commandCopies,
    disclosures: disclosures.result.disclosures,
    disclosureToggles: disclosures.toggles,
    interactiveControls: nestedControls.controls,
    targets: targets.targets,
    inlineTextTargetExceptions: targets.inlineTextExceptions,
    labelledControlBoxes: targets.labelledControlBoxes,
    reflowSurfaces: narrowReflow.surfaces + zoomedReflow.surfaces,
    containedOverflowRegions: narrowReflow.containedOverflow +
      zoomedReflow.containedOverflow,
    motionTargets,
    themeConsumers: theme.consumers,
    themeGeometryChecks: theme.geometryChecks,
    fontFallbackChecks: theme.fontFallbackChecks,
    fontFallbackAliasesCovered: theme.fontFallbackAliasesCovered,
    fontFallbackAliasesSkipped: theme.fontFallbackAliasesSkipped,
    fontMetricOverrideFaces: theme.fontMetricOverrideFaces,
    maxFontLineBoxDeltaPixels: theme.maxFontLineBoxDeltaPixels,
    maxFontWidthDeltaPercent: theme.maxFontWidthDeltaPercent,
    semanticFocusTargets: semanticFocus.targets,
    semanticFocusRoles: semanticFocus.roles,
  };
}
