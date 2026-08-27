/**
 * Pure terminal renderer and deterministic example states for Byline.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import meta, { componentExampleVocabulary } from "./byline.meta.ts";

/** One author named by a terminal Byline. */
export interface BylineCliAuthor {
  readonly name: string;
  readonly initials?: string;
}

/** Inputs accepted by the terminal Byline renderer. */
export interface BylineCliProps {
  readonly authors: readonly BylineCliAuthor[];
  readonly lede?: string;
  readonly meta?: readonly string[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Byline states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [{
    name: "default",
    props: {
      authors: [{ name: "Ada Osei" }, { name: "June Park" }],
      meta: ["11 August 2026", "8 min read"],
    },
  }] as const satisfies readonly CliExample<BylineCliProps>[],
);

function authorList(authors: readonly BylineCliAuthor[]): string {
  const labels = authors.map((author) =>
    `[${author.initials ?? derivedInitials(author.name, 2)}] ${author.name}`
  );
  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}`;
}

/** Render a measured author attribution row with initials and publication meta. */
const renderBylineCli: CliRenderer<BylineCliProps> = (props, capabilities) => {
  if (
    props.authors.length === 0 ||
    props.authors.some((author) => author.name.trim() === "")
  ) {
    throw new TypeError("byline authors and author names must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `byline width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const separator = capabilities.unicode ? " · " : " | ";
  const authors = `${props.lede ?? "By"} ${authorList(props.authors)}`;
  const meta = (props.meta ?? []).join(separator);
  const combined = meta === "" ? authors : `${authors}${separator}${meta}`;
  const value = measureText(combined) <= width ? combined : [
    wrapText(authors, width).join("\n"),
    ...(meta === "" ? [] : [wrapText(meta, width).join("\n")]),
  ].join("\n");
  const theme = terminalThemes[props.theme ?? "dark"];
  return styleText(value, {
    ...theme.typography.strong,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities);
};

export default renderBylineCli;
