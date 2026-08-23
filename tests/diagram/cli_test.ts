import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { renderDiagramCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  describeDiagram,
  DiagramValidationError,
  type FlowDiagramSpec,
} from "../../src/diagram/mod.ts";
import projectFlowDiagramCli from "../../src/diagram/kinds/flow/flow.cli.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";
import type { ValidatedFlowDiagram } from "../../src/diagram/kinds/flow/flow.spec.ts";
import { prepareDiagramSemantics } from "../../src/generated/diagram-dispatch.ts";

const [decisionFlow, compactFlow] = fixtures;

function assertClosedAndBounded(
  frame: string,
  capabilities: TerminalCapabilities,
): void {
  const plain = stripAnsi(frame);
  if (capabilities.colorDepth === "none") {
    assertExactFrame(frame, plain, capabilities);
  } else {
    assertStyledFrame(frame, plain, capabilities);
    for (const line of frame.split("\n")) {
      if (line.includes("\u001b[")) {
        assert(
          line.endsWith("\u001b[0m"),
          `styled line did not close: ${JSON.stringify(line)}`,
        );
      }
    }
  }
  for (const line of plain.split("\n")) {
    assert(measureText(line) <= capabilities.columns);
  }
}

function render(
  spec: FlowDiagramSpec,
  capabilities: TerminalCapabilities,
  mode: "auto" | "description" = "auto",
): string {
  return renderDiagramCli(
    { spec, mode, maxWidth: capabilities.columns },
    capabilities,
  );
}

Deno.test("flow CLI selects enhanced or universal description by viability", () => {
  const narrow = testTerminalCapabilities({ columns: 34 });
  assertEquals(
    render(decisionFlow, narrow, "auto"),
    render(decisionFlow, narrow, "description"),
  );
  const standard = testTerminalCapabilities({ columns: 78 });
  const enhanced = render(decisionFlow, standard, "auto");
  assert(enhanced.startsWith("┌ Review a proposed change"));
  assert(enhanced.includes("secondary changes: review ┄┄▷ revise"));
  assert(enhanced.includes("return retry: revise ┈┈▸ review"));
  assert(enhanced !== render(decisionFlow, standard, "description"));
});

Deno.test("flow CLI is byte-stable and bounded across widths and capabilities", () => {
  for (const columns of [34, 78, 96]) {
    for (const unicode of [true, false]) {
      for (
        const colorDepth of [
          "truecolor",
          "ansi256",
          "ansi16",
          "none",
        ] as const
      ) {
        const capabilities = testTerminalCapabilities({
          columns,
          unicode,
          colorDepth,
        });
        const first = render(decisionFlow, capabilities);
        for (let run = 0; run < 5; run += 1) {
          assertEquals(render(decisionFlow, capabilities), first);
        }
        assertClosedAndBounded(first, capabilities);
        if (!unicode && columns >= 78) {
          assert(
            Array.from(stripAnsi(first)).every((character) =>
              (character.codePointAt(0) ?? 0) <= 0x7f
            ),
          );
        }
      }
    }
  }
});

Deno.test("enhanced flow output preserves the universal description facts", () => {
  const capabilities = testTerminalCapabilities({ columns: 96 });
  const enhanced = stripAnsi(render(decisionFlow, capabilities));
  const description = describeDiagram(decisionFlow);
  const prepared = prepareDiagramSemantics(decisionFlow)
    .validated as ValidatedFlowDiagram;
  const facts = [
    prepared.title,
    prepared.summary,
    prepared.direction.replaceAll("-", " "),
    ...prepared.nodes.flatMap((node) => [
      `${node.role} ${node.id}`,
      node.label,
      ...(node.annotation === undefined ? [] : [node.annotation]),
    ]),
    ...prepared.edges.flatMap((edge) => [
      edge.emphasis,
      edge.id,
      edge.from,
      edge.to,
      ...(edge.label === undefined ? [] : [edge.label]),
    ]),
  ];
  for (const fact of facts) {
    assert(description.includes(fact), `description omitted ${fact}`);
    assert(enhanced.includes(fact), `enhanced frame omitted ${fact}`);
  }
});

