import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { conformDiagramScene } from "../../src/diagram/conformance.ts";
import {
  DiagramBudgetError,
  DiagramValidationError,
} from "../../src/diagram/errors.ts";
import {
  diagramRectContains,
  diagramRectsOverlap,
} from "../../src/diagram/geometry.ts";
import type {
  DiagramRegion,
  DiagramScene,
  DiagramShape,
  DiagramText,
} from "../../src/diagram/scene.ts";
import describeTimelineDiagram from "../../src/diagram/kinds/timeline/timeline.description.ts";
import fixtures from "../../src/diagram/kinds/timeline/timeline.fixtures.ts";
import layoutTimelineDiagram from "../../src/diagram/kinds/timeline/timeline.layout.ts";
import type { TimelineDiagramSpec } from "../../src/diagram/kinds/timeline/timeline.spec.ts";
import validateTimelineDiagram, {
  parseTimelineIsoDate,
  timelineIsoFromOrdinal,
} from "../../src/diagram/kinds/timeline/timeline.validation.ts";

const minimum = fixtures[0];
const representative = fixtures[1];
const stress = fixtures[2];
if (
  minimum === undefined || representative === undefined || stress === undefined
) {
  throw new TypeError("Missing Timeline fixtures");
}

function sceneFor(spec: TimelineDiagramSpec): DiagramScene {
  return conformDiagramScene(
    layoutTimelineDiagram(validateTimelineDiagram(spec)),
  );
}

function shapes(scene: DiagramScene): readonly DiagramShape[] {
  return scene.elements.filter((element): element is DiagramShape =>
    element.kind === "shape"
  );
}

Deno.test("timeline fixes Gregorian parsing and task semantics without ambient Date", async () => {
  const leap = parseTimelineIsoDate("2028-02-29", "date");
  assertEquals(timelineIsoFromOrdinal(leap.ordinal - 1), "2028-02-28");
  assertEquals(timelineIsoFromOrdinal(leap.ordinal + 1), "2028-03-01");
  assertEquals(
    validateTimelineDiagram(minimum).tasks[0]?.end.ordinal! -
      validateTimelineDiagram(minimum).tasks[0]?.start.ordinal!,
    3,
  );
  const sources = await Promise.all([
    Deno.readTextFile(
      new URL(
        "../../src/diagram/kinds/timeline/timeline.validation.ts",
        import.meta.url,
      ),
    ),
    Deno.readTextFile(
      new URL(
        "../../src/diagram/kinds/timeline/timeline.layout.ts",
        import.meta.url,
      ),
    ),
  ]);
  assert(
    !sources.some((source) => /\bnew Date\b|Date\.UTC|toLocale/u.test(source)),
  );
});

Deno.test("timeline description preserves range, groups, rows, tasks, and gates exactly", () => {
  assertEquals(
    describeTimelineDiagram(validateTimelineDiagram(minimum)),
    `Title: Prepare a short review window
Summary: A leap-day task leads to one dated approval gate.
Range: 2028-02-27 to 2028-03-04 (end exclusive; 6 days)
Groups:
1. group review: Review window
   1. row evidence: Evidence
Tasks:
1. task collect on row evidence in group review: Collect evidence; 2028-02-27 to 2028-03-01 (end exclusive; 3 days)
Milestones:
1. standard milestone approve on row evidence in group review: Approval complete; date: 2028-02-29
`,
  );
});

