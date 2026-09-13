/** Deterministic dependency-free Gantt layout for bounded calendar plans. */

import {
  DIAGRAM_GEOMETRY,
  diagramRectBottom,
  roundDiagramNumber,
} from "../../geometry.ts";
import {
  createDiagramGuide,
  createDiagramScene,
  type DiagramMeasuredText,
  measureDiagramLayoutText,
  positionDiagramText,
} from "../../layout-authority.ts";
import type {
  DiagramRect,
  DiagramRegion,
  DiagramScene,
  DiagramSceneElement,
  DiagramShape,
} from "../../scene.ts";
import type { DiagramLayoutMeasures } from "../../kind-meta.ts";
import meta from "./timeline.meta.ts";
import type {
  ValidatedTimelineDiagram,
  ValidatedTimelineGroup,
  ValidatedTimelineMilestone,
  ValidatedTimelineRow,
  ValidatedTimelineTask,
} from "./timeline.spec.ts";
import {
  parseTimelineIsoDate,
  timelineIsoFromOrdinal,
} from "./timeline.validation.ts";

const G = DIAGRAM_GEOMETRY;
const T = Object.freeze({
  labelColumnWidth: 184,
  chartGap: 28,
  scaleLabelWidth: 92,
  itemLabelWidth: 208,
  scaleY: 34,
  groupStartY: 62,
  groupGap: 24,
  groupPadding: 12,
  groupLabelGap: 4,
  rowGap: 10,
  itemLaneHeight: 58,
  taskBarHeight: 16,
  milestoneSize: 20,
  itemGap: 4,
  /**
   * Clear space below one lane's bar or diamond before the next lane's label
   * or the row separator, so a wrapped label can never push its item into
   * the neighbouring lane band.
   */
  laneClearance: 12,
  minimumChartWidth: 320,
  minimumTickGap: 98,
});

interface GroupPlan {
  readonly group: ValidatedTimelineGroup;
  readonly label: DiagramMeasuredText;
  readonly annotation?: DiagramMeasuredText;
  readonly rows: readonly RowPlan[];
  readonly bounds: DiagramRect;
}

interface RowPlan {
  readonly row: ValidatedTimelineRow;
  readonly label: DiagramMeasuredText;
  readonly lanes: readonly LanePlan[];
  readonly top: number;
  readonly height: number;
}

/** One measured task or milestone lane inside a row. */
type LanePlan =
  & {
    readonly label: DiagramMeasuredText;
    readonly top: number;
    readonly height: number;
  }
  & (
    | { readonly kind: "task"; readonly task: ValidatedTimelineTask }
    | {
      readonly kind: "milestone";
      readonly milestone: ValidatedTimelineMilestone;
    }
  );

/** The visible wording a milestone lane renders and measures. */
function milestoneVisibleLabel(milestone: ValidatedTimelineMilestone): string {
  return `${
    milestone.emphasis === "critical" ? "Critical gate" : "Gate"
  } — ${milestone.label}`;
}

/** One lane's height: its wrapped label, item, and trailing clearance. */
function laneHeight(label: DiagramMeasuredText, itemHeight: number): number {
  return Math.max(
    T.itemLaneHeight,
    label.height + T.itemGap + itemHeight + T.laneClearance,
  );
}

function measure(
  text: string,
  maximumWidth: number,
  fontRole: "interface" | "mono",
  fontSize: number,
  lineHeight: number,
  budget: string,
  path: string,
): DiagramMeasuredText {
  return measureDiagramLayoutText({
    text,
    maximumWidth,
    fontRole,
    fontSize,
    lineHeight,
    meta,
    budget,
    path,
  });
}

function dayWidth(days: number): number {
  if (days <= 45) return 18;
  if (days <= 120) return 8;
  if (days <= 240) return 4.5;
  return 3.2;
}

function dateX(
  spec: ValidatedTimelineDiagram,
  chartX: number,
  chartWidth: number,
  ordinal: number,
): number {
  const days = spec.range.end.ordinal - spec.range.start.ordinal;
  return roundDiagramNumber(
    chartX + (ordinal - spec.range.start.ordinal) / days * chartWidth,
  );
}

function monthStartOrdinal(year: number, month: number): number {
  const iso = `${String(year).padStart(4, "0")}-${
    String(month).padStart(2, "0")
  }-01`;
  return parseTimelineIsoDate(iso, "timeline tick").ordinal;
}