function linearFlow(count: number): FlowDiagramSpec {
  return {
    kind: "flow",
    title: `${count} stage reference`,
    summary: "Each stage advances to the next stage.",
    nodes: Array.from({ length: count }, (_, index) => ({
      id: `stage-${index + 1}`,
      label: `Stage ${index + 1}`,
      role: index === 0 ? "start" : index === count - 1 ? "end" : "step",
    })),
    edges: Array.from({ length: count - 1 }, (_, index) => ({
      id: `advance-${index + 1}`,
      from: `stage-${index + 1}`,
      to: `stage-${index + 2}`,
    })),
  };
}

function project(
  spec: FlowDiagramSpec,
  columns = 96,
) {
  const capabilities = testTerminalCapabilities({ columns });
  const { validated, description } = prepareDiagramSemantics(spec);
  return projectFlowDiagramCli(validated, {
    capabilities,
    maxWidth: columns,
    theme: "dark",
    description,
  });
}

Deno.test("flow enhanced viability declines density without abbreviating", () => {
  assertEquals(project(compactFlow, 40).kind, "declined");
  assertEquals(project(linearFlow(7)).kind, "declined");
  assertEquals(
    project(linearFlow(7)),
    { kind: "declined", code: "node-count", fact: 7, limit: 6 },
  );
  assertEquals(
    project(linearFlow(5)),
    { kind: "declined", code: "rank-depth", fact: 5, limit: 4 },
  );

  const longAnnotation = {
    ...compactFlow,
    nodes: compactFlow.nodes.map((node, index) =>
      index === 1
        ? {
          ...node,
          annotation:
            "Keep every observation with the complete qualifying context used during review and comparison",
        }
        : node
    ),
  } satisfies FlowDiagramSpec;
  const wrapped = project(longAnnotation, 52);
  assertEquals(wrapped.kind, "declined");
  if (wrapped.kind === "declined") assertEquals(wrapped.code, "node-wrap");

  const wideBranch = {
    kind: "flow",
    title: "Choose a reference path",
    summary: "One decision selects one of three complete reference paths.",
    nodes: [
      { id: "start", label: "Start", role: "start" },
      { id: "choose", label: "Choose path", role: "decision" },
      { id: "one", label: "Path one", role: "end" },
      { id: "two", label: "Path two", role: "end" },
      { id: "three", label: "Path three", role: "end" },
    ],
    edges: [
      { id: "begin", from: "start", to: "choose" },
      { id: "first", from: "choose", to: "one", label: "First" },
      { id: "second", from: "choose", to: "two", label: "Second" },
      { id: "third", from: "choose", to: "three", label: "Third" },
    ],
  } as const satisfies FlowDiagramSpec;
  const branch = project(wideBranch);
  assertEquals(branch.kind, "declined");
  if (branch.kind === "declined") assertEquals(branch.code, "rank-width");

  const twoReturns = {
    ...decisionFlow,
    edges: [
      ...decisionFlow.edges,
      {
        id: "restart",
        from: "revise",
        to: "draft",
        label: "Start a new review",
        emphasis: "return",
      },
    ],
  } as const satisfies FlowDiagramSpec;
  const returns = project(twoReturns);
  assertEquals(returns.kind, "declined");
  if (returns.kind === "declined") assertEquals(returns.code, "return-edges");
});

Deno.test("flow CLI keeps validation failures deterministic", () => {
  const capabilities = testTerminalCapabilities({ columns: 80 });
  const invalid = { ...compactFlow, nodes: [] } as unknown as FlowDiagramSpec;
  const first = assertThrows(() => render(invalid, capabilities));
  const second = assertThrows(() => render(invalid, capabilities));
  assertInstanceOf(first, DiagramValidationError);
  assertInstanceOf(second, DiagramValidationError);
  assertEquals(first.code, second.code);
  assertEquals(first.message, second.message);
});
