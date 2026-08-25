/** Complete semantic preflight for deterministic half-open calendar plans. */

import {
  isoDateFromOrdinal,
  parseIsoCalendarDate,
} from "../../../internal/iso-date.ts";
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
import meta from "./timeline.meta.ts";
import type {
  TimelineMilestoneEmphasis,
  ValidatedTimelineDate,
  ValidatedTimelineDiagram,
  ValidatedTimelineGroup,
  ValidatedTimelineMilestone,
  ValidatedTimelineRow,
  ValidatedTimelineTask,
} from "./timeline.spec.ts";

const MILESTONE_EMPHASES: readonly TimelineMilestoneEmphasis[] = [
  "standard",
  "critical",
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

/** Parse one canonical ISO calendar date without Date, locale, or timezone. */
export function parseTimelineIsoDate(
  value: unknown,
  path: string,
): ValidatedTimelineDate {
  if (typeof value !== "string") {
    invalid(
      "diagram/invalid-spec",
      `${path} must be an ISO calendar date in YYYY-MM-DD form.`,
      path,
      "Use a real Gregorian calendar date such as 2028-02-29.",
    );
  }
  const parsed = parseIsoCalendarDate(value);
  if (parsed === "malformed") {
    invalid(
      "diagram/invalid-spec",
      `${path} must be an ISO calendar date in YYYY-MM-DD form.`,
      path,
      "Use a zero-padded Gregorian calendar date such as 2028-02-29.",
    );
  }
  if (parsed === "not-a-real-date") {
    invalid(
      "diagram/invalid-spec",
      `${path} is not a real Gregorian calendar date.`,
      path,
      "Correct the year, month, and day without relying on timezone rollover.",
      { date: value },
    );
  }
  return parsed;
}

/** Format a validated Gregorian ordinal without ambient date facilities. */
export function timelineIsoFromOrdinal(ordinal: number): string {
  return isoDateFromOrdinal(ordinal, "Timeline");
}

function addIdentity(
  ids: Set<string>,
  value: unknown,
  path: string,
): string {
  assertDiagramIdentifier(value, path);
  if (ids.has(value)) {
    invalid(
      "diagram/duplicate-id",
      `Duplicate semantic identity ${value}.`,
      path,
      "Give every group, row, task, and milestone one stable unique identifier.",
      { id: value },
    );
  }
  ids.add(value);
  return value;
}

function labelBudget(
  dimension: string,
  value: string,
  path: string,
): void {
  assertDiagramKindBudget(
    meta,
    dimension,
    diagramGraphemeCount(value),
    path,
  );
}

/** Validate every calendar, membership, identity, and density fact. */
export default function validateTimelineDiagram(
  input: unknown,
): ValidatedTimelineDiagram {
  const spec = validateDiagramCommonSpec(input, "timeline", [
    "kind",
    "title",
    "summary",
    "range",
    "groups",
    "rows",
    "tasks",
    "milestones",
  ]);
  if (!isDiagramRecord(spec.range)) {
    invalid(
      "diagram/invalid-spec",
      "spec.range must define start and end ISO calendar dates.",
      "spec.range",
      "Author one explicit half-open date range.",
    );
  }
  assertDiagramExactKeys(spec.range, ["start", "end"], "spec.range");
  const rangeStart = parseTimelineIsoDate(
    spec.range.start,
    "spec.range.start",
  );
  const rangeEnd = parseTimelineIsoDate(spec.range.end, "spec.range.end");
  const rangeDays = rangeEnd.ordinal - rangeStart.ordinal;
  if (rangeDays <= 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.range.end must be later than spec.range.start.",
      "spec.range",
      "Choose a non-empty half-open range whose end date is excluded.",
    );
  }
  assertDiagramKindBudget(meta, "rangeDays", rangeDays, "spec.range");

  if (!Array.isArray(spec.groups) || spec.groups.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.groups must contain at least one labelled group.",
      "spec.groups",
      "Group the plan rows by one bounded phase or ownership area.",
    );
  }
  if (!Array.isArray(spec.rows) || spec.rows.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "spec.rows must contain at least one labelled row.",
      "spec.rows",
      "Add a stable row to one authored group.",
    );
  }
  if (!Array.isArray(spec.tasks)) {
    invalid(
      "diagram/invalid-spec",
      "spec.tasks must be an array.",
      "spec.tasks",
      "Use an empty array when the plan contains only milestones.",
    );
  }
  if (spec.milestones !== undefined && !Array.isArray(spec.milestones)) {
    invalid(
      "diagram/invalid-spec",
      "spec.milestones must be an array when present.",
      "spec.milestones",
      "Use dated milestone objects or omit the field.",
    );
  }
  const milestoneValues = spec.milestones ?? [];
  if (spec.tasks.length === 0 && milestoneValues.length === 0) {
    invalid(
      "diagram/invalid-spec",
      "A timeline needs at least one task or milestone.",
      "spec.tasks",
      "Add scheduled work or use prose for an empty planning frame.",
    );
  }
  assertDiagramKindBudget(meta, "groups", spec.groups.length, "spec.groups");
  assertDiagramKindBudget(meta, "rows", spec.rows.length, "spec.rows");
  assertDiagramKindBudget(meta, "tasks", spec.tasks.length, "spec.tasks");
  assertDiagramKindBudget(
    meta,
    "milestones",
    milestoneValues.length,
    "spec.milestones",
  );

  const ids = new Set<string>();
  const groups: ValidatedTimelineGroup[] = spec.groups.map((value, index) => {
    const path = `spec.groups[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented group fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "label", "annotation"], path);
    const id = addIdentity(ids, value.id, `${path}.id`);
    assertDiagramText(value.label, `${path}.label`);
    labelBudget("groupLabelGraphemes", value.label, `${path}.label`);
    if (value.annotation !== undefined) {
      assertDiagramText(value.annotation, `${path}.annotation`);
      labelBudget(
        "annotationGraphemes",
        value.annotation,
        `${path}.annotation`,
      );
    }
    return Object.freeze({
      id,
      label: value.label,
      ...(value.annotation === undefined
        ? {}
        : { annotation: value.annotation }),
      sourceOrder: index,
    });
  });
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const rows: ValidatedTimelineRow[] = spec.rows.map((value, index) => {
    const path = `spec.rows[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented row fields.",
      );
    }
    assertDiagramExactKeys(value, ["id", "groupId", "label"], path);
    const id = addIdentity(ids, value.id, `${path}.id`);
    assertDiagramIdentifier(value.groupId, `${path}.groupId`);
    if (!groupById.has(value.groupId)) {
      invalid(
        "diagram/dangling-reference",
        `${path} refers to missing group ${value.groupId}.`,
        `${path}.groupId`,
        "Add the group or correct the row membership.",
        { missing: value.groupId },
      );
    }
    assertDiagramText(value.label, `${path}.label`);
    labelBudget("rowLabelGraphemes", value.label, `${path}.label`);
    return Object.freeze({
      id,
      groupId: value.groupId,
      label: value.label,
      sourceOrder: index,
    });
  });
  const rowById = new Map(rows.map((row) => [row.id, row]));
  for (const group of groups) {
    if (!rows.some((row) => row.groupId === group.id)) {
      invalid(
        "diagram/invalid-spec",
        `Group ${group.id} has no rows.`,
        "spec.groups",
        "Remove the empty group or move at least one row into it.",
        { groupId: group.id },
      );
    }
  }

  const tasks: ValidatedTimelineTask[] = spec.tasks.map((value, index) => {
    const path = `spec.tasks[${index}]`;
    if (!isDiagramRecord(value)) {
      invalid(
        "diagram/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented half-open task fields.",
      );
    }
    assertDiagramExactKeys(
      value,
      ["id", "rowId", "label", "start", "end"],
      path,
    );
    const id = addIdentity(ids, value.id, `${path}.id`);
    assertDiagramIdentifier(value.rowId, `${path}.rowId`);
    if (!rowById.has(value.rowId)) {
      invalid(
        "diagram/dangling-reference",
        `${path} refers to missing row ${value.rowId}.`,
        `${path}.rowId`,
        "Add the row and its group or correct the task membership.",
        { missing: value.rowId },
      );
    }
    assertDiagramText(value.label, `${path}.label`);
    labelBudget("itemLabelGraphemes", value.label, `${path}.label`);
    const start = parseTimelineIsoDate(value.start, `${path}.start`);
    const end = parseTimelineIsoDate(value.end, `${path}.end`);
    if (end.ordinal <= start.ordinal) {
      invalid(
        "diagram/invalid-spec",
        `${path} must have a positive half-open duration.`,
        path,
        "Move the excluded end date after the included start date.",
      );
    }
    if (
      start.ordinal < rangeStart.ordinal || end.ordinal > rangeEnd.ordinal
    ) {
      invalid(
        "diagram/invalid-spec",
        `${path} falls outside the timeline range.`,
        path,
        "Keep every task inside the authored range or shorten and split the plan.",
      );
    }
    return Object.freeze({
      id,
      rowId: value.rowId,
      label: value.label,
      start,
      end,
      sourceOrder: index,
    });
  });

  for (const row of rows) {
    const rowTasks = tasks.filter((task) => task.rowId === row.id);
    for (let left = 0; left < rowTasks.length; left += 1) {
      for (let right = left + 1; right < rowTasks.length; right += 1) {
        const first = rowTasks[left];
        const second = rowTasks[right];
        if (
          first !== undefined && second !== undefined &&
          first.start.ordinal < second.end.ordinal &&
          second.start.ordinal < first.end.ordinal
        ) {
          invalid(
            "diagram/invalid-spec",
            `Tasks ${first.id} and ${second.id} overlap on row ${row.id}.`,
            "spec.tasks",
            "Move concurrent work to separate labelled rows or split the group.",
            { rowId: row.id },
          );
        }
      }
    }
  }

  const milestones: ValidatedTimelineMilestone[] = milestoneValues.map(
    (value, index) => {
      const path = `spec.milestones[${index}]`;
      if (!isDiagramRecord(value)) {
        invalid(
          "diagram/invalid-spec",
          `${path} must be an object.`,
          path,
          "Use the documented milestone fields.",
        );
      }
      assertDiagramExactKeys(
        value,
        ["id", "rowId", "label", "date", "emphasis"],
        path,
      );
      const id = addIdentity(ids, value.id, `${path}.id`);
      assertDiagramIdentifier(value.rowId, `${path}.rowId`);
      if (!rowById.has(value.rowId)) {
        invalid(
          "diagram/dangling-reference",
          `${path} refers to missing row ${value.rowId}.`,
          `${path}.rowId`,
          "Add the row and its group or correct the milestone membership.",
          { missing: value.rowId },
        );
      }
      assertDiagramText(value.label, `${path}.label`);
      labelBudget("itemLabelGraphemes", value.label, `${path}.label`);
      const date = parseTimelineIsoDate(value.date, `${path}.date`);
      if (
        date.ordinal < rangeStart.ordinal || date.ordinal >= rangeEnd.ordinal
      ) {
        invalid(
          "diagram/invalid-spec",
          `${path} falls outside the half-open timeline range.`,
          path,
          "Move the milestone inside the range or split the plan.",
        );
      }
      const emphasis = value.emphasis ?? "standard";
      if (
        typeof emphasis !== "string" ||
        !MILESTONE_EMPHASES.includes(
          emphasis as TimelineMilestoneEmphasis,
        )
      ) {
        invalid(
          "diagram/invalid-spec",
          `${path}.emphasis must be standard or critical.`,
          `${path}.emphasis`,
          "Choose the semantic gate emphasis, not an authored colour.",
        );
      }
      return Object.freeze({
        id,
        rowId: value.rowId,
        label: value.label,
        date,
        emphasis: emphasis as TimelineMilestoneEmphasis,
        sourceOrder: index,
      });
    },
  );

  for (const row of rows) {
    const items = tasks.filter((task) => task.rowId === row.id).length +
      milestones.filter((milestone) => milestone.rowId === row.id).length;
    assertDiagramKindBudget(
      meta,
      "itemsPerRow",
      items,
      `row ${row.id}`,
    );
  }
  const totalText = [
    spec.title,
    spec.summary,
    ...groups.flatMap((group) => [group.label, group.annotation ?? ""]),
    ...rows.map((row) => row.label),
    ...tasks.map((task) => task.label),
    ...milestones.map((milestone) => milestone.label),
  ].reduce((total, text) => total + diagramGraphemeCount(text), 0);
  assertDiagramKindBudget(
    meta,
    "totalTextGraphemes",
    totalText,
    "spec",
  );

  return Object.freeze({
    kind: "timeline",
    title: spec.title,
    summary: spec.summary,
    range: Object.freeze({ start: rangeStart, end: rangeEnd }),
    groups: Object.freeze(groups),
    rows: Object.freeze(rows),
    tasks: Object.freeze(tasks),
    milestones: Object.freeze(milestones),
  });
}
