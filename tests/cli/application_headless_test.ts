import { assert, assertEquals } from "@std/assert";
import { measureText } from "../../src/cli/mod.ts";
import {
  type ApplicationListGroup,
  type TerminalApplicationView,
  validateTerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  decideListDensity,
  flattenList,
  type ListShape,
} from "../../src/cli/interactive/application/list-model.ts";
import {
  LIST_GROUP_FIELDS,
  type ListGroupHeaderField,
} from "../../src/cli/interactive/application/validate-rules.ts";
import { modelState } from "../../src/cli/interactive/application/model.ts";
import { type TestItem, testView } from "../fixtures/application-views.ts";
import { ApplicationDriver } from "../fixtures/application-driver.ts";
import {
  APPLICATION_REVIEW_SIZES,
  applicationDemoView,
  DEMO_COMMANDS_ID,
  DEMO_TIP,
} from "../../scripts/playground/application.ts";

const PINNED = { id: "pinned", title: "Pinned", headless: true } as const;
const GROUPS = [
  PINNED,
  { id: "first", title: "First" },
  { id: "second", title: "Second" },
  { id: "third", title: "Third" },
] as const;

/** One pinned item above three titled groups of three. */
const ITEMS: readonly TestItem[] = [
  { id: "p", group: "pinned" },
  ...["a", "b", "c"].map((id) => ({ id, group: "first" })),
  ...["d", "e", "f"].map((id) => ({ id, group: "second" })),
  ...["g", "h", "i"].map((id) => ({ id, group: "third" })),
];

const pinnedView = (
  items: readonly TestItem[] = ITEMS,
  options: Parameters<typeof testView>[1] = {},
): TerminalApplicationView<string> =>
  testView(items, { groups: GROUPS, ...options });

/** The body's lines: everything between the header row and the footer. */
function bodyLines(driver: ApplicationDriver): readonly string[] {
  return driver.text.split("\n").slice(1, -1);
}

Deno.test("a headless group's items stand without a header, apart from the next group", () => {
  for (const body of ["list", "master-detail"] as const) {
    const driver = new ApplicationDriver(pinnedView(ITEMS, { body }), {
      columns: 80,
      rows: 24,
    });
    // The list's own columns, left of any detail.
    const width = modelState(driver.model).lists.items?.density?.width ?? 80;
    const lines = bodyLines(driver).map((line) =>
      line.slice(0, width).trimEnd()
    );
    const pinned = lines.findIndex((line) => line.includes("Item p"));
    assert(pinned >= 0, driver.text);
    assert(!driver.text.includes("Pinned"), "the title is never drawn");
    assertEquals(
      lines.slice(0, pinned).filter((line) => line.trim() !== ""),
      [],
      `${body}: nothing stands above the pinned row`,
    );
    assertEquals(
      lines[pinned + 1]?.slice(0, 40).trim(),
      "",
      `${body}: a blank row parts it from the next group`,
    );
    assert(lines[pinned + 2]?.includes("First  3"), driver.text);
    assertEquals(driver.state.lists.items?.selectedId, "p", "selected first");
  }
});

Deno.test("a headless group drops its separator with the others when the list is tight", () => {
  // Three groups of three and a pinned row need fifteen rows with
  // separators and twelve without; a twelve-row list keeps none.
  const driver = new ApplicationDriver(pinnedView(ITEMS, { body: "list" }), {
    columns: 60,
    rows: 15,
  });
  const lines = bodyLines(driver).map((line) => line.trim());
  const pinned = lines.findIndex((line) => line.includes("Item p"));
  assert(lines[pinned + 1]?.startsWith("First"), driver.text);
});

