/** Reproducible fitting baseline and application navigation measurements; no sibling checkout. */
import {
  renderSelectCli,
  type SelectFrameState,
} from "@discern-sh/design-system/cli";
import {
  createTerminalApplicationModel,
  renderTerminalApplication,
  runTerminalApplication,
  TERMINAL_ANIMATION_INTERVAL_MS,
  type TerminalApplicationModel,
  type TerminalApplicationObservation,
  type TerminalApplicationView,
  transitionTerminalApplication,
} from "@discern-sh/design-system/cli/interactive";
import {
  captureTerminalFrame,
  FakeTerminalIO,
  ManualTerminalClock,
} from "@discern-sh/design-system/cli/interactive/testing";
import { TerminalScreenPainter } from "../src/cli/interactive/painter.ts";
import {
  fitInteractionFrame,
  type InteractionFrameViewport,
} from "../src/cli/interactive/viewport-budget.ts";
import { APPLICATION_REVIEW_SIZES } from "./playground/application.ts";
/** A one-group list of `count` items, the first `spinners` of them moving. */
const collection = (
  count: number,
  spinners = 0,
  title = "Collection",
): TerminalApplicationView<number> => ({
  header: { leading: [{ text: title, role: "title" }] },
  body: {
    kind: "list",
    list: {
      id: "items",
      groups: [{
        id: "all",
        title: "Items",
        items: Array.from({ length: count }, (_, i) => ({
          id: String(i),
          title: `Item ${i}`,
          marker: i < spinners
            ? {
              unicode: "◐",
              ascii: "@",
              tone: "accent" as const,
              animation: "spinner" as const,
            }
            : { unicode: "✓", ascii: "v", tone: "success" as const },
          cells: {
            status: [{
              text: i < spinners ? "Working" : "Ready",
              tone: "muted" as const,
            }],
          },
          primary: i,
        })),
      }],
      columns: [{ id: "status", width: 9, align: "end" }],
    },
  },
  footer: { left: [{ key: "q", label: "Quit" }] },
});
const down = { kind: "key", key: { kind: "named", name: "down" } } as const;
const quit = {
  keymap: [{ key: "q", action: -1 }],
  onAction: (action: number) =>
    action === -1 ? { kind: "exit" as const } : undefined,
};
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
  const view = collection(count);
  let model: TerminalApplicationModel<number> =
    createTerminalApplicationModel(view, { keymap: quit.keymap }).model;
  const io = new FakeTerminalIO();
  const times: number[] = [];
  const resizeTimes: number[] = [];
  let maximumRenderCalls = 0;
  for (let i = 0; i < 200; i++) {
    const start = performance.now();
    model = transitionTerminalApplication(model, down, i).model;
    const rendered = renderTerminalApplication(
      model,
      io.size(),
      io.capabilities(),
    );
    model = rendered.model;
    maximumRenderCalls = Math.max(maximumRenderCalls, rendered.renderCalls);
    times.push(performance.now() - start);
  }
  for (let i = 0; i < 60; i++) {
    const { columns, rows } =
      APPLICATION_REVIEW_SIZES[i % APPLICATION_REVIEW_SIZES.length] ??
        { columns: 80, rows: 24 };
    io.resize(columns, rows);
    const start = performance.now();
    model =
      renderTerminalApplication(model, io.size(), io.capabilities()).model;
    resizeTimes.push(performance.now() - start);
  }
  const observations: TerminalApplicationObservation[] = [];
  const live = new FakeTerminalIO([], { holdOpen: true });
  let iteration = 0;
  const start = performance.now();
  await runTerminalApplication({
    view,
    ...quit,
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
    ...quit,
    start: (context) => {
      // Replacements share the list value, as a provider's header-only
      // update would; building 10,000 items per update would measure this
      // script instead of adoption.
      for (let burst = 0; burst < 100; burst++) {
        context.update({
          ...view,
          header: { leading: [{ text: `Update ${burst}`, role: "title" }] },
        });
      }
    },
  }, { io: updates, observe: (event) => updateObservations.push(event) });
  if (
    updated.lists.items?.selectedId !== String(Math.min(40, count - 1)) ||
    !captureTerminalFrame(updates.output(), updates.size()).text.includes(
      "Update 99",
    )
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
// Painting: what reaches the terminal per paint, through the real runtime.
const settle = async () => {
  for (let turn = 0; turn < 5; turn++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};
const bytes = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: sorted[Math.floor(sorted.length * .5)],
    maximum: sorted.at(-1),
  };
};
const painting = [];
for (const [columns, rows] of [[80, 24], [120, 30]] as const) {
  for (const colorDepth of ["none", "truecolor"] as const) {
    const animated = collection(40, 3);
    const io = new FakeTerminalIO([], {
      holdOpen: true,
      columns,
      rows,
      colorDepth,
    });
    const clock = new ManualTerminalClock();
    const seen: TerminalApplicationObservation[] = [];
    const running = runTerminalApplication({ view: animated, ...quit }, {
      io,
      clock,
      theme: "dark",
      appearance: { accent: 220 },
      observe: (event) => seen.push(event),
    });
    await settle();
    const keyframe = seen[0];
    if (keyframe === undefined) throw new Error("no first paint");
    for (let tick = 0; tick < 40; tick++) {
      clock.advance(TERMINAL_ANIMATION_INTERVAL_MS);
      await settle();
    }
    const ticks = seen.slice(1);
    for (let key = 0; key < 20; key++) {
      io.enqueueKeys("down");
      await settle();
    }
    const navigation = seen.slice(1 + ticks.length);
    io.enqueue("q");
    await running;
    io.close();
    painting.push({
      columns,
      rows,
      colorDepth,
      visibleSpinners: 3,
      keyframeBytes: keyframe.bytesWritten,
      spinnerFrameBytes: bytes(ticks.map((event) => event.bytesWritten)),
      spinnerFrameRows: bytes(ticks.map((event) => event.rowsWritten)),
      navigationBytes: bytes(navigation.map((event) => event.bytesWritten)),
      navigationRows: bytes(navigation.map((event) => event.rowsWritten)),
      completeRepaintBytes: bytes(navigation.map((event) => event.frameBytes)),
    });
  }
}
// The painter alone: diff and validation cost per paint over real frames.
const painterTiming = [];
for (const rowDiff of [true, false]) {
  const io = new FakeTerminalIO([], { columns: 80, rows: 24 });
  const painter = new TerminalScreenPainter(io, () => 0, { rowDiff });
  let model: TerminalApplicationModel<number> =
    createTerminalApplicationModel(collection(200), { keymap: quit.keymap })
      .model;
  const frames: string[] = [];
  for (let i = 0; i < 200; i++) {
    model = transitionTerminalApplication(model, down, i).model;
    const rendered = renderTerminalApplication(model, io.size(), {
      ...io.capabilities(),
      colorDepth: "truecolor",
    });
    model = rendered.model;
    frames.push(rendered.frame);
  }
  const times: number[] = [];
  for (const frame of frames) {
    const start = performance.now();
    painter.paint({ frame, size: io.size() });
    times.push(performance.now() - start);
  }
  painterTiming.push({ rowDiff, paints: frames.length, ...summary(times) });
}
/** A confirming sheet over the list: consequences, two disclosures, two buttons. */
const sheet = {
  kind: "sheet" as const,
  id: "review",
  scope: "item" as const,
  title: "Apply the change to every item?",
  state: "ready" as const,
  body: [{
    kind: "marks" as const,
    items: Array.from({ length: 6 }, (_, i) => ({
      mark: { unicode: "→", ascii: ">", tone: "muted" as const },
      runs: [{ text: `Consequence ${i + 1} of the change, stated plainly` }],
    })),
  }],
  disclosures: ["plan", "command"].map((id, i) => ({
    id,
    label: id === "plan" ? "Plan · 12 steps" : "Command",
    key: i === 0 ? "d" : "c",
    content: Array.from({ length: 12 }, (_, step) => ({
      kind: "text" as const,
      runs: [{ text: `Step ${step + 1} of the plan` }],
    })),
  })),
  footnote: [{ text: "Nothing changes until you choose Apply." }],
  buttons: [
    { id: "keep", label: "Keep", role: "safe" as const },
    { id: "apply", label: "Apply", role: "confirm" as const, action: 1 },
  ],
};
/** A palette of `count` items across ten sections. */
const palette = (count: number) => ({
  kind: "palette" as const,
  id: "palette",
  scope: "global" as const,
  placeholder: "Search",
  sections: Array.from({ length: 10 }, (_, section) => ({
    title: `Section ${section}`,
    items: Array.from({ length: count / 10 }, (_, i) => ({
      id: `${section}-${i}`,
      label: `Command ${section * (count / 10) + i}`,
      context: `Item ${i}`,
      action: i,
    })),
  })),
});
const keyOf = (name: string) =>
  name.length === 1
    ? { kind: "key" as const, key: { kind: "text" as const, text: name } }
    : {
      kind: "key" as const,
      key: { kind: "named" as const, name: name as "right" },
    };
