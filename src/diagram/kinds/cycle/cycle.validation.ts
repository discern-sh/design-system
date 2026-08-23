/** Complete semantic preflight for ordered repeating cycles. */

import { DiagramValidationError } from "../../errors.ts";
import { diagramGraphemeCount } from "../../font-metrics.ts";
import {
  assertDiagramExactKeys,
  assertDiagramIdentifier,
  assertDiagramKindBudget,
  assertDiagramText,
  isDiagramRecord,
  validateDiagramCommonSpec,
} from "../../validation.ts";
import meta from "./cycle.meta.ts";
import type {
  CycleSpokeDirection,
  ValidatedCycleDiagram,
  ValidatedCycleHub,
  ValidatedCycleSpoke,
  ValidatedCycleStage,
} from "./cycle.spec.ts";

const SPOKE_DIRECTIONS: readonly CycleSpokeDirection[] = [
  "to-hub",
  "from-hub",
];

function invalid(
  code:
    | "diagram/invalid-spec"
    | "diagram/duplicate-id"
    | "diagram/dangling-reference",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new DiagramValidationError({ code, message, path, remedy, facts });
}

function assertUniqueIdentity(
  value: unknown,
  path: string,
  semanticIds: Set<string>,
): asserts value is string {
  assertDiagramIdentifier(value, path);
  if (semanticIds.has(value)) {
    invalid(
      "diagram/duplicate-id",
      `Duplicate semantic identity ${value}.`,
      path,
      "Give every stage, hub, and hub relationship one stable unique identifier.",
      { id: value },
    );
  }
  semanticIds.add(value);
}

function assertAnnotation(
  value: unknown,
  path: string,
): asserts value is string | undefined {
  if (value === undefined) return;
  assertDiagramText(value, path);
  assertDiagramKindBudget(
    meta,
    "annotationGraphemes",
    diagramGraphemeCount(value),
    path,
  );
}

