/**
 * Pure terminal renderer and deterministic example states for Card.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./card.meta.ts";
import type { CardPadding, CardTexture } from "./card.types.ts";

/** Inputs accepted by the terminal Card renderer. */
export interface CardCliProps extends CliPresentationOptions {
  readonly body: string;
  readonly title?: string;
  readonly raised?: boolean;
  readonly texture?: CardTexture;
  readonly padding?: CardPadding;
  readonly width?: number;
}

const PADDING: Readonly<Record<CardPadding, number>> = {
  none: 0,
  sm: 0,
  md: 1,
  lg: 2,
};

const cliExampleImplementations = [
  {
    name: "default",
    props: { title: "Card", body: "Composable terminal surface." },
  },
  {
    name: "raised",
    props: {
      title: "Raised",
      body: "Important grouped content.",
      raised: true,
    },
  },
  {
    name: "dotted",
    props: { body: "Textured supporting content.", texture: "dots" },
  },
] as const satisfies readonly CliExample<CardCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Card states rendered by `deno task catalogue:cli card`. */
export const cliExamples: readonly CliExample<CardCliProps>[] =
  cliExampleImplementations;

/** Render one width-bounded terminal Card with shared padding and texture choices. */
const renderCardCli: CliRenderer<CardCliProps> = (props, capabilities) => {
  for (const value of [props.body.replaceAll("\n", ""), props.title]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("card content must be control-free");
    }
  }
  const padding = PADDING[props.padding ?? "md"];
  const requestedWidth = props.width ?? capabilities.columns;
  if (
    !Number.isSafeInteger(requestedWidth) ||
    requestedWidth < 2 * padding + 3
  ) {
    throw new TypeError(
      `card width must be a safe integer of at least ${
        2 * padding + 3
      }; received ${requestedWidth}`,
    );
  }
  const theme = resolveTerminalTheme(props);
  const marker = capabilities.unicode ? "· " : ". ";
  const body = props.texture === "dots"
    ? props.body.split("\n").map((line) => `${marker}${line}`).join("\n")
    : props.body;
  return renderBox(
    {
      body,
      ...(props.title === undefined ? {} : { title: props.title }),
      width: requestedWidth,
      padding,
      borderStyle: {
        ...(props.raised === true
          ? theme.typography.strong
          : theme.typography.muted),
        color: props.raised === true
          ? terminalToneColor(theme, "accent")
          : terminalThemeColor(theme, "--discern-color-border"),
      },
    },
    capabilities,
  );
};

export default renderCardCli;