Deno.test("timeline layout maps month ticks and keeps every group member contained", () => {
  const validated = validateTimelineDiagram(representative);
  const scene = conformDiagramScene(layoutTimelineDiagram(validated));
  const tickIds = scene.elements.filter((element) => element.kind === "guide")
    .map((guide) => guide.semanticId);
  assert(tickIds.includes("tick:2028-02-01"));
  assert(tickIds.includes("tick:2028-03-01"));
  assert(tickIds.includes("tick:2028-04-01"));

  const regions = scene.elements.filter((element): element is DiagramRegion =>
    element.kind === "region"
  );
  for (const group of validated.groups) {
    const region = regions.find((candidate) =>
      candidate.semanticId === group.id
    );
    assert(region !== undefined);
    const rowIds = new Set(
      validated.rows.filter((row) => row.groupId === group.id).map((row) =>
        row.id
      ),
    );
    const itemIds = new Set([
      ...validated.tasks.filter((task) => rowIds.has(task.rowId)).map((task) =>
        task.id
      ),
      ...validated.milestones.filter((milestone) => rowIds.has(milestone.rowId))
        .map((milestone) => milestone.id),
    ]);
    for (
      const shape of shapes(scene).filter((shape) =>
        itemIds.has(shape.semanticId)
      )
    ) {
      assert(diagramRectContains(region.bounds, shape.bounds));
    }
  }
});

Deno.test("timeline task bars and milestone diamonds keep finite stable geometry", () => {
  for (const fixture of fixtures) {
    const first = sceneFor(fixture);
    assertEquals(
      JSON.stringify(sceneFor(structuredClone(fixture))),
      JSON.stringify(first),
    );
    for (const element of first.elements) {
      assert(
        [
          element.bounds.x,
          element.bounds.y,
          element.bounds.width,
          element.bounds.height,
        ]
          .every(Number.isFinite),
      );
      assert(diagramRectContains(first.canvas.bounds, element.bounds));
    }
    const members = shapes(first);
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        assert(
          !diagramRectsOverlap(
            (members[left] as DiagramShape).bounds,
            (members[right] as DiagramShape).bounds,
          ),
        );
      }
    }
  }
  const scene = sceneFor(representative);
  const task = shapes(scene).find((shape) => shape.semanticId === "implement");
  const gate = shapes(scene).find((shape) =>
    shape.semanticId === "launch-gate"
  );
  assert(task?.shape === "rounded-rectangle");
  assert(gate?.shape === "diamond" && gate.style === "warning");
  const visibleGate = scene.elements.find((element): element is DiagramText =>
    element.kind === "text" && element.ownerId === "launch-gate"
  );
  assert(
    visibleGate?.lines.some((line) => line.text.includes("Critical gate")),
  );
});

Deno.test("timeline supports adjacent half-open tasks and conservative long labels", () => {
  const adjacent = {
    ...minimum,
    tasks: [
      minimum.tasks[0],
      {
        id: "summarize",
        rowId: "evidence",
        label: "Summarize evidence",
        start: "2028-03-01",
        end: "2028-03-04",
      },
    ],
  } as const satisfies TimelineDiagramSpec;
  assertEquals(validateTimelineDiagram(adjacent).tasks.length, 2);
  const scene = sceneFor(stress);
  const longLabels = scene.elements.filter((element): element is DiagramText =>
    element.kind === "text" && element.id.startsWith("task-")
  );
  assert(longLabels.some((label) => label.lines.length === 2));
  assert(longLabels.every((label) => label.lines.length <= 2));
});

