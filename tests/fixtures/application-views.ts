/** Small, deterministic application views for runtime and model tests. */
import { TERMINAL_GLYPHS } from "../../src/cli/mod.ts";
import type {
  ApplicationGlyph,
  ApplicationListGroup,
  ApplicationListItem,
  ApplicationMessage,
  TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";

/** One test item: an id, the group it sits in, and whether its marker spins. */
export interface TestItem {
  readonly id: string;
  readonly group?: string;
  readonly animated?: boolean;
  readonly status?: string;
}

const idle: ApplicationGlyph = {
  unicode: TERMINAL_GLYPHS.idle.unicode,
  ascii: TERMINAL_GLYPHS.idle.ascii,
  tone: "faint",
};

/** A list item titled `Item <id>` whose Enter action is `open:<id>`. */
export function testItem(item: TestItem): ApplicationListItem<string> {
  return {
    id: item.id,
    title: `Item ${item.id}`,
    marker: item.animated === true
      ? {
        unicode: TERMINAL_GLYPHS.running.unicode,
        ascii: TERMINAL_GLYPHS.running.ascii,
        tone: "accent",
        animation: "spinner",
      }
      : idle,
    cells: { status: [{ text: item.status ?? "Ready", tone: "muted" }] },
    primary: `open:${item.id}`,
    keywords: item.status ?? "Ready",
  };
}

/** Options for {@linkcode testView}. */
export interface TestViewOptions {
  readonly body?: "list" | "master-detail";
  readonly groups?: readonly Omit<ApplicationListGroup<string>, "items">[];
  readonly message?: ApplicationMessage;
  readonly filter?: boolean;
  readonly density?: boolean;
  readonly settleMs?: number;
}

/**
 * A view of test items. Items without a group sit in `main`; groups are
 * listed in the order given, `main` first unless declared.
 */
export function testView(
  items: readonly (TestItem | string)[] = ["a", "b", "c"],
  options: TestViewOptions = {},
): TerminalApplicationView<string> {
  const entries = items.map((item) =>
    typeof item === "string" ? { id: item } : item
  );
  const declared = options.groups ?? [{ id: "main", title: "Items" }];
  const groups: ApplicationListGroup<string>[] = declared.map((group) => ({
    ...group,
    items: entries.filter((item) => (item.group ?? "main") === group.id).map(
      testItem,
    ),
  }));
  const list = {
    id: "items",
    groups,
    columns: [{ id: "status", width: 9, align: "end" as const }],
    ...(options.filter === true ? { filter: { label: "Filter" } } : {}),
    ...(options.density === true ? { density: {} } : {}),
    ...(options.settleMs === undefined ? {} : { settleMs: options.settleMs }),
  };
  return {
    header: { leading: [{ text: "Studio", role: "title" }] },
    body: options.body === "list" ? { kind: "list", list } : {
      kind: "master-detail",
      list,
      detail: {
        follows: "items",
        content: Object.fromEntries(entries.map((item) => [item.id, [
          { kind: "heading", title: `Item ${item.id}` },
          {
            kind: "text",
            runs: [{ text: `Details for item ${item.id}.` }],
          },
        ]])),
      },
    },
    ...(options.message === undefined ? {} : { message: options.message }),
    footer: {
      left: [{ key: "enter", label: "Open" }],
      right: [{ key: "q", label: "Quit" }],
    },
  };
}
