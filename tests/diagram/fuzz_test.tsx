import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertNotMatch,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { renderDiagramCli, renderMarkdownCli } from "../../src/cli/mod.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  describeDiagram,
  diagramAltText,
  DiagramValidationError,
  renderDiagramMarkdownImage,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import {
  layoutDiagram,
  validateDiagram,
} from "../../src/generated/diagram-dispatch.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import type { DiagramSpec } from "../../src/generated/diagram-spec.ts";
import { Diagram, Markdown, MarkdownParseError } from "../../src/react.ts";

const capabilities = testTerminalCapabilities({
  colorDepth: "ansi16",
  columns: 96,
  unicode: true,
});

interface ErrorIdentity {
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly path: string | undefined;
  readonly remedy: string;
}

function errorIdentity(error: unknown): ErrorIdentity {
  if (error instanceof MarkdownParseError) {
    return {
      name: error.name,
      code: "markdown/parse",
      message: error.message,
      path: undefined,
      remedy: "Reject the malformed registered resource before projection.",
    };
  }
  assertInstanceOf(error, DiagramValidationError);
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    path: error.path,
    remedy: error.remedy,
  };
}

function publicBoundaryActions(spec: unknown): readonly (() => unknown)[] {
  const typed = spec as DiagramSpec;
  const resource = { source: "./fuzz-diagram.svg", spec: typed } as const;
  const markdownSource = '![Fuzz diagram](./fuzz-diagram.svg "Fuzz summary")';
  return [
    () => validateDiagram(spec),
    () => layoutDiagram(spec),
    () => describeDiagram(typed),
    () => diagramAltText(typed),
    () => renderDiagramSvg(typed),
    () => renderDiagramMarkdownImage(resource),
    () => renderDiagramCli({ spec: typed }, capabilities),
    () => renderToStaticMarkup(<Diagram spec={typed} />),
    () =>
      renderMarkdownCli({
        source: markdownSource,
        diagrams: [resource],
      }, capabilities),
    () =>
      renderToStaticMarkup(
        <Markdown
          source={markdownSource}
          diagrams={[resource]}
        />,
      ),
  ];
}

