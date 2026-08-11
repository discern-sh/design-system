/**
 * Pure terminal renderer and deterministic example states for Diagnostic.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type { DiagnosticSeverity } from "./diagnostic.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowIndentedLines,
  workflowPathText,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Diagnostic renderer. */
export interface DiagnosticCliProps {
  readonly title: string;
  readonly impact: string;
  readonly correction: string;
  readonly severity?: DiagnosticSeverity;
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
  readonly evidence?: string;
  readonly reproductionCommand?: string;
  readonly retryCommand?: string;
  readonly workingDirectory?: string;
  readonly rawDetail?: string;
  readonly rawLabel?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Diagnostic states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DiagnosticCliProps>[] = [
  {
    name: "failure",
    props: {
      title: "Type check failed",
      impact: "The public CLI export cannot be consumed.",
      correction: "Export the missing renderer type.",
      path: "src/generated/cli-renderers.ts",
      line: 12,
      column: 4,
      reproductionCommand: "deno task typecheck",
    },
  },
  {
    name: "attention",
    props: {
      title: "Standard is near its ceiling",
      impact: "The next change may regress the gate.",
      correction: "Remove pending CLI stances.",
      severity: "attention",
    },
  },
] as const;

function assertCoordinate(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

/** Render one located, evidenced, reproducible terminal finding. */
const renderDiagnosticCli: CliRenderer<DiagnosticCliProps> = (
  props,
  capabilities,
) => {
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const severity = props.severity ?? "failure";
  for (
    const [name, value] of [
      ["title", props.title],
      ["impact", props.impact],
      ["correction", props.correction],
    ] as const
  ) {
    assertWorkflowCliText(value, `diagnostic ${name}`, true);
  }
  assertCoordinate(props.line, "diagnostic line");
  assertCoordinate(props.column, "diagnostic column");
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines(
        `${severity === "failure" ? "FAILURE" : "ATTENTION"}: `,
        props.title,
        width,
      ).join("\n"),
      severity === "failure" ? "danger" : "warning",
      capabilities,
      props.theme,
    ),
    ...workflowFactLines("Why", props.impact, width),
  ];
  if (props.path !== undefined) {
    assertWorkflowCliText(props.path, "diagnostic path");
    const coordinates = [
      props.line === undefined ? "" : String(props.line),
      props.column === undefined ? "" : String(props.column),
    ].filter((value) => value !== "").join(":");
    const suffix = coordinates === "" ? "" : `:${coordinates}`;
    lines.push(...workflowFactLines(
      "At",
      `${
        workflowPathText(
          props.path,
          Math.max(1, width - 4 - suffix.length),
          capabilities,
        )
      }${suffix}`,
      width,
    ));
  }
  if (props.evidence !== undefined) {
    assertWorkflowCliText(props.evidence, "diagnostic evidence", true);
    lines.push("Evidence:", ...workflowIndentedLines(props.evidence, width));
  }
  if (props.workingDirectory !== undefined) {
    assertWorkflowCliText(
      props.workingDirectory,
      "diagnostic working directory",
    );
    lines.push(...workflowFactLines("Run in", props.workingDirectory, width));
  }
  if (props.reproductionCommand !== undefined) {
    assertWorkflowCliText(
      props.reproductionCommand,
      "diagnostic reproduction command",
      true,
    );
    lines.push(
      ...workflowFactLines(
        "Reproduce",
        `$ ${props.reproductionCommand}`,
        width,
      ),
    );
  }
  lines.push(...workflowFactLines("Fix", props.correction, width));
  if (props.retryCommand !== undefined) {
    assertWorkflowCliText(props.retryCommand, "diagnostic retry command", true);
    lines.push(...workflowFactLines("Retry", `$ ${props.retryCommand}`, width));
  }
  if (props.rawDetail !== undefined) {
    assertWorkflowCliText(props.rawDetail, "diagnostic raw detail", true);
    const label = props.rawLabel ?? "Raw output";
    assertWorkflowCliText(label, "diagnostic raw label");
    lines.push(`${capabilities.unicode ? "▾" : "v"} ${label}`);
    lines.push(...workflowIndentedLines(props.rawDetail, width));
  }
  return lines.join("\n");
};

export default renderDiagnosticCli;
