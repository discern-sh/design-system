/**
 * Discern triangle motifs for pure, capability-aware terminal rendering.
 *
 * @module
 */

import { renderStyledSpans, type StyledSpan, styleText } from "./ansi.ts";
import type { TerminalCapabilities } from "./capabilities.ts";
import type { SequentialStepStatus } from "./interactive-states.ts";
import { measureText, truncateText } from "./text.ts";
import {
  type TerminalSemanticTone,
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "./theme.ts";

/** The four package-owned Unicode triangle marks, named by orientation. */
export const DISCERN_TRIANGLE_GLYPHS = {
  upRight: "◮",
  upLeft: "◭",
  downLeft: "⧨",
  downRight: "⧩",
} as const;

/** Intentional ASCII orientations used when Unicode is unavailable. */
export const DISCERN_TRIANGLE_ASCII_GLYPHS = {
  upRight: ">",
  upLeft: "^",
  downLeft: "<",
  downRight: "v",
} as const;

/** Canonical tessellating order used by rules, fields, and progress fills. */
export const DISCERN_TRIANGLE_WEAVE_ORDER = [
  "upRight",
  "downRight",
  "upLeft",
  "downLeft",
] as const;

/** Canonical rotational order used by indeterminate activity indicators. */
export const DISCERN_TRIANGLE_SPINNER_ORDER = [
  "upRight",
  "upLeft",
  "downLeft",
  "downRight",
] as const;

/** Axis along which a triangle pattern advances. */
export type TrianglePatternOrientation = "horizontal" | "vertical";

/** Direction in which a triangle motif reads. */
export type TriangleDirection = "forward" | "reverse";

/** Shared theme selection for triangle motifs. */
export interface TriangleThemeOptions {
  readonly theme?: TerminalThemeVariant;
}

/** Inputs for a horizontal, vertical, or thick triangle tessellation. */
export interface TrianglePatternOptions extends TriangleThemeOptions {
  readonly length: number;
  readonly orientation?: TrianglePatternOrientation;
  readonly thickness?: number;
  readonly phase?: number;
  readonly direction?: TriangleDirection;
  readonly tone?: TerminalSemanticTone;
}

/** Inputs for one truthful determinate progress frame. */
export interface TriangleProgressOptions extends TriangleThemeOptions {
  readonly completed: number;
  readonly total: number;
  /** Total visible frame width, including the percentage label. */
  readonly width: number;
}

/** Inputs for a centered labeled triangle rule. */
export interface TriangleSectionRuleOptions extends TriangleThemeOptions {
  readonly width: number;
  readonly phase?: number;
  readonly direction?: TriangleDirection;
}

/** One semantic workflow step rendered by the triangle stepper. */
export interface TriangleWorkflowStep {
  readonly label: string;
  readonly status: SequentialStepStatus;
  /** Spinner phase used while this step is active. */
  readonly phase?: number;
}

/** Theme selection for a triangle workflow rail. */
export interface TriangleWorkflowOptions extends TriangleThemeOptions {}

/** Inputs for one moving triangle activity beacon. */
export interface TriangleBeaconOptions extends TriangleThemeOptions {
  readonly width: number;
  /** Semantic animation phase; the renderer derives the packet position. */
  readonly phase: number;
  readonly direction?: TriangleDirection;
}

type TriangleName = keyof typeof DISCERN_TRIANGLE_GLYPHS;
type TriangleGlyphSet = Readonly<Record<TriangleName, string>>;

function assertInteger(value: number, name: string, minimum?: number): void {
  if (
    !Number.isSafeInteger(value) || (minimum !== undefined && value < minimum)
  ) {
    const bound = minimum === undefined
      ? "a safe integer"
      : `a safe integer of at least ${minimum}`;
    throw new TypeError(`${name} must be ${bound}; received ${value}`);
  }
}

function normalizedIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function themeFor(variant: TerminalThemeVariant | undefined): TerminalTheme {
  return terminalThemes[variant ?? "dark"];
}

function glyphSet(capabilities: TerminalCapabilities): TriangleGlyphSet {
  return capabilities.unicode
    ? DISCERN_TRIANGLE_GLYPHS
    : DISCERN_TRIANGLE_ASCII_GLYPHS;
}

function weaveNames(direction: TriangleDirection): readonly TriangleName[] {
  return direction === "forward"
    ? DISCERN_TRIANGLE_WEAVE_ORDER
    : ["downLeft", "upLeft", "downRight", "upRight"];
}

function renderCycle(
  length: number,
  phase: number,
  direction: TriangleDirection,
  capabilities: TerminalCapabilities,
): string {
  const names = weaveNames(direction);
  const glyphs = glyphSet(capabilities);
  return Array.from({ length }, (_, index) => {
    const name = names[normalizedIndex(phase + index, names.length)] ??
      "upRight";
    return glyphs[name];
  }).join("");
}

function motifColor(
  theme: TerminalTheme,
  tone: TerminalSemanticTone,
): ReturnType<typeof terminalToneColor> {
  return terminalToneColor(theme, tone);
}

/** Render a configurable package-authoritative triangle pattern. */
export function renderTrianglePattern(
  options: TrianglePatternOptions,
  capabilities: TerminalCapabilities,
): string {
  assertInteger(options.length, "triangle pattern length", 1);
  const thickness = options.thickness ?? 1;
  const phase = options.phase ?? 0;
  assertInteger(thickness, "triangle pattern thickness", 1);
  assertInteger(phase, "triangle pattern phase");
  const orientation = options.orientation ?? "horizontal";
  const direction = options.direction ?? "forward";
  const raw = orientation === "horizontal"
    ? Array.from(
      { length: thickness },
      (_, row) =>
        renderCycle(options.length, phase - (row % 2), direction, capabilities),
    ).join("\n")
    : Array.from(
      { length: options.length },
      (_, row) => renderCycle(thickness, phase + row, direction, capabilities),
    ).join("\n");
  return styleText(
    raw,
    { color: motifColor(themeFor(options.theme), options.tone ?? "accent") },
    capabilities,
  );
}

/** Render one canonical indeterminate spinner phase. */
export function renderTriangleSpinnerFrame(
  phase: number,
  capabilities: TerminalCapabilities,
  options: TriangleThemeOptions = {},
): string {
  assertInteger(phase, "triangle spinner phase");
  const name = DISCERN_TRIANGLE_SPINNER_ORDER[
    normalizedIndex(phase, DISCERN_TRIANGLE_SPINNER_ORDER.length)
  ] ?? DISCERN_TRIANGLE_SPINNER_ORDER[0];
  return styleText(
    glyphSet(capabilities)[name],
    { color: motifColor(themeFor(options.theme), "accent") },
    capabilities,
  );
}

function proportionalFloor(
  completed: number,
  total: number,
  units: number,
): number {
  const multiplied = completed * units;
  const scaled = Number.isFinite(multiplied)
    ? multiplied / total
    : completed / total * units;
  return Math.min(units, Math.floor(scaled));
}

/** Render zero-to-complete determinate progress without overstating completion. */
export function renderTriangleProgressFrame(
  options: TriangleProgressOptions,
  capabilities: TerminalCapabilities,
): string {
  if (!Number.isFinite(options.total) || options.total <= 0) {
    throw new TypeError(
      `triangle progress total must be positive and finite; received ${options.total}`,
    );
  }
  if (
    !Number.isFinite(options.completed) || options.completed < 0 ||
    options.completed > options.total
  ) {
    throw new TypeError(
      `triangle progress completed must be between 0 and ${options.total}; received ${options.completed}`,
    );
  }
  assertInteger(options.width, "triangle progress width", 1);
  const width = Math.min(options.width, capabilities.columns);
  const percentage = proportionalFloor(options.completed, options.total, 100);
  const label = `[${String(percentage).padStart(3)}%] `;
  const trackWidth = width - measureText(label);
  if (trackWidth < 1) {
    throw new TypeError(
      `triangle progress width must be at least ${
        measureText(label) + 1
      }; received ${width}`,
    );
  }
  const filled = proportionalFloor(
    options.completed,
    options.total,
    trackWidth,
  );
  const theme = themeFor(options.theme);
  const filledTone = options.completed === options.total ? "success" : "accent";
  return renderStyledSpans([
    { text: label, style: theme.typography.annotation },
    {
      text: renderCycle(filled, 0, "forward", capabilities),
      style: { color: motifColor(theme, filledTone) },
    },
    {
      text: ".".repeat(trackWidth - filled),
      style: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        dim: true,
      },
    },
  ], capabilities);
}

