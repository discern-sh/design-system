/**
 * Pure terminal renderer and deterministic example states for Docs header.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { truncateText, wrapText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
} from "../../../cli/theme.ts";
import { renderMotifSectionRule } from "../../../cli/motifs.ts";
import meta, { componentExampleVocabulary } from "./docs-header.meta.ts";

/** Inputs accepted by the terminal Docs header renderer. */
export interface DocsHeaderCliProps extends CliPresentationOptions {
  readonly brand: string;
  readonly middle?: string;
  readonly actions?: readonly string[];
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    brand: "Lorem manual",
    middle: "Search Ctrl+K",
    actions: ["Consectetur"],
  },
}] as const satisfies readonly CliExample<DocsHeaderCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Docs header states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DocsHeaderCliProps>[] =
  cliExampleImplementations;

/** Render a documentation masthead as a labeled motif rule and context row. */
const renderDocsHeaderCli: CliRenderer<DocsHeaderCliProps> = (
  props,
  capabilities,
) => {
  if (props.brand.trim() === "") {
    throw new TypeError("docs header brand must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 10) {
    throw new TypeError(
      `docs header width must be a safe integer of at least 10; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const brand = truncateText(
    props.brand,
    Math.max(1, width - 6),
    capabilities.unicode ? "…" : ".",
  );
  const rule = renderMotifSectionRule(brand, {
    ...cliPresentationPassthrough(props),
    width,
  }, capabilities);
  const blocks = [rule];
  if (props.middle !== undefined) {
    blocks.push(wrapText(props.middle, width).join("\n"));
  }
  if ((props.actions?.length ?? 0) > 0) {
    const theme = resolveTerminalTheme(props);
    const separator = capabilities.unicode ? " · " : " | ";
    blocks.push(styleText(
      wrapText(`Actions: ${(props.actions ?? []).join(separator)}`, width).join(
        "\n",
      ),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ));
  }
  return joinVertical(blocks);
};

export default renderDocsHeaderCli;
