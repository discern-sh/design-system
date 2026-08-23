/**
 * Projection-neutral paired style bundles for diagram scene roles.
 *
 * @module
 */

import type {
  DiagramConnectorStyleRole,
  DiagramNodeStyleRole,
  DiagramPaintRole,
} from "./scene.ts";

/** Public Token name that resolves one projection-neutral paint role. */
export type DiagramPaintTokenName = `--discern-diagram-${string}`;

/**
 * One Token authority for every diagram paint role. Live projections use the
 * custom-property names; standalone projections resolve the same names to
 * literal light or dark values.
 */
export const DIAGRAM_PAINT_TOKEN_NAMES = Object.freeze(
  {
    canvas: "--discern-diagram-canvas",
    "node-surface": "--discern-diagram-node-surface",
    "node-border": "--discern-diagram-node-border",
    "node-text": "--discern-diagram-primary-ink",
    "quiet-annotation": "--discern-diagram-annotation-ink",
    accent: "--discern-diagram-accent",
    focus: "--discern-diagram-focus",
    success: "--discern-diagram-success",
    warning: "--discern-diagram-warning",
    "primary-connector": "--discern-diagram-connector-primary",
    "secondary-connector": "--discern-diagram-connector-secondary",
    "return-connector": "--discern-diagram-connector-return",
    guide: "--discern-diagram-guide",
  } as const satisfies Readonly<
    Record<DiagramPaintRole, DiagramPaintTokenName>
  >,
);

/** Paint and non-colour cues that always travel together for a node. */
export interface DiagramNodeStyleBundle {
  readonly surface: DiagramPaintRole;
  readonly border: DiagramPaintRole;
  readonly text: DiagramPaintRole;
  readonly annotation: DiagramPaintRole;
  readonly cue: "plain" | "diamond" | "capsule" | "double-border";
}

/** Stroke, marker, and line treatment that always travel together. */
export interface DiagramConnectorStyleBundle {
  readonly stroke: DiagramPaintRole;
  readonly marker: DiagramPaintRole;
  readonly treatment: "solid" | "dashed";
}

/** One authority for every semantic node-style bundle. */
export const DIAGRAM_NODE_STYLE_BUNDLES = Object.freeze(
  {
    ordinary: Object.freeze({
      surface: "node-surface",
      border: "node-border",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "plain",
    }),
    decision: Object.freeze({
      surface: "node-surface",
      border: "focus",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "diamond",
    }),
    start: Object.freeze({
      surface: "node-surface",
      border: "accent",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "capsule",
    }),
    end: Object.freeze({
      surface: "node-surface",
      border: "success",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "double-border",
    }),
    focus: Object.freeze({
      surface: "node-surface",
      border: "focus",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "plain",
    }),
    success: Object.freeze({
      surface: "node-surface",
      border: "success",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "plain",
    }),
    warning: Object.freeze({
      surface: "node-surface",
      border: "warning",
      text: "node-text",
      annotation: "quiet-annotation",
      cue: "plain",
    }),
  } as const satisfies Readonly<
    Record<DiagramNodeStyleRole, DiagramNodeStyleBundle>
  >,
);

/** One authority for every semantic connector-style bundle. */
export const DIAGRAM_CONNECTOR_STYLE_BUNDLES = Object.freeze(
  {
    primary: Object.freeze({
      stroke: "primary-connector",
      marker: "primary-connector",
      treatment: "solid",
    }),
    secondary: Object.freeze({
      stroke: "secondary-connector",
      marker: "secondary-connector",
      treatment: "dashed",
    }),
    return: Object.freeze({
      stroke: "return-connector",
      marker: "return-connector",
      treatment: "dashed",
    }),
  } as const satisfies Readonly<
    Record<DiagramConnectorStyleRole, DiagramConnectorStyleBundle>
  >,
);