/** Render a centered label between canonical and reflected triangle arms. */
export function renderTriangleSectionRule(
  label: string,
  options: TriangleSectionRuleOptions,
  capabilities: TerminalCapabilities,
): string {
  if (label === "" || label.trim() !== label || /[\p{Cc}\p{Cf}]/u.test(label)) {
    throw new TypeError(
      "triangle section label must be non-empty, trimmed, and control-free",
    );
  }
  assertInteger(options.width, "triangle section-rule width", 1);
  const phase = options.phase ?? 0;
  assertInteger(phase, "triangle section-rule phase");
  const width = Math.min(options.width, capabilities.columns);
  const theme = themeFor(options.theme);
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const labelWidth = measureText(label);
  const armCells = width - labelWidth - 2 * measureText(gap);
  if (armCells < 2) {
    throw new TypeError(
      `triangle section-rule width ${width} cannot hold ${
        JSON.stringify(label)
      }`,
    );
  }
  const leftCells = Math.floor(armCells / 2);
  const rightCells = armCells - leftCells;
  const left = renderCycle(
    leftCells,
    phase,
    options.direction ?? "forward",
    capabilities,
  );
  const right = [...left].reverse().join("") +
    (rightCells > leftCells
      ? renderCycle(1, phase - 1, options.direction ?? "forward", capabilities)
      : "");
  const armStyle = { color: motifColor(theme, "accent") } as const;
  return renderStyledSpans([
    { text: left, style: armStyle },
    { text: gap },
    {
      text: label,
      style: {
        ...theme.typography.strong,
        color: terminalThemeColor(theme, "--discern-color-ink"),
      },
    },
    { text: gap },
    { text: right, style: armStyle },
  ], capabilities);
}

