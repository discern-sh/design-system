/**
 * Pure terminal renderer and deterministic example states for Banner.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { BannerTone } from "./banner.types.ts";
import meta, { componentExampleVocabulary } from "./banner.meta.ts";

/** Inputs accepted by the terminal Banner renderer. */
export interface BannerCliProps {
  readonly message: string;
  readonly title?: string;
  readonly tone?: BannerTone;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Banner states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { message: "A new version is available." } },
    {
      name: "accent",
      props: { message: "Review the featured change.", tone: "accent" },
    },
    {
      name: "success",
      props: { message: "Checks passed.", tone: "success" },
    },
    {
      name: "warning",
      props: { message: "Review the pending changes.", tone: "warning" },
    },
    { name: "danger", props: { message: "Build failed.", tone: "danger" } },
  ] as const satisfies readonly CliExample<BannerCliProps>[],
);

/** Render one width-bounded, semantically toned terminal Banner. */
const renderBannerCli: CliRenderer<BannerCliProps> = (props, capabilities) => {
  if (props.message.trim() === "") {
    throw new TypeError("banner message must be non-empty");
  }
  const tone = props.tone ?? "neutral";
  const theme = terminalThemes[props.theme ?? "dark"];
  return renderBox({
    body: props.message,
    title: props.title ?? tone[0]?.toLocaleUpperCase() + tone.slice(1),
    width: props.width ?? Math.min(64, capabilities.columns),
    borderStyle: { color: terminalToneColor(theme, tone) },
  }, capabilities);
};

export default renderBannerCli;
