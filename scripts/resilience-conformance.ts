import { AxeBuilder } from "@axe-core/playwright";
import type { Browser, Locator, Page } from "playwright-core";
import { themeTokens } from "../src/tokens/tokens.ts";
import {
  auditBundledFontMetricAssets,
  auditFontMetricOverrides,
  bundledFontMetricSources,
} from "./font-metric-overrides.ts";
import { fontMetricCssomSnapshot } from "./font-metric-cssom.ts";
import { requireViewport, withViewport } from "./viewport.ts";

const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;
const NARROW_VIEWPORT = { width: 390, height: 844 } as const;
const ZOOMED_REFLOW_VIEWPORT = { width: 320, height: 256 } as const;
const MINIMUM_TARGET_SIZE = 24;
const MINIMUM_FOCUS_GEOMETRY_CHANGE = 2;
const FOCUS_PROXY_SIZE_FACTOR = 4;
const FOCUS_PROXY_DISTANCE_FACTOR = 2;
const PARENT_FOCUS_EDGE_FACTOR = 2;
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
  "a[href], area[href], button, input:not([type='hidden']), select, textarea, " +
  "summary, audio[controls], video[controls], iframe, object, embed, " +
  "[tabindex], [contenteditable]";
const SEMANTIC_FOCUS_ID_ATTRIBUTE = "data-discern-semantic-focus-id";
const FOCUS_CANDIDATE_ID_ATTRIBUTE = "data-discern-focus-candidate-id";
const FOCUS_SCROLL_ID_ATTRIBUTE = "data-discern-focus-scroll-id";
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
  readonly authoredProxy: boolean;
  readonly backgroundColor: string;
  readonly candidate: "target" | "next-sibling" | "parent";
  readonly candidateId: string;
  readonly effectiveOpacity: number;
  readonly outlineColor: string;
  readonly outlineOffset: string;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly boxShadow: string;
  readonly boxShadowLayers:
    | readonly FocusShadowLayer[]
    | undefined;
  readonly nativeLabelAssociated: boolean;
  readonly paintKnown: boolean;
  readonly pseudos: readonly FocusPseudoStyle[];
  readonly rect: FocusRect;
  readonly semanticallyAssociated: boolean;
  readonly sharedParentRect: FocusRect | undefined;
  readonly targetRect: FocusRect;
  readonly textDecorationColor: string;
  readonly textDecorationLine: string;
  readonly textDecorationThickness: string;
  readonly visible: boolean;
}

interface FocusPseudoStyle {
  readonly backdropFilter: string;
  readonly backgroundColor: string;
  readonly backgroundImage: string;
  readonly borderBottomColor: string;
  readonly borderBottomStyle: string;
  readonly borderBottomWidth: string;
  readonly borderLeftColor: string;
  readonly borderLeftStyle: string;
  readonly borderLeftWidth: string;
  readonly borderRightColor: string;
  readonly borderRightStyle: string;
  readonly borderRightWidth: string;
  readonly borderTopColor: string;
  readonly borderTopStyle: string;
  readonly borderTopWidth: string;
  readonly boxShadow: string;
  readonly boxShadowLayers: readonly FocusShadowLayer[] | undefined;
  readonly clipPath: string;
  readonly color: string;
  readonly content: string;
  readonly display: string;
  readonly height: string;
  readonly insetBlockEnd: string;
  readonly insetBlockStart: string;
  readonly insetInlineEnd: string;
  readonly insetInlineStart: string;
  readonly opacity: string;
  readonly outlineColor: string;
  readonly outlineOffset: string;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly position: string;
  readonly pseudo: "::before" | "::after";
  readonly filter: string;
  readonly marginBottom: string;
  readonly marginLeft: string;
  readonly marginRight: string;
  readonly marginTop: string;
  readonly maskImage: string;
  readonly mixBlendMode: string;
  readonly rotate: string;
  readonly scale: string;
  readonly textDecorationColor: string;
  readonly textDecorationLine: string;
  readonly textDecorationThickness: string;
  readonly transform: string;
  readonly translate: string;
  readonly visibility: string;
  readonly width: string;
}

interface FocusShadowGeometry {
  readonly blur: number;
  readonly inset: boolean;
  readonly spread: number;
  readonly x: number;
  readonly y: number;
}

interface FocusShadowLayer extends FocusShadowGeometry {
  readonly color: string;
}

interface FocusFixtureOracle {
  readonly authoredProxy: boolean;
  readonly backgroundColor: string;
  readonly candidateHeight: number;
  readonly candidateWidth: number;
  readonly color: string;
  readonly controlSized: boolean;
  readonly distanceLocal: boolean;
  readonly effectiveOpacity: number;
  readonly filterKnown: boolean;
  readonly filters: readonly string[];
  readonly geometricallyAssociated: boolean;
  readonly nativeLabelAssociated: boolean;
  readonly outlineOffset: number;
  readonly outlineStyle: string;
  readonly outlineWidth: number;
  readonly paintPresent: boolean;
  readonly parentEdgesLocal: boolean;
  readonly semanticallyAssociated: boolean;
  readonly shadowGeometry: FocusShadowGeometry | undefined;
  readonly shadowLayers: readonly FocusShadowLayer[] | undefined;
  readonly targetHeight: number;
  readonly targetWidth: number;
  readonly underlinePresent: boolean;
  readonly underlineThickness: number;
  readonly visible: boolean;
}

interface FocusSampleRegion {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface FocusSamplePlan {
  readonly clip: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  };
  readonly envelopes: readonly {
    readonly candidateId: string;
    readonly rect: FocusRect;
    readonly region: FocusSampleRegion;
  }[];
}

interface FocusRenderedDelta {
  readonly changedDevicePixels: number;
  readonly candidateId: string;
  readonly maximumAdjacentContrast: number;
  readonly maximumRestContrast: number;
  readonly outsideEnvelopeDevicePixels: number;
  readonly qualifyingCssPixels: number;
  readonly qualifyingDevicePixels: number;
  readonly requiredCssPixels: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly stable: boolean;
  readonly instability: string | undefined;
}

interface FocusInspection {
  readonly after: readonly FocusIndicatorStyle[];
  readonly before: readonly FocusIndicatorStyle[];
  readonly failures: readonly string[];
  readonly keyboardFocused: boolean;
  readonly plan: FocusSamplePlan | undefined;
  readonly renderedDelta: FocusRenderedDelta | undefined;
}

interface FocusRenderedCoverage {
  readonly measured: number | undefined;
  readonly required: number | undefined;
  readonly sufficient: boolean;
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
  readonly audited: boolean;
  readonly proofKind: string;
  readonly role: string;
  readonly signature: string;
  readonly surfaceColor: string;
  readonly targetId: string;
}

interface FocusCandidateEvidence {
  readonly candidate: FocusIndicatorStyle["candidate"];
  readonly candidateId: string;
  readonly envelope: FocusSampleRegion;
  readonly local: boolean;
  readonly localityFailure: string | undefined;
  readonly pseudos: readonly ("::before" | "::after")[];
  readonly regions: readonly FocusSampleRegion[];
  readonly requiredCssPixels: number;
  readonly viewportLocality: boolean;
}

interface FocusSceneCapture {
  readonly activeTargetId: string | undefined;
  readonly bytes: Uint8Array;
  readonly candidateGeometryKey: string;
  readonly geometryKey: string;
  readonly styles: readonly FocusIndicatorStyle[];
}

interface FocusViewportLocalityCaptures {
  readonly focusedOne: FocusSceneCapture;
  readonly focusedTwo: FocusSceneCapture;
  readonly plan: FocusSamplePlan;
  readonly suppressedOne: FocusSceneCapture;
  readonly suppressedTwo: FocusSceneCapture;
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

function focusControlScale(style: FocusIndicatorStyle): number {
  return Math.max(
    MINIMUM_TARGET_SIZE,
    style.targetRect.width,
    style.targetRect.height,
  );
}

function focusProxyIsControlSized(style: FocusIndicatorStyle): boolean {
  const limit = focusControlScale(style) * FOCUS_PROXY_SIZE_FACTOR;
  return style.rect.width <= limit && style.rect.height <= limit;
}

function focusCandidateAssociated(style: FocusIndicatorStyle): boolean {
  if (style.candidate === "target") return true;
  if (!style.semanticallyAssociated) return false;
  if (style.candidate === "parent") {
    if (!focusProxyIsControlSized(style)) return false;
    if (
      !rectContains(style.rect, style.targetRect) &&
      !rectsOverlap(style.rect, style.targetRect)
    ) {
      return false;
    }
    const edgeLimit = focusControlScale(style) * PARENT_FOCUS_EDGE_FACTOR;
    return Math.max(
      Math.abs(style.rect.left - style.targetRect.left),
      Math.abs(style.rect.top - style.targetRect.top),
      Math.abs(style.rect.right - style.targetRect.right),
      Math.abs(style.rect.bottom - style.targetRect.bottom),
    ) <= edgeLimit;
  }
  const sharedParent = style.sharedParentRect;
  const sharedParentContainsBoth = sharedParent !== undefined &&
    rectContains(sharedParent, style.targetRect) &&
    rectContains(sharedParent, style.rect);
  if (
    style.authoredProxy &&
    style.nativeLabelAssociated &&
    sharedParentContainsBoth
  ) return true;
  if (!focusProxyIsControlSized(style)) return false;
  if (rectsOverlap(style.rect, style.targetRect)) return true;
  if (!sharedParentContainsBoth) return false;
  return rectGap(style.rect, style.targetRect) <=
    focusControlScale(style) * FOCUS_PROXY_DISTANCE_FACTOR;
}

function paintAppearanceContrast(
  previousColor: string,
  currentColor: string,
  previousBackground: string,
  currentBackground: string,
  previous: FocusIndicatorStyle,
  current: FocusIndicatorStyle,
): number {
  if (!previous.paintKnown || !current.paintKnown) return 0;
  const beforePaint = paintedBackground(
    previousColor,
    previousBackground,
    previous.visible ? previous.effectiveOpacity : 0,
  );
  const afterPaint = paintedBackground(
    currentColor,
    currentBackground,
    current.visible ? current.effectiveOpacity : 0,
  );
  return contrastRatio(afterPaint, beforePaint) ?? 0;
}

function computedPixelLength(value: string): number | undefined {
  const match = value.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))px$/,
  );
  if (match?.[1] === undefined) return undefined;
  const length = Number(match[1]);
  return Number.isFinite(length) ? length : undefined;
}

function computedShadowLayerSources(
  value: string,
): readonly string[] | undefined {
  if (value === "none") return [];
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let position = 0; position < value.length; position += 1) {
    const character = value[position];
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) return undefined;
    } else if (character === "," && depth === 0) {
      const layer = value.slice(start, position).trim();
      if (layer === "") return undefined;
      layers.push(layer);
      start = position + 1;
    }
  }
  if (depth !== 0) return undefined;
  const layer = value.slice(start).trim();
  if (layer === "") return undefined;
  layers.push(layer);
  return layers;
}

function computedShadowLayers(
  value: string,
  colors: readonly string[],
): readonly FocusShadowLayer[] | undefined {
  const layers = computedShadowLayerSources(value);
  if (layers === undefined || layers.length !== colors.length) return undefined;
  const colorPattern = /(?:rgba?|hsla?|oklab|oklch|color)\([^)]+\)/gi;
  const parsed: FocusShadowLayer[] = [];
  for (const [index, layer] of layers.entries()) {
    const tokens = layer.replace(colorPattern, " ").trim().split(/\s+/);
    const insetTokens = tokens.filter((token) => token === "inset");
    if (insetTokens.length > 1) return undefined;
    const lengths: number[] = [];
    for (const token of tokens) {
      if (token === "inset") continue;
      const length = computedPixelLength(token);
      if (length === undefined) return undefined;
      lengths.push(length);
    }
    if (lengths.length < 2 || lengths.length > 4) return undefined;
    const color = colors[index];
    if (color === undefined) return undefined;
    parsed.push({
      blur: lengths[2] ?? 0,
      color,
      inset: insetTokens.length === 1,
      spread: lengths[3] ?? 0,
      x: lengths[0] ?? 0,
      y: lengths[1] ?? 0,
    });
  }
  return parsed;
}

function outlineGeometryChanged(
  previous: FocusIndicatorStyle | undefined,
  current: FocusIndicatorStyle,
): boolean {
  const currentWidth = computedPixelLength(current.outlineWidth);
  if (
    current.outlineStyle === "none" ||
    currentWidth === undefined ||
    currentWidth < 2
  ) {
    return false;
  }
  if (previous === undefined) return true;
  if (previous.outlineStyle === "none") return true;
  const previousWidth = computedPixelLength(previous.outlineWidth);
  if (previousWidth === undefined) return false;
  const previousOffset = computedPixelLength(previous.outlineOffset);
  const currentOffset = computedPixelLength(current.outlineOffset);
  if (previousOffset === undefined || currentOffset === undefined) return false;
  return Math.max(
    Math.abs(currentWidth - previousWidth),
    Math.abs(currentOffset - previousOffset),
  ) >= MINIMUM_FOCUS_GEOMETRY_CHANGE;
}

function shadowGeometryDistance(
  previous: FocusShadowGeometry,
  current: FocusShadowGeometry,
): number {
  return Math.max(
    Math.abs(current.x - previous.x),
    Math.abs(current.y - previous.y),
    Math.abs(current.blur - previous.blur),
    Math.abs(current.spread - previous.spread),
  );
}

function changedShadowLayers(
  previous: FocusIndicatorStyle | undefined,
  current: FocusIndicatorStyle,
  surfaceColor: string,
): readonly FocusShadowLayer[] {
  const currentLayers = current.boxShadowLayers;
  if (currentLayers === undefined || currentLayers.length === 0) return [];
  if (previous === undefined) return currentLayers;
  const previousLayers = previous.boxShadowLayers;
  if (previousLayers === undefined) return [];

  const previousMatches = new Array<number | undefined>(
    previousLayers.length,
  ).fill(undefined);
  // An admissible edge stays below both evidence thresholds. Finding a
  // complete maximum matching proves that order alone explains every current
  // layer; identity and distance order only choose a stable witness.
  const candidates = (currentIndex: number): readonly number[] => {
    const currentLayer = currentLayers[currentIndex];
    if (currentLayer === undefined) return [];
    return previousLayers.flatMap((previousLayer, previousIndex) => {
      const distance = shadowGeometryDistance(previousLayer, currentLayer);
      const paintContrast = paintAppearanceContrast(
        previousLayer.color,
        currentLayer.color,
        surfaceColor,
        surfaceColor,
        previous,
        current,
      );
      if (
        distance >= MINIMUM_FOCUS_GEOMETRY_CHANGE ||
        paintContrast >= 3
      ) {
        return [];
      }
      const identityRank = previousLayer.color === currentLayer.color &&
          previousLayer.inset === currentLayer.inset
        ? 0
        : previousLayer.inset === currentLayer.inset
        ? 1
        : previousLayer.color === currentLayer.color
        ? 2
        : 3;
      return [{ distance, identityRank, previousIndex }];
    }).toSorted((left, right) =>
      left.identityRank - right.identityRank ||
      left.distance - right.distance ||
      left.previousIndex - right.previousIndex
    ).map(({ previousIndex }) => previousIndex);
  };
  const match = (
    currentIndex: number,
    visitedPrevious: Set<number>,
  ): boolean => {
    for (const previousIndex of candidates(currentIndex)) {
      if (visitedPrevious.has(previousIndex)) continue;
      visitedPrevious.add(previousIndex);
      const occupiedBy = previousMatches[previousIndex];
      if (
        occupiedBy === undefined ||
        match(occupiedBy, visitedPrevious)
      ) {
        previousMatches[previousIndex] = currentIndex;
        return true;
      }
    }
    return false;
  };

  for (
    let currentIndex = 0;
    currentIndex < currentLayers.length;
    currentIndex += 1
  ) {
    match(currentIndex, new Set());
  }
  const matchedCurrent = new Set(
    previousMatches.filter((index): index is number => index !== undefined),
  );
  return currentLayers.filter((_, currentIndex) =>
    !matchedCurrent.has(currentIndex)
  );
}

