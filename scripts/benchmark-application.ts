/** Reproducible fitting baseline and application navigation measurements; no sibling checkout. */
import {
  renderSelectCli,
  type SelectFrameState,
} from "@discern-sh/design-system/cli";
import {
  renderTerminalApplication,
  runTerminalApplication,
  type TerminalApplicationObservation,
  type TerminalApplicationView,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "@discern-sh/design-system/cli/interactive";
import { FakeTerminalIO } from "@discern-sh/design-system/cli/interactive/testing";
import {
  fitInteractionFrame,
  type InteractionFrameViewport,
} from "../src/cli/interactive/viewport-budget.ts";
const summary = (times: number[]) => {
  const sorted = [...times].sort((a, b) => a - b);
  return {
    p50Ms: sorted[Math.floor(sorted.length * .5)],
    p95Ms: sorted[Math.floor(sorted.length * .95)],
    maximumMs: sorted.at(-1),
  };
};
const entries = Array.from(
  { length: 20 },
  (_, i) => ({
    id: String(i),
    label: `Sample choice ${i} with a moderately long label`,
    description:
      "Supporting detail stays near the focused control and wraps at narrow widths.",
  }),
);
const fitting = [];
for (
  const { presentation, columns, rows, scenario } of [
    { presentation: "form", columns: 80, rows: 26, scenario: "static" },
    { presentation: "menu", columns: 40, rows: 13, scenario: "static" },
    { presentation: "menu", columns: 80, rows: 24, scenario: "static" },
    { presentation: "menu", columns: 0, rows: 0, scenario: "resize" },
    { presentation: "form", columns: 80, rows: 26, scenario: "navigation" },
  ] as const
) {
  for (const algorithm of ["baseline", "shared"] as const) {
    const times: number[] = [];
    let calls = 0;
    const layouts = new Set<string>();
    for (let iteration = 0; iteration < 100; iteration++) {
      const geometry = columns === 0
        ? ([[40, 13], [80, 24], [120, 30]] as const)[iteration % 3]!
        : [columns, rows];
      const caps = {
        columns: geometry[0]!,
        colorDepth: "none" as const,
        unicode: true,
      };
      const viewportRows = geometry[1]!;
      const frame = (v: InteractionFrameViewport): SelectFrameState => {
        const count = v.controlRows(10);
        const focused = scenario === "navigation"
          ? iteration % entries.length
          : 0;
        return {
          kind: "select",
          label: "Choose",
          lifecycle: { status: "active" },
          options: entries,
          highlightedIndex: focused,
          visibleStart: Math.max(
            0,
            Math.min(focused - Math.floor(count / 2), entries.length - count),
          ),
          visibleCount: count,
          ...(presentation === "menu"
            ? { presentation: "menu", menuDetailLineLimit: v.controlRows(3) }
            : {}),
        };
      };
      const render = (state: SelectFrameState) => {
        calls++;
        const output = renderSelectCli(state, caps);
        layouts.add(output);
        return output;
      };
      const start = performance.now();
      if (algorithm === "shared") {
        fitInteractionFrame({ viewportRows, frame, render });
      } else {for (let budget = viewportRows; budget > 0; budget--) {
          const rendered = render(
            frame({
              maximumControlRows: budget,
              controlRows: (requested) => Math.min(requested, budget),
            }),
          );
          if (rendered.split("\n").length <= viewportRows) break;
        }}
      times.push(performance.now() - start);
    }
    fitting.push({
      scenario,
      presentation,
      columns,
      rows,
      algorithm,
      renderCallsPerFrame: calls / 100,
      distinctLayouts: layouts.size,
      ...summary(times),
    });
  }
}
const navigation = [];
for (const count of [20, 10_000]) {
  const view: TerminalApplicationView<number> = {
    title: "Collection",
    regions: [{
      kind: "choices",
      id: "items",
      title: "Items",
      entries: Array.from(
        { length: count },
        (_, i) => ({
          id: String(i),
          label: `Item ${i}`,
          value: i,
          status: { content: "Ready", tone: "success" },
        }),
      ),
    }],
  };
  let state = updateTerminalApplication(view);
  const io = new FakeTerminalIO();
  const times: number[] = [];
  const resizeTimes: number[] = [];
  let maximumRenderCalls = 0;
  for (let i = 0; i < 200; i++) {
    const start = performance.now();
    state =
      transitionTerminalApplication(state, { kind: "named", name: "down" })
        .state;
    const rendered = renderTerminalApplication(
      state,
      io.size(),
      io.capabilities(),
    );
    state = rendered.state;
    maximumRenderCalls = Math.max(maximumRenderCalls, rendered.renderCalls);
    times.push(performance.now() - start);
  }
  for (let i = 0; i < 60; i++) {
    const sizes = [[80, 24], [120, 30], [40, 20], [80, 13], [60, 50]] as const;
    const [columns, rows] = sizes[i % sizes.length]!;
    io.resize(columns, rows);
    const start = performance.now();
    state =
      renderTerminalApplication(state, io.size(), io.capabilities()).state;
    resizeTimes.push(performance.now() - start);
  }
  const observations: TerminalApplicationObservation[] = [];
  const live = new FakeTerminalIO([], { holdOpen: true });
  let iteration = 0;
  const start = performance.now();
  await runTerminalApplication({
    view,
    onKey: (key) =>
      key.kind === "text" && key.text === "q" ? { kind: "exit" } : undefined,
    start: (context) => {
      context.update(view);
    },
  }, {
    io: live,
    observe: (event) => {
      observations.push(event);
      if (iteration++ < 40) live.enqueueKeys("down");
      else live.enqueue("q");
    },
  });
  live.close();
  const liveMs = performance.now() - start;
  // A separate burst measures normalization coalescing while meaningful keys are queued.
  const updates = new FakeTerminalIO(["\x1b[B".repeat(40) + "q"]);
  const updateObservations: TerminalApplicationObservation[] = [];
  const updateStart = performance.now();
  const updated = await runTerminalApplication({
    view,
    start: (context) => {
      for (let burst = 0; burst < 100; burst++) {
        context.update({ ...view, title: `Update ${burst}` });
      }
    },
    onKey: (key) =>
      key.kind === "text" && key.text === "q" ? { kind: "exit" } : undefined,
  }, { io: updates, observe: (event) => updateObservations.push(event) });
  if (
    updated.positions.items?.selectedId !== String(Math.min(40, count - 1)) ||
    updated.view.title !== "Update 99"
  ) throw new Error("coalescing lost an update or navigation key");
  navigation.push({
    items: count,
    navigation: summary(times),
    resize: summary(resizeTimes),
    maximumRenderCalls,
    liveFrames: observations.length,
    liveMs,
    liveRender: summary(observations.map((v) => v.renderDurationMs)),
    backgroundBurstMs: performance.now() - updateStart,
    backgroundBurstFrames: updateObservations.length,
  });
}
console.log(
  JSON.stringify(
    {
      environment: {
        deno: Deno.version.deno,
        v8: Deno.version.v8,
        os: Deno.build.os,
        arch: Deno.build.arch,
      },
      fitting,
      navigation,
    },
    null,
    2,
  ),
);