function tickOrdinals(spec: ValidatedTimelineDiagram): readonly number[] {
  const start = spec.range.start.ordinal;
  const end = spec.range.end.ordinal;
  const days = end - start;
  const candidates = [start];
  if (days <= 45) {
    const interval = 7;
    for (let ordinal = start + interval; ordinal < end; ordinal += interval) {
      candidates.push(ordinal);
    }
  } else {
    let year = spec.range.start.year;
    let month = spec.range.start.month + 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
    while (year <= 9_999) {
      const ordinal = monthStartOrdinal(year, month);
      if (ordinal >= end) break;
      candidates.push(ordinal);
      month += 1;
      if (month > 12) {
        year += 1;
        month = 1;
      }
    }
  }
  candidates.push(end);
  return candidates;
}

function filteredTicks(
  spec: ValidatedTimelineDiagram,
  chartX: number,
  chartWidth: number,
): readonly number[] {
  const accepted: number[] = [];
  for (const ordinal of tickOrdinals(spec)) {
    const previous = accepted.at(-1);
    if (
      previous === undefined ||
      dateX(spec, chartX, chartWidth, ordinal) -
            dateX(spec, chartX, chartWidth, previous) >= T.minimumTickGap
    ) {
      accepted.push(ordinal);
      continue;
    }
    if (ordinal === spec.range.end.ordinal && accepted.length > 1) {
      accepted.pop();
      accepted.push(ordinal);
    }
  }
  return accepted;
}

function planGroups(
  spec: ValidatedTimelineDiagram,
  chartEnd: number,
): readonly GroupPlan[] {
  const plans: GroupPlan[] = [];
  let groupTop = T.groupStartY;
  for (const group of spec.groups) {
    const label = measure(
      group.label,
      T.labelColumnWidth - T.groupPadding * 2,
      "interface",
      G.text.primarySize,
      G.text.primaryLineHeight,
      "groupLabelLines",
      `group ${group.id} label`,
    );
    const annotation = group.annotation === undefined ? undefined : measure(
      group.annotation,
      T.labelColumnWidth - T.groupPadding * 2,
      "mono",
      G.text.annotationSize,
      G.text.annotationLineHeight,
      "annotationLines",
      `group ${group.id} annotation`,
    );
    const headerHeight = T.groupPadding * 2 + label.height +
      (annotation === undefined ? 0 : T.groupLabelGap + annotation.height);
    let rowTop = groupTop + headerHeight;
    const rows: RowPlan[] = [];
    for (
      const row of spec.rows.filter((candidate) =>
        candidate.groupId === group.id
      )
    ) {
      const rowLabel = measure(
        row.label,
        T.labelColumnWidth - T.groupPadding * 2,
        "interface",
        G.text.annotationSize,
        G.text.annotationLineHeight,
        "rowLabelLines",
        `row ${row.id} label`,
      );
      const lanes: LanePlan[] = [];
      let laneTop = rowTop;
      for (const task of spec.tasks.filter((item) => item.rowId === row.id)) {
        const label = measure(
          task.label,
          T.itemLabelWidth,
          "interface",
          G.text.annotationSize,
          G.text.annotationLineHeight,
          "itemLabelLines",
          `task ${task.id} label`,
        );
        const height = laneHeight(label, T.taskBarHeight);
        lanes.push({ kind: "task", task, label, top: laneTop, height });
        laneTop += height;
      }
      for (
        const milestone of spec.milestones.filter((item) =>
          item.rowId === row.id
        )
      ) {
        const label = measure(
          milestoneVisibleLabel(milestone),
          T.itemLabelWidth,
          "interface",
          G.text.annotationSize,
          G.text.annotationLineHeight,
          "itemLabelLines",
          `milestone ${milestone.id} label`,
        );
        const height = laneHeight(label, T.milestoneSize);
        lanes.push({
          kind: "milestone",
          milestone,
          label,
          top: laneTop,
          height,
        });
        laneTop += height;
      }
      const height = Math.max(T.itemLaneHeight, laneTop - rowTop);
      rows.push({ row, label: rowLabel, lanes, top: rowTop, height });
      rowTop += height + T.rowGap;
    }
    const bottom = rowTop - T.rowGap + T.groupPadding;
    const bounds = {
      x: 0,
      y: groupTop,
      width: chartEnd,
      height: roundDiagramNumber(bottom - groupTop),
    };
    plans.push({
      group,
      label,
      ...(annotation === undefined ? {} : { annotation }),
      rows,
      bounds,
    });
    groupTop = diagramRectBottom(bounds) + T.groupGap;
  }
  return plans;
}

