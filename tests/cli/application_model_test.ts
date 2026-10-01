import { assert, assertEquals, assertThrows } from "@std/assert";
import { createCliBlock, stripAnsi } from "../../src/cli/mod.ts";
import {
  createTerminalApplicationModel,
  renderTerminalApplication,
  TERMINAL_APPLICATION_RESERVED_KEYS,
  terminalApplicationDeadline,
  type TerminalApplicationEffect,
  type TerminalApplicationInput,
  type TerminalApplicationModel,
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
      keymap: [{ key: "x", action: "bound" }],
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
        filter: { placeholder: "Find", match: "fuzzy" as const },
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
  assertEquals(validateTerminalApplicationView(testView(["a", "b"])), []);
  assertThrows(() => createTerminalApplicationModel(view), TypeError);
});

Deno.test("every key the package acts on in a list is reserved from caller bindings", () => {
  // Iterate the decoder's whole key vocabulary plus printable navigation
  // keys, so a newly handled key that is not reserved fails here.
  const keys: readonly string[] = [
    ...Object.keys(TERMINAL_KEY_SEQUENCES),
    "/",
    " ",
    "j",
    "k",
  ];
  const view = grouped([
    { id: "a", group: "first" },
    { id: "b", group: "first" },
    { id: "c", group: "second" },
    { id: "d", group: "second" },
    { id: "e", group: "third" },
  ], { filter: true });
  const body = view.body;
  if (body.kind !== "master-detail") throw new Error("expected master-detail");
  const long = {
    ...view,
    body: {
      ...body,
      detail: {
        ...body.detail,
        content: Object.fromEntries(
          ["a", "b", "c", "d", "e"].map((id) => [
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
  const prepared = [
    (driver: Driver) => driver.key("down", "down"),
    (driver: Driver) => driver.key("down", "down", "page-down"),
    (driver: Driver) => driver.key("down", "down", "space"),
  ];
  const handled = new Set<string>();
  for (const key of keys) {
    for (const prepare of prepared) {
      const driver = prepare(new Driver(long));
      const before = JSON.stringify(terminalApplicationState(driver.model));
      driver.take();
      driver.key(key === " " ? "space" : key);
      const effects = driver.take().filter((effect) =>
        effect.kind !== "selection-change"
      );
      if (
        JSON.stringify(terminalApplicationState(driver.model)) !== before ||
        effects.length > 0
      ) handled.add(key === " " ? "space" : key);
    }
  }
  // Escape closes what is open before a binding may see it, and Ctrl+C
  // cancels unless a binding claims it; both stay bindable on purpose.
  const bindable = new Set(["escape", "ctrl-c"]);
  for (const key of handled) {
    if (bindable.has(key)) continue;
    assert(
      TERMINAL_APPLICATION_RESERVED_KEYS.includes(key),
      `the package acts on ${key}, so a binding for it must be refused`,
    );
  }
  for (const key of TERMINAL_APPLICATION_RESERVED_KEYS) {
    assert(handled.has(key), `${key} is reserved but the list ignores it`);
  }
});