function underlineGeometryChanged(
  previous: FocusIndicatorStyle | undefined,
  current: FocusIndicatorStyle,
): boolean {
  const currentPresent = current.textDecorationLine.split(/\s+/).includes(
    "underline",
  );
  if (!currentPresent) return false;
  if (previous === undefined) return true;
  const previousPresent = previous.textDecorationLine.split(/\s+/).includes(
    "underline",
  );
  if (!previousPresent) return true;
  const previousThickness = computedPixelLength(
    previous.textDecorationThickness,
  );
  const currentThickness = computedPixelLength(
    current.textDecorationThickness,
  );
  if (previousThickness === undefined || currentThickness === undefined) {
    return false;
  }
  return Math.abs(currentThickness - previousThickness) >=
    MINIMUM_FOCUS_GEOMETRY_CHANGE;
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
    const previousInsideBackground = previous === undefined
      ? surfaceColor
      : paintedBackground(
        previous.backgroundColor,
        surfaceColor,
        previous.effectiveOpacity,
      );
    const opacityOrVisibilityChanged = previous !== undefined &&
      (
        current.effectiveOpacity !== previous.effectiveOpacity ||
        current.visible !== previous.visible
      );
    const outlinePaintChanged = previous !== undefined &&
      (
        opacityOrVisibilityChanged ||
        current.outlineColor !== previous.outlineColor
      ) &&
      paintAppearanceContrast(
          previous.outlineColor,
          current.outlineColor,
          Number.parseFloat(previous.outlineOffset) < 0
            ? previousInsideBackground
            : surfaceColor,
          Number.parseFloat(current.outlineOffset) < 0
            ? insideBackground
            : surfaceColor,
          previous,
          current,
        ) >= 3;
    const outlineChanged = outlinePaintChanged ||
      outlineGeometryChanged(previous, current);
    if (
      outlineChanged && current.outlineStyle !== "none" &&
      (computedPixelLength(current.outlineWidth) ?? 0) >= 2
    ) {
      indicators.push({
        color: current.outlineColor,
        background: Number.parseFloat(current.outlineOffset) < 0
          ? insideBackground
          : surfaceColor,
        effectiveOpacity: current.effectiveOpacity,
      });
    }
    const shadowChanges = current.boxShadow === "none"
      ? []
      : changedShadowLayers(
        previous,
        current,
        surfaceColor,
      );
    if (shadowChanges.length > 0) {
      indicators.push(
        ...shadowChanges.map((layer) => ({
          color: layer.color,
          background: layer.inset ? insideBackground : surfaceColor,
          effectiveOpacity: current.effectiveOpacity,
        })),
      );
    }
    const underlinePaintChanged = previous !== undefined &&
      (
        opacityOrVisibilityChanged ||
        current.textDecorationColor !== previous.textDecorationColor
      ) &&
      paintAppearanceContrast(
          previous.textDecorationColor,
          current.textDecorationColor,
          previousInsideBackground,
          insideBackground,
          previous,
          current,
        ) >= 3;
    const underlineChanged = underlinePaintChanged ||
      underlineGeometryChanged(previous, current);
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
  const styles = await target.evaluate((node) => {
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
    const explicitlyRelated = (
      left: Element,
      right: Element,
    ): boolean =>
      [
        right.id !== "" &&
        references(left, "aria-controls").includes(right.id),
        right.id !== "" &&
        references(left, "aria-owns").includes(right.id),
        left.id !== "" &&
        references(right, "aria-controls").includes(left.id),
        left.id !== "" &&
        references(right, "aria-owns").includes(left.id),
      ].some(Boolean);
    const nativeLabelAssociation = (
      candidate: Element,
      kind: Candidate["kind"],
    ): boolean => {
      if (kind === "target") return true;
      if (kind === "parent") {
        return candidate instanceof HTMLLabelElement &&
          candidate.control === node;
      }
      const parent = node.parentElement;
      return parent !== null &&
        candidate.parentElement === parent &&
        parent instanceof HTMLLabelElement &&
        parent.control === node;
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
      const shadowColorPattern = /(?:rgba?|hsla?|oklab|oklch|color)\([^)]+\)/g;
      const candidateId = candidate.getAttribute(
        "data-discern-focus-candidate-id",
      );
      if (candidateId === null) {
        throw new Error(
          "Focus candidate was not marked before bracket measurement",
        );
      }
      const pseudoStyle = (
        pseudo: "::before" | "::after",
      ) => {
        const current = getComputedStyle(candidate, pseudo);
        return {
          backdropFilter: current.backdropFilter,
          backgroundColor: pixelColor(current.backgroundColor),
          backgroundImage: current.backgroundImage,
          borderBottomColor: pixelColor(current.borderBottomColor),
          borderBottomStyle: current.borderBottomStyle,
          borderBottomWidth: current.borderBottomWidth,
          borderLeftColor: pixelColor(current.borderLeftColor),
          borderLeftStyle: current.borderLeftStyle,
          borderLeftWidth: current.borderLeftWidth,
          borderRightColor: pixelColor(current.borderRightColor),
          borderRightStyle: current.borderRightStyle,
          borderRightWidth: current.borderRightWidth,
          borderTopColor: pixelColor(current.borderTopColor),
          borderTopStyle: current.borderTopStyle,
          borderTopWidth: current.borderTopWidth,
          boxShadow: current.boxShadow,
          boxShadowColors: (current.boxShadow.match(shadowColorPattern) ?? [])
            .map(pixelColor),
          clipPath: current.clipPath,
          color: pixelColor(current.color),
          content: current.content,
          display: current.display,
          filter: current.filter,
          height: current.height,
          insetBlockEnd: current.insetBlockEnd,
          insetBlockStart: current.insetBlockStart,
          insetInlineEnd: current.insetInlineEnd,
          insetInlineStart: current.insetInlineStart,
          marginBottom: current.marginBottom,
          marginLeft: current.marginLeft,
          marginRight: current.marginRight,
          marginTop: current.marginTop,
          maskImage: current.maskImage,
          mixBlendMode: current.mixBlendMode,
          opacity: current.opacity,
          outlineColor: pixelColor(current.outlineColor),
          outlineOffset: current.outlineOffset,
          outlineStyle: current.outlineStyle,
          outlineWidth: current.outlineWidth,
          position: current.position,
          pseudo,
          rotate: current.rotate,
          scale: current.scale,
          textDecorationColor: pixelColor(current.textDecorationColor),
          textDecorationLine: current.textDecorationLine,
          textDecorationThickness: current.textDecorationThickness,
          transform: current.transform,
          translate: current.translate,
          visibility: current.visibility,
          width: current.width,
        };
      };
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
      const nativeLabelAssociated = nativeLabelAssociation(candidate, kind);
      const authoredProxy = kind === "next-sibling" &&
        style.getPropertyValue("--discern-focus-proxy").trim() === "1" &&
        (
          candidate.parentElement === null ||
          getComputedStyle(candidate.parentElement).getPropertyValue(
              "--discern-focus-proxy",
            ).trim() !== "1"
        );
      return {
        authoredProxy,
        backgroundColor: pixelColor(style.backgroundColor),
        candidate: kind,
        candidateId,
        effectiveOpacity,
        outlineColor: pixelColor(style.outlineColor),
        outlineOffset: style.outlineOffset,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        boxShadowColors: (style.boxShadow.match(shadowColorPattern) ?? [])
          .map(pixelColor),
        nativeLabelAssociated,
        paintKnown,
        pseudos: [
          pseudoStyle("::before"),
          pseudoStyle("::after"),
        ],
        rect: rect(candidate),
        semanticallyAssociated: nativeLabelAssociated ||
          explicitlyRelated(node, candidate),
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
  return styles.map((style) => ({
    ...style,
    boxShadowLayers: computedShadowLayers(
      style.boxShadow,
      style.boxShadowColors,
    ),
    pseudos: style.pseudos.map((pseudo) => ({
      ...pseudo,
      boxShadowLayers: computedShadowLayers(
        pseudo.boxShadow,
        pseudo.boxShadowColors,
      ),
    })),
  }));
}

function focusExpandedRegion(
  rect: FocusRect | FocusSampleRegion,
  amount: number,
): FocusSampleRegion | undefined {
  const region = {
    bottom: rect.bottom + amount,
    left: rect.left - amount,
    right: rect.right + amount,
    top: rect.top - amount,
  };
  return region.right > region.left && region.bottom > region.top
    ? region
    : undefined;
}

function focusRegionDifference(
  outer: FocusSampleRegion,
  inner: FocusSampleRegion,
): FocusSampleRegion[] {
  const overlap = {
    bottom: Math.min(outer.bottom, inner.bottom),
    left: Math.max(outer.left, inner.left),
    right: Math.min(outer.right, inner.right),
    top: Math.max(outer.top, inner.top),
  };
  if (
    overlap.right <= overlap.left ||
    overlap.bottom <= overlap.top
  ) {
    return [outer];
  }
  return [
    {
      bottom: overlap.top,
      left: outer.left,
      right: outer.right,
      top: outer.top,
    },
    {
      bottom: outer.bottom,
      left: outer.left,
      right: outer.right,
      top: overlap.bottom,
    },
    {
      bottom: overlap.bottom,
      left: outer.left,
      right: overlap.left,
      top: overlap.top,
    },
    {
      bottom: overlap.bottom,
      left: overlap.right,
      right: outer.right,
      top: overlap.top,
    },
  ].filter((region) =>
    region.right > region.left && region.bottom > region.top
  );
}

function focusLocalityEnvelope(
  style: FocusIndicatorStyle,
): FocusSampleRegion {
  const distance = Math.max(
    MINIMUM_TARGET_SIZE,
    style.rect.width,
    style.rect.height,
  ) * FOCUS_PROXY_DISTANCE_FACTOR;
  return focusExpandedRegion(style.rect, distance) ?? {
    bottom: style.rect.bottom,
    left: style.rect.left,
    right: style.rect.right,
    top: style.rect.top,
  };
}

function focusRegionContained(
  envelope: FocusSampleRegion,
  region: FocusSampleRegion,
): boolean {
  const tolerance = 0.01;
  return region.left >= envelope.left - tolerance &&
    region.right <= envelope.right + tolerance &&
    region.top >= envelope.top - tolerance &&
    region.bottom <= envelope.bottom + tolerance;
}

function focusOutlineRegions(
  style: FocusIndicatorStyle,
): readonly FocusSampleRegion[] {
  const width = computedPixelLength(style.outlineWidth);
  const offset = computedPixelLength(style.outlineOffset);
  if (
    style.outlineStyle === "none" ||
    width === undefined ||
    offset === undefined ||
    width <= 0
  ) {
    return [];
  }
  const outer = focusExpandedRegion(style.rect, offset + width);
  const inner = focusExpandedRegion(style.rect, offset);
  if (outer === undefined) return [];
  return inner === undefined ? [outer] : focusRegionDifference(outer, inner);
}

function focusShadowRegions(
  style: FocusIndicatorStyle,
  layers: readonly FocusShadowLayer[],
): readonly FocusSampleRegion[] {
  const targetRegion = {
    bottom: style.rect.bottom,
    left: style.rect.left,
    right: style.rect.right,
    top: style.rect.top,
  };
  return layers.flatMap((layer) => {
    if (layer.inset) {
      return [targetRegion];
    }
    const blurExtent = 2 * layer.blur;
    const region = focusExpandedRegion(
      {
        bottom: style.rect.bottom + layer.y,
        left: style.rect.left + layer.x,
        right: style.rect.right + layer.x,
        top: style.rect.top + layer.y,
      },
      layer.spread + blurExtent,
    );
    if (region === undefined) return [targetRegion];
    const difference = focusRegionDifference(region, style.rect);
    return difference.length === 0 ? [targetRegion] : difference;
  });
}

function focusUnderlineRegions(
  style: FocusIndicatorStyle,
): readonly FocusSampleRegion[] {
  const thickness = computedPixelLength(style.textDecorationThickness);
  if (
    thickness === undefined ||
    thickness <= 0 ||
    !style.textDecorationLine.split(/\s+/).includes("underline")
  ) {
    return [];
  }
  return [{
    bottom: style.rect.bottom,
    left: style.rect.left,
    right: style.rect.right,
    top: style.rect.top,
  }];
}

function focusPseudoPaintSignature(style: FocusPseudoStyle): string {
  return JSON.stringify([
    style.backdropFilter,
    style.backgroundColor,
    style.backgroundImage,
    style.borderBottomColor,
    style.borderBottomStyle,
    style.borderBottomWidth,
    style.borderLeftColor,
    style.borderLeftStyle,
    style.borderLeftWidth,
    style.borderRightColor,
    style.borderRightStyle,
    style.borderRightWidth,
    style.borderTopColor,
    style.borderTopStyle,
    style.borderTopWidth,
    style.boxShadow,
    style.clipPath,
    style.color,
    style.content,
    style.display,
    style.filter,
    style.height,
    style.insetBlockEnd,
    style.insetBlockStart,
    style.insetInlineEnd,
    style.insetInlineStart,
    style.marginBottom,
    style.marginLeft,
    style.marginRight,
    style.marginTop,
    style.maskImage,
    style.mixBlendMode,
    style.opacity,
    style.outlineColor,
    style.outlineOffset,
    style.outlineWidth,
    style.position,
    style.rotate,
    style.scale,
    style.textDecorationColor,
    style.textDecorationLine,
    style.textDecorationThickness,
    style.transform,
    style.translate,
    style.visibility,
    style.width,
  ]);
}

function focusPseudoHasEligiblePaint(style: FocusPseudoStyle): boolean {
  const visibleColor = (value: string): boolean =>
    (computedColor(value)?.alpha ?? 0) > 0;
  const borderPaint = [
    [style.borderBottomColor, style.borderBottomStyle, style.borderBottomWidth],
    [style.borderLeftColor, style.borderLeftStyle, style.borderLeftWidth],
    [style.borderRightColor, style.borderRightStyle, style.borderRightWidth],
    [style.borderTopColor, style.borderTopStyle, style.borderTopWidth],
  ].some(([color, borderStyle, width]) =>
    borderStyle !== "none" &&
    (computedPixelLength(width ?? "") ?? 0) > 0 &&
    visibleColor(color ?? "")
  );
  const outlinePaint = style.outlineStyle !== "none" &&
    (computedPixelLength(style.outlineWidth) ?? 0) > 0 &&
    visibleColor(style.outlineColor);
  const shadowPaint = (style.boxShadowLayers ?? []).some((layer) =>
    visibleColor(layer.color)
  );
  const underlinePaint = style.textDecorationLine.split(/\s+/).includes(
    "underline",
  ) && visibleColor(style.textDecorationColor);
  const contentPaint = !['""', "''"].includes(style.content) &&
    visibleColor(style.color);
  return Number.parseFloat(style.opacity) > 0 &&
    (
      visibleColor(style.backgroundColor) ||
      style.backgroundImage !== "none" ||
      borderPaint ||
      outlinePaint ||
      shadowPaint ||
      underlinePaint ||
      contentPaint
    );
}

function focusPseudoLocal(
  pseudo: FocusPseudoStyle,
  owner: FocusIndicatorStyle,
): boolean {
  if (
    pseudo.position === "fixed" ||
    pseudo.backgroundImage !== "none" ||
    pseudo.backdropFilter !== "none" ||
    pseudo.filter !== "none" ||
    pseudo.clipPath !== "none" ||
    pseudo.maskImage !== "none" ||
    pseudo.mixBlendMode !== "normal" ||
    pseudo.rotate !== "none" ||
    pseudo.scale !== "none" ||
    pseudo.translate !== "none"
  ) {
    return false;
  }
  const limit = Math.max(
    MINIMUM_TARGET_SIZE,
    owner.rect.width,
    owner.rect.height,
  ) * FOCUS_PROXY_DISTANCE_FACTOR;
  const lengths = [
    pseudo.height,
    pseudo.insetBlockEnd,
    pseudo.insetBlockStart,
    pseudo.insetInlineEnd,
    pseudo.insetInlineStart,
    pseudo.marginBottom,
    pseudo.marginLeft,
    pseudo.marginRight,
    pseudo.marginTop,
    pseudo.width,
  ];
  for (const value of lengths) {
    if (value === "auto" || value === "none") continue;
    const length = computedPixelLength(value);
    if (length === undefined || Math.abs(length) > limit * 2) return false;
  }
  if (pseudo.transform !== "none") {
    const match = pseudo.transform.match(
      /^matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([^,]+),\s*([^)]+)\)$/,
    );
    if (match?.[1] === undefined || match[2] === undefined) return false;
    const x = Number(match[1]);
    const y = Number(match[2]);
    if (
      !Number.isFinite(x) || !Number.isFinite(y) ||
      Math.abs(x) > limit || Math.abs(y) > limit
    ) {
      return false;
    }
  }
  if (
    pseudo.boxShadow !== "none" &&
    (
      pseudo.boxShadowLayers === undefined ||
      pseudo.boxShadowLayers.some((layer) =>
        Math.max(
          Math.abs(layer.x),
          Math.abs(layer.y),
          2 * layer.blur,
          Math.abs(layer.spread),
        ) > limit
      )
    )
  ) {
    return false;
  }
  return true;
}

function focusCandidateEvidence(
  before: readonly FocusIndicatorStyle[],
  after: readonly FocusIndicatorStyle[],
  surfaceColor: string,
  plan: FocusSamplePlan,
): readonly FocusCandidateEvidence[] {
  const previousById = new Map(
    before.map((style) => [style.candidateId, style] as const),
  );
  const envelopes = new Map(
    plan.envelopes.map(({ candidateId, region }) => [candidateId, region]),
  );
  return after.flatMap((current) => {
    const previous = previousById.get(current.candidateId);
    const envelope = envelopes.get(current.candidateId);
    if (
      previous === undefined ||
      envelope === undefined ||
      !current.visible ||
      !current.paintKnown ||
      !focusCandidateAssociated(current)
    ) {
      return [];
    }
    const opacityOrVisibilityChanged =
      current.effectiveOpacity !== previous.effectiveOpacity ||
      current.visible !== previous.visible;
    const outlineChanged = current.outlineColor !== previous.outlineColor ||
      opacityOrVisibilityChanged ||
      outlineGeometryChanged(previous, current);
    const outlineRegions = outlineChanged ? focusOutlineRegions(current) : [];
    const changedShadows = changedShadowLayers(
      previous,
      current,
      surfaceColor,
    );
    const shadowRegions = focusShadowRegions(current, changedShadows);
    const underlineChanged =
      current.textDecorationColor !== previous.textDecorationColor ||
      opacityOrVisibilityChanged ||
      underlineGeometryChanged(previous, current);
    const underlineRegions = underlineChanged
      ? focusUnderlineRegions(current)
      : [];
    const previousPseudos = new Map(
      previous.pseudos.map((pseudo) => [pseudo.pseudo, pseudo] as const),
    );
    const changedPseudos = current.pseudos.filter((pseudo) => {
      const prior = previousPseudos.get(pseudo.pseudo);
      return prior !== undefined &&
        pseudo.content !== "none" &&
        pseudo.display !== "none" &&
        pseudo.visibility === "visible" &&
        focusPseudoHasEligiblePaint(pseudo) &&
        focusPseudoPaintSignature(prior) !== focusPseudoPaintSignature(pseudo);
    });
    const regions = [
      ...outlineRegions,
      ...shadowRegions,
      ...underlineRegions,
      ...(changedPseudos.length === 0 ? [] : [envelope]),
    ];
    if (regions.length === 0) return [];
    const remotePseudo = changedPseudos.find((pseudo) =>
      !focusPseudoLocal(pseudo, current)
    );
    const overflowingRegion = regions.find((region) =>
      !focusRegionContained(envelope, region)
    );
    const localityFailure = remotePseudo !== undefined
      ? `${remotePseudo.pseudo} uses non-local geometry`
      : overflowingRegion !== undefined
      ? "eligible focus paint exceeds the declared locality envelope"
      : undefined;
    return [{
      candidate: current.candidate,
      candidateId: current.candidateId,
      envelope,
      local: localityFailure === undefined,
      localityFailure,
      pseudos: changedPseudos.map(({ pseudo }) => pseudo),
      regions,
      requiredCssPixels: MINIMUM_FOCUS_GEOMETRY_CHANGE *
        Math.max(
          MINIMUM_TARGET_SIZE,
          Math.min(current.rect.width, current.rect.height),
        ),
      viewportLocality: changedPseudos.length > 0,
    }];
  });
}

async function focusSamplePlan(
  page: Page,
  before: readonly FocusIndicatorStyle[],
): Promise<FocusSamplePlan | undefined> {
  if (before.length === 0) return undefined;
  const envelopes = before.filter(focusCandidateAssociated).map((style) => ({
    candidateId: style.candidateId,
    rect: style.rect,
    region: focusLocalityEnvelope(style),
  }));
  if (envelopes.length === 0) return undefined;
  const viewport = await page.evaluate(() => ({
    height: globalThis.innerHeight,
    width: globalThis.innerWidth,
  }));
  const visible = envelopes.flatMap(({ candidateId, region }) => {
    const clipped = {
      bottom: Math.min(viewport.height, region.bottom),
      left: Math.max(0, region.left),
      right: Math.min(viewport.width, region.right),
      top: Math.max(0, region.top),
    };
    return clipped.right > clipped.left && clipped.bottom > clipped.top
      ? [{ candidateId, region: clipped }]
      : [];
  });
  if (visible.length === 0) return undefined;
  const x = Math.floor(Math.min(...visible.map(({ region }) => region.left)));
  const y = Math.floor(Math.min(...visible.map(({ region }) => region.top)));
  const right = Math.ceil(
    Math.max(...visible.map(({ region }) => region.right)),
  );
  const bottom = Math.ceil(
    Math.max(...visible.map(({ region }) => region.bottom)),
  );
  if (right <= x || bottom <= y) return undefined;
  return {
    clip: { height: bottom - y, width: right - x, x, y },
    envelopes,
  };
}

async function focusViewportPlan(
  page: Page,
  plan: FocusSamplePlan,
): Promise<FocusSamplePlan> {
  const viewport = await page.evaluate(() => ({
    height: globalThis.innerHeight,
    width: globalThis.innerWidth,
  }));
  return {
    clip: {
      height: viewport.height,
      width: viewport.width,
      x: 0,
      y: 0,
    },
    envelopes: plan.envelopes,
  };
}

async function settleFocusPaint(page: Page): Promise<void> {
  await page.evaluate(() =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    })
  );
}

async function focusScreenshot(
  page: Page,
  plan: FocusSamplePlan,
  expectedScroll: { readonly x: number; readonly y: number },
): Promise<Uint8Array> {
  const scroll = await page.evaluate(() => ({
    x: globalThis.scrollX,
    y: globalThis.scrollY,
  }));
  if (scroll.x !== expectedScroll.x || scroll.y !== expectedScroll.y) {
    throw new Error(
      `Focus screenshot scroll changed before capture: expected ${expectedScroll.x},${expectedScroll.y}; received ${scroll.x},${scroll.y}`,
    );
  }
  return await page.screenshot({
    animations: "disabled",
    caret: "hide",
    clip: plan.clip,
    scale: "device",
  });
}

