import { assert, assertEquals } from "@std/assert";
import {
  DiagramBudgetError,
  DiagramConformanceError,
  DiagramValidationError,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import type { FlowDiagramSpec } from "../../src/diagram/kinds/flow/flow.spec.ts";

/**
 * Seeded layered-flow generator. It produces chains, decisions with two or
 * three branches, tier-skipping edges, returns from and into inner nodes,
 * annotations, and both directions, in the shapes an author reaches for
 * while explaining a process. Some generated specs are deliberately over
 * budget or structurally invalid; those refusals are the author's, and the
 * test only insists that no valid spec is ever refused by conformance.
 */
const WORDS = [
  "gather",
  "every",
  "input",
  "carefully",
  "compose",
  "the",
  "message",
  "publish",
  "result",
  "review",
  "evidence",
  "address",
  "finding",
  "decision",
  "merge",
  "outcome",
  "queue",
  "retry",
];

function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface GeneratedNode {
  id: string;
  label: string;
  annotation?: string;
  role?: "start" | "end" | "decision" | "step";
}

interface GeneratedEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  emphasis?: "return";
}

function generateFlow(random: () => number): FlowDiagramSpec {
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length)] as T;
  const words = (count: number): string =>
    Array.from({ length: count }, () => pick(WORDS)).join(" ");
  const direction = random() < 0.3 ? "left-to-right" : "top-to-bottom";
  const depth = 3 + Math.floor(random() * 5);
  const ranks: string[][] = [];
  const nodes: GeneratedNode[] = [];
  let nodeCount = 0;
  for (let rank = 0; rank < depth; rank += 1) {
    const width = rank === 0 ? 1 : 1 + Math.floor(random() * 3);
    ranks.push(Array.from({ length: width }, () => {
      const id = `n${nodeCount++}`;
      const node: GeneratedNode = {
        id,
        label: words(1 + Math.floor(random() * 3)),
      };
      if (random() < 0.3) node.annotation = words(1 + Math.floor(random() * 3));
      nodes.push(node);
      return id;
    }));
  }
  const edges: GeneratedEdge[] = [];
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  const add = (
    from: string,
    to: string,
    extra: Partial<GeneratedEdge> = {},
  ) => {
    if (from === to || edges.some((e) => e.from === from && e.to === to)) {
      return;
    }
    edges.push({ id: `e${edges.length}`, from, to, ...extra });
    outgoing.set(from, (outgoing.get(from) ?? 0) + 1);
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  };
  for (let rank = 1; rank < depth; rank += 1) {
    for (const id of ranks[rank] ?? []) {
      const skip = random() < 0.2 && rank >= 2 ? 2 : 1;
      add(pick(ranks[rank - skip] ?? []), id);
    }
  }
  for (let rank = 0; rank < depth - 1; rank += 1) {
    for (const id of ranks[rank] ?? []) {
      if (!outgoing.has(id)) add(id, pick(ranks[rank + 1] ?? []));
    }
  }
  const returns = Math.floor(random() * 3);
  for (let index = 0; index < returns; index += 1) {
    const fromRank = 1 + Math.floor(random() * (depth - 1));
    const toRank = Math.floor(random() * fromRank);
    add(pick(ranks[fromRank] ?? []), pick(ranks[toRank] ?? []), {
      emphasis: "return",
      ...(random() < 0.6 ? { label: pick(["Again", "Rework"]) } : {}),
    });
  }
  for (const node of nodes) {
    const mainOut = edges.filter((e) =>
      e.from === node.id && e.emphasis !== "return"
    ).length;
    const anyOut = outgoing.get(node.id) ?? 0;
    const mainIn =
      edges.filter((e) => e.to === node.id && e.emphasis !== "return").length;
    if (mainIn === 0) node.role = "start";
    else if (anyOut === 0) node.role = "end";
    else if (mainOut > 1) node.role = "decision";
    else node.role = "step";
  }
  for (const edge of edges) {
    const from = nodes.find((node) => node.id === edge.from);
    if (edge.emphasis === "return") continue;
    if (from?.role === "decision") {
      edge.label = pick(["Yes", "No", "Retry later", "Escalate"]);
    } else if (random() < 0.2) {
      edge.label = words(1 + Math.floor(random() * 2));
    }
  }
  return {
    kind: "flow",
    title: "Generated process",
    summary: "A layered process produced by the fuzz generator.",
    direction,
    nodes,
    edges,
  } as FlowDiagramSpec;
}

Deno.test("no valid generated flow is ever refused by scene conformance", () => {
  const random = generator(11);
  let rendered = 0;
  let refused = 0;
  for (let index = 0; index < 300; index += 1) {
    const spec = generateFlow(random);
    try {
      renderDiagramSvg(spec);
      rendered += 1;
    } catch (error) {
      assert(
        !(error instanceof DiagramConformanceError),
        `${error instanceof Error ? error.message : String(error)}\n${
          JSON.stringify(spec)
        }`,
      );
      assert(
        error instanceof DiagramBudgetError ||
          error instanceof DiagramValidationError,
        String(error),
      );
      refused += 1;
    }
  }
  assert(rendered >= 30, `only ${rendered} generated flows rendered`);
  assert(refused > 0, "the generator never exercises a refusal");
  assertEquals(rendered + refused, 300);
});