function groupElements(plan: GroupPlan): readonly DiagramSceneElement[] {
  const region: DiagramRegion = {
    kind: "region",
    id: `group-${plan.group.id}-region`,
    semanticId: plan.group.id,
    style: "boundary",
    bounds: plan.bounds,
    radius: G.node.radius,
    lineWidth: 1,
  };
  const centerX = T.labelColumnWidth / 2;
  const labelTop = plan.bounds.y + T.groupPadding;
  const elements: DiagramSceneElement[] = [
    region,
    positionDiagramText({
      id: `group-${plan.group.id}-label`,
      ownerId: plan.group.id,
      placement: "inside-region",
      role: "node-text",
      measured: plan.label,
      centerX,
      top: labelTop,
    }),
  ];
  if (plan.annotation !== undefined) {
    elements.push(positionDiagramText({
      id: `group-${plan.group.id}-annotation`,
      ownerId: plan.group.id,
      placement: "inside-region",
      role: "quiet-annotation",
      measured: plan.annotation,
      centerX,
      top: labelTop + plan.label.height + T.groupLabelGap,
    }));
  }
  return elements;
}

function taskElements(
  spec: ValidatedTimelineDiagram,
  task: ValidatedTimelineTask,
  label: DiagramMeasuredText,
  laneTop: number,
  chartX: number,
  chartWidth: number,
): readonly DiagramSceneElement[] {
  const start = dateX(spec, chartX, chartWidth, task.start.ordinal);
  const end = dateX(spec, chartX, chartWidth, task.end.ordinal);
  const width = roundDiagramNumber(Math.max(8, end - start));
  const centerX = roundDiagramNumber((start + end) / 2);
  const bounds = {
    x: roundDiagramNumber(centerX - width / 2),
    y: roundDiagramNumber(laneTop + label.height + T.itemGap),
    width,
    height: T.taskBarHeight,
  };
  const shape: DiagramShape = {
    kind: "shape",
    id: `task-${task.id}-shape`,
    semanticId: task.id,
    shape: "rounded-rectangle",
    style: "ordinary",
    bounds,
    radius: T.taskBarHeight / 2,
  };
  return [
    shape,
    positionDiagramText({
      id: `task-${task.id}-label`,
      ownerId: task.id,
      placement: "free",
      role: "node-text",
      measured: label,
      centerX: roundDiagramNumber(bounds.x + bounds.width / 2),
      top: laneTop,
    }),
  ];
}

function milestoneElements(
  spec: ValidatedTimelineDiagram,
  milestone: ValidatedTimelineMilestone,
  label: DiagramMeasuredText,
  laneTop: number,
  chartX: number,
  chartWidth: number,
): readonly DiagramSceneElement[] {
  const centerX = dateX(spec, chartX, chartWidth, milestone.date.ordinal);
  const size = T.milestoneSize;
  const bounds = {
    x: roundDiagramNumber(centerX - size / 2),
    y: roundDiagramNumber(laneTop + label.height + T.itemGap),
    width: size,
    height: size,
  };
  const shape: DiagramShape = {
    kind: "shape",
    id: `milestone-${milestone.id}-shape`,
    semanticId: milestone.id,
    shape: "diamond",
    style: milestone.emphasis === "critical" ? "warning" : "focus",
    bounds,
    radius: 0,
  };
  return [
    shape,
    positionDiagramText({
      id: `milestone-${milestone.id}-label`,
      ownerId: milestone.id,
      placement: "free",
      role: "node-text",
      measured: label,
      centerX,
      top: laneTop,
    }),
  ];
}

