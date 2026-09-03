import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  type CliPresentationOptions,
  resolveCliExampleCapabilities,
} from "../../src/cli/contracts.ts";
import { renderDiagramCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  resolveTerminalTheme,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import { cliReleaseFixtures } from "../../src/components/editorial/diagram/diagram.cli.ts";
import {
  describeDiagram,
  DiagramValidationError,
  type FlowDiagramSpec,
} from "../../src/diagram/mod.ts";
import type { DiagramKindCliProjection } from "../../src/cli/diagram-kinds.ts";
import projectFlowDiagramCli from "../../src/diagram/kinds/flow/flow.cli.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";
import type { ValidatedFlowDiagram } from "../../src/diagram/kinds/flow/flow.spec.ts";
import {
  projectDiagramKindCli,
} from "../../src/generated/diagram-cli-registry.ts";
import { prepareDiagramSemantics } from "../../src/generated/diagram-dispatch.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import type { DiagramSpec } from "../../src/generated/diagram-spec.ts";

const [decisionFlow, compactFlow] = fixtures;

function assertClosedAndBounded(
  frame: string,
  capabilities: TerminalCapabilities,
): void {
  assert(
    !frame.includes("\u001b]"),
    "Diagram CLI output must not open an OSC envelope.",
  );
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
  presentation: CliPresentationOptions = {},
): string {
  return renderDiagramCli(
    { ...presentation, spec, mode, maxWidth: capabilities.columns },
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

Deno.test("diagram projections select local Accent without changing semantics", () => {
  for (const theme of ["light", "dark"] as const) {
    const fieldPresentation = { theme, appearance: {} } as const;
    const accentPresentation = {
      theme,
      appearance: { accent: 245 },
    } as const;
    for (
      const colorDepth of ["truecolor", "ansi256", "ansi16"] as const
    ) {
      const capabilities = testTerminalCapabilities({
        columns: 96,
        colorDepth,
        hyperlinks: false,
      });
      const field = render(
        decisionFlow,
        capabilities,
        "auto",
        fieldPresentation,
      );
      const accent = render(
        decisionFlow,
        capabilities,
        "auto",
        accentPresentation,
      );
      assertEquals(stripAnsi(accent), stripAnsi(field));
      assert(
        accent !== field,
        `${theme} ${colorDepth} diagram did not select Accent`,
      );
      const color = terminalToneColor(
        resolveTerminalTheme(accentPresentation),
        "accent",
      );
      const probe = styleText("x", { color }, capabilities);
      assert(
        accent.includes(probe.slice(0, probe.indexOf("x"))),
        `${theme} ${colorDepth} diagram omitted the selected Accent code`,
      );
    }
  }

  const plain = testTerminalCapabilities({ columns: 96, colorDepth: "none" });
  assertEquals(
    render(decisionFlow, plain, "auto", {
      theme: "light",
      appearance: { accent: 245 },
    }),
    render(decisionFlow, plain, "auto", { theme: "light" }),
  );
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
  if (validated.kind !== "flow") {
    throw new Error("Flow preparation returned a different generated kind.");
  }
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

Deno.test("Diagram release fixtures cover enhanced, deliberate description, and typed fallback postures", () => {
  const catalogueCapabilities = testTerminalCapabilities({
    columns: 160,
    colorDepth: "truecolor",
    unicode: true,
  });
  const postures = Object.fromEntries(cliReleaseFixtures.map((example) => {
    const capabilities = resolveCliExampleCapabilities(
      example,
      catalogueCapabilities,
    );
    const output = stripAnsi(renderDiagramCli(example.props, capabilities));
    return [
      example.name,
      output.startsWith("Title:") ? "description" : "enhanced",
    ];
  }));
  for (const entry of diagramKindRegistry) {
    assertEquals(
      postures[`${entry.meta.slug}-${entry.meta.cli.stance}`],
      entry.meta.cli.stance,
    );
    assertEquals(
      postures[`${entry.meta.slug}-universal-description`],
      "description",
    );
    assertEquals(
      postures[`${entry.meta.slug}-maximum-density`],
      "description",
    );
    if (entry.meta.cli.stance === "enhanced") {
      assertEquals(
        postures[`${entry.meta.slug}-narrow-ascii-fallback`],
        "description",
      );
    }
  }
  assertEquals(Object.keys(postures).length, 18);
});

const terminalReleaseProfiles = (
  ["truecolor", "ansi256", "ansi16", "none"] as const
).flatMap((colorDepth) =>
  [true, false].map((unicode) => ({ colorDepth, unicode }))
);

function renderAnyDiagram(
  spec: DiagramSpec,
  capabilities: TerminalCapabilities,
  mode: "auto" | "description" = "auto",
): string {
  return renderDiagramCli(
    { spec, mode, maxWidth: capabilities.columns },
    capabilities,
  );
}

interface AuthoredFact {
  readonly key: string;
  readonly value: string;
}

function authoredFacts(
  value: unknown,
  key = "",
  facts: AuthoredFact[] = [],
): readonly AuthoredFact[] {
  if (typeof value === "string") {
    if (key !== "kind" && key !== "direction") facts.push({ key, value });
    return facts;
  }
  if (Array.isArray(value)) {
    for (const item of value) authoredFacts(item, key, facts);
    return facts;
  }
  if (typeof value === "object" && value !== null) {
    for (const [childKey, child] of Object.entries(value)) {
      authoredFacts(child, childKey, facts);
    }
  }
  return facts;
}

function semanticFacts(spec: DiagramSpec): readonly AuthoredFact[] {
  const facts = [...authoredFacts(spec)];
  const validated = prepareDiagramSemantics(spec).validated;
  if (validated.kind === "flow" || validated.kind === "architecture") {
    facts.push({ key: "direction", value: validated.direction });
  }
  if (validated.kind === "flow") {
    facts.push(...validated.edges.map(({ from, to }) => ({
      key: "relationship",
      value: `${from} to ${to}`,
    })));
  } else if (validated.kind === "architecture") {
    facts.push(...validated.relationships.map(({ from, to }) => ({
      key: "relationship",
      value: `${from} to ${to}`,
    })));
  } else if (validated.kind === "cycle" && validated.hub !== undefined) {
    const hubId = validated.hub.id;
    facts.push(...validated.spokes.map(({ direction, stageId }) => ({
      key: "relationship",
      value: direction === "to-hub"
        ? `${stageId} to ${hubId}`
        : `${hubId} to ${stageId}`,
    })));
  } else if (validated.kind === "sequence") {
    facts.push(...validated.messages.map(({ source, target }) => ({
      key: "relationship",
      value: `${source} to ${target}`,
    })));
  }
  return facts;
}

function compactTerminalSemantics(value: string): string {
  return stripAnsi(value)
    .split("\n")
    .map((line) => line.replace(/^[│|]\s?/u, "").replace(/\s?[│|]$/u, ""))
    .join("")
    .replaceAll("[self]>", "to")
    .replaceAll(/(?:[─┄┈↻.~\-]+[▸▷>])/gu, "to")
    .replaceAll(/\s+/gu, "");
}

function assertCarriesEveryAuthoredFact(
  output: string,
  spec: DiagramSpec,
  context: string,
): void {
  const compact = compactTerminalSemantics(output);
  for (const fact of semanticFacts(spec)) {
    const expected = fact.key === "direction"
      ? fact.value.replaceAll("-", "")
      : fact.value;
    assert(
      compact.includes(expected.replaceAll(/\s+/gu, "")),
      `${context} lost ${fact.key}=${JSON.stringify(fact.value)}`,
    );
  }
}

function projectAtWidth(
  spec: DiagramSpec,
  columns: number,
  profile: {
    readonly colorDepth: TerminalCapabilities["colorDepth"];
    readonly unicode: boolean;
  },
): {
  readonly capabilities: TerminalCapabilities;
  readonly projection: DiagramKindCliProjection | undefined;
} {
  const capabilities = testTerminalCapabilities({ columns, ...profile });
  const prepared = prepareDiagramSemantics(spec);
  return {
    capabilities,
    projection: projectDiagramKindCli(prepared.validated, {
      capabilities,
      maxWidth: columns,
      theme: "dark",
      description: prepared.description,
    }),
  };
}

Deno.test("generated Diagram CLI matrix preserves facts across every stance and viability boundary", () => {
  const scanWidths = Array.from({ length: 137 }, (_, index) => index + 24);
  for (const entry of diagramKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      const spec = releaseCase.spec as DiagramSpec;
      for (const profile of terminalReleaseProfiles) {
        const context =
          `${entry.meta.slug}/${releaseCase.name}/${profile.colorDepth}/${
            profile.unicode ? "unicode" : "ascii"
          }`;
        const scan = scanWidths.map((columns) => ({
          columns,
          ...projectAtWidth(spec, columns, profile),
        }));
        const selectedWidths = new Set([24, 34, 80, 120, 160]);
        for (let index = 1; index < scan.length; index += 1) {
          const before = scan[index - 1];
          const after = scan[index];
          if (
            before !== undefined && after !== undefined &&
            before.projection?.kind !== after.projection?.kind
          ) {
            selectedWidths.add(before.columns);
            selectedWidths.add(after.columns);
            if (after.columns < 160) selectedWidths.add(after.columns + 1);
          }
        }

        if (entry.meta.cli.stance === "description") {
          assert(
            scan.every(({ projection }) => projection === undefined),
            `${context} unexpectedly acquired an enhanced projector`,
          );
        } else {
          const representative = releaseCase.postures.some((posture) =>
            posture === "representative"
          );
          if (representative) {
            assert(
              scan.some(({ projection }) => projection?.kind === "frame"),
              `${context} never reached an enhanced frame by 160 columns`,
            );
          }
          for (const { columns, projection } of scan) {
            assert(projection !== undefined, `${context}/${columns} vanished`);
            const repeated = projectAtWidth(spec, columns, profile).projection;
            assertEquals(repeated, projection, `${context}/${columns}`);
            if (projection.kind === "declined") {
              assert(projection.code.length > 0);
              assert(Number.isSafeInteger(projection.fact));
              assert(Number.isSafeInteger(projection.limit));
              assert(projection.fact >= 0);
              assert(projection.limit >= 0);
            }
          }
        }

        for (const columns of [...selectedWidths].toSorted((a, b) => a - b)) {
          const { capabilities, projection } = projectAtWidth(
            spec,
            columns,
            profile,
          );
          const automatic = renderAnyDiagram(spec, capabilities);
          const description = renderAnyDiagram(
            spec,
            capabilities,
            "description",
          );
          assertClosedAndBounded(automatic, capabilities);
          assertClosedAndBounded(description, capabilities);
          assertCarriesEveryAuthoredFact(
            automatic,
            spec,
            `${context}/${columns}/auto`,
          );
          assertCarriesEveryAuthoredFact(
            description,
            spec,
            `${context}/${columns}/description`,
          );
          if (projection?.kind === "frame") {
            assertEquals(automatic, projection.frame);
            assertClosedAndBounded(projection.frame, capabilities);
          } else {
            assertEquals(
              automatic,
              description,
              `${context}/${columns} did not fall back atomically`,
            );
          }
        }
      }
    }
  }
});
