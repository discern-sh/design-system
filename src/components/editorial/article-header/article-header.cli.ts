/**
 * Pure terminal renderer and deterministic example states for Article header.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, wrapInlineCluster } from "../../../cli/layout.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import meta, { componentExampleVocabulary } from "./article-header.meta.ts";
import type {
  ArticleHeaderHeadingLevel,
  ArticleHeaderSurface,
} from "./article-header.types.ts";

/** One terminal-safe author in an Article header. */
export interface ArticleHeaderCliAuthor {
  readonly name: string;
  readonly role?: string;
  readonly initials?: string;
}

/** Inputs accepted by the terminal Article header renderer. */
export interface ArticleHeaderCliProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly standfirst: string;
  readonly authors?: readonly ArticleHeaderCliAuthor[];
  readonly meta?: readonly string[];
  readonly actions?: readonly string[];
  readonly mediaDescription?: string;
  readonly headingLevel?: ArticleHeaderHeadingLevel;
  readonly surface?: ArticleHeaderSurface;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    eyebrow: "Field note · Issue 08",
    title: "A neighbourhood garden through the seasons.",
    standfirst:
      "An illustrated account of how planting, weather, and shared care shape one small green space over a year.",
    authors: [{
      name: "Morgan Lee",
      role: "Contributing editor",
      initials: "ML",
    }],
    meta: ["12 min read", "Updated 14 July", "Field notes"],
    actions: ["Save article"],
    surface: "accent",
  },
}] as const satisfies readonly CliExample<ArticleHeaderCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Article header states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ArticleHeaderCliProps>[] =
  cliExampleImplementations;

function renderWidth(
  requested: number | undefined,
  columns: number,
): number {
  const width = requested ?? columns;
  if (!Number.isSafeInteger(width) || width < 12) {
    throw new TypeError(
      `article header width must be a safe integer of at least 12; received ${width}`,
    );
  }
  return Math.min(width, columns);
}

function authorLabel(author: ArticleHeaderCliAuthor, unicode: boolean): string {
  const initials = author.initials ?? derivedInitials(author.name, 2);
  return `[${initials}] ${author.name}${
    author.role === undefined ? "" : ` ${unicode ? "—" : "-"} ${author.role}`
  }`;
}

/** Render one measured terminal Article header. */
const renderArticleHeaderCli: CliRenderer<ArticleHeaderCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "" || props.standfirst.trim() === "") {
    throw new TypeError(
      "article header title and standfirst must be non-empty",
    );
  }
  const width = renderWidth(props.maxWidth, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const divider = capabilities.unicode ? " · " : " | ";
  const blocks: string[] = [];
  if (props.eyebrow !== undefined) {
    blocks.push(styleText(props.eyebrow.toLocaleUpperCase(), {
      ...theme.typography.annotation,
      color: terminalToneColor(theme, "accent"),
    }, capabilities));
  }
  blocks.push(styleText(wrapText(props.title, width).join("\n"), {
    ...(props.headingLevel === 2
      ? theme.typography.strong
      : theme.typography.display),
    color: props.surface === "accent"
      ? terminalToneColor(theme, "accent")
      : terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities));
  blocks.push(styleText(wrapText(props.standfirst, width).join("\n"), {
    ...theme.typography.emphasis,
    color: terminalThemeColor(theme, "--discern-color-ink-muted"),
  }, capabilities));
  if ((props.authors?.length ?? 0) > 0) {
    blocks.push(wrapInlineCluster(
      (props.authors ?? []).map((author) =>
        authorLabel(author, capabilities.unicode)
      ),
      { columns: width, gap: 2 },
    ));
  }
  if ((props.meta?.length ?? 0) > 0) {
    blocks.push(styleText(
      wrapText((props.meta ?? []).join(divider), width).join("\n"),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ));
  }
  if (props.mediaDescription !== undefined) {
    blocks.push(
      wrapText(`Figure: ${props.mediaDescription}`, width).join("\n"),
    );
  }
  if ((props.actions?.length ?? 0) > 0) {
    blocks.push(
      wrapText(`Actions: ${(props.actions ?? []).join(divider)}`, width).join(
        "\n",
      ),
    );
  }
  return joinVertical(blocks, { spacing: 1 });
};

export default renderArticleHeaderCli;
