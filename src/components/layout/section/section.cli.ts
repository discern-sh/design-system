/**
 * Pure terminal renderer and deterministic example states for Section.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
import {
  type TerminalSpacingTokenName,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import {
  renderTrianglePattern,
  renderTriangleSectionRule,
} from "../../../cli/triangles.ts";
import type { SectionSpacing, SectionSurface } from "./section.types.ts";

/** Structural treatments available to the terminal Section renderer. */
export type SectionCliTreatment = "plain" | "rule" | "ribbon";

/** Inputs accepted by the terminal Section renderer. */
export interface SectionCliProps {
  readonly body: string;
  readonly title?: string;
  readonly surface?: SectionSurface;
  readonly spacing?: SectionSpacing;
  readonly treatment?: SectionCliTreatment;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const SPACING_STEPS: Readonly<Record<SectionSpacing, 0 | 2 | 4 | 6>> = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 6,
};

/** Deterministic Section states rendered by `deno task catalogue:cli section`. */
export const cliExamples: readonly CliExample<SectionCliProps>[] = [
  {
    name: "labelled-rule",
    props: { title: "Foundation", body: "Shared design language", width: 32 },
  },
  {
    name: "ribbon",
    props: {
      title: "Details",
      body: "Supporting section content",
      treatment: "ribbon",
      width: 24,
    },
  },
  {
    name: "sunken",
    props: {
      body: "Quiet supporting material",
      surface: "sunken",
      spacing: "sm",
      width: 24,
    },
  },
] as const;

/** Compose a terminal section from layout primitives and selected triangle treatments. */
const renderSectionCli: CliRenderer<SectionCliProps> = (
  props,
  capabilities,
) => {
  for (const value of [props.body.replaceAll("\n", ""), props.title]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("section content must be control-free");
    }
  }
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 5) {
    throw new TypeError(
      `section width must be a safe integer of at least 5; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const treatment = props.treatment ??
    (props.title === undefined ? "plain" : "rule");
  const heading: string[] = [];
  if (treatment === "ribbon") {
    heading.push(renderTrianglePattern(
      {
        length: width,
        thickness: 2,
        ...(props.theme === undefined ? {} : { theme: props.theme }),
      },
      capabilities,
    ));
  }
  if (props.title !== undefined && props.title !== "") {
    if (treatment === "rule") {
      heading.push(renderTriangleSectionRule(
        props.title,
        props.theme === undefined ? { width } : { width, theme: props.theme },
        capabilities,
      ));
    } else {
      heading.push(styleText(
        props.title,
        {
          ...theme.typography.display,
          color: terminalThemeColor(theme, "--discern-color-ink"),
        },
        capabilities,
      ));
    }
  }
  let body = layoutColumns([props.body], { columns: width, gap: 0 });
  if ((props.surface ?? "canvas") === "sunken") {
    body = styleText(
      body,
      {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    );
  }
  const step = SPACING_STEPS[props.spacing ?? "md"];
  const cells = step === 0 ? 0 : theme.spacing[
    `--discern-space-${step}` as TerminalSpacingTokenName
  ] ?? 1;
  return joinVertical([...heading, body], {
    spacing: heading.length === 0 ? 0 : Math.max(0, cells - 1),
  });
};

export default renderSectionCli;
