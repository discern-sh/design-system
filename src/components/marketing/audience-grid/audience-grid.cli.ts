/**
 * Pure terminal renderer and deterministic example states for Audience grid.
 *
 * @module
 */

import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
  wrapMarketingCliText,
} from "../marketing-frame.ts";
import meta, { componentExampleVocabulary } from "./audience-grid.meta.ts";

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
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        eyebrow: "Choose your path",
        title: "One system, three useful points of view.",
        description:
          "Start with the outcome that matches the work in front of you.",
        items: [
          {
            eyebrow: "For builders",
            title: "Move from idea to reliable release.",
            description:
              "Compose the pieces you need without giving up a coherent system.",
            featured: true,
          },
          {
            eyebrow: "For reviewers",
            title: "See the evidence behind the result.",
            description:
              "Turn invisible implementation detail into a reviewable account.",
          },
          {
            eyebrow: "For teams",
            title: "Give every project the same strong defaults.",
            description:
              "Share a standard without forcing every team into the same stack.",
          },
        ],
      },
    },
  ] as const satisfies readonly CliExample<AudienceGridCliProps>[],
);

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