Deno.test("timeline item labels stay centred on their bars and gates at range edges", () => {
  const futureSibling = {
    ...minimum,
    title: "Schedule an unrelated edge case",
    tasks: [{
      id: "opening-work",
      rowId: "evidence",
      label: "An independently named opening activity",
      start: "2028-02-27",
      end: "2028-03-01",
    }],
    milestones: [{
      id: "closing-marker",
      rowId: "evidence",
      label: "A separately named closing marker",
      date: "2028-03-03",
    }],
  } as const satisfies TimelineDiagramSpec;
  const minimumBarSibling = {
    ...minimum,
    title: "Keep a short late-range task aligned",
    range: { start: "2028-01-01", end: "2028-10-01" },
    tasks: [{
      id: "late-check",
      rowId: "evidence",
      label: "Inspect one late-range day",
      start: "2028-09-29",
      end: "2028-09-30",
    }],
  } as const satisfies TimelineDiagramSpec;
  const openingBarSibling = {
    ...minimumBarSibling,
    title: "Separate opening work from its row heading",
    rows: [{
      id: "evidence",
      groupId: "review",
      label: "Detailed verification row",
    }],
    tasks: [{
      id: "opening-check",
      rowId: "evidence",
      label: "Detailed opening-day activity",
      start: "2028-01-01",
      end: "2028-01-02",
    }],
  } as const satisfies TimelineDiagramSpec;

  for (
    const fixture of [
      ...fixtures,
      futureSibling,
      minimumBarSibling,
      openingBarSibling,
    ]
  ) {
    const validated = validateTimelineDiagram(fixture);
    const scene = sceneFor(fixture);
    const itemLabels = scene.elements.filter(
      (element): element is DiagramText =>
        element.kind === "text" &&
        (element.id.startsWith("task-") ||
          element.id.startsWith("milestone-")),
    );
    const rowLabels = scene.elements.filter(
      (element): element is DiagramText =>
        element.kind === "text" && element.id.startsWith("row-") &&
        element.id.endsWith("-label"),
    );
    for (const item of [...validated.tasks, ...validated.milestones]) {
      const label = itemLabels.find((candidate) =>
        candidate.ownerId === item.id
      );
      assert(label !== undefined, `${item.id} lost its visible label`);
      const shape = shapes(scene).find((candidate) =>
        candidate.semanticId === label.ownerId
      );
      assert(shape !== undefined);
      const labelCenter = label.bounds.x + label.bounds.width / 2;
      const shapeCenter = shape.bounds.x + shape.bounds.width / 2;
      assert(
        Math.abs(labelCenter - shapeCenter) <= 0.01,
        `${label.id} is offset ${labelCenter - shapeCenter} from its shape`,
      );
      const row = validated.rows.find((candidate) =>
        candidate.id === item.rowId
      );
      const region = scene.elements.find(
        (candidate): candidate is DiagramRegion =>
          candidate.kind === "region" &&
          candidate.semanticId === row?.groupId,
      );
      assert(region !== undefined);
      assert(
        diagramRectContains(region.bounds, label.bounds),
        `${label.id} leaves its group boundary`,
      );
      assert(
        rowLabels.every((rowLabel) =>
          !diagramRectsOverlap(label.bounds, rowLabel.bounds, 4)
        ),
        `${label.id} enters the row-label column`,
      );
    }
  }
});

Deno.test("timeline rejects invalid dates, ranges, membership, overlap, and duplicates", () => {
  const cases: readonly TimelineDiagramSpec[] = [
    { ...minimum, range: { start: "2027-02-29", end: "2028-03-04" } },
    { ...minimum, range: { start: "2028-03-04", end: "2028-03-04" } },
    {
      ...minimum,
      rows: [{ ...minimum.rows[0], groupId: "missing" }],
    },
    {
      ...minimum,
      tasks: [{ ...minimum.tasks[0], rowId: "missing" }],
    },
    {
      ...minimum,
      tasks: [{ ...minimum.tasks[0], start: "2028-02-20" }],
    },
    {
      ...minimum,
      rows: [minimum.rows[0], minimum.rows[0]],
    },
    {
      ...minimum,
      tasks: [
        minimum.tasks[0],
        {
          id: "overlap",
          rowId: "evidence",
          label: "Overlapping work",
          start: "2028-02-28",
          end: "2028-03-02",
        },
      ],
    },
    {
      ...minimum,
      milestones: [{ ...minimum.milestones[0], date: minimum.range.end }],
    },
  ];
  for (const spec of cases) {
    assertInstanceOf(
      assertThrows(() => validateTimelineDiagram(spec)),
      DiagramValidationError,
    );
  }
});

Deno.test("timeline range refusal names the dimension and shorter-range action", () => {
  const error = assertThrows(() =>
    validateTimelineDiagram({
      ...minimum,
      range: { start: "2028-01-01", end: "2030-01-01" },
    })
  );
  assertInstanceOf(error, DiagramBudgetError);
  assertEquals(error.dimension, "rangeDays");
  assertEquals(error.authorAction, "shorten-range");
  assert(error.message.includes("received 731"));
});