function stepMarker(
  step: TriangleWorkflowStep,
  index: number,
  capabilities: TerminalCapabilities,
  theme: TerminalTheme,
): StyledSpan {
  const phase = step.phase ?? index;
  assertInteger(phase, `triangle workflow step ${index + 1} phase`);
  if (step.status === "active") {
    const raw = `[${
      stripStyle(
        renderTriangleSpinnerFrame(phase, {
          ...capabilities,
          colorDepth: "none",
        }),
      )
    }]`;
    return {
      text: raw,
      style: { color: motifColor(theme, "accent"), bold: true },
    };
  }
  if (step.status === "complete") {
    return {
      text: renderCycle(1, phase, "forward", capabilities),
      style: { color: motifColor(theme, "success") },
    };
  }
  if (step.status === "error") {
    return {
      text: "!",
      style: { color: motifColor(theme, "danger"), bold: true },
    };
  }
  if (step.status === "cancelled") {
    return {
      text: capabilities.unicode ? "×" : "x",
      style: { color: motifColor(theme, "neutral"), dim: true },
    };
  }
  return {
    text: capabilities.unicode ? "·" : ".",
    style: {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      dim: true,
    },
  };
}

function stripStyle(value: string): string {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "gu"),
    "",
  );
}

/** Render semantic workflow step states on a vertical triangle rail. */
export function renderTriangleWorkflowStepper(
  steps: readonly TriangleWorkflowStep[],
  capabilities: TerminalCapabilities,
  options: TriangleWorkflowOptions = {},
): string {
  if (steps.length === 0) {
    throw new TypeError("triangle workflow requires at least one step");
  }
  const theme = themeFor(options.theme);
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const lines: string[] = [];
  for (const [index, step] of steps.entries()) {
    if (step.label === "" || /[\p{Cc}\p{Cf}]/u.test(step.label)) {
      throw new TypeError(
        `triangle workflow step ${index + 1} has an invalid label`,
      );
    }
    const marker = stepMarker(step, index, capabilities, theme);
    const labelWidth = Math.max(
      1,
      capabilities.columns - measureText(marker.text) - measureText(gap),
    );
    const label = truncateText(
      step.label,
      labelWidth,
      capabilities.unicode ? "…" : ".",
    );
    lines.push(renderStyledSpans([
      marker,
      { text: gap },
      step.status === "pending"
        ? { text: label, style: theme.typography.muted }
        : { text: label },
    ], capabilities));
    if (index < steps.length - 1) {
      lines.push(styleText(
        capabilities.unicode ? "│" : "|",
        {
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
          dim: true,
        },
        capabilities,
      ));
    }
  }
  return lines.join("\n");
}

/** Render a four-glyph activity packet whose position derives from its phase. */
export function renderTriangleActivityBeacon(
  options: TriangleBeaconOptions,
  capabilities: TerminalCapabilities,
): string {
  assertInteger(options.width, "triangle beacon width", 4);
  assertInteger(options.phase, "triangle beacon phase");
  const width = Math.min(options.width, capabilities.columns);
  if (width < 4) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold a triangle beacon`,
    );
  }
  const maximumOffset = width - DISCERN_TRIANGLE_WEAVE_ORDER.length;
  const journey = Math.max(1, maximumOffset * 2);
  const cursor = normalizedIndex(options.phase, journey);
  let offset = cursor <= maximumOffset ? cursor : journey - cursor;
  if ((options.direction ?? "forward") === "reverse") {
    offset = maximumOffset - offset;
  }
  const theme = themeFor(options.theme);
  return renderStyledSpans([
    {
      text: ".".repeat(offset),
      style: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        dim: true,
      },
    },
    {
      text: renderCycle(
        4,
        options.phase,
        options.direction ?? "forward",
        capabilities,
      ),
      style: { color: motifColor(theme, "accent") },
    },
    {
      text: ".".repeat(maximumOffset - offset),
      style: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        dim: true,
      },
    },
  ], capabilities);
}