async function measureFocusRenderedDelta(
  page: Page,
  restOne: FocusSceneCapture,
  restTwo: FocusSceneCapture,
  focusedOne: FocusSceneCapture,
  focusedTwo: FocusSceneCapture,
  suppressedOne: FocusSceneCapture,
  suppressedTwo: FocusSceneCapture,
  restoredRest: FocusSceneCapture,
  evidence: FocusCandidateEvidence,
  plan: FocusSamplePlan,
): Promise<FocusRenderedDelta | undefined> {
  return await page.evaluate(
    async (
      {
        candidateId,
        clip,
        envelope,
        focusedOneBytes,
        focusedTwoBytes,
        regions,
        requiredCssPixels,
        restOneBytes,
        restTwoBytes,
        restoredRestBytes,
        suppressedOneBytes,
        suppressedTwoBytes,
      },
    ) => {
      const decodedPixels = async (
        bytes: readonly number[],
      ): Promise<
        | {
          readonly data: Uint8ClampedArray;
          readonly height: number;
          readonly width: number;
        }
        | undefined
      > => {
        const bitmap = await createImageBitmap(
          new Blob([Uint8Array.from(bytes)], { type: "image/png" }),
        );
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });
        if (context === null) {
          bitmap.close();
          return undefined;
        }
        context.drawImage(bitmap, 0, 0);
        const data = context.getImageData(
          0,
          0,
          bitmap.width,
          bitmap.height,
        ).data;
        const result = {
          data,
          height: bitmap.height,
          width: bitmap.width,
        };
        bitmap.close();
        return result;
      };
      const [
        restOnePixels,
        restTwoPixels,
        focusedOnePixels,
        focusedTwoPixels,
        suppressedOnePixels,
        suppressedTwoPixels,
        restoredRestPixels,
      ] = await Promise.all([
        decodedPixels(restOneBytes),
        decodedPixels(restTwoBytes),
        decodedPixels(focusedOneBytes),
        decodedPixels(focusedTwoBytes),
        decodedPixels(suppressedOneBytes),
        decodedPixels(suppressedTwoBytes),
        decodedPixels(restoredRestBytes),
      ]);
      if (
        restOnePixels === undefined ||
        restTwoPixels === undefined ||
        focusedOnePixels === undefined ||
        focusedTwoPixels === undefined ||
        suppressedOnePixels === undefined ||
        suppressedTwoPixels === undefined ||
        restoredRestPixels === undefined
      ) {
        return undefined;
      }
      if (
        [
          restTwoPixels,
          focusedOnePixels,
          focusedTwoPixels,
          suppressedOnePixels,
          suppressedTwoPixels,
          restoredRestPixels,
        ].some((image) =>
          image.width !== restOnePixels.width ||
          image.height !== restOnePixels.height
        )
      ) {
        return undefined;
      }
      const scaleX = restOnePixels.width / clip.width;
      const scaleY = restOnePixels.height / clip.height;
      if (
        !Number.isFinite(scaleX) ||
        !Number.isFinite(scaleY) ||
        scaleX <= 0 ||
        scaleY <= 0
      ) {
        return undefined;
      }
      const linearChannel = (channel: number): number => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (
        data: Uint8ClampedArray,
        offset: number,
      ): number => {
        const alpha = (data[offset + 3] ?? 255) / 255;
        const red = (data[offset] ?? 0) * alpha + 255 * (1 - alpha);
        const green = (data[offset + 1] ?? 0) * alpha +
          255 * (1 - alpha);
        const blue = (data[offset + 2] ?? 0) * alpha +
          255 * (1 - alpha);
        return 0.2126 * linearChannel(red) +
          0.7152 * linearChannel(green) +
          0.0722 * linearChannel(blue);
      };
      const differingPixels = (
        left: Uint8ClampedArray,
        right: Uint8ClampedArray,
      ): number => {
        let differences = 0;
        for (let row = 0; row < restOnePixels.height; row += 1) {
          const top = clip.y + row / scaleY;
          const bottom = clip.y + (row + 1) / scaleY;
          for (let column = 0; column < restOnePixels.width; column += 1) {
            const cellLeft = clip.x + column / scaleX;
            const cellRight = clip.x + (column + 1) / scaleX;
            if (
              !regions.some((region) =>
                cellLeft < region.right &&
                cellRight > region.left &&
                top < region.bottom &&
                bottom > region.top
              )
            ) {
              continue;
            }
            const offset = (row * restOnePixels.width + column) * 4;
            const attributedInFirstPair = focusedOnePixels.data[offset] !==
                suppressedOnePixels.data[offset] ||
              focusedOnePixels.data[offset + 1] !==
                suppressedOnePixels.data[offset + 1] ||
              focusedOnePixels.data[offset + 2] !==
                suppressedOnePixels.data[offset + 2] ||
              focusedOnePixels.data[offset + 3] !==
                suppressedOnePixels.data[offset + 3];
            const attributedInSecondPair = focusedTwoPixels.data[offset] !==
                suppressedTwoPixels.data[offset] ||
              focusedTwoPixels.data[offset + 1] !==
                suppressedTwoPixels.data[offset + 1] ||
              focusedTwoPixels.data[offset + 2] !==
                suppressedTwoPixels.data[offset + 2] ||
              focusedTwoPixels.data[offset + 3] !==
                suppressedTwoPixels.data[offset + 3];
            if (!attributedInFirstPair && !attributedInSecondPair) continue;
            if (
              left[offset] !== right[offset] ||
              left[offset + 1] !== right[offset + 1] ||
              left[offset + 2] !== right[offset + 2] ||
              left[offset + 3] !== right[offset + 3]
            ) {
              differences += 1;
            }
          }
        }
        return differences;
      };
      const unstablePairs = [
        ["rest A1/A2", differingPixels(restOnePixels.data, restTwoPixels.data)],
        [
          "focused F1/F2",
          differingPixels(focusedOnePixels.data, focusedTwoPixels.data),
        ],
        [
          "suppressed S1/S2",
          differingPixels(suppressedOnePixels.data, suppressedTwoPixels.data),
        ],
        [
          "rest A1/A3",
          differingPixels(restOnePixels.data, restoredRestPixels.data),
        ],
      ] as const;
      const unstable = unstablePairs.find(([, differences]) => differences > 0);
      const pixelIntersectionArea = (
        left: number,
        right: number,
        top: number,
        bottom: number,
        sampleRegions: readonly {
          readonly bottom: number;
          readonly left: number;
          readonly right: number;
          readonly top: number;
        }[],
      ): number => {
        const clipped = sampleRegions.flatMap((region) => {
          const overlap = {
            bottom: Math.min(bottom, region.bottom),
            left: Math.max(left, region.left),
            right: Math.min(right, region.right),
            top: Math.max(top, region.top),
          };
          return overlap.right > overlap.left && overlap.bottom > overlap.top
            ? [overlap]
            : [];
        });
        const xBreaks = [
          ...new Set(clipped.flatMap((region) => [
            region.left,
            region.right,
          ])),
        ].toSorted((a, b) => a - b);
        let area = 0;
        for (let index = 0; index + 1 < xBreaks.length; index += 1) {
          const xOne = xBreaks[index];
          const xTwo = xBreaks[index + 1];
          if (xOne === undefined || xTwo === undefined || xTwo <= xOne) {
            continue;
          }
          const middle = (xOne + xTwo) / 2;
          const intervals = clipped.flatMap((region) =>
            middle >= region.left && middle < region.right
              ? [[region.top, region.bottom] as const]
              : []
          ).toSorted((a, b) => a[0] - b[0]);
          let covered = 0;
          let start: number | undefined;
          let end: number | undefined;
          for (const interval of intervals) {
            if (start === undefined || end === undefined) {
              [start, end] = interval;
            } else if (interval[0] > end) {
              covered += end - start;
              [start, end] = interval;
            } else {
              end = Math.max(end, interval[1]);
            }
          }
          if (start !== undefined && end !== undefined) {
            covered += end - start;
          }
          area += (xTwo - xOne) * covered;
        }
        return area;
      };
      let changedDevicePixels = 0;
      let maximumAdjacentContrast = 1;
      let maximumRestContrast = 1;
      let outsideEnvelopeDevicePixels = 0;
      let qualifyingDevicePixels = 0;
      let qualifyingCssPixels = 0;
      const regionBounds = {
        bottom: Math.max(...regions.map((region) => region.bottom)),
        left: Math.min(...regions.map((region) => region.left)),
        right: Math.max(...regions.map((region) => region.right)),
        top: Math.min(...regions.map((region) => region.top)),
      };
      for (let row = 0; row < restOnePixels.height; row += 1) {
        const top = clip.y + row / scaleY;
        const bottom = clip.y + (row + 1) / scaleY;
        for (let column = 0; column < restOnePixels.width; column += 1) {
          const left = clip.x + column / scaleX;
          const right = clip.x + (column + 1) / scaleX;
          const offset = (row * restOnePixels.width + column) * 4;
          const suppressionChanged = focusedOnePixels.data[offset] !==
              suppressedOnePixels.data[offset] ||
            focusedOnePixels.data[offset + 1] !==
              suppressedOnePixels.data[offset + 1] ||
            focusedOnePixels.data[offset + 2] !==
              suppressedOnePixels.data[offset + 2] ||
            focusedOnePixels.data[offset + 3] !==
              suppressedOnePixels.data[offset + 3];
          if (suppressionChanged) {
            const envelopeArea = pixelIntersectionArea(
              left,
              right,
              top,
              bottom,
              [envelope],
            );
            const deviceCellArea = (right - left) * (bottom - top);
            if (envelopeArea < deviceCellArea - 1e-6) {
              outsideEnvelopeDevicePixels += 1;
            }
          }
          if (
            right <= regionBounds.left ||
            left >= regionBounds.right ||
            bottom <= regionBounds.top ||
            top >= regionBounds.bottom
          ) {
            continue;
          }
          const intersectionArea = pixelIntersectionArea(
            left,
            right,
            top,
            bottom,
            regions,
          );
          if (intersectionArea <= 0) continue;
          if (
            restOnePixels.data[offset] !== focusedOnePixels.data[offset] ||
            restOnePixels.data[offset + 1] !==
              focusedOnePixels.data[offset + 1] ||
            restOnePixels.data[offset + 2] !==
              focusedOnePixels.data[offset + 2] ||
            restOnePixels.data[offset + 3] !==
              focusedOnePixels.data[offset + 3]
          ) {
            changedDevicePixels += 1;
          }
          const focusedLuminance = luminance(focusedOnePixels.data, offset);
          const restLuminance = luminance(restOnePixels.data, offset);
          const suppressedLuminance = luminance(
            suppressedOnePixels.data,
            offset,
          );
          const restContrast = (
            Math.max(focusedLuminance, restLuminance) + 0.05
          ) / (Math.min(focusedLuminance, restLuminance) + 0.05);
          const adjacentContrast = (
            Math.max(focusedLuminance, suppressedLuminance) + 0.05
          ) / (Math.min(focusedLuminance, suppressedLuminance) + 0.05);
          maximumRestContrast = Math.max(maximumRestContrast, restContrast);
          maximumAdjacentContrast = Math.max(
            maximumAdjacentContrast,
            adjacentContrast,
          );
          if (restContrast >= 3 && adjacentContrast >= 3) {
            qualifyingDevicePixels += 1;
            qualifyingCssPixels += intersectionArea;
          }
        }
      }
      return {
        candidateId,
        changedDevicePixels,
        maximumAdjacentContrast,
        maximumRestContrast,
        outsideEnvelopeDevicePixels,
        qualifyingCssPixels,
        qualifyingDevicePixels,
        requiredCssPixels,
        scaleX,
        scaleY,
        stable: unstable === undefined,
        instability: unstable === undefined
          ? undefined
          : `${unstable[0]} changed at ${unstable[1]} attributed device pixels`,
      };
    },
    {
      candidateId: evidence.candidateId,
      clip: plan.clip,
      envelope: evidence.envelope,
      focusedOneBytes: [...focusedOne.bytes],
      focusedTwoBytes: [...focusedTwo.bytes],
      regions: evidence.regions,
      requiredCssPixels: evidence.requiredCssPixels,
      restOneBytes: [...restOne.bytes],
      restTwoBytes: [...restTwo.bytes],
      restoredRestBytes: [...restoredRest.bytes],
      suppressedOneBytes: [...suppressedOne.bytes],
      suppressedTwoBytes: [...suppressedTwo.bytes],
    },
  );
}

async function measureFocusViewportLocality(
  page: Page,
  captures: FocusViewportLocalityCaptures,
  envelope: FocusSampleRegion,
): Promise<{
  readonly instability: string | undefined;
  readonly outsideEnvelopeDevicePixels: number;
}> {
  return await page.evaluate(
    async (
      {
        envelope,
        focusedOneBytes,
        focusedTwoBytes,
        plan,
        suppressedOneBytes,
        suppressedTwoBytes,
      },
    ) => {
      const decode = async (bytes: readonly number[]) => {
        const bitmap = await createImageBitmap(
          new Blob([Uint8Array.from(bytes)], { type: "image/png" }),
        );
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });
        if (context === null) {
          bitmap.close();
          return undefined;
        }
        context.drawImage(bitmap, 0, 0);
        const result = {
          data: context.getImageData(
            0,
            0,
            bitmap.width,
            bitmap.height,
          ).data,
          height: bitmap.height,
          width: bitmap.width,
        };
        bitmap.close();
        return result;
      };
      const [focusedOne, focusedTwo, suppressedOne, suppressedTwo] =
        await Promise.all([
          decode(focusedOneBytes),
          decode(focusedTwoBytes),
          decode(suppressedOneBytes),
          decode(suppressedTwoBytes),
        ]);
      if (
        focusedOne === undefined ||
        focusedTwo === undefined ||
        suppressedOne === undefined ||
        suppressedTwo === undefined ||
        [focusedTwo, suppressedOne, suppressedTwo].some((image) =>
          image.width !== focusedOne.width ||
          image.height !== focusedOne.height
        )
      ) {
        return {
          instability:
            "viewport locality screenshots could not be decoded consistently",
          outsideEnvelopeDevicePixels: 0,
        };
      }
      const scaleX = focusedOne.width / plan.clip.width;
      const scaleY = focusedOne.height / plan.clip.height;
      let outsideEnvelopeDevicePixels = 0;
      let unstableAttributionPixels = 0;
      for (let row = 0; row < focusedOne.height; row += 1) {
        const top = plan.clip.y + row / scaleY;
        const bottom = plan.clip.y + (row + 1) / scaleY;
        for (let column = 0; column < focusedOne.width; column += 1) {
          const offset = (row * focusedOne.width + column) * 4;
          const changed =
            focusedOne.data[offset] !== suppressedOne.data[offset] ||
            focusedOne.data[offset + 1] !== suppressedOne.data[offset + 1] ||
            focusedOne.data[offset + 2] !== suppressedOne.data[offset + 2] ||
            focusedOne.data[offset + 3] !== suppressedOne.data[offset + 3];
          if (!changed) continue;
          const focusedStable =
            focusedOne.data[offset] === focusedTwo.data[offset] &&
            focusedOne.data[offset + 1] === focusedTwo.data[offset + 1] &&
            focusedOne.data[offset + 2] === focusedTwo.data[offset + 2] &&
            focusedOne.data[offset + 3] === focusedTwo.data[offset + 3];
          const suppressedStable =
            suppressedOne.data[offset] === suppressedTwo.data[offset] &&
            suppressedOne.data[offset + 1] === suppressedTwo.data[offset + 1] &&
            suppressedOne.data[offset + 2] === suppressedTwo.data[offset + 2] &&
            suppressedOne.data[offset + 3] === suppressedTwo.data[offset + 3];
          const left = plan.clip.x + column / scaleX;
          const right = plan.clip.x + (column + 1) / scaleX;
          if (
            left < envelope.left ||
            right > envelope.right ||
            top < envelope.top ||
            bottom > envelope.bottom
          ) {
            if (focusedStable && suppressedStable) {
              outsideEnvelopeDevicePixels += 1;
            } else {
              unstableAttributionPixels += 1;
            }
          }
        }
      }
      const instability = unstableAttributionPixels > 0
        ? `viewport attribution changed state at ${unstableAttributionPixels} device pixels`
        : undefined;
      return { instability, outsideEnvelopeDevicePixels };
    },
    {
      envelope,
      focusedOneBytes: [...captures.focusedOne.bytes],
      focusedTwoBytes: [...captures.focusedTwo.bytes],
      plan: captures.plan,
      suppressedOneBytes: [...captures.suppressedOne.bytes],
      suppressedTwoBytes: [...captures.suppressedTwo.bytes],
    },
  );
}

function focusRenderedCoverage(
  plan: FocusSamplePlan | undefined,
  renderedDelta: FocusRenderedDelta | undefined,
): FocusRenderedCoverage {
  const required = plan === undefined
    ? undefined
    : renderedDelta?.requiredCssPixels;
  const measured = renderedDelta?.qualifyingCssPixels;
  return {
    measured,
    required,
    sufficient: measured !== undefined &&
      required !== undefined &&
      required > 0 &&
      renderedDelta?.stable === true &&
      renderedDelta.outsideEnvelopeDevicePixels === 0 &&
      measured >= required,
  };
}

async function focusFixtureOracle(
  target: Locator,
  kind: string,
): Promise<FocusFixtureOracle | undefined> {
  return await target.evaluate((node, {
    kind,
    minimumTargetSize,
    parentEdgeFactor,
    proxyDistanceFactor,
    proxySizeFactor,
  }) => {
    const siblingProxy = [
      "fixed-proxy",
      "generic-parent-proxy",
      "huge-sibling-proxy",
      "unmarked-far-label-proxy",
      "unmarked-wide-label-proxy",
      "inherited-far-label-proxy",
      "marked-far-label-proxy",
      "marked-wide-label-proxy",
      "proxy-speck-threshold",
      "candidate-sibling-removal",
      "shadow-root-radio-proxy",
    ].includes(kind);
    const parentProxy = [
      "huge-parent-proxy",
      "edge-parent-proxy",
      "local-parent-proxy",
    ].includes(kind);
    const candidate = siblingProxy
      ? node.nextElementSibling
      : parentProxy
      ? node.parentElement
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
    const contains = (outer: DOMRect, inner: DOMRect): boolean =>
      outer.left <= inner.left + 1 &&
      outer.top <= inner.top + 1 &&
      outer.right >= inner.right - 1 &&
      outer.bottom >= inner.bottom - 1;
    const overlaps = targetRect.left < current.right &&
      targetRect.right > current.left &&
      targetRect.top < current.bottom &&
      targetRect.bottom > current.top;
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
    const references = (element: Element, attribute: string): string[] =>
      (element.getAttribute(attribute) ?? "").trim().split(/\s+/).filter(
        Boolean,
      );
    const explicitlyRelated = (
      left: Element,
      right: Element,
    ): boolean =>
      [
        right.id !== "" &&
        references(left, "aria-controls").includes(right.id),
        right.id !== "" &&
        references(left, "aria-owns").includes(right.id),
        left.id !== "" &&
        references(right, "aria-controls").includes(left.id),
        left.id !== "" &&
        references(right, "aria-owns").includes(left.id),
      ].some(Boolean);
    const nativeLabelAssociated = candidate === node ||
      (parentProxy
        ? candidate instanceof HTMLLabelElement &&
          candidate.control === node
        : node.parentElement instanceof HTMLLabelElement &&
          node.parentElement.control === node);
    const semanticallyAssociated = nativeLabelAssociated ||
      explicitlyRelated(node, candidate);
    const controlScale = Math.max(
      minimumTargetSize,
      targetRect.width,
      targetRect.height,
    );
    const controlSized = current.width <= controlScale * proxySizeFactor &&
      current.height <= controlScale * proxySizeFactor;
    const distanceLocal = gap <= controlScale * proxyDistanceFactor;
    const authoredProxy = siblingProxy &&
      style.getPropertyValue("--discern-focus-proxy").trim() === "1" &&
      (
        candidate.parentElement === null ||
        getComputedStyle(candidate.parentElement).getPropertyValue(
            "--discern-focus-proxy",
          ).trim() !== "1"
      );
    const sharedAssociationContains = semanticallyAssociated &&
      parent !== undefined &&
      contains(parent, targetRect) &&
      contains(parent, current);
    const geometricallyAssociated = candidate === node
      ? true
      : parentProxy
      ? contains(current, targetRect) || overlaps
      : overlaps ||
        (
          sharedAssociationContains &&
          (authoredProxy || distanceLocal)
        );
    const parentEdgesLocal = !parentProxy ||
      Math.max(
          Math.abs(current.left - targetRect.left),
          Math.abs(current.top - targetRect.top),
          Math.abs(current.right - targetRect.right),
          Math.abs(current.bottom - targetRect.bottom),
        ) <= controlScale * parentEdgeFactor;
    const shadowColorPattern = /(?:rgba?|hsla?|oklab|oklch|color)\([^)]+\)/g;
    const shadowProof = kind !== "shadow-root-radio-proxy" &&
      (
        kind.includes("shadow") ||
        kind === "background-attribution-duplicate"
      );
    const underlineProof = kind.includes("underline");
    const shadowLayerSources: string[] | undefined = (() => {
      if (style.boxShadow === "none") return [];
      const layers: string[] = [];
      let depth = 0;
      let start = 0;
      for (
        let position = 0;
        position < style.boxShadow.length;
        position += 1
      ) {
        const character = style.boxShadow[position];
        if (character === "(") depth += 1;
        else if (character === ")") {
          depth -= 1;
          if (depth < 0) return undefined;
        } else if (character === "," && depth === 0) {
          layers.push(style.boxShadow.slice(start, position).trim());
          start = position + 1;
        }
      }
      if (depth !== 0) return undefined;
      layers.push(style.boxShadow.slice(start).trim());
      return layers.some((layer) => layer === "") ? undefined : layers;
    })();
    const parsedShadowLayers = shadowLayerSources?.flatMap((layer) => {
      const colors = layer.match(shadowColorPattern) ?? [];
      const lengths = (layer.replace(shadowColorPattern, "").match(
        /[+-]?(?:\d+(?:\.\d+)?|\.\d+)px/g,
      ) ?? []).map(Number.parseFloat);
      if (colors.length !== 1 || lengths.length < 2) return [];
      return [{
        blur: lengths[2] ?? 0,
        color: pixelColor(colors[0] ?? "transparent"),
        inset: layer.split(/\s+/).includes("inset"),
        spread: lengths[3] ?? 0,
        x: lengths[0] ?? 0,
        y: lengths[1] ?? 0,
      }];
    });
    const shadowLayers = parsedShadowLayers !== undefined &&
        parsedShadowLayers.length === shadowLayerSources?.length
      ? parsedShadowLayers
      : undefined;
    const shadowGeometry = shadowLayers?.[0];
    const underlinePresent = style.textDecorationLine.split(/\s+/).includes(
      "underline",
    );
    const underlineThickness = Number.parseFloat(
      style.textDecorationThickness,
    );
    const color = shadowProof
      ? shadowLayers?.[0]?.color ?? "rgba(0, 0, 0, 0)"
      : underlineProof
      ? pixelColor(style.textDecorationColor)
      : pixelColor(style.outlineColor);
    const paintPresent = shadowProof
      ? style.boxShadow !== "none" && (shadowLayers?.length ?? 0) > 0
      : underlineProof
      ? underlinePresent &&
        underlineThickness >= 2
      : style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) >= 2;
    return {
      authoredProxy,
      backgroundColor: pixelColor(style.backgroundColor),
      candidateHeight: current.height,
      candidateWidth: current.width,
      color,
      controlSized,
      distanceLocal,
      effectiveOpacity: Math.max(0, Math.min(1, effectiveOpacity)),
      filterKnown,
      filters,
      geometricallyAssociated,
      nativeLabelAssociated,
      outlineOffset: Number.parseFloat(style.outlineOffset),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      paintPresent,
      parentEdgesLocal,
      semanticallyAssociated,
      shadowGeometry,
      shadowLayers,
      targetHeight: targetRect.height,
      targetWidth: targetRect.width,
      underlinePresent,
      underlineThickness,
      visible: effectiveOpacity > 0 &&
        style.visibility === "visible" &&
        style.getPropertyValue("content-visibility") !== "hidden" &&
        candidate.getClientRects().length > 0,
    };
  }, {
    kind,
    minimumTargetSize: MINIMUM_TARGET_SIZE,
    parentEdgeFactor: PARENT_FOCUS_EDGE_FACTOR,
    proxyDistanceFactor: FOCUS_PROXY_DISTANCE_FACTOR,
    proxySizeFactor: FOCUS_PROXY_SIZE_FACTOR,
  });
}

async function blurActiveElement(page: Page): Promise<void> {
  await page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement !== null) {
      const nested = active?.shadowRoot?.activeElement;
      if (nested === undefined || nested === null) break;
      active = nested;
    }
    if (active instanceof HTMLElement) {
      active.blur();
    }
  });
}

interface FocusKeyboardHarness {
  readonly radioState: readonly {
    readonly checked: boolean;
    readonly id: string;
  }[];
  readonly targetId: string;
}

interface FocusInspectionHooks {
  readonly afterBlur?: () => Promise<void>;
  readonly afterFocus?: () => Promise<void>;
}