function assertDeterministicRefusal(spec: unknown, context: string): void {
  for (
    const [projectionIndex, action] of publicBoundaryActions(spec).entries()
  ) {
    const attempts = [0, 1].map(() => {
      try {
        const output = action();
        throw new Error(
          `${context}/${projectionIndex} returned partial output ${
            typeof output === "string"
              ? JSON.stringify(output.slice(0, 80))
              : ""
          }`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith(`${context}/`)
        ) throw error;
        return errorIdentity(error);
      }
    });
    assertEquals(
      attempts[1],
      attempts[0],
      `${context}/${projectionIndex} was not deterministic`,
    );
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

const visibleTextAtoms = [
  "reference",
  "API/v2.0",
  "<node>",
  "&",
  '"quoted"',
  "cafe\u0301",
  "naïve",
  "設計",
  "العربية",
  "punctuation:()[]{}",
] as const;

const visibleLabelAtoms = [
  "API/v2",
  "<node>",
  "&",
  "cafe\u0301",
  "設計",
  "عربى",
  "[]{}",
] as const;

function seededVisibleText(
  random: () => number,
  prefix: string,
  maximumAtoms = 3,
): string {
  const count = 1 + Math.floor(random() * maximumAtoms);
  const selected = Array.from(
    { length: count },
    () => visibleTextAtoms[Math.floor(random() * visibleTextAtoms.length)]!,
  );
  return [prefix, ...selected].join(" ");
}

function seededVisibleLabel(random: () => number): string {
  return `Label ${
    visibleLabelAtoms[Math.floor(random() * visibleLabelAtoms.length)]
  }`;
}

function setRepresentativeLabel(
  spec: DiagramSpec,
  label: string,
): void {
  if (spec.kind === "flow" || spec.kind === "architecture") {
    const node = spec.nodes[0] as { label: string } | undefined;
    if (node !== undefined) node.label = label;
  } else if (spec.kind === "cycle") {
    const stage = spec.stages[0] as { label: string } | undefined;
    if (stage !== undefined) stage.label = label;
  } else if (spec.kind === "sequence") {
    const participant = spec.participants[0] as { label: string } | undefined;
    if (participant !== undefined) participant.label = label;
  } else {
    const task = spec.tasks[0] as { label: string } | undefined;
    if (task !== undefined) task.label = label;
  }
}

Deno.test("seeded visible Unicode and markup-like text stays safe and deterministic", () => {
  const random = seededRandom(0x5a_d1_a6);
  for (const entry of diagramKindRegistry) {
    const source = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "representative")
    )?.spec;
    assert(source !== undefined);
    for (let run = 0; run < 12; run += 1) {
      const spec = structuredClone(source) as DiagramSpec;
      const mutable = spec as DiagramSpec & {
        title: string;
        summary: string;
      };
      mutable.title = seededVisibleText(random, `Case ${run + 1}`);
      mutable.summary = seededVisibleText(random, "Summary");
      setRepresentativeLabel(
        spec,
        seededVisibleLabel(random),
      );
      const firstSvg = renderDiagramSvg(spec, { theme: "adaptive" });
      const secondSvg = renderDiagramSvg(structuredClone(spec), {
        theme: "adaptive",
      });
      assertEquals(secondSvg, firstSvg);
      assertNotMatch(
        firstSvg,
        /<(?:script|foreignObject|image|a|use|iframe)\b/iu,
      );
      assertNotMatch(firstSvg, /\s(?:href|xlink:href|on[a-z]+)=["']/iu);
      assertNotMatch(firstSvg, /url\s*\(|context-stroke|<marker\b/iu);
      assert(firstSvg.includes("<title>"));
      assert(firstSvg.includes("<desc>"));

      const firstReact = renderToStaticMarkup(<Diagram spec={spec} />);
      assertEquals(
        renderToStaticMarkup(<Diagram spec={structuredClone(spec)} />),
        firstReact,
      );
      assertNotMatch(firstReact, /<(?:script|foreignObject|iframe)\b/iu);

      const firstCli = renderDiagramCli({ spec }, capabilities);
      assertEquals(
        renderDiagramCli({ spec: structuredClone(spec) }, capabilities),
        firstCli,
      );
      assert(firstCli.length > 0);
      assert(describeDiagram(spec).includes(spec.title));
      assert(diagramAltText(spec).includes(spec.summary));
    }
  }
});

function commonHostileCases(base: DiagramSpec): readonly {
  readonly name: string;
  readonly spec: unknown;
}[] {
  const withExtra = (value: unknown): Record<string, unknown> => ({
    ...(structuredClone(base) as unknown as Record<string, unknown>),
    hostile: value,
  });
  const customPrototype = structuredClone(base) as object;
  Object.setPrototypeOf(customPrototype, { polluted: true });
  const prototypeKey = JSON.parse(JSON.stringify(base)) as Record<
    string,
    unknown
  >;
  Object.defineProperty(prototypeKey, "__proto__", {
    enumerable: true,
    value: { polluted: true },
  });
  const nested: Record<string, unknown> = {};
  let cursor = nested;
  for (let depth = 0; depth < 40; depth += 1) {
    const child: Record<string, unknown> = {};
    cursor.child = child;
    cursor = child;
  }
  const throwingProxy = new Proxy({}, {
    ownKeys(): never {
      throw new Error("ambient ownKeys failure");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  return [
    { name: "nan", spec: withExtra(Number.NaN) },
    { name: "positive-infinity", spec: withExtra(Number.POSITIVE_INFINITY) },
    { name: "negative-infinity", spec: withExtra(Number.NEGATIVE_INFINITY) },
    { name: "function", spec: withExtra(() => undefined) },
    { name: "symbol", spec: withExtra(Symbol("hostile")) },
    { name: "bigint", spec: withExtra(1n) },
    { name: "date", spec: withExtra(new Date(0)) },
    { name: "custom-prototype", spec: customPrototype },
    { name: "prototype-key", spec: prototypeKey },
    { name: "excessive-depth", spec: withExtra(nested) },
    { name: "throwing-proxy", spec: throwingProxy },
    { name: "revoked-proxy", spec: revoked.proxy },
  ];
}

Deno.test("generated invalid, budget, and hostile values refuse atomically at every boundary", () => {
  for (const entry of diagramKindRegistry) {
    const representative = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "representative")
    )?.spec as DiagramSpec | undefined;
    assert(representative !== undefined);
    for (const invalid of entry.releaseCorpus.invalid) {
      assertDeterministicRefusal(
        invalid.spec,
        `${entry.meta.slug}/${invalid.name}`,
      );
    }
    assertDeterministicRefusal(
      entry.releaseCorpus.overBudget.spec,
      `${entry.meta.slug}/over-budget`,
    );
    for (const hostile of commonHostileCases(representative)) {
      assertDeterministicRefusal(
        hostile.spec,
        `${entry.meta.slug}/${hostile.name}`,
      );
    }
  }
});

Deno.test("confusable identities, bidi, controls, and lone surrogates have stable failures", () => {
  const flowEntry = diagramKindRegistry[0];
  assert(flowEntry !== undefined);
  const flow = structuredClone(
    flowEntry.releaseCorpus.cases[0]!.spec,
  ) as DiagramSpec;
  assert(flow.kind === "flow");
  const confusable = structuredClone(flow);
  const confusableNode = confusable.nodes[0] as { id: string };
  confusableNode.id = "revіew";

  const invalidText = [
    "\u0000",
    "\u001b[31m",
    "\u007f",
    "\u200b",
    "\u202e",
    "\u2066",
    "\ufeff",
    "\ud800",
    "\udfff",
    "\u{1BCA0}",
  ].map((value, index) => {
    const spec = structuredClone(flow);
    const node = spec.nodes[0] as { label: string };
    node.label = `Unsafe${index}${value}label`;
    return { name: `text-${index}`, spec };
  });
  for (
    const hostile of [
      { name: "confusable-identifier", spec: confusable },
      ...invalidText,
    ]
  ) {
    assertDeterministicRefusal(hostile.spec, hostile.name);
  }
});

Deno.test("validated snapshots are deeply detached from later caller mutation", () => {
  for (const entry of diagramKindRegistry) {
    const original = structuredClone(
      entry.releaseCorpus.cases[0]!.spec,
    ) as DiagramSpec;
    const expectedTitle = original.title;
    const validated = validateDiagram(original);
    (original as DiagramSpec & { title: string }).title =
      "Caller changed this after validation";
    assertEquals(validated.title, expectedTitle);
    assert(Object.isFrozen(validated));
    assert(Object.isFrozen(
      validated.kind === "flow" || validated.kind === "architecture"
        ? validated.nodes
        : validated.kind === "cycle"
        ? validated.stages
        : validated.kind === "sequence"
        ? validated.participants
        : validated.tasks,
    ));
  }
});