Deno.test("a headless group never folds and never joins a summary row", () => {
  const list = (() => {
    const body = pinnedView().body;
    if (body.kind !== "master-detail") throw new Error("expected a split");
    return body.list;
  })();
  const shapes: ListShape[] = [];
  for (const separators of [true, false]) {
    for (const query of [undefined, "Item"]) {
      for (
        const folds of [[], ["pinned"], ["pinned", "first", "second"]]
      ) {
        for (
          const densityFolds of [[], ["pinned"], ["pinned", "second", "third"]]
        ) {
          shapes.push({
            folds: new Set(folds),
            densityFolds: new Set(densityFolds),
            separators,
            ...(query === undefined ? {} : { query }),
          });
        }
      }
    }
  }
  for (const shape of shapes) {
    const rows = flattenList(list, shape).rows;
    const where = JSON.stringify({ ...shape, folds: [...shape.folds] });
    for (const row of rows) {
      if (row.kind === "header") {
        assert(row.group.id !== "pinned", `a header at ${where}`);
      }
      if (row.kind === "fold") {
        assert(
          row.groups.every((folded) => folded.group.id !== "pinned"),
          `a fold at ${where}`,
        );
      }
    }
    assertEquals(
      rows.filter((row) => row.kind === "item" && row.group.id === "pinned")
        .length,
      1,
      `the pinned item shows at ${where}`,
    );
  }
  const dense = { ...list, density: { foldOrder: ["first", "second"] } };
  for (let available = 1; available <= 16; available += 1) {
    for (const selected of [[], ["pinned"], ["first"]]) {
      const decision = decideListDensity(dense, new Set(), available, selected);
      assert(!decision.densityFolds.includes("pinned"), `${available}`);
    }
  }
});

Deno.test("a headless group's rows count toward fitting a short screen", () => {
  // Without the pinned row the list fits twelve body rows once its
  // separators go; with it, the quietest group folds into a summary row.
  const unpinned = ITEMS.filter((item) => item.group !== "pinned");
  const size = { columns: 80, rows: 14 };
  const plain = new ApplicationDriver(
    pinnedView(unpinned, { density: true }),
    size,
  );
  const pinned = new ApplicationDriver(
    pinnedView(ITEMS, { density: true }),
    size,
  );
  const folded = (driver: ApplicationDriver) =>
    modelState(driver.model).lists.items?.density?.densityFolds ?? [];
  assertEquals(folded(plain), [], plain.text);
  assertEquals(folded(pinned), ["third"], pinned.text);
  assert(pinned.text.includes("▸ Third 3"), pinned.text);
  assert(pinned.text.includes("Item p"), "the pinned row stays");
});

Deno.test("a headless group's items move, jump, filter, run, and click like any item", () => {
  const driver = new ApplicationDriver(
    pinnedView(ITEMS, { filter: true }),
    { columns: 80, rows: 24 },
  );
  const selected = () => driver.state.lists.items?.selectedId;
  driver.key("down");
  assertEquals(selected(), "a", "Down passes the next group's header");
  driver.key("up");
  assertEquals(selected(), "p");
  driver.key("tab");
  assertEquals(selected(), "a", "Tab reaches the next group");
  driver.key("shift-tab");
  assertEquals(selected(), "p", "Shift+Tab reaches the pinned group");
  driver.key("end", "home");
  assertEquals(selected(), "p");
  driver.take();
  driver.key("enter");
  assertEquals(driver.actions(), ["open:p"], "Enter runs its primary");
  driver.take();
  assert(driver.text.includes("Details for item p."), "the detail follows");
  driver.key("/").type("item p");
  assertEquals(selected(), "p", "the filter keeps it");
  assert(driver.text.includes("1 of 10"), driver.text);
  assert(!driver.text.includes("Pinned"));
  driver.key("escape");
  driver.update({
    ...pinnedView(ITEMS, { filter: true }),
    input: { mouse: true },
  });
  const target = driver.find("Item b");
  driver.click(target.column, target.row);
  assertEquals(selected(), "b");
  const pinned = driver.find("Item p");
  driver.click(pinned.column, pinned.row);
  assertEquals(selected(), "p", "a click selects the pinned row");
});

Deno.test("Tab reaches a headless group placed between titled groups", () => {
  const driver = new ApplicationDriver(
    testView([
      { id: "a", group: "first" },
      { id: "p", group: "pinned" },
      { id: "q", group: "pinned" },
      { id: "d", group: "second" },
    ], {
      groups: [{ id: "first", title: "First" }, PINNED, {
        id: "second",
        title: "Second",
      }],
    }),
  );
  driver.key("tab");
  assertEquals(driver.state.lists.items?.selectedId, "p");
  driver.key("tab");
  assertEquals(driver.state.lists.items?.selectedId, "d");
  driver.key("shift-tab");
  assertEquals(driver.state.lists.items?.selectedId, "p");
  driver.key("down", "shift-tab");
  assertEquals(
    driver.state.lists.items?.selectedId,
    "a",
    "Shift+Tab from inside the group reaches the previous group",
  );
});

