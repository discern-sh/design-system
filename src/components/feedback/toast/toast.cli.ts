/**
 * Pure terminal renderer and deterministic example states for Toast.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defaultTerminalFrameWidth } from "../../../cli/frame-measure.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { ToastTone } from "./toast.types.ts";

/** Inputs accepted by the terminal Toast renderer. */
export interface ToastCliProps {
  readonly message: string;
  readonly tone?: ToastTone;
  readonly dismissible?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Toast states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ToastCliProps>[] = [
  { name: "neutral", props: { message: "Settings saved." } },
  {
    name: "success",
    props: { message: "Release published.", tone: "success" },
  },
  {
    name: "warning",
    props: { message: "Connection is slow.", tone: "warning" },
  },
  {
    name: "danger",
    props: { message: "Could not save.", tone: "danger", dismissible: true },
  },
] as const;

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
    padding: 0,
    borderStyle: { color: terminalToneColor(theme, tone) },
  }, capabilities);
};

export default renderToastCli;
