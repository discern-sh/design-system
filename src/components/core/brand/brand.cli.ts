/**
 * Pure terminal renderer and deterministic example states for Brand.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { renderTrianglePattern } from "../../../cli/triangles.ts";
import type { LogoShape, LogoTreatment } from "../logo/logo.types.ts";
import type { BrandSize, BrandTypeface } from "./brand.types.ts";

/** Inputs accepted by the terminal Brand renderer. */
export interface BrandCliProps {
  readonly name: string;
  readonly tagline?: string;
  readonly mark?: boolean;
  readonly size?: BrandSize;
  readonly typeface?: BrandTypeface;
  readonly markTreatment?: LogoTreatment;
  readonly markShape?: LogoShape;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const MARK_LENGTHS: Readonly<Record<BrandSize, number>> = {
  sm: 1,
  md: 2,
  lg: 4,
};

/** Deterministic Brand states rendered by `deno task catalogue:cli brand`. */
export const cliExamples: readonly CliExample<BrandCliProps>[] = [
  { name: "wordmark", props: { name: "discern" } },
  {
    name: "tagline",
    props: {
      name: "discern",
      tagline: "Tools that remember the rules",
      size: "lg",
    },
  },
  {
    name: "name-only",
    props: { name: "discern", mark: false, typeface: "mono" },
  },
] as const;

/** Render a width-bounded terminal brand lockup with optional triangle mark. */
const renderBrandCli: CliRenderer<BrandCliProps> = (props, capabilities) => {
  if (props.name === "" || /[\p{Cc}\p{Cf}]/u.test(props.name)) {
    throw new TypeError("brand name must be non-empty and control-free");
  }
  if (props.tagline !== undefined && /[\p{Cc}\p{Cf}]/u.test(props.tagline)) {
    throw new TypeError("brand tagline must be control-free");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `brand width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const size = props.size ?? "md";
  const markOptions = props.theme === undefined
    ? {
      length: Math.min(MARK_LENGTHS[size], Math.max(1, width - 2)),
      direction: props.markShape === "square"
        ? "reverse" as const
        : "forward" as const,
    }
    : {
      length: Math.min(MARK_LENGTHS[size], Math.max(1, width - 2)),
      theme: props.theme,
      direction: props.markShape === "square"
        ? "reverse" as const
        : "forward" as const,
    };
  const mark = props.mark === false
    ? ""
    : renderTrianglePattern(markOptions, capabilities);
  const brackets = props.markTreatment === "tile" ? 2 : 0;
  const nameWidth = width - (mark === "" ? 0 : measureText(mark) + 1) -
    brackets;
  if (nameWidth < 1) {
    throw new TypeError(`brand width ${width} cannot hold its name`);
  }
  const name = truncateText(
    props.name,
    nameWidth,
    capabilities.unicode ? "…" : ".",
  );
  const nameStyle = props.typeface === "inherit" || props.typeface === "ui"
    ? theme.typography.body
    : theme.typography.display;
  const line = renderStyledSpans([
    ...(props.markTreatment === "tile"
      ? [{ text: "[", style: { color: terminalToneColor(theme, "neutral") } }]
      : []),
    ...(mark === "" ? [] : [{ text: mark }, { text: " " }]),
    {
      text: name,
      style: { ...nameStyle, color: terminalToneColor(theme, "accent") },
    },
    ...(props.markTreatment === "tile"
      ? [{ text: "]", style: { color: terminalToneColor(theme, "neutral") } }]
      : []),
  ], capabilities);
  if (props.tagline === undefined || props.tagline === "") return line;
  return joinVertical([
    line,
    renderStyledSpans([{
      text: truncateText(
        props.tagline,
        width,
        capabilities.unicode ? "…" : ".",
      ),
      style: {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
    }], capabilities),
  ]);
};

export default renderBrandCli;