Deno.test("zoom names a headless group's item alone and counts it", () => {
  const driver = new ApplicationDriver(pinnedView(), {
    columns: 80,
    rows: 24,
  });
  driver.key("space");
  const crumb = driver.text.split("\n").find((line) =>
    line.includes("1 of 10")
  );
  assert(crumb !== undefined, driver.text);
  assert(crumb.includes("Item p"), crumb);
  assert(!crumb.includes("›"), `no group crumb: ${crumb}`);
  driver.key("down");
  assert(driver.text.includes("First  ›  Item a"), driver.text);
  assert(driver.text.includes("2 of 10"));
  driver.key("up");
  assertEquals(driver.state.lists.items?.selectedId, "p");
});

Deno.test("an uncounted group stays out of the filter and zoom's numbering", () => {
  const groups = [{ ...PINNED, counted: false }, ...GROUPS.slice(1)];
  const list = (() => {
    const body = testView(ITEMS, { groups }).body;
    if (body.kind !== "master-detail") throw new Error("expected a split");
    return body.list;
  })();
  const shape = { folds: new Set<string>(), densityFolds: new Set<string>() };
  const all = flattenList(list, { ...shape, separators: true });
  assertEquals([all.matched, all.total], [9, 9], "no count includes it");
  assert(all.rows.some((row) => row.kind === "item" && row.item.id === "p"));
  const filtered = flattenList(list, {
    ...shape,
    separators: true,
    query: "item p",
  });
  assertEquals([filtered.matched, filtered.total], [0, 9]);
  assertEquals(filtered.rows, [], "the filter passes over it");

  const driver = new ApplicationDriver(
    testView(ITEMS, { groups, filter: true }),
    { columns: 80, rows: 24 },
  );
  const selected = () => driver.state.lists.items?.selectedId;
  assertEquals(selected(), "p");
  driver.key("/").type("item");
  assert(driver.text.includes("9 of 9"), driver.text);
  assert(!driver.text.includes("Item p"), "it hides while a filter applies");
  assertEquals(selected(), "a", "the selection moves to the first match");
  driver.key("escape");
  assert(driver.text.includes("Item p"), "it returns with the list");
  assertEquals(selected(), "a", "clearing the filter keeps the selection");
  driver.key("/").type("item p");
  assert(driver.text.includes("0 of 9"), driver.text);
  driver.key("escape", "home");
  assertEquals(selected(), "p");
  driver.key("space");
  const crumb = driver.text.split("\n").find((line) => line.includes("Item p"));
  assert(crumb !== undefined && !/\d+ of \d+/u.test(crumb), driver.text);
  driver.key("down");
  assert(driver.text.includes("First  ›  Item a"), driver.text);
  assert(driver.text.includes("1 of 9"), "zoom numbers counted items alone");
  driver.key("up");
  assertEquals(selected(), "p", "zoom still walks to it");
});

Deno.test("a long headless group keeps its upper marker on a line of its own", () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    id: `${index}`,
    group: "pinned",
  }));
  const driver = new ApplicationDriver(
    testView(items, { body: "list", groups: [PINNED] }),
    { columns: 60, rows: 12 },
  );
  driver.key(...Array.from({ length: 12 }, () => "down"));
  const lines = bodyLines(driver);
  const first = lines.find((line) => line.trim() !== "") ?? "";
  assert(/↑ \d+ more/u.test(first), `the marker leads:\n${driver.text}`);
  assert(!first.includes("Item"), "the marker line carries no row");
  const above = Number(/↑ (\d+) more/u.exec(first)?.[1]);
  const shown = lines.filter((line) => /Item \d+/u.test(line)).map((line) =>
    Number(/Item (\d+)/u.exec(line)?.[1])
  );
  assertEquals(shown[0], above, "the marker counts exactly the rows above");
  assert(shown.includes(12), "the selection stays in view");
});

