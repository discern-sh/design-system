/**
 * Pure terminal renderer and deterministic example states for Container.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { layoutColumns } from "../../../cli/layout.ts";
import type { ContainerSize } from "./container.types.ts";

/** Inputs accepted by the terminal Container renderer. */
export interface ContainerCliProps {
  readonly body: string;
  readonly size?: ContainerSize;
  readonly width?: number;
}

const SIZE_COLUMNS: Readonly<Record<Exclude<ContainerSize, "full">, number>> = {
  measure: 48,
  sm: 60,
  md: 72,
  lg: 96,
};

/** Deterministic Container states rendered by `deno task catalogue:cli container`. */
export const cliExamples: readonly CliExample<ContainerCliProps>[] = [
  {
    name: "measure",
    props: {
      body: "Readable content stays centred inside a named terminal measure.",
      size: "measure",
      width: 80,
    },
  },
  {
    name: "full",
    props: { body: "Full-width content", size: "full", width: 40 },
  },
] as const;

/** Centre and wrap terminal content inside the shared named Container widths. */
const renderContainerCli: CliRenderer<ContainerCliProps> = (
  props,
  capabilities,
) => {
  if (/[^\n]*[\p{Cc}\p{Cf}][^\n]*/u.test(props.body.replaceAll("\n", ""))) {
    throw new TypeError("container body must be control-free");
  }
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `container width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const size = props.size ?? "lg";
  const contentWidth = size === "full"
    ? width
    : Math.min(width, SIZE_COLUMNS[size]);
  const inset = " ".repeat(Math.floor((width - contentWidth) / 2));
  const body = layoutColumns([props.body], { columns: contentWidth, gap: 0 });
  return body.split("\n").map((line) => `${inset}${line}`).join("\n");
};

export default renderContainerCli;