const layers = [];
for (const count of [20, 10_000]) {
  for (
    const [name, layer, keys] of [
      ["sheet", sheet, ["right", "left", "d", "d", "tab", "shift-tab"]],
      ["palette", palette(1000), [..."command 4", "backspace"]],
    ] as const
  ) {
    const io = new FakeTerminalIO([], { colorDepth: "truecolor" });
    const painter = new TerminalScreenPainter(io, () => 0);
    let model: TerminalApplicationModel<number> =
      createTerminalApplicationModel(
        { ...collection(count), layers: [layer] },
        { keymap: quit.keymap },
      ).model;
    const render = () => {
      const frame = renderTerminalApplication(
        model,
        io.size(),
        io.capabilities(),
      );
      model = frame.model;
      return painter.paint({
        frame: frame.frame,
        size: io.size(),
        layer: frame.composition,
      });
    };
    const opened = render();
    const times: number[] = [];
    const written: number[] = [];
    for (let i = 0; i < 60; i++) {
      const start = performance.now();
      model = transitionTerminalApplication(
        model,
        keyOf(keys[i % keys.length] ?? "right"),
        i,
      ).model;
      const painted = render();
      times.push(performance.now() - start);
      written.push(painted.status === "painted" ? painted.bytes : 0);
    }
    layers.push({
      items: count,
      layer: name,
      openBytes: opened.status === "painted" ? opened.bytes : 0,
      keyBytes: bytes(written),
      ...summary(times),
    });
  }
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
      painting,
      painterTiming,
      layers,
    },
    null,
    2,
  ),
);
