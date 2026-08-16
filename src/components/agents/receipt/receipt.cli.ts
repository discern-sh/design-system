/**
 * Pure terminal renderer and deterministic example states for Receipt.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { ReceiptCheckState, ReceiptStamp } from "./receipt.types.ts";
import {
  agentsCliTheme,
  agentsCliWidth,
  assertAgentsCliText,
} from "../agents-cli.ts";

/** One framework-neutral metadata row accepted by the terminal Receipt. */
export interface ReceiptCliMeta {
  readonly label: string;
  readonly value: string;
}

/** One framework-neutral check row accepted by the terminal Receipt. */
export interface ReceiptCliCheck {
  readonly label: string;
  readonly state: ReceiptCheckState;
  readonly stateLabel?: string;
  readonly value?: string;
}

/** Inputs accepted by the terminal Receipt renderer. */
export interface ReceiptCliProps {
  readonly title: string;
  readonly stamp?: ReceiptStamp;
  readonly meta?: readonly ReceiptCliMeta[];
  readonly checks?: readonly ReceiptCliCheck[];
  readonly summary?: string;
  readonly footer?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Receipt states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ReceiptCliProps>[] = [
  {
    name: "gate",
    props: {
      title: "Gate proof",
      stamp: "pass",
      meta: [
        { label: "Branch", value: "agent/cli-2b" },
        { label: "Commit", value: "abc1234" },
      ],
      checks: [
        { label: "Typecheck", state: "pass" },
        { label: "Tests", state: "pass", value: "310" },
      ],
      summary: "All required checks passed.",
    },
  },
] as const;

function checkGlyph(state: ReceiptCheckState, unicode: boolean): string {
  if (state === "pass") return unicode ? "✓" : "+";
  if (state === "fail") return unicode ? "✕" : "x";
  return unicode ? "–" : "-";
}

function checkLine(
  check: ReceiptCliCheck,
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

/** Render one boxed proof-of-work receipt with exact dot leaders. */
const renderReceiptCli: CliRenderer<ReceiptCliProps> = (
  props,
  capabilities,
) => {
  assertAgentsCliText(props.title, "receipt title");
  const width = agentsCliWidth(props.maxWidth, capabilities, 20);
  const innerWidth = width - 4;
  const body: string[] = [];
  for (const [index, row] of props.meta?.entries() ?? []) {
    assertAgentsCliText(row.label, `receipt metadata ${index + 1} label`);
    assertAgentsCliText(row.value, `receipt metadata ${index + 1} value`, true);
    body.push(`${row.label}: ${row.value}`);
  }
  if ((props.meta?.length ?? 0) > 0 && (props.checks?.length ?? 0) > 0) {
    body.push("");
  }
  for (const [index, check] of props.checks?.entries() ?? []) {
    assertAgentsCliText(check.label, `receipt check ${index + 1} label`);
    if (check.stateLabel !== undefined) {
      assertAgentsCliText(
        check.stateLabel,
        `receipt check ${index + 1} state label`,
      );
    }
    if (check.value !== undefined) {
      assertAgentsCliText(check.value, `receipt check ${index + 1} value`);
    }
    body.push(checkLine(check, innerWidth, capabilities.unicode));
  }
  if (props.summary !== undefined) {
    assertAgentsCliText(props.summary, "receipt summary", true);
    body.push("", props.summary);
  }
  if (props.footer !== undefined) {
    assertAgentsCliText(props.footer, "receipt footer", true);
    body.push("", props.footer);
  }
  if (body.length === 0) body.push("No receipt detail");
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

export default renderReceiptCli;
