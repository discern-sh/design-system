/**
 * Pure terminal renderer and deterministic example states for File change.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type {
  FileChangeMagnitude,
  FileDisposition,
} from "./file-change.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowPathText,
} from "../workflow-cli.ts";

const labels: Readonly<Record<FileDisposition, string>> = {
  added: "Added",
  updated: "Updated",
  generated: "Generated",
  removed: "Removed",
  unchanged: "Unchanged",
};

const tones: Readonly<Record<FileDisposition, TerminalSemanticTone>> = {
  added: "success",
  updated: "accent",
  generated: "neutral",
  removed: "danger",
  unchanged: "neutral",
};

/** Inputs accepted by the terminal File change renderer. */
export interface FileChangeCliProps {
  readonly path: string;
  readonly disposition: FileDisposition;
  readonly magnitude?: FileChangeMagnitude;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic File change states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<FileChangeCliProps>[] = [
  {
    name: "updated",
    props: {
      path: "src/components/workflow/command/command.cli.ts",
      disposition: "updated",
      magnitude: { added: 24, removed: 3 },
    },
  },
  {
    name: "generated",
    props: { path: "src/generated/cli-renderers.ts", disposition: "generated" },
  },
] as const;

/** Render one file disposition, suffix-preserving path, and optional diffstat. */
const renderFileChangeCli: CliRenderer<FileChangeCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.path, "file change path");
  const width = workflowCliWidth(props.maxWidth, capabilities, 13);
  if (
    props.magnitude !== undefined &&
    (!Number.isSafeInteger(props.magnitude.added) ||
      props.magnitude.added < 0 ||
      !Number.isSafeInteger(props.magnitude.removed) ||
      props.magnitude.removed < 0)
  ) {
    throw new TypeError(
      "file change magnitude must contain non-negative safe integers",
    );
  }
  const unicodeMarkers: Readonly<Record<FileDisposition, string>> = {
    added: "+",
    updated: "~",
    generated: "◇",
    removed: "−",
    unchanged: "=",
  };
  const asciiMarkers: Readonly<Record<FileDisposition, string>> = {
    ...unicodeMarkers,
    generated: "*",
    removed: "-",
  };
  const marker = (capabilities.unicode ? unicodeMarkers : asciiMarkers)[
    props.disposition
  ];
  const prefix = `${marker} ${labels[props.disposition]} `;
  const suffix = props.magnitude === undefined
    ? ""
    : ` +${props.magnitude.added} -${props.magnitude.removed}`;
  const inlineMagnitude = prefix.length + suffix.length + 1 <= width;
  const pathWidth = Math.max(
    1,
    width - prefix.length - (inlineMagnitude ? suffix.length : 0),
  );
  const frame = `${prefix}${
    workflowPathText(props.path, pathWidth, capabilities)
  }${inlineMagnitude ? suffix : suffix === "" ? "" : `\n  ${suffix.trim()}`}`;
  return styleWorkflowHeading(
    frame,
    tones[props.disposition],
    capabilities,
    props.theme,
  );
};

export default renderFileChangeCli;