async function installFocusBracketInfrastructure(
  page: Page,
  target: Locator,
): Promise<void> {
  await page.evaluate(() => {
    if (
      document.querySelector("[data-discern-focus-bracket-style]") === null
    ) {
      const stability = document.createElement("style");
      stability.dataset.discernFocusBracketStyle = "";
      stability.textContent = "*,*::before,*::after{" +
        "animation:none!important;transition:none!important;" +
        "caret-color:transparent!important;scroll-behavior:auto!important;}";
      document.head.append(stability);
    }
    if (
      document.querySelector("[data-discern-focus-suppression-style]") === null
    ) {
      const suppression = document.createElement("style");
      suppression.dataset.discernFocusSuppressionStyle = "";
      document.head.append(suppression);
    }
  });
  await target.evaluate((node, {
    candidateAttribute,
    scrollAttribute,
    targetAttribute,
  }) => {
    const stableId = (): string =>
      crypto.randomUUID?.() ??
        `discern-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (node.getAttribute(targetAttribute) === null) {
      throw new Error(
        "Focus target identity was not prepared before bracket installation",
      );
    }
    const candidates = [node, node.nextElementSibling, node.parentElement]
      .filter((candidate): candidate is Element => candidate !== null);
    for (const candidate of candidates) {
      if (candidate.getAttribute(candidateAttribute) === null) {
        candidate.setAttribute(candidateAttribute, stableId());
      }
      let ancestor: Element | null = candidate;
      while (ancestor !== null) {
        if (
          ancestor instanceof HTMLElement &&
          ancestor.getAttribute(scrollAttribute) === null
        ) {
          ancestor.setAttribute(scrollAttribute, stableId());
        }
        ancestor = ancestor.parentElement ??
          (ancestor.getRootNode() instanceof ShadowRoot
            ? (ancestor.getRootNode() as ShadowRoot).host
            : null);
      }
    }
    const roots = new Set<Document | ShadowRoot>();
    for (const candidate of candidates) {
      const root = candidate?.getRootNode();
      if (root instanceof Document || root instanceof ShadowRoot) {
        roots.add(root);
      }
    }
    for (const root of roots) {
      if (root instanceof Document) continue;
      if (
        root.querySelector("[data-discern-focus-bracket-style]") === null
      ) {
        const stability = document.createElement("style");
        stability.dataset.discernFocusBracketStyle = "";
        stability.textContent = "*,*::before,*::after{" +
          "animation:none!important;transition:none!important;" +
          "caret-color:transparent!important;scroll-behavior:auto!important;}";
        root.append(stability);
      }
      if (
        root.querySelector("[data-discern-focus-suppression-style]") === null
      ) {
        const suppression = document.createElement("style");
        suppression.dataset.discernFocusSuppressionStyle = "";
        root.append(suppression);
      }
    }
  }, {
    candidateAttribute: FOCUS_CANDIDATE_ID_ATTRIBUTE,
    scrollAttribute: FOCUS_SCROLL_ID_ATTRIBUTE,
    targetAttribute: SEMANTIC_FOCUS_ID_ATTRIBUTE,
  });
}

async function prepareFocusKeyboardHarness(
  target: Locator,
): Promise<FocusKeyboardHarness> {
  return await target.evaluate((node) => {
    const stableId = (): string =>
      crypto.randomUUID?.() ??
        `discern-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let targetId = node.getAttribute("data-discern-semantic-focus-id");
    if (targetId === null) {
      targetId = stableId();
      node.setAttribute("data-discern-semantic-focus-id", targetId);
    }
    const tree = node.getRootNode();
    const radioGroup = node instanceof HTMLInputElement &&
        node.type === "radio" &&
        (tree instanceof Document || tree instanceof ShadowRoot)
      ? Array.from(
        tree.querySelectorAll<HTMLInputElement>("input[type='radio']"),
      ).filter((radio) =>
        !radio.disabled &&
        radio.name === node.name &&
        radio.form === node.form
      )
      : [];
    const sequentialPeer = radioGroup.find((radio) => radio.checked) ??
      radioGroup[0] ??
      node;
    const sentinel = document.createElement("span");
    sentinel.dataset.discernSemanticFocusSentinel = "";
    sentinel.dataset.discernSemanticFocusSentinelFor = targetId;
    sentinel.tabIndex = Math.max(0, sequentialPeer.tabIndex);
    sentinel.style.cssText =
      "position:fixed;inset:0 auto auto 0;inline-size:1px;block-size:1px;" +
      "overflow:hidden;opacity:0;pointer-events:none;z-index:-1;";
    sequentialPeer.before(sentinel);
    const radioState = radioGroup.map((radio) => {
      const id = radio.dataset.discernFocusRadioStateId ??
        crypto.randomUUID?.() ??
        `discern-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      radio.dataset.discernFocusRadioStateId = id;
      return { checked: radio.checked, id };
    });
    return { radioState, targetId };
  });
}

async function focusByKeyboard(
  page: Page,
  target: Locator,
  harness?: FocusKeyboardHarness,
): Promise<boolean> {
  const currentHarness = harness ?? await prepareFocusKeyboardHarness(target);
  const sentinel = page.locator(
    `[data-discern-semantic-focus-sentinel-for="${currentHarness.targetId}"]`,
  );
  await sentinel.focus();
  await page.keyboard.press("Tab");
  const targetFocused = async (): Promise<boolean> =>
    await target.evaluate((node) => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement !== null) {
        const nested = active?.shadowRoot?.activeElement;
        if (nested === undefined || nested === null) break;
        active = nested;
      }
      return active === node;
    });
  if (await targetFocused()) return true;
  const radioPeers = currentHarness.radioState.length;
  for (let index = 0; index < radioPeers; index += 1) {
    await page.keyboard.press("ArrowRight");
    if (await targetFocused()) return true;
  }
  return false;
}

async function restoreFocusKeyboardHarness(
  target: Locator,
  harness: FocusKeyboardHarness,
): Promise<void> {
  await target.evaluate((node, harness) => {
    const tree = node.getRootNode();
    for (const state of harness.radioState) {
      const radio = tree instanceof Document || tree instanceof ShadowRoot
        ? tree.querySelector<HTMLInputElement>(
          `[data-discern-focus-radio-state-id="${state.id}"]`,
        )
        : null;
      if (radio !== null) {
        radio.checked = state.checked;
        delete radio.dataset.discernFocusRadioStateId;
      }
    }
    if (tree instanceof Document || tree instanceof ShadowRoot) {
      tree.querySelector(
        `[data-discern-semantic-focus-sentinel-for="${harness.targetId}"]`,
      )?.remove();
    }
  }, harness);
}

async function setFocusCandidateSuppression(
  target: Locator,
  candidateId: string | undefined,
): Promise<void> {
  await target.evaluate((node, { attribute, candidateId }) => {
    type SuppressibleElement = Element & {
      __discernFocusInlineStyle?: string | null;
    };
    const candidates = [node, node.nextElementSibling, node.parentElement]
      .filter((candidate): candidate is Element => candidate !== null);
    const restoreInline = (candidate: SuppressibleElement): void => {
      const inlineStyle = candidate.__discernFocusInlineStyle;
      if (inlineStyle === undefined) return;
      if (inlineStyle === null) candidate.removeAttribute("style");
      else candidate.setAttribute("style", inlineStyle);
      delete candidate.__discernFocusInlineStyle;
    };
    for (const candidate of candidates) {
      restoreInline(candidate as SuppressibleElement);
    }
    const roots = new Set<Document | ShadowRoot>();
    for (const candidate of candidates) {
      const root = candidate.getRootNode();
      if (root instanceof Document || root instanceof ShadowRoot) {
        roots.add(root);
      }
    }
    const styles = [...roots].flatMap((root) => {
      const style = root.querySelector<HTMLStyleElement>(
        "[data-discern-focus-suppression-style]",
      );
      return style === null ? [] : [style];
    });
    for (const style of styles) style.textContent = "";
    if (
      candidateId === undefined ||
      !/^[a-zA-Z0-9_-]+$/.test(candidateId)
    ) {
      return;
    }
    const candidate = candidates.find((element) =>
      element.getAttribute(attribute) === candidateId
    );
    if (candidate === undefined) return;
    const root = candidate.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return;
    const style = root.querySelector<HTMLStyleElement>(
      "[data-discern-focus-suppression-style]",
    );
    if (style === null) return;
    const selector = `[${attribute}="${candidateId}"]`;
    style.textContent =
      `${selector}{outline:none!important;box-shadow:none!important;` +
      "text-decoration-line:none!important;}" +
      `${selector}::before,${selector}::after{visibility:hidden!important;` +
      "outline:none!important;box-shadow:none!important;" +
      "text-decoration-line:none!important;}";
    if (
      "style" in candidate &&
      candidate.style instanceof CSSStyleDeclaration
    ) {
      const suppressible = candidate as SuppressibleElement & {
        readonly style: CSSStyleDeclaration;
      };
      const computed = getComputedStyle(candidate);
      if (
        computed.outlineStyle !== "none" ||
        computed.boxShadow !== "none" ||
        computed.textDecorationLine.split(/\s+/).includes("underline")
      ) {
        suppressible.__discernFocusInlineStyle = candidate.getAttribute(
          "style",
        );
        suppressible.style.setProperty("outline", "none", "important");
        suppressible.style.setProperty("box-shadow", "none", "important");
        suppressible.style.setProperty(
          "text-decoration",
          "none",
          "important",
        );
      }
    }
  }, { attribute: FOCUS_CANDIDATE_ID_ATTRIBUTE, candidateId });
}

async function focusSceneCapture(
  page: Page,
  target: Locator,
  plan: FocusSamplePlan,
): Promise<FocusSceneCapture> {
  await settleFocusPaint(page);
  const styles = await focusStyles(target);
  const scene = await target.evaluate((node, {
    allowedCandidateIds,
    candidateAttribute,
    scrollAttribute,
    targetAttribute,
  }) => {
    const composedParent = (element: Element): Element | null =>
      element.parentElement ??
        (element.getRootNode() instanceof ShadowRoot
          ? (element.getRootNode() as ShadowRoot).host
          : null);
    const candidates = [node, node.nextElementSibling, node.parentElement]
      .filter((element): element is Element =>
        element !== null &&
        allowedCandidateIds.includes(
          element.getAttribute(candidateAttribute) ?? "",
        )
      );
    const scrolls = new Map<string, {
      readonly clientHeight: number;
      readonly clientWidth: number;
      readonly scrollHeight: number;
      readonly scrollLeft: number;
      readonly scrollTop: number;
      readonly scrollWidth: number;
    }>();
    for (const candidate of candidates) {
      let ancestor: Element | null = candidate;
      while (ancestor !== null) {
        if (ancestor instanceof HTMLElement) {
          const style = getComputedStyle(ancestor);
          const scrollable = /(auto|scroll|overlay)/.test(
            `${style.overflow} ${style.overflowX} ${style.overflowY}`,
          ) || ancestor.scrollHeight > ancestor.clientHeight ||
            ancestor.scrollWidth > ancestor.clientWidth;
          if (scrollable) {
            const id = ancestor.getAttribute(scrollAttribute);
            if (id === null) {
              throw new Error(
                "Focus scroll container was not marked before bracket measurement",
              );
            }
            scrolls.set(id, {
              clientHeight: ancestor.clientHeight,
              clientWidth: ancestor.clientWidth,
              scrollHeight: ancestor.scrollHeight,
              scrollLeft: ancestor.scrollLeft,
              scrollTop: ancestor.scrollTop,
              scrollWidth: ancestor.scrollWidth,
            });
          }
        }
        ancestor = composedParent(ancestor);
      }
    }
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement !== null) {
      const nested = active?.shadowRoot?.activeElement;
      if (nested === undefined || nested === null) break;
      active = nested;
    }
    return {
      activeTargetId: active?.getAttribute(targetAttribute) ?? undefined,
      scrolls: [...scrolls.entries()].toSorted(([left], [right]) =>
        left.localeCompare(right)
      ),
      viewport: {
        height: globalThis.innerHeight,
        scrollX: globalThis.scrollX,
        scrollY: globalThis.scrollY,
        width: globalThis.innerWidth,
      },
      candidateIds: candidates.map((candidate) =>
        candidate.getAttribute(candidateAttribute)
      ),
    };
  }, {
    allowedCandidateIds: plan.envelopes.map(({ candidateId }) => candidateId),
    candidateAttribute: FOCUS_CANDIDATE_ID_ATTRIBUTE,
    scrollAttribute: FOCUS_SCROLL_ID_ATTRIBUTE,
    targetAttribute: SEMANTIC_FOCUS_ID_ATTRIBUTE,
  });
  const geometryKey = JSON.stringify({
    candidates: styles.filter((style) =>
      plan.envelopes.some(({ candidateId }) =>
        candidateId === style.candidateId
      )
    ).map((style) => ({
      candidate: style.candidate,
      candidateId: style.candidateId,
      rect: style.rect,
    })),
    candidateIds: scene.candidateIds,
    scrolls: scene.scrolls,
    viewport: scene.viewport,
  });
  const candidateGeometryKey = JSON.stringify(
    styles.filter((style) =>
      plan.envelopes.some(({ candidateId }) =>
        candidateId === style.candidateId
      )
    ).map(({ candidateId, rect }) => ({ candidateId, rect })),
  );
  const bytes = await focusScreenshot(page, plan, {
    x: scene.viewport.scrollX,
    y: scene.viewport.scrollY,
  });
  return {
    activeTargetId: scene.activeTargetId,
    bytes,
    candidateGeometryKey,
    geometryKey,
    styles,
  };
}

async function inspectKeyboardFocus(
  page: Page,
  target: Locator,
  surfaceColor: string,
  hooks: FocusInspectionHooks = {},
): Promise<FocusInspection> {
  const harness = await prepareFocusKeyboardHarness(target);
  await installFocusBracketInfrastructure(page, target);
  let restoredRest: FocusSceneCapture | undefined;
  try {
    await target.scrollIntoViewIfNeeded();
    await blurActiveElement(page);
    if (hooks.afterBlur !== undefined) await hooks.afterBlur();
    await settleFocusPaint(page);
    const before = await focusStyles(target);
    const plan = await focusSamplePlan(page, before);
    if (plan === undefined) {
      return {
        after: before,
        before,
        failures: ["focus locality clip could not be established"],
        keyboardFocused: false,
        plan,
        renderedDelta: undefined,
      };
    }
    const plannedCandidateGeometryKey = JSON.stringify(
      plan.envelopes.map(({ candidateId, rect }) => ({ candidateId, rect })),
    );
    const inspectionFailures: string[] = [];
    const suppressed = new Map<
      string,
      readonly [FocusSceneCapture, FocusSceneCapture]
    >();
    const viewportSuppressed = new Map<
      string,
      FocusViewportLocalityCaptures
    >();
    const restOne = await focusSceneCapture(page, target, plan);
    const restTwo = await focusSceneCapture(page, target, plan);
    const keyboardFocused = await focusByKeyboard(page, target, harness);
    if (hooks.afterFocus !== undefined) await hooks.afterFocus();
    const focusedOne = await focusSceneCapture(page, target, plan);
    const focusedTwo = await focusSceneCapture(page, target, plan);
    const evidence = focusCandidateEvidence(
      restOne.styles,
      focusedOne.styles,
      surfaceColor,
      plan,
    );
    const viewportCandidates = evidence.filter((candidate) =>
      candidate.local && candidate.viewportLocality
    );
    const viewportPlan = viewportCandidates.length === 0
      ? undefined
      : await focusViewportPlan(page, plan);
    const viewportFocused = viewportPlan === undefined ? undefined : [
      await focusSceneCapture(page, target, viewportPlan),
      await focusSceneCapture(page, target, viewportPlan),
    ] as const;
    for (const candidate of evidence) {
      if (!candidate.local) {
        inspectionFailures.push(
          `${candidate.candidate}/${candidate.candidateId}: ${
            candidate.localityFailure ?? "non-local focus paint"
          }`,
        );
        continue;
      }
      await setFocusCandidateSuppression(target, candidate.candidateId);
      const suppressedOne = await focusSceneCapture(page, target, plan);
      const suppressedTwo = await focusSceneCapture(page, target, plan);
      suppressed.set(candidate.candidateId, [suppressedOne, suppressedTwo]);
      const suppressedStyle = suppressedOne.styles.find((style) =>
        style.candidateId === candidate.candidateId
      );
      const elementSuppressed = suppressedStyle !== undefined &&
        suppressedStyle.outlineStyle === "none" &&
        suppressedStyle.boxShadow === "none" &&
        !suppressedStyle.textDecorationLine.split(/\s+/).includes(
          "underline",
        );
      const pseudosSuppressed = suppressedStyle !== undefined &&
        candidate.pseudos.every((pseudo) =>
          suppressedStyle.pseudos.find((style) => style.pseudo === pseudo)
            ?.visibility === "hidden"
        );
      if (!elementSuppressed || !pseudosSuppressed) {
        inspectionFailures.push(
          `${candidate.candidate}/${candidate.candidateId}: eligible candidate paint could not be authoritatively suppressed`,
        );
      }
      if (
        candidate.viewportLocality &&
        viewportPlan !== undefined &&
        viewportFocused !== undefined
      ) {
        viewportSuppressed.set(candidate.candidateId, {
          focusedOne: viewportFocused[0],
          focusedTwo: viewportFocused[1],
          plan: viewportPlan,
          suppressedOne: await focusSceneCapture(page, target, viewportPlan),
          suppressedTwo: await focusSceneCapture(page, target, viewportPlan),
        });
      }
      await setFocusCandidateSuppression(target, undefined);
    }
    await blurActiveElement(page);
    if (hooks.afterBlur !== undefined) await hooks.afterBlur();
    await target.evaluate((node, radioState) => {
      const tree = node.getRootNode();
      for (const state of radioState) {
        const radio = tree instanceof Document || tree instanceof ShadowRoot
          ? tree.querySelector<HTMLInputElement>(
            `[data-discern-focus-radio-state-id="${state.id}"]`,
          )
          : null;
        if (radio !== null) radio.checked = state.checked;
      }
      if (document.activeElement === node && node instanceof HTMLElement) {
        node.blur();
      }
    }, harness.radioState);
    restoredRest = await focusSceneCapture(page, target, plan);
    const captures = [
      restOne,
      restTwo,
      focusedOne,
      focusedTwo,
      restoredRest,
      ...[...suppressed.values()].flat(),
    ];
    const geometry = new Set(captures.map(({ geometryKey }) => geometryKey));
    if (geometry.size !== 1) {
      inspectionFailures.push(
        "candidate identity, geometry, viewport, or scroll coordinates changed during the focus bracket",
      );
    }
    if (
      captures.some(({ candidateGeometryKey }) =>
        candidateGeometryKey !== plannedCandidateGeometryKey
      )
    ) {
      inspectionFailures.push(
        "a planned candidate changed stable identity or viewport-relative geometry during the focus bracket",
      );
    }
    if (
      focusedOne.activeTargetId !== harness.targetId ||
      focusedTwo.activeTargetId !== harness.targetId ||
      [...suppressed.values()].some(([one, two]) =>
        one.activeTargetId !== harness.targetId ||
        two.activeTargetId !== harness.targetId
      )
    ) {
      inspectionFailures.push(
        "the stable target did not retain keyboard focus through the focused bracket",
      );
    }
    const evidenceById = new Map(
      focusCandidateEvidence(
        restOne.styles,
        focusedOne.styles,
        surfaceColor,
        plan,
      ).map((candidate) => [candidate.candidateId, candidate] as const),
    );
    const witnesses: FocusRenderedDelta[] = [];
    for (const [candidateId, [one, two]] of suppressed) {
      const candidate = evidenceById.get(candidateId);
      if (candidate === undefined) continue;
      const measured = await measureFocusRenderedDelta(
        page,
        restOne,
        restTwo,
        focusedOne,
        focusedTwo,
        one,
        two,
        restoredRest,
        candidate,
        plan,
      );
      if (measured !== undefined) {
        const viewportCaptures = viewportSuppressed.get(candidateId);
        const viewportLocality = viewportCaptures === undefined
          ? undefined
          : await measureFocusViewportLocality(
            page,
            viewportCaptures,
            candidate.envelope,
          );
        const witness: FocusRenderedDelta = {
          ...measured,
          instability: measured.instability ??
            viewportLocality?.instability,
          outsideEnvelopeDevicePixels: Math.max(
            measured.outsideEnvelopeDevicePixels,
            viewportLocality?.outsideEnvelopeDevicePixels ?? 0,
          ),
          stable: measured.stable &&
            viewportLocality?.instability === undefined,
        };
        witnesses.push(witness);
        if (!witness.stable) {
          inspectionFailures.push(
            `${candidate.candidate}/${candidateId}: ${
              witness.instability ?? "rendered scene was unstable"
            }`,
          );
        }
        if (witness.outsideEnvelopeDevicePixels > 0) {
          inspectionFailures.push(
            `${candidate.candidate}/${candidateId}: suppressed candidate paint changed ${witness.outsideEnvelopeDevicePixels} device pixels outside its declared locality envelope`,
          );
        }
      }
    }
    const renderedDelta = witnesses.toSorted((left, right) => {
      const leftAccepted = left.stable &&
        left.qualifyingCssPixels >= left.requiredCssPixels;
      const rightAccepted = right.stable &&
        right.qualifyingCssPixels >= right.requiredCssPixels;
      return Number(rightAccepted) - Number(leftAccepted) ||
        right.qualifyingCssPixels - left.qualifyingCssPixels;
    })[0];
    return {
      after: focusedOne.styles,
      before: restOne.styles,
      failures: inspectionFailures,
      keyboardFocused,
      plan,
      renderedDelta,
    };
  } finally {
    await setFocusCandidateSuppression(target, undefined);
    await blurActiveElement(page);
    if (hooks.afterBlur !== undefined && restoredRest === undefined) {
      await hooks.afterBlur();
    }
    await restoreFocusKeyboardHarness(target, harness);
  }
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
    (
      {
        focusableSelector,
        surfaceSelector,
        surfaceTokens,
        targetAttribute,
      },
    ) => {
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
      const composedParent = (element: Element): Element | null =>
        element.parentElement ??
          (element.getRootNode() instanceof ShadowRoot
            ? (element.getRootNode() as ShadowRoot).host
            : null);
      const potentiallySequentialScrollable = (
        element: HTMLElement,
        style = getComputedStyle(element),
      ): boolean => {
        return style.overflowX === "auto" ||
          style.overflowX === "scroll" ||
          style.overflowY === "auto" ||
          style.overflowY === "scroll";
      };
      const allElements: HTMLElement[] = [];
      const collect = (scope: Document | Element | ShadowRoot): void => {
        for (const element of scope.querySelectorAll<HTMLElement>("*")) {
          if (!allElements.includes(element)) allElements.push(element);
          if (element.shadowRoot !== null) collect(element.shadowRoot);
        }
      };
      collect(document);
      const authoredCandidates = allElements.filter((element) =>
        element.matches(focusableSelector) ||
        potentiallySequentialScrollable(element)
      );
      const structuralPath = (element: Element): string => {
        const segments: string[] = [];
        let current: Element | null = element;
        while (current !== null && current !== root) {
          const parent: Element | null = current.parentElement;
          if (parent !== null) {
            const index = Array.from(parent.children).indexOf(current);
            segments.push(
              `${current.tagName.toLowerCase()}:${index}`,
            );
            current = parent;
            continue;
          }
          const nodeRoot = current.getRootNode();
          if (nodeRoot instanceof ShadowRoot) {
            const index = Array.from(nodeRoot.children).indexOf(current);
            segments.push(`${current.tagName.toLowerCase()}:${index}#shadow`);
            current = nodeRoot.host;
            continue;
          }
          break;
        }
        return segments.reverse().join("/");
      };
      const result: SemanticFocusTarget[] = [];
      for (const target of authoredCandidates) {
        let ancestor: Element | null = target;
        let semantic:
          | { readonly role: string; readonly color: string }
          | undefined;
        let surfaceColor = "";
        let fallbackSurfaceColor = "";
        ancestor = target;
        while (ancestor !== null) {
          const ancestorColor = getComputedStyle(ancestor).backgroundColor;
          if (
            fallbackSurfaceColor === "" &&
            ancestorColor !== "transparent" &&
            ancestorColor !== "rgba(0, 0, 0, 0)"
          ) {
            fallbackSurfaceColor = pixelColor(ancestorColor);
          }
          if (ancestor.matches(surfaceSelector)) {
            let painted: Element | null = target;
            while (painted !== null) {
              const color = getComputedStyle(painted).backgroundColor;
              const match = tokenColors.find((candidate) =>
                candidate.color === color
              );
              if (match !== undefined) {
                semantic = match;
                surfaceColor = pixelColor(color);
                break;
              }
              if (painted === ancestor) break;
              painted = composedParent(painted);
            }
            break;
          }
          ancestor = composedParent(ancestor);
        }
        const audited = semantic !== undefined;
        const role = semantic?.role ?? "outside-semantic-surface";
        const targetId = target.getAttribute(targetAttribute) ??
          crypto.randomUUID?.() ??
          `discern-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        target.setAttribute(targetAttribute, targetId);
        const proofKind = target.dataset.discernFocusProof ??
          target.dataset.discernFocusRoleProof ?? "";
        result.push({
          audited,
          proofKind,
          role,
          signature: JSON.stringify([
            structuralPath(target),
            target.tagName.toLowerCase(),
            target.getAttribute("type") ?? "",
            target.getAttribute("name") ?? "",
            proofKind,
          ]),
          surfaceColor: surfaceColor || fallbackSurfaceColor,
          targetId,
        });
      }
      return result;
    },
    {
      surfaceSelector: SURFACE_SELECTOR,
      focusableSelector: FOCUSABLE_SELECTOR,
      surfaceTokens,
      targetAttribute: SEMANTIC_FOCUS_ID_ATTRIBUTE,
    },
  );
}

async function installSemanticTargetRegistry(
  page: Page,
  targets: readonly SemanticFocusTarget[],
): Promise<void> {
  await page.evaluate(({ targetAttribute, targets }) => {
    const allElements = (): Element[] => {
      const result: Element[] = [];
      const collect = (scope: Document | Element | ShadowRoot): void => {
        for (const element of scope.querySelectorAll("*")) {
          result.push(element);
          if (element.shadowRoot !== null) collect(element.shadowRoot);
        }
      };
      collect(document);
      return result;
    };
    const elements = allElements();
    const records = targets.flatMap(({ signature, targetId }) => {
      const element = elements.find((candidate) =>
        candidate.getAttribute(targetAttribute) === targetId
      );
      return element === undefined ? [] : [{ element, signature, targetId }];
    });
    (globalThis as typeof globalThis & {
      __discernSemanticTargetRegistry?: typeof records;
    }).__discernSemanticTargetRegistry = records;
  }, {
    targetAttribute: SEMANTIC_FOCUS_ID_ATTRIBUTE,
    targets,
  });
}

async function semanticTargetRegistryFailures(
  page: Page,
  surfaceTokens: readonly SemanticSurfaceToken[],
  expectedUniverse: readonly SemanticFocusTarget[],
  expectedIdentities: readonly SemanticFocusTarget[],
): Promise<readonly string[]> {
  const current = await discoverSemanticTargets(page, surfaceTokens);
  const expectedSignatures = expectedUniverse.map(({ signature }) => signature)
    .toSorted();
  const currentSignatures = current.map(({ signature }) => signature)
    .toSorted();
  const failures: string[] = [];
  if (
    JSON.stringify(expectedSignatures) !== JSON.stringify(currentSignatures)
  ) {
    const expectedSet = new Set(expectedSignatures);
    const currentSet = new Set(currentSignatures);
    const removed = expectedSignatures.filter((signature) =>
      !currentSet.has(signature)
    );
    const added = currentSignatures.filter((signature) =>
      !expectedSet.has(signature)
    );
    failures.push(
      `the enrolled semantic focus universe changed (removed: ${
        removed.join(", ") || "none"
      }; added: ${added.join(", ") || "none"})`,
    );
  }
  const currentById = new Map(
    current.map((target) => [target.targetId, target] as const),
  );
  for (const target of expectedIdentities) {
    const currentTarget = currentById.get(target.targetId);
    if (currentTarget?.signature !== target.signature) {
      failures.push(
        `target ${target.signature} lost its stable marker or signature (current: ${
          currentTarget?.signature ?? "not enrolled"
        })`,
      );
    }
  }
  const identityFailures = await page.evaluate(({ targetAttribute }) => {
    const registry = (globalThis as typeof globalThis & {
      __discernSemanticTargetRegistry?: Array<{
        readonly element: Element;
        readonly signature: string;
        readonly targetId: string;
      }>;
    }).__discernSemanticTargetRegistry ?? [];
    const allElements: Element[] = [];
    const collect = (scope: Document | Element | ShadowRoot): void => {
      for (const element of scope.querySelectorAll("*")) {
        allElements.push(element);
        if (element.shadowRoot !== null) collect(element.shadowRoot);
      }
    };
    collect(document);
    return registry.flatMap(({ element, signature, targetId }) => {
      const marked = allElements.find((candidate) =>
        candidate.getAttribute(targetAttribute) === targetId
      );
      if (!element.isConnected) {
        return [`target ${signature} was disconnected`];
      }
      if (marked !== element) {
        return [`target ${signature} was replaced by a different Element`];
      }
      return [];
    });
  }, { targetAttribute: SEMANTIC_FOCUS_ID_ATTRIBUTE });
  failures.push(...identityFailures);
  return failures;
}

interface SequentialSemanticEnrollment {
  readonly complete: boolean;
  readonly order: readonly string[];
  readonly potentialUniverse: readonly string[];
  readonly unknownStops: readonly string[];
  readonly universe: readonly string[];
}

async function discoverSequentialSemanticTargets(
  page: Page,
  surfaceTokens: readonly SemanticSurfaceToken[],
): Promise<SequentialSemanticEnrollment> {
  const targets = await discoverSemanticTargets(page, surfaceTokens);
  const signatureById = new Map(
    targets.map(({ signature, targetId }) => [targetId, signature] as const),
  );
  const sentinelId = crypto.randomUUID();
  await page.evaluate((sentinelId) => {
    const sentinel = document.createElement("span");
    sentinel.dataset.discernSemanticEnrollmentSentinel = sentinelId;
    sentinel.tabIndex = 0;
    sentinel.style.cssText =
      "position:fixed;inset:0 auto auto 0;inline-size:1px;block-size:1px;" +
      "overflow:hidden;opacity:0;pointer-events:none;z-index:-1;";
    document.body.append(sentinel);
    sentinel.focus();
  }, sentinelId);
  const order: string[] = [];
  const enrolled = new Set<string>();
  const unknownStops = new Set<string>();
  let complete = false;
  const activeState = async (): Promise<{
    readonly description: string;
    readonly ignorable: boolean;
    readonly radioPeers: number;
    readonly sentinel: boolean;
    readonly targetId: string | undefined;
  }> =>
    await page.evaluate(({ sentinelId, targetAttribute }) => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement !== null) {
        const nested = active?.shadowRoot?.activeElement;
        if (nested === undefined || nested === null) break;
        active = nested;
      }
      const radioPeers = active instanceof HTMLInputElement &&
          active.type === "radio"
        ? (() => {
          const tree = active.getRootNode();
          return tree instanceof Document || tree instanceof ShadowRoot
            ? Array.from(
              tree.querySelectorAll<HTMLInputElement>("input[type='radio']"),
            ).filter((radio) =>
              !radio.disabled &&
              radio.name === active.name &&
              radio.form === active.form
            ).length
            : 0;
        })()
        : 0;
      return {
        description: active?.outerHTML.replace(/\s+/g, " ").slice(0, 180) ??
          "no active element",
        ignorable: active === null ||
          active === document.body ||
          active === document.documentElement,
        radioPeers,
        sentinel: active instanceof HTMLElement &&
          active.dataset.discernSemanticEnrollmentSentinel === sentinelId,
        targetId: active?.getAttribute(targetAttribute) ?? undefined,
      };
    }, {
      sentinelId,
      targetAttribute: SEMANTIC_FOCUS_ID_ATTRIBUTE,
    });
  const recordActive = (state: {
    readonly description: string;
    readonly ignorable: boolean;
    readonly targetId: string | undefined;
  }): void => {
    if (state.ignorable) return;
    if (state.targetId === undefined) {
      unknownStops.add(state.description);
      return;
    }
    if (enrolled.has(state.targetId)) return;
    const signature = signatureById.get(state.targetId);
    if (signature === undefined) {
      unknownStops.add(state.description);
      return;
    }
    enrolled.add(state.targetId);
    order.push(signature);
  };
  const maximumStops = Math.max(100, targets.length * 8);
  for (let stop = 0; stop < maximumStops; stop += 1) {
    await page.keyboard.press("Tab");
    const state = await activeState();
    if (state.sentinel) {
      complete = true;
      break;
    }
    recordActive(state);
    for (let peer = 1; peer <= state.radioPeers; peer += 1) {
      await page.keyboard.press("ArrowRight");
      recordActive(await activeState());
    }
  }
  await page.evaluate((sentinelId) => {
    document.querySelector(
      `[data-discern-semantic-enrollment-sentinel="${sentinelId}"]`,
    )?.remove();
  }, sentinelId);
  return {
    complete,
    order,
    potentialUniverse: targets.map(({ signature }) => signature).toSorted(),
    unknownStops: [...unknownStops],
    universe: order.toSorted(),
  };
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
  return await withViewport(page, WIDE_VIEWPORT, async () => {
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
            failures.push(
              `${id}: keyboard target did not match :focus-visible`,
            );
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
          failures.push(
            `${id}: command ${index + 1} has no single copy target`,
          );
          continue;
        }
        await copy.focus();
        await page.keyboard.press("Enter");
        const copied = await page.evaluate(() =>
          navigator.clipboard.readText()
        );
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
  });
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
  return await withViewport(page, NARROW_VIEWPORT, async () => {
    await loadPage(page, conformanceUrl(origin));
    const result = await page.evaluate(
      ({ surfaceSelector, interactiveSelector, minimumTargetSize }) => {
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
                    element.closest("p, li, dd, dt, figcaption")?.childNodes ??
                      []
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
            if (
              rect.width < minimumTargetSize ||
              rect.height < minimumTargetSize
            ) {
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
        minimumTargetSize: MINIMUM_TARGET_SIZE,
      },
    );
    failures.push(
      ...result.failures.map((failure) => `Target size: ${failure}`),
    );
    if (!result.futureProof) {
      failures.push(
        "Target size: synthetic future target escaped the detector",
      );
    }
    return result;
  });
}

async function reflowAt(
  page: Page,
  origin: string,
  viewport: { readonly width: number; readonly height: number },
  label: string,
  failures: string[],
): Promise<ReflowResult> {
  return await withViewport(page, viewport, async () => {
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
  });
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
  const fontCss = await Deno.readTextFile(fontCssUrl);
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
    const fontMetricAudit = auditFontMetricOverrides(
      fontCss,
      await fontMetricCssomSnapshot(page, fontCss),
    );
    failures.push(
      ...fontMetricAudit.failures.map((failure) =>
        `Font metric overrides: ${failure}`
      ),
    );
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

async function verifyFocusDeviceScaleInvariant(
  browser: Browser,
  origin: string,
  rawProofKinds: readonly string[],
): Promise<readonly string[]> {
  const measurements: Array<{
    readonly area: number;
    readonly deviceScale: number;
    readonly measuredScaleX: number;
    readonly measuredScaleY: number;
  }> = [];
  const failures: string[] = [];
  for (const deviceScale of [1, 2] as const) {
    const context = await browser.newContext({
      deviceScaleFactor: deviceScale,
      viewport: { height: 240, width: 320 },
    });
    try {
      const page = await context.newPage();
      await page.setContent(`
        <!doctype html>
        <style>
          html, body { background: rgb(255, 255, 255); margin: 0; }
          button {
            background: rgb(255, 255, 255);
            border: 0;
            box-shadow: none;
            height: 44.5px;
            left: 80.25px;
            outline: none;
            padding: 0;
            position: absolute;
            top: 80.25px;
            width: 44.5px;
          }
          button:focus-visible {
            box-shadow: 0 0 0 2px rgb(0, 0, 0);
          }
        </style>
        <button type="button" aria-label="Fractional focus raster proof"></button>
      `);
      const inspection = await inspectKeyboardFocus(
        page,
        page.locator("button"),
        "rgb(255, 255, 255)",
      );
      const rendered = inspection.renderedDelta;
      if (
        !inspection.keyboardFocused ||
        inspection.failures.length > 0 ||
        rendered === undefined ||
        !rendered.stable ||
        rendered.qualifyingCssPixels < rendered.requiredCssPixels
      ) {
        failures.push(
          `DPR ${deviceScale} fractional focus raster did not satisfy the production witness: keyboard=${inspection.keyboardFocused}, failures=${
            inspection.failures.join(", ") || "none"
          }, area=${rendered?.qualifyingCssPixels.toFixed(2) ?? "missing"}/${
            rendered?.requiredCssPixels.toFixed(2) ?? "missing"
          }, changed=${rendered?.changedDevicePixels ?? "missing"}, rest=${
            rendered?.maximumRestContrast.toFixed(2) ?? "missing"
          }:1, suppressed=${
            rendered?.maximumAdjacentContrast.toFixed(2) ?? "missing"
          }:1, scale=${
            rendered === undefined
              ? "missing"
              : `${rendered.scaleX.toFixed(2)}×${rendered.scaleY.toFixed(2)}`
          }`,
        );
        continue;
      }
      measurements.push({
        area: rendered.qualifyingCssPixels,
        deviceScale,
        measuredScaleX: rendered.scaleX,
        measuredScaleY: rendered.scaleY,
      });
    } finally {
      await context.close();
    }
  }
  const one = measurements.find(({ deviceScale }) => deviceScale === 1);
  const two = measurements.find(({ deviceScale }) => deviceScale === 2);
  if (
    one === undefined ||
    two === undefined ||
    Math.abs(one.measuredScaleX - 1) > 0.01 ||
    Math.abs(one.measuredScaleY - 1) > 0.01 ||
    Math.abs(two.measuredScaleX - 2) > 0.01 ||
    Math.abs(two.measuredScaleY - 2) > 0.01 ||
    Math.abs(one.area - two.area) > 2
  ) {
    failures.push(
      `fractional focus coverage was not device-scale invariant: DPR1=${
        one?.area.toFixed(2) ?? "missing"
      } CSS pixels, DPR2=${two?.area.toFixed(2) ?? "missing"} CSS pixels`,
    );
  }
  for (const deviceScale of [1, 2] as const) {
    const rawContext = await browser.newContext({
      deviceScaleFactor: deviceScale,
      reducedMotion: "reduce",
      viewport: WIDE_VIEWPORT,
    });
    try {
      const rawPage = await rawContext.newPage();
      const rawFailures: string[] = [];
      await verifySemanticFocus(
        browser,
        rawPage,
        origin,
        rawFailures,
        {
          auditProductionThemes: false,
          syntheticProofKinds: rawProofKinds,
        },
      );
      failures.push(
        ...rawFailures.map((failure) =>
          `isolated DPR ${deviceScale} raw raster: ${failure}`
        ),
      );
    } finally {
      await rawContext.close();
    }
  }
  return failures;
}

async function verifySemanticFocus(
  browser: Browser,
  page: Page,
  origin: string,
  failures: string[],
  scope: {
    readonly auditProductionThemes?: boolean;
    readonly syntheticProofKinds?: readonly string[];
  } = {},
): Promise<SemanticFocusResult> {
  requireViewport(page, WIDE_VIEWPORT, "Semantic focus verification");
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
  const auditedThemes = scope.auditProductionThemes === false
    ? []
    : ["light", "dark"] as const;
  for (const theme of auditedThemes) {
    await loadPage(page, conformanceUrl(origin, theme));
    await installSemanticRoleProbes(page, surfaceTokens);
    const sacrificial = await discoverSequentialSemanticTargets(
      page,
      surfaceTokens,
    );
    if (!sacrificial.complete) {
      currentFailures.push(
        `${theme}: sacrificial real-Tab enrollment did not return to its fixed sentinel`,
      );
    }
    if (sacrificial.unknownStops.length > 0) {
      currentFailures.push(
        `${theme}: real Tab reached focus stops outside the canonical enrollment universe: ${
          sacrificial.unknownStops.join(", ")
        }`,
      );
    }
    await loadPage(page, conformanceUrl(origin, theme));
    await installSemanticRoleProbes(page, surfaceTokens);
    const freshTargets = await discoverSemanticTargets(page, surfaceTokens);
    const freshUniverse = freshTargets.map(({ signature }) => signature)
      .toSorted();
    if (
      JSON.stringify(freshUniverse) !==
        JSON.stringify(sacrificial.potentialUniverse)
    ) {
      currentFailures.push(
        `${theme}: semantic focus universe changed between the sacrificial and fresh page loads`,
      );
    }
    const freshBySignature = new Map(
      freshTargets.map((target) => [target.signature, target] as const),
    );
    const orderedTargets = sacrificial.order.flatMap((signature) => {
      const target = freshBySignature.get(signature);
      return target === undefined ? [] : [target];
    });
    if (
      new Set(sacrificial.order).size !== sacrificial.universe.length ||
      orderedTargets.length !== sacrificial.order.length
    ) {
      currentFailures.push(
        `${theme}: the browser sequential-focus order did not account for every enrolled target and radio peer`,
      );
    }
    await installSemanticTargetRegistry(page, orderedTargets);
    const semanticTargets = orderedTargets.filter(({ audited }) => audited);
    const themeRoles = new Set<string>();
    for (const semanticTarget of semanticTargets) {
      const target = page.locator(
        `[${SEMANTIC_FOCUS_ID_ATTRIBUTE}="${semanticTarget.targetId}"]`,
      );
      if (await target.count() !== 1 || !await target.isVisible()) {
        currentFailures.push(
          `${theme}/${semanticTarget.role}: enrolled target is missing, duplicated, or no longer visible before its focus audit`,
        );
        continue;
      }
      const {
        after,
        before,
        failures: inspectionFailures,
        keyboardFocused,
        plan,
        renderedDelta,
      } = await inspectKeyboardFocus(
        page,
        target,
        semanticTarget.surfaceColor,
      );
      const renderedCoverage = focusRenderedCoverage(plan, renderedDelta);
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
      } else if (
        !renderedCoverage.sufficient || inspectionFailures.length > 0
      ) {
        currentFailures.push(
          `${theme}/${semanticTarget.role}: semantic-surface focus indicator has ${
            indicator.maxContrast.toFixed(2)
          }:1 modeled diagnostic contrast, ${
            renderedCoverage.measured?.toFixed(2) ?? "unmeasured"
          } CSS pixels witnessed at both 3:1 focus-vs-rest and 3:1 focus-vs-suppressed-candidate contrast; requires ${
            renderedCoverage.required?.toFixed(2) ?? "an available threshold"
          } CSS pixels for one stable associated candidate${
            inspectionFailures.length === 0
              ? ""
              : ` (${inspectionFailures.join(", ")})`
          }: ${await target.evaluate((node) =>
            node.outerHTML.replace(/\s+/g, " ").slice(0, 180)
          )}`,
        );
      }
      themeRoles.add(semanticTarget.role);
      coveredRoles.add(semanticTarget.role);
      targets += 1;
      const registryFailures = await semanticTargetRegistryFailures(
        page,
        surfaceTokens,
        freshTargets,
        orderedTargets,
      );
      currentFailures.push(
        ...registryFailures.map((failure) =>
          `${theme}/${semanticTarget.role}: ${failure}`
        ),
      );
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
  type ShadowProofLayer = {
    readonly blur: number;
    readonly inset: boolean;
    readonly spread: number;
    readonly x: number;
    readonly y: number;
  };
  type FocusDeviceScale = 1 | 2;
  type FocusRasterExpectation = {
    readonly changedDevicePixels: number;
    readonly maximumRestContrast: number;
    readonly qualifyingCssPixels: number;
  };
  type ShadowRenderedProof = {
    readonly afterLayers: readonly ShadowProofLayer[];
    readonly beforeLayers: readonly ShadowProofLayer[];
    readonly borderRadius: string;
    readonly expectedAccepted: boolean;
    readonly expectedRaster: Readonly<
      Record<FocusDeviceScale, FocusRasterExpectation>
    >;
    readonly expectedRequiredCssPixels: number;
    readonly height: number;
    readonly kind: string;
    readonly width: number;
  };
  const nearCollapsedShadowBaseProofs = [
    {
      baseSide: 0,
      expectedRaster: {
        1: {
          changedDevicePixels: 0,
          maximumRestContrast: 1,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 0,
          maximumRestContrast: 1,
          qualifyingCssPixels: 0,
        },
      },
      label: "collapsed-base",
    },
    {
      baseSide: 0.002,
      expectedRaster: {
        1: {
          changedDevicePixels: 0,
          maximumRestContrast: 1,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 0,
          maximumRestContrast: 1,
          qualifyingCssPixels: 0,
        },
      },
      label: "positive-base-1",
    },
    {
      baseSide: 0.02,
      expectedRaster: {
        1: {
          changedDevicePixels: 4,
          maximumRestContrast: 1.0089257904478435,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 4,
          maximumRestContrast: 1.0245258509127817,
          qualifyingCssPixels: 0,
        },
      },
      label: "positive-base-2",
    },
  ] as const;
  const shadowRenderedProofs = [
    ...nearCollapsedShadowBaseProofs.map(
      ({ baseSide, expectedRaster, label }) => ({
        afterLayers: [{
          blur: 0,
          inset: false,
          spread: (baseSide - 44) / 2,
          x: 24,
          y: 0,
        }],
        beforeLayers: [],
        borderRadius: "0",
        expectedAccepted: false,
        expectedRaster,
        expectedRequiredCssPixels: 88,
        height: 44,
        kind: `new-shadow-${label}-geometry`,
        width: 44,
      }),
    ),
    {
      afterLayers: [{
        blur: 0,
        inset: false,
        spread: 0,
        x: 2,
        y: 0,
      }],
      beforeLayers: [],
      borderRadius: "0",
      expectedAccepted: true,
      expectedRaster: {
        1: {
          changedDevicePixels: 88,
          maximumRestContrast: 14.7872786921595,
          qualifyingCssPixels: 88,
        },
        2: {
          changedDevicePixels: 352,
          maximumRestContrast: 14.7872786921595,
          qualifyingCssPixels: 88,
        },
      },
      expectedRequiredCssPixels: 88,
      height: 44,
      kind: "new-shadow-offset-geometry",
      width: 44,
    },
    {
      afterLayers: [{
        blur: 0.99,
        inset: false,
        spread: 0,
        x: 0,
        y: 0,
      }],
      beforeLayers: [],
      borderRadius: "0",
      expectedAccepted: false,
      expectedRaster: {
        1: {
          changedDevicePixels: 180,
          maximumRestContrast: 1.3709144265045325,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 1072,
          maximumRestContrast: 1.9216258801692638,
          qualifyingCssPixels: 0,
        },
      },
      expectedRequiredCssPixels: 88,
      height: 44,
      kind: "new-shadow-blurred-outset-geometry",
      width: 44,
    },
    {
      afterLayers: [{
        blur: 1.02,
        inset: true,
        spread: 0,
        x: 0,
        y: 0,
      }],
      beforeLayers: [],
      borderRadius: "0",
      expectedAccepted: false,
      expectedRaster: {
        1: {
          changedDevicePixels: 172,
          maximumRestContrast: 1.5497980121506556,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 1020,
          maximumRestContrast: 3.1993000874256312,
          qualifyingCssPixels: 1,
        },
      },
      expectedRequiredCssPixels: 88,
      height: 44,
      kind: "new-shadow-blurred-inset-geometry",
      width: 44,
    },
    {
      afterLayers: [{
        blur: 0,
        inset: false,
        spread: 0,
        x: 0.12,
        y: 0,
      }],
      beforeLayers: [],
      borderRadius: "0",
      expectedAccepted: false,
      expectedRaster: {
        1: {
          changedDevicePixels: 400,
          maximumRestContrast: 1.2695668023862239,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 800,
          maximumRestContrast: 1.6337760499447278,
          qualifyingCssPixels: 0,
        },
      },
      expectedRequiredCssPixels: 48,
      height: 400,
      kind: "new-shadow-tall-subpixel-geometry",
      width: 24,
    },
    {
      afterLayers: [{
        blur: 0,
        inset: false,
        spread: -17,
        x: 30,
        y: 0,
      }],
      beforeLayers: [],
      borderRadius: "50%",
      expectedAccepted: false,
      expectedRaster: {
        1: {
          changedDevicePixels: 88,
          maximumRestContrast: 14.7872786921595,
          qualifyingCssPixels: 80,
        },
        2: {
          changedDevicePixels: 332,
          maximumRestContrast: 14.7872786921595,
          qualifyingCssPixels: 79,
        },
      },
      expectedRequiredCssPixels: 88,
      height: 44,
      kind: "new-shadow-rounded-speck-geometry",
      width: 44,
    },
    {
      afterLayers: [
        { blur: 0, inset: false, spread: 2, x: 0, y: 0 },
        { blur: 0, inset: false, spread: 2, x: 0, y: 0 },
      ],
      beforeLayers: [
        { blur: 0, inset: false, spread: 2, x: 0, y: 0 },
      ],
      borderRadius: "0",
      expectedAccepted: false,
      expectedRaster: {
        1: {
          changedDevicePixels: 0,
          maximumRestContrast: 1,
          qualifyingCssPixels: 0,
        },
        2: {
          changedDevicePixels: 0,
          maximumRestContrast: 1,
          qualifyingCssPixels: 0,
        },
      },
      expectedRequiredCssPixels: 88,
      height: 44,
      kind: "shadow-opaque-duplicate-insertion-geometry",
      width: 44,
    },
    {
      afterLayers: [{
        blur: 0,
        inset: true,
        spread: -22,
        x: 24,
        y: 0,
      }],
      beforeLayers: [],
      borderRadius: "0",
      expectedAccepted: true,
      expectedRaster: {
        1: {
          changedDevicePixels: 88,
          maximumRestContrast: 14.7872786921595,
          qualifyingCssPixels: 88,
        },
        2: {
          changedDevicePixels: 352,
          maximumRestContrast: 14.7872786921595,
          qualifyingCssPixels: 88,
        },
      },
      expectedRequiredCssPixels: 88,
      height: 44,
      kind: "new-shadow-collapsed-inset-geometry",
      width: 44,
    },
  ] satisfies readonly ShadowRenderedProof[];
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
    "huge-parent-proxy",
    "edge-parent-proxy",
    "huge-sibling-proxy",
    "unmarked-far-label-proxy",
    "unmarked-wide-label-proxy",
    "inherited-far-label-proxy",
    "subtle-outline-color",
    "subtle-shadow-color",
    "subtle-underline-color",
    "outline-one-to-two-geometry",
    "subtle-outline-width-geometry",
    "subtle-outline-offset-geometry",
    "outline-style-only-geometry",
    "subtle-shadow-geometry",
    "shadow-layer-reorder-geometry",
    "shadow-duplicate-reorder-geometry",
    "shadow-inset-only-geometry",
    "shadow-outside-to-inset-background-geometry",
    "shadow-inset-to-outside-background-geometry",
    "new-shadow-zero-band-geometry",
    "new-shadow-zero-target-geometry",
    ...shadowRenderedProofs.filter(({ expectedAccepted }) => !expectedAccepted)
      .map(({ kind }) => kind),
    "subtle-underline-geometry",
    "background-attribution-duplicate",
    "surface-has-invisible-outline",
    "proxy-speck-threshold",
    "candidate-sibling-removal",
    "ticking-focused-child",
    "one-time-focus-mutation",
    "remote-pseudo-indicator",
    "remote-pseudo-scale",
    "remote-pseudo-translate",
    "remote-pseudo-shadow",
    "pseudo-layered-important",
    "transparent-in-flow-pseudo",
    "contenteditable-no-indicator",
    "iframe-no-indicator",
    "cross-target-replaces-next",
  ] as const;
  const positiveProofKinds = [
    "revealed-indicator",
    "local-parent-proxy",
    "marked-far-label-proxy",
    "marked-wide-label-proxy",
    "meaningful-outline-color",
    "meaningful-shadow-color",
    "meaningful-underline-color",
    "new-outline-geometry",
    "new-shadow-geometry",
    "new-shadow-spread-geometry",
    ...shadowRenderedProofs.filter(({ expectedAccepted }) => expectedAccepted)
      .map(({ kind }) => kind),
    "new-inset-shadow-geometry",
    "shadow-layer-insertion-geometry",
    "new-underline-geometry",
    "meaningful-outline-width-geometry",
    "meaningful-outline-offset-geometry",
    "meaningful-shadow-geometry",
    "meaningful-underline-geometry",
    "nested-scroll-indicator",
    "window-scroll-indicator",
    "pseudo-ring-indicator",
    "pseudo-border-style-ring",
    "radio-checked-before-target",
    "radio-checked-after-target",
    "shadow-root-radio-proxy",
    "inline-important-outline",
    "positive-tabindex-indicator",
    "aria-disabled-indicator",
    "underline-single-line-descent",
    "underline-multiline",
    "cross-target-victim",
  ] as const;
  const proofKinds = [...negativeProofKinds, ...positiveProofKinds] as const;
  const synthetic = await page.evaluate(
    (
      {
        proofKinds,
        shadowRenderedProofs,
        surfaceSelector,
        surfaceTokens,
      },
    ) => {
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
      const rawStage = document.createElement("div");
      rawStage.dataset.discernFocusRawStage = "";
      rawStage.setAttribute("data-discern-journey", "focus-raster-fixtures");
      rawStage.style.cssText =
        `position:absolute;left:100px;top:${
          Math.ceil(document.documentElement.scrollHeight) + 100
        }px;display:grid;gap:8px;inline-size:300px;` +
        `background:${
          getComputedStyle(root).getPropertyValue(accent.token).trim()
        };`;
      rawStage.style.setProperty(
        "--discern-color-ink",
        getComputedStyle(root).getPropertyValue("--discern-color-ink").trim(),
      );
      document.body.append(rawStage);
      const shadowValue = (
        layers: readonly ShadowProofLayer[],
        color: string,
      ): string =>
        layers.length === 0
          ? "none"
          : layers.map((layer) =>
            `${
              layer.inset ? "inset " : ""
            }${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${color}`
          ).join(", ");
      for (const kind of proofKinds) {
        const shadowRenderedProof = shadowRenderedProofs.find((proof) =>
          proof.kind === kind
        );
        const siblingProxy = [
          "fixed-proxy",
          "generic-parent-proxy",
          "huge-sibling-proxy",
          "unmarked-far-label-proxy",
          "unmarked-wide-label-proxy",
          "inherited-far-label-proxy",
          "marked-far-label-proxy",
          "marked-wide-label-proxy",
          "proxy-speck-threshold",
          "candidate-sibling-removal",
          "shadow-root-radio-proxy",
        ].includes(kind);
        const parentProxy = [
          "huge-parent-proxy",
          "edge-parent-proxy",
          "local-parent-proxy",
          "proxy-speck-threshold",
          "candidate-sibling-removal",
          "shadow-root-radio-proxy",
        ].includes(kind);
        const labelWrapper = [
          "fixed-proxy",
          "huge-sibling-proxy",
          "unmarked-far-label-proxy",
          "unmarked-wide-label-proxy",
          "inherited-far-label-proxy",
          "marked-far-label-proxy",
          "marked-wide-label-proxy",
          "edge-parent-proxy",
          "local-parent-proxy",
        ].includes(kind);
        const wrapper = labelWrapper
          ? document.createElement("label")
          : kind === "huge-parent-proxy"
          ? document.createElement("div")
          : document.createElement("span");
        wrapper.style.cssText = kind === "huge-parent-proxy"
          ? "display:flex;align-items:flex-start;inline-size:1000px;" +
            "block-size:500px;justify-self:start;"
          : kind === "edge-parent-proxy"
          ? "display:flex;align-items:flex-start;inline-size:240px;" +
            "block-size:60px;justify-self:start;"
          : kind === "local-parent-proxy"
          ? "display:inline-flex;padding:8px;justify-self:start;"
          : kind === "huge-sibling-proxy"
          ? "display:flex;align-items:flex-start;gap:10px;inline-size:1054px;" +
            "block-size:510px;justify-self:start;"
          : kind.endsWith("-far-label-proxy")
          ? "display:flex;align-items:flex-start;justify-content:space-between;" +
            "inline-size:600px;min-block-size:44px;justify-self:start;"
          : kind.endsWith("-wide-label-proxy")
          ? "display:inline-flex;align-items:flex-start;gap:10px;" +
            "justify-self:start;"
          : kind === "generic-parent-proxy"
          ? "display:flex;justify-content:space-between;inline-size:100%;" +
            "min-block-size:44px;"
          : kind === "surface-has-invisible-outline"
          ? "display:inline-block;padding:8px;background:white;" +
            "position:relative;justify-self:start;"
          : kind === "nested-scroll-indicator"
          ? "display:block;inline-size:72px;block-size:56px;overflow:auto;" +
            "justify-self:start;"
          : kind === "window-scroll-indicator"
          ? "display:inline-block;margin-block-start:1200px;" +
            "position:relative;justify-self:start;"
          : "display:inline-block;position:relative;justify-self:start;";
        if (kind === "inherited-far-label-proxy") {
          wrapper.style.setProperty("--discern-focus-proxy", "1");
        }
        wrapper.dataset.discernFocusProofWrapper = kind;
        const target = kind === "contenteditable-no-indicator"
          ? document.createElement("div")
          : kind === "iframe-no-indicator"
          ? document.createElement("iframe")
          : labelWrapper ||
              kind === "radio-checked-before-target" ||
              kind === "radio-checked-after-target" ||
              kind === "shadow-root-radio-proxy"
          ? document.createElement("input")
          : document.createElement("button");
        if (target instanceof HTMLInputElement) target.type = "checkbox";
        if (target instanceof HTMLButtonElement) target.type = "button";
        if (kind === "contenteditable-no-indicator") {
          target.contentEditable = "true";
          target.textContent = "Editable future focus proof";
        }
        if (target instanceof HTMLIFrameElement) {
          target.srcdoc = "<!doctype html><title>Future frame</title>";
          target.title = "Future frame focus proof";
        }
        if (
          target instanceof HTMLInputElement &&
          (
            kind === "radio-checked-before-target" ||
            kind === "radio-checked-after-target" ||
            kind === "shadow-root-radio-proxy"
          )
        ) {
          target.type = "radio";
          target.name = `future-${kind}`;
        }
        target.dataset.discernFocusProof = kind;
        if (kind === "positive-tabindex-indicator") target.tabIndex = 5;
        if (kind === "aria-disabled-indicator") {
          target.setAttribute("aria-disabled", "true");
        }
        if (target instanceof HTMLButtonElement) {
          if (shadowRenderedProof === undefined) {
            target.textContent = `Future ${kind} action`;
          } else {
            target.setAttribute("aria-label", `Future ${kind} action`);
          }
        }
        const targetWidth = kind === "proxy-speck-threshold"
          ? 1
          : kind === "underline-single-line-descent"
          ? 120
          : kind === "underline-multiline"
          ? 100
          : shadowRenderedProof?.width ?? 44;
        const targetHeight = kind === "proxy-speck-threshold"
          ? 1
          : kind === "underline-multiline"
          ? 60
          : shadowRenderedProof?.height ?? 44;
        target.style.cssText = `min-inline-size:${targetWidth}px;` +
          `min-block-size:${targetHeight}px;background:transparent;` +
          `inline-size:${targetWidth}px;block-size:${targetHeight}px;` +
          "overflow:hidden;" +
          "border:0;box-shadow:none;outline:none;text-decoration:none;";
        if (target instanceof HTMLInputElement) {
          target.style.cssText +=
            `appearance:none;inline-size:${targetWidth}px;` +
            `block-size:${targetHeight}px;margin:0;`;
        }
        if (shadowRenderedProof !== undefined) {
          wrapper.style.cssText =
            `display:block;inline-size:${targetWidth}px;` +
            `block-size:${targetHeight}px;margin-inline-start:100px;` +
            "position:relative;";
          target.style.borderRadius = shadowRenderedProof.borderRadius;
          target.style.boxShadow = shadowValue(
            shadowRenderedProof.beforeLayers,
            "var(--discern-color-ink)",
          );
        }
        if (kind === "background-attribution-duplicate") {
          target.style.backgroundColor = "rgb(0, 0, 0)";
          target.style.boxShadow = "0 0 0 3px rgb(0, 0, 0)";
        }
        if (kind === "underline-single-line-descent") {
          target.textContent = "gyp focus descent";
        } else if (kind === "underline-multiline") {
          target.textContent = "multiline focus underline wraps";
          target.style.whiteSpace = "normal";
        }
        if (
          [
            "pseudo-ring-indicator",
            "pseudo-border-style-ring",
            "remote-pseudo-indicator",
            "remote-pseudo-scale",
            "remote-pseudo-translate",
            "remote-pseudo-shadow",
            "pseudo-layered-important",
            "transparent-in-flow-pseudo",
          ].includes(kind)
        ) {
          target.style.overflow = "visible";
          target.style.position = "relative";
        }
        if (
          kind === "shadow-outside-to-inset-background-geometry" ||
          kind === "shadow-inset-to-outside-background-geometry"
        ) {
          target.style.backgroundColor = "rgb(0, 0, 0)";
        }
        if (kind === "new-shadow-zero-target-geometry") {
          target.style.cssText +=
            "min-inline-size:0;min-block-size:0;inline-size:0;" +
            "block-size:0;padding:0;margin:0;";
        }
        if (
          kind === "subtle-opacity" ||
          kind === "subtle-filter-opacity" ||
          kind === "revealed-indicator"
        ) {
          target.style.outline = "2px solid var(--discern-color-ink)";
          target.style.outlineOffset = "2px";
        }
        if (
          kind === "subtle-outline-color" ||
          kind === "meaningful-outline-color"
        ) {
          target.style.outlineColor = `${
            kind === "subtle-outline-color"
              ? "rgb(0, 0, 0)"
              : `var(${accent.token})`
          }`;
          target.style.outlineStyle = "solid";
          target.style.outlineWidth = "2px";
          target.style.outlineOffset = "2px";
        }
        if (
          kind === "subtle-shadow-color" ||
          kind === "meaningful-shadow-color"
        ) {
          target.style.boxShadow = `0 0 0 3px ${
            kind === "subtle-shadow-color"
              ? "rgb(0, 0, 0)"
              : `var(${accent.token})`
          }`;
        }
        if (
          kind === "subtle-underline-color" ||
          kind === "meaningful-underline-color"
        ) {
          target.style.textDecorationLine = "underline";
          target.style.textDecorationThickness = "3px";
          target.style.textDecorationColor = kind === "subtle-underline-color"
            ? "rgb(0, 0, 0)"
            : `var(${accent.token})`;
        }
        if (
          [
            "subtle-outline-width-geometry",
            "subtle-outline-offset-geometry",
            "outline-one-to-two-geometry",
            "outline-style-only-geometry",
            "meaningful-outline-width-geometry",
            "meaningful-outline-offset-geometry",
          ].includes(kind)
        ) {
          target.style.outlineColor = "var(--discern-color-ink)";
          target.style.outlineStyle = kind === "outline-style-only-geometry"
            ? "dashed"
            : "solid";
          target.style.outlineWidth = kind === "outline-one-to-two-geometry"
            ? "1px"
            : "2px";
          target.style.outlineOffset = "2px";
        }
        if (
          [
            "subtle-shadow-geometry",
            "shadow-layer-reorder-geometry",
            "shadow-duplicate-reorder-geometry",
            "shadow-layer-insertion-geometry",
            "shadow-inset-only-geometry",
            "meaningful-shadow-geometry",
          ].includes(kind)
        ) {
          target.style.boxShadow = kind === "shadow-layer-reorder-geometry"
            ? "0 0 0 3px var(--discern-color-ink), 0 0 0 6px rgb(0, 0, 0)"
            : kind === "shadow-duplicate-reorder-geometry"
            ? "0 0 0 3px var(--discern-color-ink), 0 0 0 6px var(--discern-color-ink)"
            : kind === "shadow-layer-insertion-geometry"
            ? "0 0 0 3px rgb(0, 0, 0)"
            : "0 0 0 3px var(--discern-color-ink)";
        }
        if (kind === "shadow-outside-to-inset-background-geometry") {
          target.style.boxShadow = "0 0 0 3px rgba(255, 255, 255, 0.5)";
        } else if (kind === "shadow-inset-to-outside-background-geometry") {
          target.style.boxShadow = "inset 0 0 0 3px rgba(0, 0, 0, 0.5)";
        }
        if (
          [
            "subtle-underline-geometry",
            "meaningful-underline-geometry",
          ].includes(kind)
        ) {
          target.style.textDecorationLine = "underline";
          target.style.textDecorationThickness = "2px";
          target.style.textDecorationColor = "var(--discern-color-ink)";
        }
        if (kind === "revealed-indicator") target.style.opacity = "0";
        const proxy = siblingProxy ? document.createElement("span") : undefined;
        if (proxy !== undefined) {
          proxy.dataset.discernFocusProxy = kind;
          proxy.style.cssText = kind === "fixed-proxy"
            ? "position:fixed;inset:8px auto auto 8px;inline-size:44px;" +
              "block-size:44px;"
            : kind === "huge-sibling-proxy"
            ? "display:block;inline-size:1000px;block-size:500px;"
            : kind.endsWith("-wide-label-proxy")
            ? "display:block;inline-size:200px;block-size:44px;"
            : kind === "proxy-speck-threshold"
            ? "display:block;position:relative;inline-size:44px;block-size:22px;"
            : "display:block;inline-size:44px;block-size:44px;";
          if (
            kind.startsWith("marked-") ||
            kind === "proxy-speck-threshold" ||
            kind === "candidate-sibling-removal" ||
            kind === "shadow-root-radio-proxy"
          ) {
            proxy.style.setProperty("--discern-focus-proxy", "1");
          }
        }
        if (kind === "nested-scroll-indicator") {
          const middle = document.createElement("div");
          middle.style.cssText =
            "inline-size:120px;block-size:96px;overflow:auto;padding:12px;";
          const inner = document.createElement("div");
          inner.style.cssText =
            "inline-size:96px;block-size:80px;padding:12px;";
          inner.append(target);
          middle.append(inner);
          wrapper.append(middle);
        } else if (
          kind === "radio-checked-before-target" ||
          kind === "radio-checked-after-target"
        ) {
          const peer = document.createElement("input");
          peer.type = "radio";
          peer.name = `future-${kind}`;
          peer.checked = true;
          peer.setAttribute("aria-label", `${kind} checked peer`);
          peer.style.cssText =
            "inline-size:20px;block-size:20px;margin:0;appearance:none;";
          if (kind === "radio-checked-before-target") {
            wrapper.append(peer, target);
          } else {
            wrapper.append(target, peer);
          }
        } else if (kind === "shadow-root-radio-proxy") {
          const host = document.createElement("span");
          host.style.display = "inline-block";
          const shadow = host.attachShadow({ mode: "open" });
          const group = document.createElement("span");
          group.style.cssText =
            "display:inline-flex;gap:4px;align-items:center;";
          const peer = document.createElement("input");
          peer.type = "radio";
          peer.name = `future-${kind}`;
          peer.checked = true;
          peer.setAttribute("aria-label", `${kind} checked peer`);
          peer.style.cssText =
            "inline-size:20px;block-size:20px;margin:0;appearance:none;";
          if (proxy !== undefined) {
            proxy.id = `proxy-${
              crypto.randomUUID?.() ??
                `discern-${Date.now()}-${Math.random().toString(36).slice(2)}`
            }`;
            target.setAttribute("aria-controls", proxy.id);
            group.append(peer, target, proxy);
          } else {
            group.append(peer, target);
          }
          shadow.append(group);
          wrapper.append(host);
        } else {
          wrapper.append(target);
          if (proxy !== undefined) wrapper.append(proxy);
        }
        if (parentProxy) wrapper.dataset.discernFocusProxy = kind;
        if (shadowRenderedProof === undefined) {
          futureSurface.append(wrapper);
        } else {
          rawStage.append(wrapper);
        }
      }
      const proofStyles = document.createElement("style");
      proofStyles.dataset.discernFocusProofStyles = "";
      proofStyles.textContent = `
        [data-discern-focus-proof-wrapper="surface-has-invisible-outline"]:has(
          [data-discern-focus-proof="surface-has-invisible-outline"]:focus-visible
        ) { background: rgb(0, 0, 0) !important; }
        [data-discern-focus-proof="surface-has-invisible-outline"]:focus-visible {
          outline: 2px solid rgb(0, 0, 0) !important;
          outline-offset: 2px !important;
        }
        [data-discern-focus-proof-wrapper="proxy-speck-threshold"]:has(
          [data-discern-focus-proof="proxy-speck-threshold"]:focus-visible
        ) > [data-discern-focus-proxy="proxy-speck-threshold"]::after {
          background: rgb(0, 0, 0);
          content: "";
          height: 2px;
          position: absolute;
          right: -2px;
          top: 10px;
          width: 2px;
        }
        [data-discern-focus-proof="pseudo-ring-indicator"]:focus-visible::after,
        [data-discern-focus-proof="pseudo-layered-important"]:focus-visible::after {
          box-shadow: 0 0 0 2px rgb(0, 0, 0);
          content: "";
          inset: 0;
          position: absolute;
        }
        [data-discern-focus-proof="pseudo-border-style-ring"]::after {
          border: 2px none rgb(0, 0, 0);
          content: "";
          inset: -2px;
          position: absolute;
        }
        [data-discern-focus-proof="pseudo-border-style-ring"]:focus-visible::after {
          border-style: solid;
        }
        [data-discern-focus-proof="remote-pseudo-indicator"]:focus-visible::after {
          background: rgb(0, 0, 0);
          content: "";
          height: 44px;
          left: 0;
          position: fixed;
          top: 0;
          width: 44px;
        }
        [data-discern-focus-proof="remote-pseudo-scale"]:focus-visible::after {
          background: rgb(0, 0, 0);
          content: "";
          height: 2px;
          inset: 0;
          position: absolute;
          scale: 100;
          width: 2px;
        }
        [data-discern-focus-proof="remote-pseudo-translate"]:focus-visible::after {
          background: rgb(0, 0, 0);
          content: "";
          height: 8px;
          inset: 0;
          position: absolute;
          translate: 1000px 0;
          width: 8px;
        }
        [data-discern-focus-proof="remote-pseudo-shadow"]:focus-visible::after {
          box-shadow: 1000px 0 0 0 rgb(0, 0, 0);
          content: "";
          height: 8px;
          inset: 0;
          position: absolute;
          width: 8px;
        }
        [data-discern-focus-proof="transparent-in-flow-pseudo"]:focus-visible::before {
          color: transparent;
          content: "layout only";
          display: inline;
        }
      `;
      futureSurface.prepend(proofStyles);
      const layeredStyles = document.createElement("style");
      layeredStyles.textContent = `
        @layer future-focus-lock {
          [data-discern-focus-proof="pseudo-layered-important"]:focus-visible::after {
            visibility: visible !important;
          }
        }
      `;
      futureSurface.prepend(layeredStyles);
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
      shadowRenderedProofs,
      surfaceSelector: SURFACE_SELECTOR,
      surfaceTokens,
    },
  );
  const syntheticFailures: string[] = [];
  if (!synthetic.ready) {
    syntheticFailures.push("fixture could not be installed");
  }
  if (synthetic.ready) {
    const discoveredTargets = await discoverSemanticTargets(
      page,
      surfaceTokens,
    );
    const sequentialProof = await discoverSequentialSemanticTargets(
      page,
      surfaceTokens,
    );
    if (
      !sequentialProof.complete ||
      sequentialProof.unknownStops.length > 0 ||
      new Set(sequentialProof.order).size !== sequentialProof.universe.length
    ) {
      syntheticFailures.push(
        `synthetic real-Tab enrollment was incomplete or reached unknown stops: ${
          sequentialProof.unknownStops.join(", ") || "no unknown stop"
        }`,
      );
    }
    const discoveredBySignature = new Map(
      discoveredTargets.map((target) => [target.signature, target] as const),
    );
    const enrolledTargets = sequentialProof.order.flatMap((signature) => {
      const target = discoveredBySignature.get(signature);
      return target === undefined ? [] : [target];
    });
    if (enrolledTargets.length !== sequentialProof.order.length) {
      syntheticFailures.push(
        "synthetic real-Tab enrollment could not remap every target identity",
      );
    }
    await installSemanticTargetRegistry(page, enrolledTargets);
    const discoveredProofs = new Set(
      discoveredTargets.map(({ proofKind }) => proofKind).filter(Boolean),
    );
    const auditedProofKinds = scope.syntheticProofKinds === undefined
      ? proofKinds
      : proofKinds.filter((kind) => scope.syntheticProofKinds?.includes(kind));
    for (const kind of proofKinds) {
      if (!discoveredProofs.has(kind)) {
        syntheticFailures.push(`${kind} target did not auto-enrol`);
      }
    }
    type InlineStyleSnapshot = readonly (
      | string
      | null
      | false
    )[];
    const inlineStyleSnapshot = async (
      target: Locator,
    ): Promise<InlineStyleSnapshot> =>
      await target.evaluate((node) =>
        [node, node.parentElement, node.nextElementSibling].map((element) =>
          element instanceof HTMLElement ? element.getAttribute("style") : false
        )
      );
    const restoreInlineStyles = async (
      target: Locator,
      snapshot: InlineStyleSnapshot,
    ): Promise<void> => {
      await target.evaluate((node, snapshot) => {
        const elements = [node, node.parentElement, node.nextElementSibling];
        for (const [index, value] of snapshot.entries()) {
          const element = elements[index];
          if (!(element instanceof HTMLElement) || value === false) continue;
          if (value === null) {
            element.removeAttribute("style");
          } else {
            element.setAttribute("style", value);
          }
        }
      }, snapshot);
    };
    for (const kind of auditedProofKinds) {
      const target = page.locator(`[data-discern-focus-proof="${kind}"]`);
      await installFocusBracketInfrastructure(page, target);
      await target.scrollIntoViewIfNeeded();
      const windowScrollOffset = await page.evaluate(() => globalThis.scrollY);
      await blurActiveElement(page);
      await settleFocusPaint(page);
      const before = await focusStyles(target);
      const oracleBefore = await focusFixtureOracle(target, kind);
      const beforeInlineStyles = await inlineStyleSnapshot(target);
      const shadowRenderedProof = shadowRenderedProofs.find((proof) =>
        proof.kind === kind
      );
      await target.evaluate(
        async (node, { kind, shadowRenderedProof, surfaceColor }) => {
          const siblingProxy = [
            "fixed-proxy",
            "generic-parent-proxy",
            "huge-sibling-proxy",
            "unmarked-far-label-proxy",
            "unmarked-wide-label-proxy",
            "inherited-far-label-proxy",
            "marked-far-label-proxy",
            "marked-wide-label-proxy",
            "proxy-speck-threshold",
            "candidate-sibling-removal",
            "shadow-root-radio-proxy",
          ].includes(kind);
          const parentProxy = [
            "huge-parent-proxy",
            "edge-parent-proxy",
            "local-parent-proxy",
          ].includes(kind);
          const paint = siblingProxy
            ? node.nextElementSibling
            : parentProxy
            ? node.parentElement
            : node;
          if (!(paint instanceof HTMLElement)) return;
          const subtleColor = [
            "subtle-outline-color",
            "subtle-shadow-color",
            "subtle-underline-color",
          ].includes(kind);
          const paintColor = kind === "transparent"
            ? "transparent"
            : kind === "same-colour"
            ? surfaceColor
            : subtleColor
            ? "rgb(1, 1, 1)"
            : "var(--discern-color-ink)";
          const cssDriven = [
            "surface-has-invisible-outline",
            "proxy-speck-threshold",
            "pseudo-ring-indicator",
            "pseudo-border-style-ring",
            "remote-pseudo-indicator",
            "remote-pseudo-scale",
            "remote-pseudo-translate",
            "remote-pseudo-shadow",
            "pseudo-layered-important",
            "transparent-in-flow-pseudo",
            "contenteditable-no-indicator",
            "iframe-no-indicator",
          ].includes(kind);
          const shadowValue = (
            layers: readonly ShadowProofLayer[],
          ): string =>
            layers.map((layer) =>
              `${
                layer.inset ? "inset " : ""
              }${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${paintColor}`
            ).join(", ");
          if (cssDriven) {
            // These fixtures exercise authored focus selectors and pseudos.
          } else if (kind === "background-attribution-duplicate") {
            paint.style.setProperty(
              "box-shadow",
              "0 0 0 3px rgb(0, 0, 0), 0 0 0 3px rgb(0, 0, 0)",
              "important",
            );
            paint.style.setProperty(
              "background-color",
              "rgb(255, 255, 255)",
              "important",
            );
          } else if (
            kind === "outline-one-to-two-geometry" ||
            kind === "subtle-outline-width-geometry" ||
            kind === "meaningful-outline-width-geometry"
          ) {
            paint.style.setProperty(
              "outline-width",
              kind === "outline-one-to-two-geometry"
                ? "2px"
                : kind === "subtle-outline-width-geometry"
                ? "3px"
                : "4px",
              "important",
            );
          } else if (
            kind === "subtle-outline-offset-geometry" ||
            kind === "meaningful-outline-offset-geometry"
          ) {
            paint.style.setProperty(
              "outline-offset",
              kind === "subtle-outline-offset-geometry" ? "3px" : "4px",
              "important",
            );
          } else if (kind === "outline-style-only-geometry") {
            paint.style.setProperty("outline-style", "solid", "important");
          } else if (
            kind === "subtle-shadow-geometry" ||
            kind === "meaningful-shadow-geometry"
          ) {
            paint.style.setProperty(
              "box-shadow",
              `0 0 0 ${
                kind === "subtle-shadow-geometry" ? "3.02px" : "5px"
              } ${paintColor}`,
              "important",
            );
          } else if (kind === "shadow-layer-reorder-geometry") {
            paint.style.setProperty(
              "box-shadow",
              "0 0 0 6px rgb(0, 0, 0), 0 0 0 3px var(--discern-color-ink)",
              "important",
            );
          } else if (kind === "shadow-duplicate-reorder-geometry") {
            paint.style.setProperty(
              "box-shadow",
              "0 0 0 6px var(--discern-color-ink), 0 0 0 3px var(--discern-color-ink)",
              "important",
            );
          } else if (kind === "shadow-layer-insertion-geometry") {
            paint.style.setProperty(
              "box-shadow",
              "0 0 0 3px rgb(0, 0, 0), 0 0 0 6px var(--discern-color-ink)",
              "important",
            );
          } else if (kind === "shadow-inset-only-geometry") {
            paint.style.setProperty(
              "box-shadow",
              `inset 0 0 0 3px ${paintColor}`,
              "important",
            );
          } else if (
            kind === "shadow-outside-to-inset-background-geometry"
          ) {
            paint.style.setProperty(
              "box-shadow",
              "inset 0 0 0 3px rgba(255, 255, 255, 0.5)",
              "important",
            );
          } else if (
            kind === "shadow-inset-to-outside-background-geometry"
          ) {
            paint.style.setProperty(
              "box-shadow",
              "0 0 0 3px rgba(0, 0, 0, 0.5)",
              "important",
            );
          } else if (kind === "new-shadow-zero-band-geometry") {
            paint.style.setProperty(
              "box-shadow",
              `0 0 0 0 ${paintColor}`,
              "important",
            );
          } else if (kind === "new-shadow-zero-target-geometry") {
            paint.style.setProperty(
              "box-shadow",
              `0 0 0 3px ${paintColor}`,
              "important",
            );
          } else if (shadowRenderedProof !== null) {
            paint.style.setProperty(
              "box-shadow",
              shadowValue(shadowRenderedProof.afterLayers),
              "important",
            );
          } else if (kind === "new-shadow-geometry") {
            paint.style.setProperty(
              "box-shadow",
              `0 0 0 3px ${paintColor}`,
              "important",
            );
          } else if (kind === "new-shadow-spread-geometry") {
            paint.style.setProperty(
              "box-shadow",
              `0 0 0 2px ${paintColor}`,
              "important",
            );
          } else if (kind === "new-inset-shadow-geometry") {
            paint.style.setProperty(
              "box-shadow",
              `inset 0 0 0 2px ${paintColor}`,
              "important",
            );
          } else if (
            kind === "subtle-underline-geometry" ||
            kind === "meaningful-underline-geometry"
          ) {
            paint.style.setProperty(
              "text-decoration-thickness",
              kind === "subtle-underline-geometry" ? "2.02px" : "4px",
              "important",
            );
          } else if (
            kind === "new-underline-geometry" ||
            kind === "underline-single-line-descent" ||
            kind === "underline-multiline"
          ) {
            paint.style.setProperty(
              "text-decoration-line",
              "underline",
              "important",
            );
            paint.style.setProperty(
              "text-decoration-thickness",
              kind === "new-underline-geometry" ? "3px" : "4px",
              "important",
            );
            paint.style.setProperty(
              "text-decoration-color",
              paintColor,
              "important",
            );
          } else if (kind.includes("-shadow-color")) {
            paint.style.setProperty(
              "box-shadow",
              `0 0 0 3px ${paintColor}`,
              "important",
            );
          } else if (kind.includes("-underline-color")) {
            paint.style.setProperty(
              "text-decoration-line",
              "underline",
              "important",
            );
            paint.style.setProperty(
              "text-decoration-thickness",
              "3px",
              "important",
            );
            paint.style.setProperty(
              "text-decoration-color",
              paintColor,
              "important",
            );
          } else {
            paint.style.setProperty(
              "outline-color",
              paintColor,
              "important",
            );
            paint.style.setProperty("outline-style", "solid", "important");
            paint.style.setProperty("outline-width", "2px", "important");
            paint.style.setProperty("outline-offset", "2px", "important");
          }
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
          }
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        },
        {
          kind,
          shadowRenderedProof: shadowRenderedProof ?? null,
          surfaceColor: synthetic.surfaceColor,
        },
      );
      const oracleAfter = await focusFixtureOracle(target, kind);
      const after = await focusStyles(target);
      const afterInlineStyles = await inlineStyleSnapshot(target);
      await restoreInlineStyles(target, beforeInlineStyles);
      const inspection = await inspectKeyboardFocus(
        page,
        target,
        synthetic.surfaceColor,
        {
          afterBlur: async () => {
            await target.evaluate((node, kind) => {
              type FixtureNode = Element & {
                __discernRemovedFocusSibling?: Element;
                __discernReplacedFocusVictim?: Element;
                __discernTickingFocusInterval?: ReturnType<
                  typeof setInterval
                >;
                __discernTickingFocusText?: string;
              };
              const fixture = node as FixtureNode;
              if (
                kind === "candidate-sibling-removal" &&
                fixture.__discernRemovedFocusSibling !== undefined
              ) {
                node.after(fixture.__discernRemovedFocusSibling);
                delete fixture.__discernRemovedFocusSibling;
              }
              if (
                kind === "ticking-focused-child" &&
                fixture.__discernTickingFocusInterval !== undefined
              ) {
                clearInterval(fixture.__discernTickingFocusInterval);
                if (node instanceof HTMLElement) {
                  node.textContent = fixture.__discernTickingFocusText ?? "";
                }
                delete fixture.__discernTickingFocusInterval;
                delete fixture.__discernTickingFocusText;
              }
            }, kind);
            await restoreInlineStyles(target, beforeInlineStyles);
          },
          afterFocus: async () => {
            await restoreInlineStyles(target, afterInlineStyles);
            await target.evaluate((node, kind) => {
              type FixtureNode = Element & {
                __discernRemovedFocusSibling?: Element;
                __discernReplacedFocusVictim?: Element;
                __discernTickingFocusInterval?: ReturnType<
                  typeof setInterval
                >;
                __discernTickingFocusText?: string;
              };
              const fixture = node as FixtureNode;
              if (kind === "candidate-sibling-removal") {
                const sibling = node.nextElementSibling;
                if (sibling !== null) {
                  fixture.__discernRemovedFocusSibling = sibling;
                  sibling.remove();
                }
              } else if (
                kind === "ticking-focused-child" &&
                node instanceof HTMLElement
              ) {
                fixture.__discernTickingFocusText = node.textContent ?? "";
                let tick = 0;
                fixture.__discernTickingFocusInterval = setInterval(() => {
                  tick += 1;
                  node.textContent = `focus tick ${tick}`;
                }, 1);
              } else if (
                kind === "one-time-focus-mutation" &&
                node instanceof HTMLElement &&
                node.dataset.discernOneTimeFocusMutation !== "done"
              ) {
                node.dataset.discernOneTimeFocusMutation = "done";
                node.textContent = "permanently changed on first focus";
                node.style.backgroundColor = "rgb(255, 255, 255)";
              } else if (kind === "cross-target-replaces-next") {
                const victim = document.querySelector(
                  '[data-discern-focus-proof="cross-target-victim"]',
                );
                if (victim !== null) {
                  fixture.__discernReplacedFocusVictim = victim;
                  victim.replaceWith(victim.cloneNode(true));
                }
              }
            }, kind);
          },
        },
      );
      const {
        failures: inspectionFailures,
        keyboardFocused,
        plan: samplePlan,
        renderedDelta,
      } = inspection;
      const registryFailures = await semanticTargetRegistryFailures(
        page,
        surfaceTokens,
        discoveredTargets,
        enrolledTargets,
      );
      const registryStable = registryFailures.length === 0;
      const registryProofMatches = kind === "cross-target-replaces-next"
        ? registryFailures.some((failure) =>
          failure.includes("replaced") || failure.includes("disconnected")
        )
        : registryStable;
      if (kind === "cross-target-replaces-next") {
        await target.evaluate((node) => {
          type FixtureNode = Element & {
            __discernReplacedFocusVictim?: Element;
          };
          const fixture = node as FixtureNode;
          const original = fixture.__discernReplacedFocusVictim;
          const replacement = document.querySelector(
            '[data-discern-focus-proof="cross-target-victim"]',
          );
          if (original !== undefined && replacement !== null) {
            replacement.replaceWith(original);
            delete fixture.__discernReplacedFocusVictim;
          }
        });
      }
      const renderedCoverage = focusRenderedCoverage(
        samplePlan,
        renderedDelta,
      );
      const renderedDeviceScale: FocusDeviceScale | undefined =
        renderedDelta !== undefined &&
          renderedDelta.scaleX === renderedDelta.scaleY &&
          (renderedDelta.scaleX === 1 || renderedDelta.scaleX === 2)
          ? renderedDelta.scaleX
          : undefined;
      const expectedRaster = shadowRenderedProof === undefined ||
          renderedDeviceScale === undefined
        ? undefined
        : shadowRenderedProof.expectedRaster[renderedDeviceScale];
      const screenshotProofMatches = shadowRenderedProof === undefined ||
        (
          renderedDelta !== undefined &&
          renderedDelta.stable &&
          expectedRaster !== undefined &&
          renderedDelta.changedDevicePixels ===
            expectedRaster.changedDevicePixels &&
          renderedDelta.qualifyingCssPixels ===
            expectedRaster.qualifyingCssPixels &&
          renderedDelta.requiredCssPixels ===
            shadowRenderedProof.expectedRequiredCssPixels &&
          renderedDelta.maximumRestContrast ===
            expectedRaster.maximumRestContrast
        );
      const indicator = focusIndicatorContrast(
        before,
        after,
        synthetic.surfaceColor,
      );
      if (oracleBefore === undefined || oracleAfter === undefined) {
        syntheticFailures.push(`${kind} target lost its oracle candidate`);
        continue;
      }
      const oracleBeforeInsideBackground = paintedBackground(
        oracleBefore.backgroundColor,
        synthetic.surfaceColor,
        oracleBefore.effectiveOpacity,
      );
      const oracleAfterInsideBackground = paintedBackground(
        oracleAfter.backgroundColor,
        synthetic.surfaceColor,
        oracleAfter.effectiveOpacity,
      );
      const computedFixtureBackground = kind.includes("shadow") &&
          oracleAfter.shadowGeometry?.inset === true
        ? oracleAfterInsideBackground
        : synthetic.surfaceColor;
      const computedFixtureContrast = contrastRatio(
        oracleAfter.color,
        computedFixtureBackground,
        oracleAfter.visible && oracleAfter.paintPresent
          ? oracleAfter.effectiveOpacity
          : 0,
      );
      const appearanceContrast = contrastRatio(
        paintedBackground(
          oracleAfter.color,
          synthetic.surfaceColor,
          oracleAfter.visible && oracleAfter.paintPresent
            ? oracleAfter.effectiveOpacity
            : 0,
        ),
        paintedBackground(
          oracleBefore.color,
          synthetic.surfaceColor,
          oracleBefore.visible && oracleBefore.paintPresent
            ? oracleBefore.effectiveOpacity
            : 0,
        ),
      );
      const geometryProof = kind.endsWith("-geometry");
      const near = (value: number, expected: number): boolean =>
        Math.abs(value - expected) < 0.001;
      const beforeOutlineRendered = oracleBefore.outlineStyle !== "none";
      const beforeOutlinePresent = beforeOutlineRendered &&
        oracleBefore.outlineWidth >= 2;
      const afterOutlinePresent = oracleAfter.outlineStyle !== "none" &&
        oracleAfter.outlineWidth >= 2;
      const outlineGeometryEvidence = afterOutlinePresent &&
        (
          !beforeOutlineRendered ||
          Math.max(
              Math.abs(
                oracleAfter.outlineWidth - oracleBefore.outlineWidth,
              ),
              Math.abs(
                oracleAfter.outlineOffset - oracleBefore.outlineOffset,
              ),
            ) >= 2
        );
      const beforeShadow = oracleBefore.shadowGeometry;
      const afterShadow = oracleAfter.shadowGeometry;
      const beforeShadowLayers = oracleBefore.shadowLayers;
      const afterShadowLayers = oracleAfter.shadowLayers;
      const shadowLayerSignature = (layer: FocusShadowLayer): string =>
        `${layer.color}|${layer.inset}|${layer.x}|${layer.y}|${layer.blur}|${layer.spread}`;
      const shadowLayerGeometryMatches = (
        actual: FocusShadowGeometry,
        expected: ShadowProofLayer,
      ): boolean =>
        near(actual.x, expected.x) &&
        near(actual.y, expected.y) &&
        near(actual.blur, expected.blur) &&
        near(actual.spread, expected.spread) &&
        actual.inset === expected.inset;
      const shadowProofLayersMatch = (
        actual: readonly FocusShadowLayer[] | undefined,
        expected: readonly ShadowProofLayer[],
      ): boolean =>
        actual !== undefined &&
        actual.length === expected.length &&
        actual.every((layer, index) => {
          const expectedLayer = expected[index];
          return expectedLayer !== undefined &&
            shadowLayerGeometryMatches(layer, expectedLayer);
        });
      const shadowLayerMultisetEqual = beforeShadowLayers !== undefined &&
        afterShadowLayers !== undefined &&
        beforeShadowLayers.length === afterShadowLayers.length &&
        beforeShadowLayers.map(shadowLayerSignature).toSorted().join("\n") ===
          afterShadowLayers.map(shadowLayerSignature).toSorted().join("\n");
      const shadowGeometryEvidence = [
          "shadow-layer-reorder-geometry",
          "shadow-duplicate-reorder-geometry",
        ].includes(kind)
        ? !shadowLayerMultisetEqual
        : kind === "shadow-layer-insertion-geometry"
        ? beforeShadowLayers !== undefined &&
          afterShadowLayers !== undefined &&
          afterShadowLayers.length > beforeShadowLayers.length &&
          afterShadowLayers.some((layer) =>
            !beforeShadowLayers.some((previousLayer) =>
              shadowLayerSignature(previousLayer) ===
                shadowLayerSignature(layer)
            )
          )
        : afterShadow !== undefined &&
          (
            beforeShadow === undefined ||
            Math.max(
                Math.abs(afterShadow.x - beforeShadow.x),
                Math.abs(afterShadow.y - beforeShadow.y),
                Math.abs(afterShadow.blur - beforeShadow.blur),
                Math.abs(afterShadow.spread - beforeShadow.spread),
              ) >= 2
          );
      const underlineGeometryEvidence = oracleAfter.underlinePresent &&
        (
          !oracleBefore.underlinePresent ||
          Math.abs(
              oracleAfter.underlineThickness -
                oracleBefore.underlineThickness,
            ) >= 2
        );
      const geometryEvidence = kind.includes("outline")
        ? outlineGeometryEvidence
        : kind.includes("shadow")
        ? shadowGeometryEvidence
        : underlineGeometryEvidence;
      const geometryFixtureMatches = kind === "subtle-outline-width-geometry"
        ? near(oracleBefore.outlineWidth, 2) &&
          near(oracleAfter.outlineWidth, 3)
        : kind === "outline-one-to-two-geometry"
        ? near(oracleBefore.outlineWidth, 1) &&
          near(oracleAfter.outlineWidth, 2)
        : kind === "subtle-outline-offset-geometry"
        ? near(oracleBefore.outlineOffset, 2) &&
          near(oracleAfter.outlineOffset, 3)
        : kind === "outline-style-only-geometry"
        ? oracleBefore.outlineStyle === "dashed" &&
          oracleAfter.outlineStyle === "solid" &&
          near(oracleBefore.outlineWidth, oracleAfter.outlineWidth) &&
          near(oracleBefore.outlineOffset, oracleAfter.outlineOffset)
        : kind === "meaningful-outline-width-geometry"
        ? near(oracleBefore.outlineWidth, 2) &&
          near(oracleAfter.outlineWidth, 4)
        : kind === "meaningful-outline-offset-geometry"
        ? near(oracleBefore.outlineOffset, 2) &&
          near(oracleAfter.outlineOffset, 4)
        : kind === "new-outline-geometry"
        ? !beforeOutlinePresent && afterOutlinePresent
        : kind === "subtle-shadow-geometry"
        ? beforeShadow !== undefined &&
          afterShadow !== undefined &&
          near(beforeShadow.spread, 3) &&
          near(afterShadow.spread, 3.02)
        : kind === "shadow-inset-only-geometry"
        ? beforeShadow !== undefined &&
          afterShadow !== undefined &&
          !beforeShadow.inset &&
          afterShadow.inset &&
          near(beforeShadow.spread, afterShadow.spread)
        : kind === "shadow-outside-to-inset-background-geometry"
        ? beforeShadow !== undefined &&
          afterShadow !== undefined &&
          !beforeShadow.inset &&
          afterShadow.inset &&
          oracleBefore.color === oracleAfter.color &&
          oracleBeforeInsideBackground !== synthetic.surfaceColor &&
          near(beforeShadow.spread, afterShadow.spread)
        : kind === "shadow-inset-to-outside-background-geometry"
        ? beforeShadow !== undefined &&
          afterShadow !== undefined &&
          beforeShadow.inset &&
          !afterShadow.inset &&
          oracleBefore.color === oracleAfter.color &&
          oracleBeforeInsideBackground !== synthetic.surfaceColor &&
          near(beforeShadow.spread, afterShadow.spread)
        : kind === "shadow-layer-reorder-geometry"
        ? beforeShadowLayers !== undefined &&
          afterShadowLayers !== undefined &&
          shadowLayerMultisetEqual &&
          beforeShadowLayers.map(shadowLayerSignature).join("\n") !==
            afterShadowLayers.map(shadowLayerSignature).join("\n")
        : kind === "shadow-duplicate-reorder-geometry"
        ? beforeShadowLayers !== undefined &&
          afterShadowLayers !== undefined &&
          shadowLayerMultisetEqual &&
          new Set(beforeShadowLayers.map(({ color }) => color)).size === 1 &&
          beforeShadowLayers.map(shadowLayerSignature).join("\n") !==
            afterShadowLayers.map(shadowLayerSignature).join("\n")
        : kind === "shadow-layer-insertion-geometry"
        ? beforeShadowLayers !== undefined &&
          afterShadowLayers !== undefined &&
          beforeShadowLayers.length === 1 &&
          afterShadowLayers.length === 2
        : kind === "meaningful-shadow-geometry"
        ? beforeShadow !== undefined &&
          afterShadow !== undefined &&
          near(beforeShadow.spread, 3) &&
          near(afterShadow.spread, 5)
        : kind === "new-shadow-geometry"
        ? beforeShadow === undefined && afterShadow !== undefined
        : kind === "new-shadow-zero-band-geometry"
        ? beforeShadow === undefined &&
          afterShadow !== undefined &&
          near(afterShadow.x, 0) &&
          near(afterShadow.y, 0) &&
          near(afterShadow.blur, 0) &&
          near(afterShadow.spread, 0) &&
          oracleAfter.candidateWidth > 0 &&
          oracleAfter.candidateHeight > 0
        : kind === "new-shadow-zero-target-geometry"
        ? beforeShadow === undefined &&
          afterShadow !== undefined &&
          near(oracleAfter.candidateWidth, 0) &&
          near(oracleAfter.candidateHeight, 0)
        : shadowRenderedProof !== undefined
        ? shadowProofLayersMatch(
          beforeShadowLayers,
          shadowRenderedProof.beforeLayers,
        ) &&
          shadowProofLayersMatch(
            afterShadowLayers,
            shadowRenderedProof.afterLayers,
          ) &&
          near(oracleAfter.candidateWidth, shadowRenderedProof.width) &&
          near(oracleAfter.candidateHeight, shadowRenderedProof.height)
        : kind === "new-shadow-spread-geometry"
        ? beforeShadow === undefined &&
          afterShadow !== undefined &&
          near(afterShadow.x, 0) &&
          near(afterShadow.y, 0) &&
          near(afterShadow.blur, 0) &&
          near(afterShadow.spread, 2) &&
          !afterShadow.inset
        : kind === "new-inset-shadow-geometry"
        ? beforeShadow === undefined &&
          afterShadow !== undefined &&
          near(afterShadow.x, 0) &&
          near(afterShadow.y, 0) &&
          near(afterShadow.blur, 0) &&
          near(afterShadow.spread, 2) &&
          afterShadow.inset
        : kind === "subtle-underline-geometry"
        ? near(oracleBefore.underlineThickness, 2) &&
          near(oracleAfter.underlineThickness, 2.02)
        : kind === "meaningful-underline-geometry"
        ? near(oracleBefore.underlineThickness, 2) &&
          near(oracleAfter.underlineThickness, 4)
        : kind === "new-underline-geometry"
        ? !oracleBefore.underlinePresent && oracleAfter.underlinePresent
        : true;
      const subtle = kind === "subtle-opacity" ||
        kind === "subtle-filter-opacity" ||
        kind === "subtle-outline-color" ||
        kind === "subtle-shadow-color" ||
        kind === "subtle-underline-color";
      const opacityFiltered = kind === "target-filter-opacity" ||
        kind === "ancestor-filter-opacity";
      const fixedProxy = kind === "fixed-proxy";
      const genericProxy = kind === "generic-parent-proxy";
      const hugeParentProxy = kind === "huge-parent-proxy";
      const edgeParentProxy = kind === "edge-parent-proxy";
      const hugeSiblingProxy = kind === "huge-sibling-proxy";
      const localParentProxy = kind === "local-parent-proxy";
      const unmarkedFarProxy = kind === "unmarked-far-label-proxy";
      const unmarkedWideProxy = kind === "unmarked-wide-label-proxy";
      const inheritedFarProxy = kind === "inherited-far-label-proxy";
      const markedFarProxy = kind === "marked-far-label-proxy";
      const markedWideProxy = kind === "marked-wide-label-proxy";
      const shadowRootRadioProxy = kind === "shadow-root-radio-proxy";
      const ambiguous = kind === "ambiguous-filter";
      const expectedAccepted = (positiveProofKinds as readonly string[])
        .includes(kind);
      const cssDriven = [
        "surface-has-invisible-outline",
        "proxy-speck-threshold",
        "pseudo-ring-indicator",
        "pseudo-border-style-ring",
        "remote-pseudo-indicator",
        "remote-pseudo-scale",
        "remote-pseudo-translate",
        "remote-pseudo-shadow",
        "pseudo-layered-important",
        "transparent-in-flow-pseudo",
        "contenteditable-no-indicator",
        "iframe-no-indicator",
      ].includes(kind);
      const renderedAdversarialNegative = [
        "background-attribution-duplicate",
        "surface-has-invisible-outline",
        "proxy-speck-threshold",
        "candidate-sibling-removal",
        "ticking-focused-child",
        "one-time-focus-mutation",
        "remote-pseudo-indicator",
        "remote-pseudo-scale",
        "remote-pseudo-translate",
        "remote-pseudo-shadow",
        "pseudo-layered-important",
        "transparent-in-flow-pseudo",
        "contenteditable-no-indicator",
        "iframe-no-indicator",
        "cross-target-replaces-next",
      ].includes(kind);
      const renderedPseudoPositive = [
        "pseudo-ring-indicator",
        "pseudo-border-style-ring",
        "underline-single-line-descent",
        "underline-multiline",
      ].includes(kind);
      const productionAccepted = renderedCoverage.sufficient &&
        inspectionFailures.length === 0 &&
        registryStable;
      const acceptedAssociationEvidence = localParentProxy
        ? oracleAfter.semanticallyAssociated &&
          oracleAfter.geometricallyAssociated &&
          oracleAfter.controlSized &&
          oracleAfter.parentEdgesLocal
        : markedFarProxy
        ? oracleAfter.authoredProxy &&
          oracleAfter.nativeLabelAssociated &&
          oracleAfter.geometricallyAssociated &&
          oracleAfter.controlSized &&
          !oracleAfter.distanceLocal
        : markedWideProxy
        ? oracleAfter.authoredProxy &&
          oracleAfter.nativeLabelAssociated &&
          oracleAfter.geometricallyAssociated &&
          !oracleAfter.controlSized &&
          oracleAfter.distanceLocal
        : shadowRootRadioProxy
        ? oracleAfter.authoredProxy &&
          oracleAfter.semanticallyAssociated &&
          oracleAfter.geometricallyAssociated &&
          oracleAfter.controlSized &&
          oracleAfter.distanceLocal
        : true;
      const windowScrollEvidence = kind !== "window-scroll-indicator" ||
        windowScrollOffset > 0;
      const oracleSupportsExpectation = renderedAdversarialNegative
        ? !productionAccepted
        : renderedPseudoPositive
        ? productionAccepted
        : shadowRenderedProof !== undefined
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          geometryFixtureMatches &&
          screenshotProofMatches
        : expectedAccepted
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          (
            geometryProof
              ? geometryFixtureMatches &&
                geometryEvidence &&
                renderedCoverage.sufficient
              : appearanceContrast !== undefined &&
                appearanceContrast >= 3 &&
                acceptedAssociationEvidence &&
                windowScrollEvidence &&
                renderedCoverage.sufficient
          )
        : geometryProof
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          geometryFixtureMatches &&
          (
            !geometryEvidence ||
            !renderedCoverage.sufficient
          )
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
          !oracleAfter.geometricallyAssociated &&
          oracleAfter.controlSized &&
          !oracleAfter.distanceLocal
        : hugeParentProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          !oracleAfter.semanticallyAssociated &&
          oracleAfter.geometricallyAssociated &&
          !oracleAfter.controlSized &&
          !oracleAfter.parentEdgesLocal
        : edgeParentProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          oracleAfter.semanticallyAssociated &&
          oracleAfter.geometricallyAssociated &&
          !oracleAfter.controlSized &&
          !oracleAfter.parentEdgesLocal
        : hugeSiblingProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          oracleAfter.semanticallyAssociated &&
          oracleAfter.geometricallyAssociated &&
          !oracleAfter.controlSized
        : unmarkedFarProxy || inheritedFarProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          !oracleAfter.authoredProxy &&
          oracleAfter.nativeLabelAssociated &&
          !oracleAfter.geometricallyAssociated &&
          oracleAfter.controlSized &&
          !oracleAfter.distanceLocal
        : unmarkedWideProxy
        ? computedFixtureContrast !== undefined &&
          computedFixtureContrast >= 3 &&
          !oracleAfter.authoredProxy &&
          oracleAfter.nativeLabelAssociated &&
          oracleAfter.geometricallyAssociated &&
          !oracleAfter.controlSized &&
          oracleAfter.distanceLocal
        : ambiguous
        ? !oracleAfter.filterKnown &&
          oracleAfter.filters.some((filter) => filter.includes("url("))
        : kind === "hidden"
        ? !oracleAfter.visible
        : computedFixtureContrast !== undefined &&
          computedFixtureContrast < 3;
      const productionMatchesExpectation = expectedAccepted
        ? productionAccepted
        : !productionAccepted;
      const serializedFilterMatches = !opacityFiltered ||
        oracleAfter.filters.flatMap((filter) =>
            filter.match(/opacity\([^)]*\)/g) ?? []
          ).length === 2;
      const oraclePaintMatches = cssDriven ? true : oracleAfter.paintPresent;
      const proofDiagnostic =
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
        }:1, changed-device-pixels=${
          renderedDelta?.changedDevicePixels ?? "not-measured"
        }, qualifying-css-pixels=${
          renderedDelta?.qualifyingCssPixels.toFixed(2) ?? "not-measured"
        }, required-css-pixels=${
          renderedCoverage.required?.toFixed(2) ?? "not-measured"
        }, rendered-max=${
          renderedDelta?.maximumRestContrast.toFixed(2) ?? "not-measured"
        }:1, suppressed-max=${
          renderedDelta?.maximumAdjacentContrast.toFixed(2) ?? "not-measured"
        }:1, screenshot-scale=${
          renderedDelta === undefined
            ? "not-measured"
            : `${renderedDelta.scaleX.toFixed(2)}×${
              renderedDelta.scaleY.toFixed(2)
            }`
        }, filters=${
          oracleAfter.filters.join(", ") || "none"
        }, semantic=${oracleAfter.semanticallyAssociated}, native-label=${oracleAfter.nativeLabelAssociated}, authored-proxy=${oracleAfter.authoredProxy}, geometry=${oracleAfter.geometricallyAssociated}, distance-local=${oracleAfter.distanceLocal}, sized=${oracleAfter.controlSized}, parent-edges=${oracleAfter.parentEdgesLocal}, candidate=${
          oracleAfter.candidateWidth.toFixed(1)
        }×${oracleAfter.candidateHeight.toFixed(1)}, target=${
          oracleAfter.targetWidth.toFixed(1)
        }×${
          oracleAfter.targetHeight.toFixed(1)
        }, outline=${oracleAfter.outlineWidth}/${oracleAfter.outlineOffset}/${oracleAfter.outlineStyle}, shadow=${
          oracleAfter.shadowGeometry === undefined
            ? "none"
            : `${oracleAfter.shadowGeometry.x}/${oracleAfter.shadowGeometry.y}/${oracleAfter.shadowGeometry.blur}/${oracleAfter.shadowGeometry.spread}/${oracleAfter.shadowGeometry.inset}`
        }, underline=${oracleAfter.underlinePresent}/${oracleAfter.underlineThickness}, bracket=${
          inspectionFailures.join(", ") || "stable"
        }, registry=${
          registryFailures.join(", ") || "stable"
        }, window-scroll=${windowScrollOffset}`;
      if (
        !keyboardFocused ||
        !productionMatchesExpectation ||
        !oraclePaintMatches ||
        !oracleSupportsExpectation ||
        !screenshotProofMatches ||
        !registryProofMatches ||
        !serializedFilterMatches
      ) {
        syntheticFailures.push(proofDiagnostic);
      }
    }
    await page.evaluate(() => {
      document.querySelector("[data-discern-focus-proof-surface]")?.remove();
      document.querySelector("[data-discern-focus-raw-stage]")?.remove();
    });
  }
  if (scope.syntheticProofKinds === undefined) {
    syntheticFailures.push(
      ...await verifyFocusDeviceScaleInvariant(
        browser,
        origin,
        shadowRenderedProofs.map(({ kind }) => kind),
      ),
    );
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
  requireViewport(page, WIDE_VIEWPORT, "Resilience conformance");
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
    browser,
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