/** The measures this layout wraps text at and how a calendar's scene grows. */
export const layoutMeasures: DiagramLayoutMeasures = {
  text: [
    {
      text: "group label",
      budget: "groupLabelLines",
      width: T.labelColumnWidth - T.groupPadding * 2,
      fontSize: G.text.primarySize,
      fontRole: "interface",
    },
    {
      text: "group annotation",
      budget: "annotationLines",
      width: T.labelColumnWidth - T.groupPadding * 2,
      fontSize: G.text.annotationSize,
      fontRole: "mono",
    },
    {
      text: "row label",
      budget: "rowLabelLines",
      width: T.labelColumnWidth - T.groupPadding * 2,
      fontSize: G.text.annotationSize,
      fontRole: "interface",
    },
    {
      text: "task or milestone label",
      budget: "itemLabelLines",
      width: T.itemLabelWidth,
      fontSize: G.text.annotationSize,
      fontRole: "interface",
    },
  ],
  extent: [
    `The label column is ${T.labelColumnWidth} units and the calendar at least ${T.minimumChartWidth}, widening with the range so that ticks stay ${T.minimumTickGap} units apart; each task or milestone lane adds at least ${T.itemLaneHeight} units of height and grows with its wrapped label so the item keeps ${T.laneClearance} units of clearance.`,
  ],
};

/** Lay a validated calendar plan into one projection-neutral scene. */
export default function layoutTimelineDiagram(
  spec: ValidatedTimelineDiagram,
): DiagramScene {
  const rangeDays = spec.range.end.ordinal - spec.range.start.ordinal;
  const itemLabelMargin = T.itemLabelWidth / 2;
  const chartX = T.labelColumnWidth + T.chartGap + itemLabelMargin;
  const chartWidth = roundDiagramNumber(
    Math.max(T.minimumChartWidth, rangeDays * dayWidth(rangeDays)),
  );
  const chartEnd = chartX + chartWidth;
  const plans = planGroups(spec, chartEnd + itemLabelMargin);
  const chartBottom = Math.max(
    ...plans.map((plan) => diagramRectBottom(plan.bounds)),
  );
  const elements: DiagramSceneElement[] = plans.flatMap(groupElements);

  for (const ordinal of filteredTicks(spec, chartX, chartWidth)) {
    const iso = ordinal === spec.range.start.ordinal
      ? spec.range.start.iso
      : ordinal === spec.range.end.ordinal
      ? spec.range.end.iso
      : timelineIsoFromOrdinal(ordinal);
    const x = dateX(spec, chartX, chartWidth, ordinal);
    const guide = createDiagramGuide({
      id: `tick-${iso}-guide`,
      semanticId: `tick:${iso}`,
      style: "dashed",
      lineWidth: 1,
      points: [{ x, y: T.scaleY }, { x, y: chartBottom }],
    });
    const label = measure(
      iso,
      T.scaleLabelWidth,
      "mono",
      G.text.annotationSize,
      G.text.annotationLineHeight,
      "tickLabelLines",
      `tick ${iso} label`,
    );
    elements.push(
      guide,
      positionDiagramText({
        id: `tick-${iso}-label`,
        ownerId: guide.semanticId,
        placement: "free",
        role: "quiet-annotation",
        measured: label,
        centerX: x,
        top: 0,
      }),
    );
  }

  for (const plan of plans) {
    for (const row of plan.rows) {
      const guideY = roundDiagramNumber(row.top + row.height - 6);
      const guide = createDiagramGuide({
        id: `row-${row.row.id}-guide`,
        semanticId: row.row.id,
        lineWidth: 1,
        points: [{ x: chartX, y: guideY }, { x: chartEnd, y: guideY }],
      });
      elements.push(
        guide,
        positionDiagramText({
          id: `row-${row.row.id}-label`,
          ownerId: row.row.id,
          placement: "free",
          role: "quiet-annotation",
          measured: row.label,
          centerX: T.labelColumnWidth / 2,
          top: row.top + (row.height - row.label.height) / 2,
        }),
      );
      for (const lane of row.lanes) {
        elements.push(...(lane.kind === "task"
          ? taskElements(spec, lane.task, lane.label, lane.top, chartX,
            chartWidth)
          : milestoneElements(spec, lane.milestone, lane.label, lane.top,
            chartX, chartWidth)));
      }
    }
  }

  const ordered = [
    ...elements.filter((element) => element.kind === "region"),
    ...elements.filter((element) => element.kind === "guide"),
    ...elements.filter((element) => element.kind === "shape"),
    ...elements.filter((element) => element.kind === "text"),
  ];
  return createDiagramScene({
    sourceKind: "timeline",
    elements: ordered,
    groups: [],
    root: ordered.map((element) => element.id),
    meta,
  });
}
