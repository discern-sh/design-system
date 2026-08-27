/**
 * Pure terminal renderer and deterministic example states for Pager.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./pager.meta.ts";

/** One terminal Pager destination. */
export interface PagerCliLink {
  readonly label: string;
  readonly href: string;
}

/** Inputs accepted by the terminal Pager renderer. */
export interface PagerCliProps {
  readonly previous?: PagerCliLink;
  readonly next?: PagerCliLink;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
  readonly showTargets?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      previous: { label: "Lorem ipsum", href: "#anchor-heading-lorem" },
      next: {
        label: "Consectetur adipiscing",
        href: "#anchor-heading-consectetur",
      },
    },
  },
  {
    name: "next-only",
    props: {
      next: { label: "Dolor sit amet", href: "#anchor-heading-lorem" },
    },
  },
] as const satisfies readonly CliExample<PagerCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Pager states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<PagerCliProps>[] =
  cliExampleImplementations;

/** Render adjacent documentation destinations on one line or a narrow stack. */
const renderPagerCli: CliRenderer<PagerCliProps> = (props, capabilities) => {
  if (props.previous === undefined && props.next === undefined) {
    throw new TypeError("pager requires a previous or next destination");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 5) {
    throw new TypeError(
      `pager width must be a safe integer of at least 5; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const previousArrow = capabilities.unicode ? "←" : "<-";
  const nextArrow = capabilities.unicode ? "→" : "->";
  const target = (link: PagerCliLink): string =>
    props.showTargets === true ? ` (${link.href})` : "";
  const previous = props.previous === undefined
    ? undefined
    : `${previousArrow} ${
      props.previousLabel ?? "Previous"
    }: ${props.previous.label}${target(props.previous)}`;
  const next = props.next === undefined
    ? undefined
    : `${props.nextLabel ?? "Next"}: ${props.next.label}${
      target(props.next)
    } ${nextArrow}`;
  const boundedPrevious = previous === undefined
    ? undefined
    : truncateText(previous, width, capabilities.unicode ? "…" : ".");
  const boundedNext = next === undefined
    ? undefined
    : truncateText(next, width, capabilities.unicode ? "…" : ".");
  const theme = terminalThemes[props.theme ?? "dark"];
  const renderLink = (value: string): string =>
    styleText(value, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
  if (boundedPrevious === undefined) return renderLink(boundedNext ?? "");
  if (boundedNext === undefined) return renderLink(boundedPrevious);
  const gap = width - measureText(boundedPrevious) - measureText(boundedNext);
  if (gap >= 2) {
    return `${renderLink(boundedPrevious)}${" ".repeat(gap)}${
      renderLink(boundedNext)
    }`;
  }
  return `${renderLink(boundedPrevious)}\n${renderLink(boundedNext)}`;
};

export default renderPagerCli;
