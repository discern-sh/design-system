import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  createCliBlock,
  renderMarkdownCli,
  stripAnsi,
} from "../../src/cli/mod.ts";
import {
  createTerminalApplicationModel,
  renderTerminalApplication,
  terminalApplicationDeadline,
  type TerminalApplicationEffect,
  type TerminalApplicationInput,
  type TerminalApplicationModel,
  terminalApplicationReservedKeys,
  terminalApplicationState,
  type TerminalApplicationView,
  transitionTerminalApplication,
  updateTerminalApplication,
  validateTerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import type { TerminalKeyName } from "../../src/cli/interactive/keys.ts";
import {
  FakeTerminalIO,
  TERMINAL_KEY_SEQUENCES,
} from "../../src/cli/interactive/testing.ts";
import { type TestItem, testView } from "../fixtures/application-views.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";

const GROUPS = [
  { id: "first", title: "First" },
  { id: "second", title: "Second" },
  { id: "third", title: "Third" },
] as const;

type Model = TerminalApplicationModel<string>;

/** Drive a model through keys and inputs, rendering after each like the runtime. */
class Driver {
  model: Model;
  effects: TerminalApplicationEffect<string>[] = [];
  now = 0;
  constructor(
    view: TerminalApplicationView<string>,
    readonly io = new FakeTerminalIO([], { columns: 80, rows: 24 }),
  ) {
    const created = createTerminalApplicationModel(view, {
      keymap: [
        { key: "x", action: "bound" },
        { key: "q", action: "quit" },
        { key: "ctrl-k", action: "commands" },
      ],
    });
    this.model = created.model;
    this.effects.push(...created.effects);
    this.render();
  }
  render(): string {
    const frame = renderTerminalApplication(
      this.model,
      this.io.size(),
      this.io.capabilities(),
      {},
      { phase: 0, now: this.now },
    );
    this.model = frame.model;
    return stripAnsi(frame.frame);
  }
  input(input: TerminalApplicationInput): this {
    const step = transitionTerminalApplication(this.model, input, this.now);
    this.model = step.model;
    this.effects.push(...step.effects);
    this.render();
    return this;
  }
  key(...names: (TerminalKeyName | string)[]): this {
    for (const name of names) {
      this.input({
        kind: "key",
        key: name.length === 1
          ? { kind: "text", text: name }
          : { kind: "named", name: name as TerminalKeyName },
      });
    }
    return this;
  }
  /** Let the settle window close, as it does when no key is pressed. */
  idle(): this {
    this.now += 10_000;
    return this.input({ kind: "time" });
  }
  update(view: TerminalApplicationView<string>): this {
    const step = updateTerminalApplication(this.model, view, this.now);
    this.model = step.model;
    this.effects.push(...step.effects);
    this.render();
    return this;
  }
  get selected(): string | undefined {
    return terminalApplicationState(this.model).lists.items?.selectedId;
  }
  take(): TerminalApplicationEffect<string>[] {
    return this.effects.splice(0);
  }
}

const grouped = (
  items: readonly TestItem[],
  options: Parameters<typeof testView>[1] = {},
) => testView(items, { groups: GROUPS, ...options });

Deno.test("selection starts on the first item and follows identity through reorder", () => {
  const driver = new Driver(testView(["a", "b", "c"]));
  assertEquals(driver.selected, "a");
  assertEquals(driver.take(), [{
    kind: "selection-change",
    listId: "items",
    itemId: "a",
  }]);
  driver.key("down");
  assertEquals(driver.selected, "b");
  driver.idle().update(testView(["c", "b", "a"]));
  assertEquals(driver.selected, "b");
  assertEquals(
    driver.take().filter((effect) => effect.kind === "selection-moved"),
    [],
  );
});

Deno.test("a regrouped selection follows its item and reports the move", () => {
  const driver = new Driver(grouped([
    { id: "a", group: "first" },
    { id: "b", group: "second" },
  ]));
  driver.key("down");
  driver.take();
  driver.idle().update(grouped([
    { id: "a", group: "first" },
    { id: "b", group: "first" },
  ]));
  assertEquals(driver.selected, "b");
  assertEquals(driver.take(), [{
    kind: "selection-moved",
    listId: "items",
    itemId: "b",
    move: { kind: "regrouped", from: "second", to: "first" },
  }]);
});

Deno.test("a removed selection moves to the next row in its group, then the next group, then the previous row", () => {
  const items: TestItem[] = [
    { id: "a", group: "first" },
    { id: "b", group: "first" },
    { id: "c", group: "first" },
    { id: "d", group: "second" },
  ];
  const driver = new Driver(grouped(items));
  driver.key("down");
  driver.take();
  driver.idle().update(grouped(items.filter((item) => item.id !== "b")));
  assertEquals(driver.selected, "c", "the next row in the same group");
  assertEquals(driver.take(), [
    {
      kind: "selection-moved",
      listId: "items",
      itemId: "b",
      move: { kind: "removed", replacement: "c" },
    },
    { kind: "selection-change", listId: "items", itemId: "c" },
  ]);
  driver.update(grouped(items.filter((item) => !["b", "c"].includes(item.id))));
  assertEquals(driver.selected, "d", "the first row of the next group");
  driver.update(grouped([{ id: "a", group: "first" }]));
  assertEquals(driver.selected, "a", "the previous row");
  driver.update(grouped([]));
  assertEquals(driver.selected, undefined);
});

Deno.test("membership waits for key idle while content updates at once", () => {
  const driver = new Driver(testView(["a", "b", "c"], { settleMs: 1500 }));
  driver.now = 1000;
  driver.key("down");
  driver.update(
    testView([{ id: "c" }, { id: "a" }, { id: "b", status: "Changed" }], {
      settleMs: 1500,
    }),
  );
  const pending = driver.render();
  assert(
    pending.indexOf("Item a") < pending.indexOf("Item c"),
    "order holds while keys are recent",
  );
  assert(pending.includes("Changed"), "content applies at once");
  assertEquals(terminalApplicationDeadline(driver.model, driver.now), 2500);
  driver.now = 2499;
  driver.input({ kind: "time" });
  assert(driver.render().indexOf("Item a") < driver.render().indexOf("Item c"));
  driver.now = 2500;
  driver.input({ kind: "time" });
  const settled = driver.render();
  assert(settled.indexOf("Item c") < settled.indexOf("Item a"));
  assertEquals(driver.selected, "b");
  assertEquals(
    terminalApplicationDeadline(driver.model, driver.now),
    undefined,
  );
});

Deno.test("a caller selection of an item still settling applies its membership", () => {
  const driver = new Driver(testView(["a", "b"]));
  driver.now = 10;
  driver.key("down");
  driver.update(testView(["a", "b", "new"]));
  assert(!driver.render().includes("Item new"));
  driver.input({ kind: "select", listId: "items", itemId: "new" });
  assertEquals(driver.selected, "new");
  assert(driver.render().includes("Item new"));
});

Deno.test("the filter narrows while typing, keeps arrows moving, and Enter or Escape leave it", () => {
  const driver = new Driver(
    testView([
      "apple",
      { id: "banana", status: "Stale" },
      "apricot",
      "cherry",
    ], { filter: true }),
  );
  driver.key("/", "a", "p");
  let frame = driver.render();
  assert(frame.includes("Filter  ap▏  2 of 4"), frame.split("\n")[0]);
  assert(!frame.includes("Item cherry"));
  assertEquals(driver.selected, "apple");
  driver.key("down");
  assertEquals(driver.selected, "apricot", "arrows move through matches");
  assertEquals(
    terminalApplicationState(driver.model).focusedControlId,
    "items:filter",
  );
  driver.take();
  driver.key("x");
  assertEquals(
    driver.take().filter((effect) => effect.kind === "action"),
    [],
    "letters type while the field owns input",
  );
  driver.key("backspace", "enter");
  frame = driver.render();
  assert(frame.includes("Filter  ap  2 of 4"), "Enter keeps the filter");
  driver.key("x");
  assertEquals(
    driver.take().filter((effect) => effect.kind === "action"),
    [{ kind: "action", action: "bound", source: "key" }],
    "Enter returns keys to the list",
  );
  driver.key("/", "backspace", "backspace", "s", "t", "a", "l", "e");
  assertEquals(driver.selected, "banana", "keywords match");
  driver.key("escape");
  assertEquals(
    terminalApplicationState(driver.model).lists.items?.filter,
    undefined,
  );
  assertEquals(driver.selected, "banana");
  assert(driver.render().includes("Item cherry"));
});

Deno.test("a filter that matches nothing keeps the selection through an update", () => {
  const view = testView(["apple", "banana", "cherry"], { filter: true });
  const driver = new Driver(view);
  driver.key("down");
  assertEquals(driver.selected, "banana");
  driver.key("/", "z", "z");
  assert(driver.render().includes("0 of 3"));
  // The same list again, as a live application repaints its view.
  driver.idle().update(
    testView(["apple", "banana", "cherry"], { filter: true }),
  );
  driver.key("escape");
  assertEquals(driver.selected, "banana", "clearing the filter returns to it");
  driver.key("/", "z", "z");
  driver.idle().update(testView(["apple", "cherry"], { filter: true }));
  driver.key("escape");
  assert(driver.selected !== "banana", "a removed item still moves on");
});

Deno.test("fuzzy filters match characters in order", () => {
  const view = testView(["alpha", "bravo"], { filter: true });
  const body = view.body;
  if (body.kind !== "master-detail") throw new Error("expected master-detail");
  const fuzzy = {
    ...view,
    body: {
      ...body,
      list: {
        ...body.list,
        filter: { label: "Find", match: "fuzzy" as const },
      },
    },
  };
  const driver = new Driver(fuzzy);
  driver.key("/", "b", "v");
  assertEquals(driver.selected, "bravo");
  assert(driver.render().includes("Find  bv▏  1 of 2"));
});

Deno.test("foldable groups fold and unfold with Enter on their header or fold row", () => {
  const driver = new Driver(testView(
    [{ id: "a", group: "first" }, { id: "b", group: "kept" }, {
      id: "c",
      group: "kept",
    }],
    {
      groups: [
        { id: "first", title: "First" },
        { id: "kept", title: "Kept", foldable: true, initiallyFolded: true },
      ],
    },
  ));
  let frame = driver.render();
  assert(frame.includes("▸ Kept 2"), "initially folded");
  assert(!frame.includes("Item b"));
  driver.key("down");
  assertEquals(
    terminalApplicationState(driver.model).lists.items?.selectedGroupId,
    "kept",
  );
  driver.key("enter");
  frame = driver.render();
  assert(frame.includes("▾ Kept  2"));
  assert(frame.includes("Item c"));
  assertEquals(terminalApplicationState(driver.model).lists.items?.folds, []);
  driver.key("enter");
  assert(driver.render().includes("▸ Kept 2"));
});

Deno.test("a selected group row shows its groups and what Enter does, not item hints", async (t) => {
  const view = testView(
    [{ id: "a", group: "first" }, { id: "b", group: "kept" }],
    {
      groups: [
        { id: "first", title: "First" },
        { id: "kept", title: "Kept", foldable: true, initiallyFolded: true },
      ],
    },
  );
  for (const [columns, rows] of [[80, 24], [60, 20], [32, 10]] as const) {
    await t.step(`${columns}x${rows}`, () => {
      const driver = new Driver(
        view,
        new FakeTerminalIO([], { columns, rows }),
      );
      driver.key("down");
      let frame = driver.render().split("\n");
      const footer = frame.at(-1) ?? "";
      assert(footer.includes("↵ Show"), footer);
      assert(!footer.includes("Open"), "an item hint on a group row");
      assert(
        frame.slice(1, -1).some((line) =>
          line.includes("Kept") && !line.includes("▌")
        ),
        `the group summary is missing:\n${frame.join("\n")}`,
      );
      driver.key("enter");
      frame = driver.render().split("\n");
      assert((frame.at(-1) ?? "").includes("↵ Hide"));
    });
  }
});

Deno.test("short screens fold quiet groups into one summary row, never the selection's", () => {
  const io = new FakeTerminalIO([], { columns: 80, rows: 10 });
  const items: TestItem[] = [
    ...["a", "b", "c"].map((id) => ({ id, group: "first" })),
    ...["d", "e", "f"].map((id) => ({ id, group: "second" })),
    ...["g", "h", "i"].map((id) => ({ id, group: "third" })),
  ];
  const driver = new Driver(grouped(items, { density: true }), io);
  const frame = driver.render();
  assert(frame.includes("▸ Second 3 · Third 3"), frame);
  assert(frame.includes("Item c"), "the selection's group stays open");
  const lines = frame.split("\n");
  const summary = lines.findIndex((line) => line.includes("▸ Second"));
  assertEquals(
    (lines[summary - 1] ?? "x").slice(0, 30).trim(),
    "",
    `the folds leave room for the separator above the summary:\n${frame}`,
  );
  driver.key("down", "down", "down");
  assertEquals(
    terminalApplicationState(driver.model).lists.items?.selectedGroupId,
    "second",
  );
  assert(
    driver.render().includes("▸ Second 3 · Third 3"),
    "keys never refold the list",
  );
  driver.key("enter");
  const opened = driver.render();
  assert(opened.includes("Item d"), "Enter unfolds every group in the row");
  assert(!opened.includes("▸ Second"));
});

Deno.test("Space zooms the detail; Up and Down walk items; Escape, Left and Space return", () => {
  const driver = new Driver(grouped([
    { id: "a", group: "first" },
    { id: "b", group: "second" },
  ]));
  driver.key("space");
  let frame = driver.render();
  assert(frame.includes("First  ›  Item a"), frame);
  assert(frame.includes("1 of 2"));
  driver.key("down");
  frame = driver.render();
  assertEquals(driver.selected, "b");
  assert(frame.includes("Second  ›  Item b"));
  assert(frame.includes("2 of 2"));
  driver.key("escape");
  for (const back of ["escape", "left", "space"] as const) {
    driver.key("space");
    assertEquals(
      terminalApplicationState(driver.model).lists.items?.zoomed,
      true,
    );
    driver.key(back);
    assertEquals(
      terminalApplicationState(driver.model).lists.items?.zoomed,
      false,
      back,
    );
  }
});

Deno.test("page keys scroll the detail by item and remember each item's place", () => {
  const view = testView(["a", "b"]);
  const body = view.body;
  if (body.kind !== "master-detail") throw new Error("expected master-detail");
  const long = {
    ...view,
    body: {
      ...body,
      detail: {
        ...body.detail,
        content: {
          ...body.detail.content,
          a: Array.from({ length: 40 }, (_, index) => ({
            kind: "text" as const,
            runs: [{ text: `Line ${index}` }],
          })),
        },
      },
    },
  };
  const driver = new Driver(long);
  assert(driver.render().includes("more · PgDn"));
  driver.key("page-down");
  const scrolled = terminalApplicationState(driver.model).detailScroll.a ?? 0;
  assert(scrolled > 0);
  assert(driver.render().includes("more · PgUp"));
  driver.key("shift-down");
  assertEquals(
    terminalApplicationState(driver.model).detailScroll.a,
    scrolled + 1,
  );
  driver.key("down", "up");
  assertEquals(
    terminalApplicationState(driver.model).detailScroll.a,
    scrolled + 1,
  );
});

Deno.test("a long list scrolls at its edge with one row of margin, a sticky header, and honest counts", () => {
  const io = new FakeTerminalIO([], { columns: 60, rows: 12 });
  const items = Array.from({ length: 30 }, (_, index) => `${index}`);
  const driver = new Driver(testView(items, { body: "list" }), io);
  let frame = driver.render();
  assert(frame.includes("↓ 22 more"), frame);
  const line = (id: string) =>
    driver.render().split("\n").findIndex((row) => row.includes(`Item ${id} `));
  driver.key(...Array.from({ length: 6 }, () => "down"));
  assertEquals(line("6"), 8, "no scrolling until the edge");
  driver.key("down");
  assertEquals(line("7"), 8, "the selection stops one row above the edge");
  frame = driver.render();
  assert(frame.split("\n")[1]?.includes("Items  30"), "sticky header");
  assert(frame.includes("↑ 1 more"));
  driver.key("up");
  assertEquals(line("6"), 7, "moving back does not centre");
  driver.key("end");
  frame = driver.render();
  assert(frame.includes("Item 29"));
  assert(!frame.includes("↓"));
});

Deno.test("Tab and Shift+Tab reach the first row of the next and previous group", () => {
  const driver = new Driver(grouped([
    { id: "a", group: "first" },
    { id: "b", group: "first" },
    { id: "c", group: "second" },
    { id: "d", group: "third" },
  ]));
  driver.key("tab");
  assertEquals(driver.selected, "c");
  driver.key("tab");
  assertEquals(driver.selected, "d");
  driver.key("tab");
  assertEquals(driver.selected, "d", "no wrap");
  driver.key("shift-tab", "shift-tab");
  assertEquals(driver.selected, "a");
  driver.key("end", "home");
  assertEquals(driver.selected, "a");
});

Deno.test("reveal selects into a folded group and unfolds only that group", () => {
  const driver = new Driver(testView(
    [{ id: "a", group: "first" }, { id: "b", group: "kept" }, {
      id: "c",
      group: "other",
    }],
    {
      groups: [
        { id: "first", title: "First" },
        { id: "kept", title: "Kept", foldable: true, initiallyFolded: true },
        { id: "other", title: "Other", foldable: true, initiallyFolded: true },
      ],
    },
  ));
  driver.input({ kind: "select", listId: "items", itemId: "b" });
  assertEquals(driver.selected, "a", "a folded item needs reveal");
  driver.input({ kind: "select", listId: "items", itemId: "b", reveal: true });
  assertEquals(driver.selected, "b");
  assertEquals(terminalApplicationState(driver.model).lists.items?.folds, [
    "other",
  ]);
});

Deno.test("Enter runs an item's action, Escape dismisses a message, and Ctrl+C cancels unless bound", () => {
  const driver = new Driver(testView(["a"], {
    message: { id: "note", runs: [{ text: "Saved" }] },
  }));
  driver.take();
  driver.key("enter");
  assertEquals(driver.take(), [{
    kind: "action",
    action: "open:a",
    source: "enter",
  }]);
  driver.key("escape");
  assertEquals(driver.take(), [{
    kind: "dismiss",
    target: { message: "note" },
    via: "escape",
  }]);
  assert(!driver.render().includes("Saved"));
  driver.key("escape");
  assertEquals(driver.take(), [], "Escape with nothing to close does nothing");
  driver.input({ kind: "key", key: { kind: "named", name: "ctrl-c" } });
  assertEquals(driver.take(), [{ kind: "cancel" }]);
});

Deno.test("an optional message shows only whole and never in the footer's place", () => {
  const teaching = "Each item keeps its own workspace; press Enter to open it";
  const view = testView(["a"], {
    message: {
      id: "teach",
      runs: [{ text: teaching }],
      optional: true,
      dismiss: { onKey: true },
    },
  });
  const at = (columns: number, rows: number) =>
    new Driver(view, new FakeTerminalIO([], { columns, rows }));
  // Wide enough: the whole line shows above the footer.
  const wide = at(80, 24);
  assert(wide.render().includes(teaching));
  assertEquals(wide.render().split("\n").at(-1)?.includes("Open"), true);
  // Too narrow to show it whole: no part of it shows, and Escape passes by.
  const narrow = at(40, 20);
  const frame = narrow.render();
  assert(!frame.includes("Each item"), frame);
  narrow.take();
  narrow.key("escape");
  assertEquals(narrow.take(), [], "Escape never dismisses a message unseen");
  // Short: the footer keeps its row.
  const short = at(80, 13);
  const shortFrame = short.render();
  assert(!shortFrame.includes("Each item"), shortFrame);
  assert(shortFrame.split("\n").at(-1)?.includes("Open"), shortFrame);
  // A required message still shows cut, and takes the footer's place.
  const required = new Driver(
    testView(["a"], { message: { id: "warn", runs: [{ text: teaching }] } }),
    new FakeTerminalIO([], { columns: 80, rows: 13 }),
  );
  assert(required.render().split("\n").at(-1)?.includes("Each item"));
});

Deno.test("a first or persistent message's row folds a quiet group before the list scrolls", () => {
  const items: TestItem[] = [
    ...["a", "b", "c"].map((id) => ({ id, group: "first" })),
    ...["d", "e", "f"].map((id) => ({ id, group: "second" })),
    ...["g", "h", "i"].map((id) => ({ id, group: "third" })),
  ];
  const plain = grouped(items, { density: true, body: "list" });
  // The least height, tall enough for a message row of its own, at which
  // the list fits whole without a message.
  let rows = 14;
  for (; rows < 30; rows += 1) {
    const frame = new Driver(
      plain,
      new FakeTerminalIO([], { columns: 60, rows }),
    ).render();
    if (frame.includes("Item i") && !frame.includes("more")) break;
  }
  for (
    const dismiss of [undefined, { onKey: true }] as const
  ) {
    const driver = new Driver(
      grouped(items, {
        density: true,
        body: "list",
        message: {
          id: "note",
          runs: [{ text: "A note" }],
          ...(dismiss === undefined ? {} : { dismiss }),
        },
      }),
      new FakeTerminalIO([], { columns: 60, rows }),
    );
    const frame = driver.render();
    assert(frame.includes("A note"), frame);
    assert(!/\d+ more/u.test(frame), `the list scrolled:\n${frame}`);
    assert(frame.includes("Third"), `a group went out of sight:\n${frame}`);
  }
  // A message that arrives later passes without refolding the list.
  const later = new Driver(
    plain,
    new FakeTerminalIO([], { columns: 60, rows }),
  );
  later.update(grouped(items, {
    density: true,
    body: "list",
    message: {
      id: "toast",
      runs: [{ text: "Saved" }],
      dismiss: { afterMs: 1 },
    },
  }));
  const toast = later.render();
  assert(toast.includes("Saved"), toast);
  assert(
    /\d+ more/u.test(toast),
    `a passing toast refolded the list:\n${toast}`,
  );
});

Deno.test("a message dismissed on key reports before the key's own action", () => {
  const driver = new Driver(testView(["a", "b"], {
    message: {
      id: "tip",
      runs: [{ text: "Tip" }],
      dismiss: { onKey: true },
    },
  }));
  driver.take();
  driver.key("down");
  assertEquals(driver.take(), [
    { kind: "selection-change", listId: "items", itemId: "b" },
    { kind: "dismiss", target: { message: "tip" }, via: "key" },
  ]);
  driver.key("x");
  assertEquals(driver.take(), [{
    kind: "action",
    action: "bound",
    source: "key",
  }]);
});

Deno.test("a timed message reports its timeout and must leave the next view", () => {
  const view = testView(["a"], {
    message: {
      id: "done",
      runs: [{ text: "Done" }],
      dismiss: { afterMs: 6000 },
    },
  });
  const driver = new Driver(view);
  driver.take();
  assertEquals(terminalApplicationDeadline(driver.model, 0), 6000);
  driver.now = 6000;
  driver.input({ kind: "time" });
  assertEquals(driver.take(), [{
    kind: "dismiss",
    target: { message: "done" },
    via: "timeout",
  }]);
  assertThrows(() => driver.update(view), TypeError, "dismissed");
  driver.update(testView(["a"]));
  driver.update(view);
  assert(driver.render().includes("Done"), "a later view may show it again");
});

Deno.test("busy liveness appears only after it has lasted", () => {
  const view = (state: "idle" | "busy"): TerminalApplicationView<string> => ({
    ...testView(["a"]),
    header: {
      leading: [{ text: "Studio" }],
      liveness: {
        state,
        labels: {
          idle: "Live",
          busy: "Refreshing",
          retrying: "Retrying",
          stale: "Offline",
        },
        busyAfterMs: 1500,
      },
    },
  });
  const driver = new Driver(view("idle"));
  assert(driver.render().split("\n")[0]?.includes("Live"));
  driver.now = 100;
  driver.update(view("busy"));
  assert(driver.render().split("\n")[0]?.includes("Live"));
  assertEquals(terminalApplicationDeadline(driver.model, driver.now), 1600);
  driver.now = 1600;
  assert(driver.render().split("\n")[0]?.includes("◐ Refreshing"));
  assertEquals(
    terminalApplicationDeadline(driver.model, driver.now),
    undefined,
  );
});

Deno.test("an empty body's explanation may hold several lines, each centred on its own", () => {
  const view = (body: TerminalApplicationView<string>["body"]) => ({
    header: { leading: [{ text: "Studio" }] },
    body,
    footer: { left: [{ key: "enter", label: "New item" }] },
  });
  const first = "Each item gets its own workspace for one change.";
  const second = "Hand it to a helper; you review the result.";
  const lines = new Driver(view({
    kind: "empty",
    title: "Nothing here yet",
    body: [[{ text: first }], [{ text: second }]],
    primary: { key: "enter", label: "New item", action: "create" },
  })).render().split("\n");
  const at = (text: string) => lines.find((line) => line.includes(text)) ?? "";
  // Each sentence is a line of its own, centred by its own width.
  for (const text of [first, second]) {
    const line = at(text);
    assertEquals(line.trim(), text);
    const left = line.length - line.trimStart().length;
    const right = line.length - line.trimEnd().length;
    assert(Math.abs(left - right) <= 1, JSON.stringify(line));
  }
  // One paragraph still wraps where it falls.
  const paragraph = new Driver(view({
    kind: "empty",
    title: "Nothing here yet",
    body: [{ text: `${first} ${second}` }],
    primary: { key: "enter", label: "New item", action: "create" },
  })).render();
  assert(!paragraph.includes(second), paragraph);
  assertEquals(
    validateTerminalApplicationView(
      view({
        kind: "empty",
        title: "Nothing",
        body: [[{ text: "Fine" }], [{ text: "bad\u0007" }]],
        primary: { key: "enter", label: "New item", action: "create" },
      }),
      { keymap: [] },
    ).map((issue) => issue.path).filter((path) => path.startsWith("body.body")),
    ["body.body[1][0].text"],
  );
});

Deno.test("an empty body selects its primary hint and Down reaches its list", () => {
  const empty: TerminalApplicationView<string> = {
    header: { leading: [{ text: "Studio" }] },
    body: {
      kind: "empty",
      title: "Nothing here yet",
      body: [{ text: "Create the first item to begin." }],
      primary: { key: "enter", label: "New item", action: "create" },
      secondary: [{ key: "ctrl-k", label: "Commands" }],
      list: {
        id: "items",
        groups: [{
          id: "kept",
          title: "Kept",
          foldable: true,
          initiallyFolded: true,
          items: [{
            id: "old",
            title: "Old",
            marker: { unicode: "◇", ascii: "~" },
          }],
        }],
      },
    },
    footer: { left: [{ key: "enter", label: "New item" }] },
  };
  const driver = new Driver(empty);
  const frame = driver.render();
  assert(frame.includes("Nothing here yet"));
  assert(frame.includes("▌ ↵   New item"), frame);
  assert(frame.includes("▸ Kept 1"));
  assertEquals(
    terminalApplicationState(driver.model).focusedControlId,
    "primary",
  );
  driver.take();
  driver.key("enter");
  assertEquals(driver.take(), [{
    kind: "action",
    action: "create",
    source: "enter",
  }]);
  driver.key("down");
  assertEquals(
    terminalApplicationState(driver.model).lists.items?.selectedGroupId,
    "kept",
  );
  driver.key("up");
  assertEquals(
    terminalApplicationState(driver.model).focusedControlId,
    "primary",
  );
});

Deno.test("a reading body scrolls with its keys and remembers its place", () => {
  const io = new FakeTerminalIO([], { columns: 60, rows: 12 });
  const reading = (id: string): TerminalApplicationView<string> => ({
    header: { leading: [{ text: "Guide" }] },
    body: {
      kind: "reading",
      id,
      content: createCliBlock(
        (props: { readonly lines: readonly string[] }) =>
          props.lines.join("\n"),
        { lines: Array.from({ length: 40 }, (_, index) => `Line ${index}`) },
      ),
    },
    footer: { left: [{ key: "q", label: "Quit" }] },
  });
  const driver = new Driver(reading("guide"), io);
  assert(driver.render().includes("more · PgDn"));
  driver.key("down", "down");
  assertEquals(terminalApplicationState(driver.model).readingScroll.guide, 2);
  driver.key("end");
  const frame = driver.render();
  assert(frame.includes("Line 39"));
  assert(frame.includes("more · PgUp"));
  driver.key("home");
  assertEquals(terminalApplicationState(driver.model).readingScroll.guide, 0);
  driver.key("page-down");
  driver.update(reading("other"));
  driver.update(reading("guide"));
  assert((terminalApplicationState(driver.model).readingScroll.guide ?? 0) > 0);
});

Deno.test("the view rules report every broken rule as data", () => {
  const view = testView(["a", "a"]);
  const issues = validateTerminalApplicationView(view);
  assert(issues.some((issue) => issue.message === "repeats an item id"));
  const body = view.body;
  if (body.kind !== "master-detail") throw new Error("expected master-detail");
  const wrong = {
    ...view,
    body: { ...body, detail: { ...body.detail, follows: "other" } },
  };
  assert(
    validateTerminalApplicationView(wrong).some((issue) =>
      issue.path === "body.detail.follows"
    ),
  );
  assertEquals(
    validateTerminalApplicationView(testView(["a", "b"]), {
      keymap: [{ key: "q", action: "quit" }],
    }),
    [],
  );
  assert(
    validateTerminalApplicationView(testView(["a", "b"])).some((issue) =>
      issue.path === "footer.right[0].key"
    ),
    "a footer that advertises an unbound key is refused",
  );
  assertThrows(() => createTerminalApplicationModel(view), TypeError);
});

Deno.test("every body reserves exactly the keys the package acts on in it", async (t) => {
  // Iterate the decoder's whole key vocabulary plus printable navigation
  // keys through every kind of body, with and without a filter, so a key a
  // body handles without reserving it, or reserves while ignoring it, fails.
  const keys: readonly string[] = [
    ...Object.keys(TERMINAL_KEY_SEQUENCES),
    "/",
    "space",
    "j",
    "k",
  ];
  const items: readonly TestItem[] = [
    { id: "a", group: "first" },
    { id: "b", group: "first" },
    { id: "c", group: "second" },
    { id: "d", group: "second" },
    { id: "e", group: "third" },
  ];
  const longDetail = (filter: boolean): TerminalApplicationView<string> => {
    const view = grouped(items, { filter });
    if (view.body.kind !== "master-detail") throw new Error("expected detail");
    return {
      ...view,
      body: {
        ...view.body,
        detail: {
          ...view.body.detail,
          content: Object.fromEntries(
            items.map(({ id }) => [
              id,
              Array.from({ length: 60 }, (_, index) => ({
                kind: "text" as const,
                runs: [{ text: `${id} line ${index}` }],
              })),
            ]),
          ),
        },
      },
    };
  };
  const listed = (filter: boolean) => grouped(items, { filter, body: "list" });
  const reading: TerminalApplicationView<string> = {
    ...testView(["a"]),
    footer: { left: [{ key: ["up", "down"], label: "Scroll" }] },
    body: {
      kind: "reading",
      id: "guide",
      content: createCliBlock(renderMarkdownCli, {
        source: Array.from({ length: 80 }, (_, index) => `- line ${index}`)
          .join("\n"),
      }),
    },
  };
  // Markdown makes a reading body's links controls, which reserve more keys.
  const markdownReading: TerminalApplicationView<string> = {
    ...reading,
    body: {
      kind: "reading",
      id: "notes",
      content: {
        kind: "markdown",
        source: `See [one](one.md) and [two](two.md).\n\n${
          Array.from({ length: 80 }, (_, index) => `- line ${index}`).join(
            "\n",
          )
        }`,
      },
    },
  };
  const empty = (list: boolean, filter: boolean) => {
    const base = listed(filter);
    return {
      ...base,
      body: {
        kind: "empty" as const,
        title: "Nothing yet",
        body: [{ text: "Start here." }],
        primary: { key: "enter", label: "New", action: "new" },
        ...(list && base.body.kind === "list" ? { list: base.body.list } : {}),
      },
    };
  };
  const bodies: readonly {
    readonly name: string;
    readonly view: TerminalApplicationView<string>;
    readonly prepared: readonly (readonly string[])[];
  }[] = [
    ...[true, false].map((filter) => ({
      name: `master-detail, filter ${filter}`,
      view: longDetail(filter),
      prepared: [["down", "down"], ["down", "down", "page-down"], [
        "down",
        "down",
        "space",
      ]],
    })),
    ...[true, false].map((filter) => ({
      name: `list, filter ${filter}`,
      view: listed(filter),
      prepared: [["down", "down"], ["end"]],
    })),
    { name: "reading", view: reading, prepared: [[], ["page-down"]] },
    {
      name: "Markdown reading",
      view: markdownReading,
      prepared: [[], ["tab"], ["page-down"]],
    },
    ...[true, false].map((filter) => ({
      name: `empty with a list, filter ${filter}`,
      view: empty(true, filter),
      prepared: [[], ["down"], ["down", "down"], ["down", "end"]],
    })),
    { name: "empty", view: empty(false, false), prepared: [[]] },
  ];
  // Every kind of body, and both kinds of reading content, are enrolled.
  const kinds = {
    "master-detail": true,
    list: true,
    reading: true,
    empty: true,
  } satisfies Record<TerminalApplicationView<string>["body"]["kind"], true>;
  assertEquals(
    new Set(bodies.map(({ view }) => view.body.kind)),
    new Set(Object.keys(kinds)),
  );
  assertEquals(
    new Set(
      bodies.flatMap(({ view }) =>
        view.body.kind === "reading"
          ? ["kind" in view.body.content ? "markdown" : "block"]
          : []
      ),
    ),
    new Set(["markdown", "block"]),
  );
  for (const body of bodies) {
    for (const viKeys of [false, true]) {
      await t.step(`${body.name}, vi ${viKeys}`, () => {
        const handled = new Set<string>();
        // q is the views' own binding, not a key the package handles.
        for (const key of keys.filter((candidate) => candidate !== "q")) {
          for (const prepare of body.prepared) {
            const driver = new ApplicationDriver(body.view, {
              columns: 80,
              rows: 24,
              viKeys,
              keymap: [{ key: "q", action: "quit" }],
            });
            driver.key(...prepare);
            const before = JSON.stringify(driver.state);
            driver.take();
            driver.key(key);
            const effects = driver.take().filter((effect) =>
              effect.kind !== "selection-change"
            );
            if (JSON.stringify(driver.state) !== before || effects.length > 0) {
              handled.add(key);
            }
          }
        }
        // Escape closes what is open before a binding may see it, and
        // Ctrl+C cancels unless a binding claims it; both stay bindable.
        handled.delete("escape");
        handled.delete("ctrl-c");
        const reserved = new Set(
          terminalApplicationReservedKeys(body.view.body, { viKeys }),
        );
        for (const key of handled) {
          assert(
            reserved.has(key),
            `the package acts on ${key}, so a binding for it must be refused`,
          );
        }
        for (const key of reserved) {
          assert(
            handled.has(key),
            `${key} is reserved but the body ignores it`,
          );
        }
      });
    }
  }
});

Deno.test("a base binding may take any key the body leaves free", () => {
  const list = testView(["a", "b"], { body: "list" });
  const bound = new ApplicationDriver(list, {
    keymap: [
      { key: "q", action: "quit" },
      { key: "space", action: "toggle" },
      { key: "left", action: "collapse" },
      { key: "/", action: "search" },
    ],
  });
  bound.take();
  bound.key("space", "left", "/");
  assertEquals(bound.actions(), ["toggle", "collapse", "search"]);
  assertThrows(
    () => bound.update(testView(["a", "b"])),
    TypeError,
    "reserved for navigation in a master-detail body",
  );
});
