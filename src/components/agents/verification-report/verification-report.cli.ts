/**
 * Pure terminal renderer and deterministic example states for Verification report.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type {
  VerificationReportCheckState,
  VerificationReportStamp,
} from "./verification-report.types.ts";
import meta, {
  componentExampleVocabulary,
} from "./verification-report.meta.ts";
import {
  agentsCliTheme,
  agentsCliWidth,
  assertAgentsCliText,
} from "../agents-cli.ts";

/** One framework-neutral metadata row accepted by the terminal Verification report. */
export interface VerificationReportCliMeta {
  readonly label: string;
  readonly value: string;
}

/** One framework-neutral check row accepted by the terminal Verification report. */
export interface VerificationReportCliCheck {
  readonly label: string;
  readonly state: VerificationReportCheckState;
  readonly stateLabel?: string;
  readonly value?: string;
}

/** Inputs accepted by the terminal Verification report renderer. */
export interface VerificationReportCliProps {
  readonly title: string;
  readonly stamp?: VerificationReportStamp;
  readonly meta?: readonly VerificationReportCliMeta[];
  readonly checks?: readonly VerificationReportCliCheck[];
  readonly summary?: string;
  readonly footer?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      title: "Checkout refactor",
      stamp: "pass",
      meta: [
        { label: "Branch", value: "agent/checkout-flow" },
        { label: "Commit", value: "4f2c9d1" },
      ],
      checks: [
        { label: "Format", state: "pass" },
        { label: "Types", state: "pass" },
        { label: "Tests", state: "pass", value: "184 passed" },
      ],
      summary: "Ready for review",
    },
  },
  {
    name: "failure",
    props: {
      title: "Payment step",
      stamp: "fail",
      checks: [
        { label: "Format", state: "pass" },
        { label: "Types", state: "pass" },
        { label: "Tests", state: "fail", value: "2 of 184 failing" },
        { label: "Preview", state: "skip" },
      ],
      footer: "Fix the failing cases before handing off.",
    },
  },
] as const satisfies readonly CliExample<VerificationReportCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Verification report states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<VerificationReportCliProps>[] =
  cliExampleImplementations;

function checkGlyph(
  state: VerificationReportCheckState,
  unicode: boolean,
): string {
  if (state === "pass") return unicode ? "✓" : "+";
  if (state === "fail") return unicode ? "✕" : "x";
  return unicode ? "–" : "-";
}

function checkLine(
  check: VerificationReportCliCheck,
  innerWidth: number,
  unicode: boolean,
): string {
  const glyph = checkGlyph(check.state, unicode);
  const suffix = [
    check.value,
    glyph,
    check.stateLabel ?? check.state,
  ].filter((value): value is string => value !== undefined).join(" ");
  const labelWidth = Math.max(1, innerWidth - measureText(suffix) - 3);
  const label = truncateText(check.label, labelWidth, unicode ? "…" : ".");
  const leaders = ".".repeat(
    Math.max(1, innerWidth - measureText(label) - measureText(suffix) - 2),
  );
  return `${label} ${leaders} ${suffix}`;
}

/** Render one boxed Verification report with exact dot leaders. */
const renderVerificationReportCli: CliRenderer<VerificationReportCliProps> = (
  props,
  capabilities,
) => {
  assertAgentsCliText(props.title, "verification report title");
  const width = agentsCliWidth(props.maxWidth, capabilities, 20);
  const innerWidth = width - 4;
  const body: string[] = [];
  for (const [index, row] of props.meta?.entries() ?? []) {
    assertAgentsCliText(
      row.label,
      `verification report metadata ${index + 1} label`,
    );
    assertAgentsCliText(
      row.value,
      `verification report metadata ${index + 1} value`,
      true,
    );
    body.push(`${row.label}: ${row.value}`);
  }
  if ((props.meta?.length ?? 0) > 0 && (props.checks?.length ?? 0) > 0) {
    body.push("");
  }
  for (const [index, check] of props.checks?.entries() ?? []) {
    assertAgentsCliText(
      check.label,
      `verification report check ${index + 1} label`,
    );
    if (check.stateLabel !== undefined) {
      assertAgentsCliText(
        check.stateLabel,
        `verification report check ${index + 1} state label`,
      );
    }
    if (check.value !== undefined) {
      assertAgentsCliText(
        check.value,
        `verification report check ${index + 1} value`,
      );
    }
    body.push(checkLine(check, innerWidth, capabilities.unicode));
  }
  if (props.summary !== undefined) {
    assertAgentsCliText(props.summary, "verification report summary", true);
    body.push("", props.summary);
  }
  if (props.footer !== undefined) {
    assertAgentsCliText(props.footer, "verification report footer", true);
    body.push("", props.footer);
  }
  if (body.length === 0) body.push("No verification detail");
  const theme = agentsCliTheme(props.theme);
  const tone = props.stamp === "pass"
    ? "success"
    : props.stamp === "fail"
    ? "danger"
    : "neutral";
  const stamp = props.stamp === undefined
    ? ""
    : `[${checkGlyph(props.stamp, capabilities.unicode)}] `;
  return renderBox(
    {
      title: `${stamp}${props.title}`,
      body: body.join("\n"),
      width,
      borderStyle: { color: terminalToneColor(theme, tone) },
    },
    capabilities,
  );
};

export default renderVerificationReportCli;
