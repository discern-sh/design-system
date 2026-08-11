/**
 * Pure terminal renderer and deterministic example states for Audience grid.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
  wrapMarketingCliText,
} from "../marketing-frame.ts";

/** One terminal Audience grid card. */
export interface AudienceGridCliItem {
  readonly title: string;
  readonly description: string;
  readonly eyebrow?: string;
  readonly meta?: string;
  readonly featured?: boolean;
}

/** Inputs accepted by the terminal Audience grid renderer. */
export interface AudienceGridCliProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly items: readonly AudienceGridCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Audience grid states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AudienceGridCliProps>[] = [
  {
    name: "audiences",
    props: {
      eyebrow: "For every role",
      title: "One system, three viewpoints",
      description: "Keep the same evidence useful to different readers.",
      items: [
        { title: "Builders", description: "Move from idea to release." },
        {
          title: "Reviewers",
          description: "See the evidence behind the result.",
          featured: true,
        },
        { title: "Leaders", description: "Share reliable defaults." },
      ],
    },
  },
] as const;

/** Render audience cards as an adaptive one- or two-column terminal grid. */
const renderAudienceGridCli: CliRenderer<AudienceGridCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("audience grid requires at least one item");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const cardWidth = width >= 56 ? Math.floor((width - 2) / 2) : width;
  const cards = props.items.map((item, index) =>
    joinVertical([
      `${String(index + 1).padStart(2, "0")}. ${item.title}${
        item.featured === true ? capabilities.unicode ? " ★" : " *" : ""
      }`,
      item.eyebrow === undefined ? "" : item.eyebrow,
      wrapMarketingCliText(item.description, cardWidth),
      item.meta === undefined ? "" : wrapMarketingCliText(item.meta, cardWidth),
    ])
  );
  const rows: string[] = [];
  const columns = width >= 56 ? 2 : 1;
  for (let index = 0; index < cards.length; index += columns) {
    rows.push(layoutColumns(cards.slice(index, index + columns), {
      columns: width,
      gap: columns === 1 ? 0 : 2,
    }));
  }
  return joinVertical([
    renderMarketingCliHeader({
      title: props.title,
      ...(props.eyebrow === undefined ? {} : { eyebrow: props.eyebrow }),
      ...(props.description === undefined
        ? {}
        : { description: props.description }),
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      width,
    }, capabilities),
    joinVertical(rows, { spacing: 1 }),
  ], { spacing: 1 });
};

export default renderAudienceGridCli;
