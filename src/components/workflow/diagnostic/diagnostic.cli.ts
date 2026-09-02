/**
 * Pure terminal renderer and deterministic example states for Diagnostic.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type { DiagnosticSeverity } from "./diagnostic.types.ts";
import meta, { componentExampleVocabulary } from "./diagnostic.meta.ts";
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
export interface DiagnosticCliProps extends CliPresentationOptions {
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
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "verbose-failure",
    props: {
      title: "Type check failed",
      impact:
        "The package cannot be built until the incompatible value is corrected.",
      correction:
        'Handle the "pending" case before assigning the value, then rerun the type check.',
      path: "src/config/loader.ts",
      line: 118,
      column: 17,
      reproductionCommand: "deno task typecheck",
      evidence:
        'Type "pending" | "complete" is not assignable to type "complete".',
      retryCommand: "deno task typecheck --reload",
      workingDirectory: "/path/to/project",
      rawDetail:
        'TS2322 [ERROR]: Type "pending" | "complete" is not assignable to type "complete".\n    at src/config/loader.ts:118:17\nFound 1 error.',
      maxWidth: 48,
    },
  },
  {
    name: "attention",
    props: {
      title: "Generated output is stale",
      impact: "The checked-in surface may not match its authored metadata.",
      correction:
        "Regenerate the derived files and inspect the resulting diff.",
      severity: "attention",
    },
  },
] as const satisfies readonly CliExample<DiagnosticCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Diagnostic states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DiagnosticCliProps>[] =
  cliExampleImplementations;

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
      props,
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
    lines.push(
      `${
        triangleGlyph(TRIANGLES.filledSmall.down, capabilities.unicode)
      } ${label}`,
    );
    lines.push(...workflowIndentedLines(props.rawDetail, width));
  }
  return lines.join("\n");
};

export default renderDiagnosticCli;
