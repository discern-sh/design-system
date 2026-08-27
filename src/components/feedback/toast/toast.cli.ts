/**
 * Pure terminal renderer and deterministic example states for Toast.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defaultTerminalFrameWidth } from "../../../cli/frame-measure.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { ToastTone } from "./toast.types.ts";
import meta, { componentExampleVocabulary } from "./toast.meta.ts";

/** Inputs accepted by the terminal Toast renderer. */
export interface ToastCliProps {
  readonly message: string;
  readonly tone?: ToastTone;
  readonly dismissible?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const cliExampleImplementations = [
  { name: "default", props: { message: "Settings saved." } },
  {
    name: "success",
    props: {
      message: "Changes saved.",
      tone: "success",
      dismissible: true,
    },
  },
  {
    name: "warning",
    props: { message: "Connection is slow.", tone: "warning" },
  },
  {
    name: "danger",
    props: {
      message: "Could not save.",
      tone: "danger",
      dismissible: true,
    },
  },
] as const satisfies readonly CliExample<ToastCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Toast states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ToastCliProps>[] =
  cliExampleImplementations;

/** Render one compact, toned terminal notification box. */
const renderToastCli: CliRenderer<ToastCliProps> = (props, capabilities) => {
  if (props.message.trim() === "") {
    throw new TypeError("toast message must be non-empty");
  }
  const tone = props.tone ?? "neutral";
  const theme = terminalThemes[props.theme ?? "dark"];
  const dismiss = props.dismissible === true
    ? `  ${capabilities.unicode ? "×" : "x"}`
    : "";
  return renderBox({
    body: `${props.message}${dismiss}`,
    title: tone[0]?.toLocaleUpperCase() + tone.slice(1),
    width: props.width ?? defaultTerminalFrameWidth(capabilities),
    borderStyle: { color: terminalToneColor(theme, tone) },
  }, capabilities);
};

export default renderToastCli;