Deno.test("a group that becomes headless waits for the settle window like membership", () => {
  const titled = testView(["a", "b"], {
    groups: [{ id: "main", title: "Items" }],
  });
  const headless = testView(["a", "b"], {
    groups: [{ id: "main", title: "Items", headless: true }],
  });
  const driver = new ApplicationDriver(titled);
  driver.key("down");
  driver.update(headless);
  assert(driver.text.includes("Items  2"), "the header stays while keys move");
  driver.now += 10_000;
  driver.input({ kind: "time" });
  assert(!driver.text.includes("Items  2"), driver.text);
  assertEquals(driver.state.lists.items?.selectedId, "b");
});

/** A value for every header field, so a new one must state what it would set. */
const HEADER_VALUES: Readonly<Record<ListGroupHeaderField, unknown>> = {
  shortTitle: "Short",
  count: 3,
  foldable: true,
  initiallyFolded: true,
  aside: [{ text: "aside" }],
};

Deno.test("a headless group may set no field only a header shows", () => {
  const fields = Object.entries(LIST_GROUP_FIELDS).flatMap(([field, role]) =>
    role === "header" ? [field as ListGroupHeaderField] : []
  );
  assertEquals(fields.sort(), Object.keys(HEADER_VALUES).sort());
  const issues = (group: Omit<ApplicationListGroup<string>, "items">) =>
    validateTerminalApplicationView(testView(["a"], { groups: [group] }), {
      keymap: [{ key: "q", action: "quit" }],
    });
  assertEquals(issues({ id: "main", title: "Items", headless: true }), []);
  assertEquals(
    issues({
      id: "main",
      title: "Items",
      headless: true,
      foldable: false,
      initiallyFolded: false,
    }),
    [],
    "false leaves a flag unset",
  );
  for (const field of fields) {
    assertEquals(
      issues({
        id: "main",
        title: "Items",
        headless: true,
        [field]: HEADER_VALUES[field],
      }),
      [{
        path: `body.list.groups[0].${field}`,
        message: "does not apply to a headless group",
      }],
      field,
    );
    assertEquals(
      issues({ id: "main", title: "Items", [field]: HEADER_VALUES[field] }),
      [],
      `${field} stays legal on a titled group`,
    );
  }
});

Deno.test("a density fold order may not name a headless group", () => {
  const view = pinnedView(ITEMS, { density: true });
  const body = view.body;
  if (body.kind !== "master-detail") throw new Error("expected a split");
  const ordered: TerminalApplicationView<string> = {
    ...view,
    body: {
      ...body,
      list: { ...body.list, density: { foldOrder: ["third", "pinned"] } },
    },
  };
  assertEquals(
    validateTerminalApplicationView(ordered, {
      keymap: [{ key: "q", action: "quit" }],
    }),
    [{
      path: "body.list.density.foldOrder[1]",
      message: "names a headless group, which never folds",
    }],
  );
});

Deno.test("the sample's pinned Commands row leads every review size", () => {
  for (const size of APPLICATION_REVIEW_SIZES) {
    for (const unicode of [true, false]) {
      const where = `${size.columns}x${size.rows} unicode ${unicode}`;
      const driver = new ApplicationDriver(
        applicationDemoView(undefined, DEMO_TIP, { pinned: true }),
        { ...size, colorDepth: "none", unicode },
      );
      const lines = driver.text.split("\n");
      assertEquals(lines.length, size.rows, where);
      for (const line of lines) assertEquals(measureText(line), size.columns);
      assertEquals(driver.state.lists.jobs?.selectedId, DEMO_COMMANDS_ID);
      const row = lines.findIndex((line) => line.includes("Commands"));
      assert(row >= 1 && row <= 2, `${where}: the pinned row leads`);
      assert(!driver.text.includes("Pinned"), where);
      // Below 14 rows the tip takes the footer's row.
      if (size.rows >= 14) {
        assert(lines.at(-1)?.includes("Open"), `${where}: Enter opens it`);
      }
      driver.key("down");
      assertEquals(driver.state.lists.jobs?.selectedId, "quarterly-report");
    }
  }
});