/** Validate authored order, identities, references, and measurable density. */
export default function validateCycleDiagram(
  input: unknown,
): ValidatedCycleDiagram {
  const spec = validateDiagramCommonSpec(input, "cycle", [
    "kind",
    "title",
    "summary",
    "stages",
    "hub",
    "spokes",
  ]);
  if (!Array.isArray(spec.stages) || spec.stages.length < 3) {
    invalid(
      "diagram/invalid-spec",
      "spec.stages must contain at least three stages to form an unambiguous loop.",
      "spec.stages",
      "Author three or more repeating stages, or use flow for a non-repeating progression.",
    );
  }
  assertDiagramKindBudget(meta, "stages", spec.stages.length, "spec.stages");

  const semanticIds = new Set<string>();
  const stages: ValidatedCycleStage[] = [];
  for (const [index, value] of spec.stages.entries()) {
    const path = `spec.stages[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented cycle stage fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "label", "annotation"], path);
    assertUniqueIdentity(value.id, `${path}.id`, semanticIds);
    assertDiagramText(value.label, `${path}.label`);
    assertDiagramKindBudget(
      meta,
      "stageLabelGraphemes",
      diagramGraphemeCount(value.label),
      `${path}.label`,
    );
    assertAnnotation(value.annotation, `${path}.annotation`);
    stages.push(Object.freeze({
      id: value.id,
      label: value.label,
      ...(value.annotation === undefined
        ? {}
        : { annotation: value.annotation }),
      sourceOrder: index,
    }));
  }

  let hub: ValidatedCycleHub | undefined;
  if (spec.hub !== undefined) {
    const path = "spec.hub";
    if (!isDiagramRecord(spec.hub)) {
      invalid(
        "diagram/invalid-spec",
        "spec.hub must be an object.",
        path,
        "Use one stable hub identity, label, and optional annotation.",
      );
    }
    assertDiagramExactKeys(spec.hub, ["id", "label", "annotation"], path);
    assertUniqueIdentity(spec.hub.id, `${path}.id`, semanticIds);
    assertDiagramText(spec.hub.label, `${path}.label`);
    assertDiagramKindBudget(
      meta,
      "hubLabelGraphemes",
      diagramGraphemeCount(spec.hub.label),
      `${path}.label`,
    );
    assertAnnotation(spec.hub.annotation, `${path}.annotation`);
    hub = Object.freeze({
      id: spec.hub.id,
      label: spec.hub.label,
      ...(spec.hub.annotation === undefined
        ? {}
        : { annotation: spec.hub.annotation }),
    });
  }

  const rawSpokes = spec.spokes ?? [];
  if (!Array.isArray(rawSpokes)) {
    invalid(
      "diagram/invalid-spec",
      "spec.spokes must be an array when provided.",
      "spec.spokes",
      "Use a small ordered list of labelled stage-to-hub relationships.",
    );
  }
  if (rawSpokes.length > 0 && hub === undefined) {
    invalid(
      "diagram/dangling-reference",
      "spec.spokes requires a hub.",
      "spec.spokes",
      "Add the shared hub or remove its stage relationships.",
    );
  }
  assertDiagramKindBudget(meta, "spokes", rawSpokes.length, "spec.spokes");
  const stageIds = new Set(stages.map((stage) => stage.id));
  const relatedStages = new Set<string>();
  const spokes: ValidatedCycleSpoke[] = [];
  for (const [index, value] of rawSpokes.entries()) {
    const path = `spec.spokes[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented cycle hub-relationship fields.",
      );
    }
    assertDiagramExactKeys(
      value,
      ["id", "stageId", "direction", "label"],
      path,
    );
    assertUniqueIdentity(value.id, `${path}.id`, semanticIds);
    assertDiagramIdentifier(value.stageId, `${path}.stageId`);
    if (!stageIds.has(value.stageId)) {
      invalid(
        "diagram/dangling-reference",
        `${path} refers to missing stage ${value.stageId}.`,
        `${path}.stageId`,
        "Add the stage or correct the hub relationship stage identifier.",
        { missing: value.stageId },
      );
    }
    if (relatedStages.has(value.stageId)) {
      invalid(
        "diagram/invalid-spec",
        `${path} adds a second hub relationship for stage ${value.stageId}.`,
        path,
        "Combine parallel facts into one concise relationship, or split the detailed exchange into a sequence diagram.",
        { stageId: value.stageId },
      );
    }
    relatedStages.add(value.stageId);
    if (
      typeof value.direction !== "string" ||
      !SPOKE_DIRECTIONS.includes(value.direction as CycleSpokeDirection)
    ) {
      invalid(
        "diagram/invalid-spec",
        `${path}.direction must be one of ${SPOKE_DIRECTIONS.join(", ")}.`,
        `${path}.direction`,
        "Choose whether the named fact moves to the hub or from the hub.",
      );
    }
    assertDiagramText(value.label, `${path}.label`);
    assertDiagramKindBudget(
      meta,
      "spokeLabelGraphemes",
      diagramGraphemeCount(value.label),
      `${path}.label`,
    );
    spokes.push(Object.freeze({
      id: value.id,
      stageId: value.stageId,
      direction: value.direction as CycleSpokeDirection,
      label: value.label,
      sourceOrder: index,
    }));
  }

  const totalText = diagramGraphemeCount(spec.title) +
    diagramGraphemeCount(spec.summary) +
    stages.reduce(
      (sum, stage) =>
        sum + diagramGraphemeCount(stage.label) +
        (stage.annotation === undefined
          ? 0
          : diagramGraphemeCount(stage.annotation)),
      0,
    ) +
    (hub === undefined ? 0 : diagramGraphemeCount(hub.label) +
      (hub.annotation === undefined
        ? 0
        : diagramGraphemeCount(hub.annotation))) +
    spokes.reduce(
      (sum, spoke) => sum + diagramGraphemeCount(spoke.label),
      0,
    );
  assertDiagramKindBudget(meta, "totalTextGraphemes", totalText, "spec");

  return Object.freeze({
    kind: "cycle",
    title: spec.title,
    summary: spec.summary,
    stages: Object.freeze(stages),
    ...(hub === undefined ? {} : { hub }),
    spokes: Object.freeze(spokes),
  });
}
