/**
 * Pure terminal renderer and deterministic example states for Breadcrumbs.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { wrapInlineCluster } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./breadcrumbs.meta.ts";

/** One terminal breadcrumb ancestor. */
export interface BreadcrumbsCliItem {
  readonly label: string;
  readonly href?: string;
}

/** Inputs accepted by the terminal Breadcrumbs renderer. */
export interface BreadcrumbsCliProps {
  readonly items?: readonly BreadcrumbsCliItem[];
  readonly current: string;
  readonly label?: string;
  readonly separator?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      items: [{ label: "Home" }, { label: "Library" }],
      current: "Navigation",
    },
  },
  {
    name: "deep",
    props: {
      label: "Deep breadcrumb",
      items: [
        { label: "Home" },
        { label: "Documentation" },
        { label: "Components" },
        { label: "Navigation" },
      ],
      current: "Breadcrumbs",
    },
  },
] as const satisfies readonly CliExample<BreadcrumbsCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Breadcrumbs states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<BreadcrumbsCliProps>[] =
  cliExampleImplementations;

/** Render one wrapping inline terminal path with an explicit current location. */
const renderBreadcrumbsCli: CliRenderer<BreadcrumbsCliProps> = (
  props,
  capabilities,
) => {
  if (props.current.trim() === "") {
    throw new TypeError("breadcrumbs current label must be non-empty");
  }
  const width = Math.min(
    props.width ?? capabilities.columns,
    capabilities.columns,
  );
  if (!Number.isSafeInteger(width) || width < 4) {
    throw new TypeError(
      `breadcrumbs width must be a safe integer of at least 4; received ${width}`,
    );
  }
  const separator = props.separator ?? (capabilities.unicode ? "›" : ">");
  const items = [...(props.items ?? []), { label: props.current }];
  const pieces = items.map((item, index) =>
    index === items.length - 1
      ? `[${item.label}]`
      : `${item.label} ${separator}`
  );
  const path = wrapInlineCluster(pieces, { columns: width, gap: 1 });
  const theme = terminalThemes[props.theme ?? "dark"];
  const rendered = styleText(path, {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
  }, capabilities);
  return props.label === undefined
    ? rendered
    : `${
      styleText(`${props.label}:`, theme.typography.annotation, capabilities)
    }\n${rendered}`;
};

export default renderBreadcrumbsCli;
