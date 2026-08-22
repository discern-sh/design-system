/**
 * Human-scale terminal browser over the generated CLI Catalogue inventory.
 * The exhaustive stdout renderer remains a separate explicit mode; this
 * surface owns one alternate-screen review session and presents one specimen
 * at a time without adding navigation frames to shell scrollback.
 *
 * @module
 */

import {
  padText,
  resolveCliExampleCapabilities,
  styleText,
  type TerminalCapabilities,
  truncateStyledText,
  wrapText,
} from "../src/cli/mod.ts";
import {
  assertInteractiveTerminal,
  GraphemeTextEditor,
  InlineFramePainter,
  isNamedKey,
  type TerminalIO,
  type TerminalKey,
  TerminalKeyReader,
  withRawTerminal,
} from "../src/cli/interactive/mod.ts";
import {
  ERASE_TERMINAL_DISPLAY,
  HOME_TERMINAL_CURSOR,
} from "../src/cli/interactive/painter.ts";
import {
  renderTerminalFoundationSheet,
  type TerminalFoundationSheet,
  terminalFoundationSheets,
} from "../catalogue/terminal-foundations.ts";
import {
  type CliComponentFact,
  listCliComponents,
  type LoadedCliModule,
  loadRenderedCliModule,
} from "./cli-inventory.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";

/** One automatically enrolled destination in the interactive CLI Catalogue. */
export type CatalogueBrowserItem =
  | {
    readonly kind: "foundation";
    readonly id: string;
    readonly sheet: TerminalFoundationSheet;
  }
  | {
    readonly kind: "component";
    readonly id: string;
    readonly fact: CliComponentFact;
  };

interface CatalogueBrowserDetail {
  readonly lines: readonly string[];
  readonly exampleIndex: number;
  readonly exampleName: string;
  readonly exampleCount: number;
}

type BrowserMode = "index" | "search" | "detail";

/** Foundations followed by every Component in canonical Group order. */
export function catalogueBrowserItems(): readonly CatalogueBrowserItem[] {
  return [
    ...terminalFoundationSheets.map((sheet) => ({
      kind: "foundation" as const,
      id: sheet.id,
      sheet,
    })),
    ...listCliComponents().map((fact) => ({
      kind: "component" as const,
      id: fact.slug,
      fact,
    })),
  ];
}

function groupFacts(group: ComponentGroup): readonly CliComponentFact[] {
  return listCliComponents(group);
}

/** Compact, finite index for redirected output and explicit discovery. */
export function renderCliCatalogueIndex(): string {
  const facts = listCliComponents();
  const rendered = facts.filter(({ entry }) => entry.stance === "rendered");
  const exempt = facts.length - rendered.length;
  const lines = [
    "# discern CLI catalogue",
    "",
    `${facts.length} Components · ${rendered.length} rendered · ${exempt} exempt`,
    "",
    `Foundations: ${terminalFoundationSheets.map(({ id }) => id).join(", ")}`,
  ];
  for (const group of componentGroups) {
    const members = groupFacts(group);
    lines.push("", `${group} (${members.length})`);
    const slugs = members.map(({ slug, entry }) =>
      `${slug}${entry.stance === "exempt" ? "*" : ""}`
    ).join(", ");
    lines.push(...wrapText(slugs, 76).map((line) => `  ${line}`));
  }
  lines.push(
    "",
    "* recorded CLI exemption",
    "",
    "Browse: deno task catalogue:cli",
    "Render one: deno task catalogue:cli <component-slug|group|foundation>",
    "Exhaustive dump: deno task catalogue:cli all",
  );
  return `${lines.join("\n")}\n`;
}

function itemGroup(item: CatalogueBrowserItem): string {
  return item.kind === "foundation" ? "Foundations" : item.fact.group;
}

function itemName(item: CatalogueBrowserItem): string {
  return item.kind === "foundation" ? item.sheet.title : item.fact.name;
}

function itemLabel(item: CatalogueBrowserItem): string {
  if (item.kind === "foundation") {
    return `${itemGroup(item)} / ${itemName(item)} (\`${item.id}\`)`;
  }
  return `${itemGroup(item)} / ${itemName(item)} (\`${item.fact.slug}\`)`;
}

function itemSearchText(item: CatalogueBrowserItem): string {
  if (item.kind === "foundation") {
    return `${item.sheet.title} ${item.id} foundations`.toLocaleLowerCase();
  }
  return `${item.fact.name} ${item.fact.slug} ${item.fact.group}`
    .toLocaleLowerCase();
}

function boundedIndex(index: number, length: number): number {
  if (length < 1) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

function visibleWindow(
  highlighted: number,
  length: number,
  count: number,
): { readonly start: number; readonly end: number } {
  const available = Math.max(1, count);
  const start = Math.max(
    0,
    Math.min(highlighted - Math.floor(available / 2), length - available),
  );
  return { start, end: Math.min(length, start + available) };
}

function fitLine(
  line: string,
  columns: number,
  capabilities: TerminalCapabilities,
): string {
  const width = Math.max(1, columns);
  const marker = capabilities.unicode ? "…" : ".";
  return padText(truncateStyledText(line, width, marker), width);
}

function exactViewport(
  lines: readonly string[],
  rows: number,
  columns: number,
  capabilities: TerminalCapabilities,
): string {
  return Array.from(
    { length: Math.max(1, rows) },
    (_, index) => fitLine(lines[index] ?? "", columns, capabilities),
  ).join("\n");
}

function replaceBrowserFrame(
  painter: InlineFramePainter,
  io: TerminalIO,
  frame: string,
): void {
  const result = painter.replace(frame);
  if (result.status !== "refused") return;
  painter.clear();
  io.write(`${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}`);
  const retried = painter.replace(frame);
  if (retried.status === "refused") {
    throw new TypeError(
      `CLI Catalogue browser could not fit its viewport: ${retried.reason}`,
    );
  }
}

function indexMatches(
  items: readonly CatalogueBrowserItem[],
  query: string,
): readonly number[] {
  const normalized = query.trim().toLocaleLowerCase();
  return items.flatMap((item, index) =>
    normalized === "" || itemSearchText(item).includes(normalized)
      ? [index]
      : []
  );
}

function renderIndexFrame(
  items: readonly CatalogueBrowserItem[],
  itemIndex: number,
  query: string,
  mode: BrowserMode,
  io: TerminalIO,
): string {
  const { columns, rows } = io.size();
  const capabilities = io.capabilities();
  const matches = indexMatches(items, query);
  const selectedPosition = Math.max(0, matches.indexOf(itemIndex));
  const contentRows = Math.max(1, rows - 5);
  const window = visibleWindow(selectedPosition, matches.length, contentRows);
  const title = styleText(
    "discern CLI catalogue",
    { bold: true },
    capabilities,
  );
  const status = mode === "search"
    ? `Search: ${query}▌ · ${matches.length} match${
      matches.length === 1 ? "" : "es"
    }`
    : `${items.length} review destinations · one specimen at a time`;
  const lines = [title, status, ""];
  if (matches.length === 0) {
    lines.push("  No Components or foundations match this search.");
  } else {
    for (let position = window.start; position < window.end; position += 1) {
      const canonicalIndex = matches[position];
      const item = canonicalIndex === undefined
        ? undefined
        : items[canonicalIndex];
      if (item === undefined) continue;
      const selected = canonicalIndex === itemIndex;
      const stance = item.kind === "component" &&
          item.fact.entry.stance === "exempt"
        ? " · exempt"
        : "";
      const row = `${selected ? "›" : " "} ${itemGroup(item)} · ${
        itemName(item)
      } (\`${item.id}\`)${stance}`;
      lines.push(selected ? styleText(row, { bold: true }, capabilities) : row);
    }
  }
  while (lines.length < rows - 1) lines.push("");
  lines.push(
    mode === "search"
      ? "Type to filter · ↑↓ browse · Enter open · Esc clear · Ctrl+C quit"
      : "↑↓ browse · Enter open · / search · q quit",
  );
  return exactViewport(lines, rows, columns, capabilities);
}

async function componentModule(
  fact: CliComponentFact,
  modules: Map<string, LoadedCliModule>,
): Promise<LoadedCliModule | undefined> {
  if (fact.entry.stance === "exempt") return undefined;
  const cached = modules.get(fact.slug);
  if (cached !== undefined) return cached;
  const loaded = await loadRenderedCliModule(fact.slug, fact.entry);
  modules.set(fact.slug, loaded);
  return loaded;
}

async function browserDetail(
  item: CatalogueBrowserItem,
  requestedExample: number,
  capabilities: TerminalCapabilities,
  modules: Map<string, LoadedCliModule>,
): Promise<CatalogueBrowserDetail> {
  if (item.kind === "foundation") {
    return {
      lines: renderTerminalFoundationSheet(item.sheet, capabilities).split(
        "\n",
      ),
      exampleIndex: 0,
      exampleName: "complete sheet",
      exampleCount: 1,
    };
  }
  if (item.fact.entry.stance === "exempt") {
    return {
      lines: item.fact.entry.reason.split("\n"),
      exampleIndex: 0,
      exampleName: "recorded exemption",
      exampleCount: 1,
    };
  }
  const module = await componentModule(item.fact, modules);
  if (module === undefined) {
    throw new TypeError(`Rendered Component ${item.fact.slug} has no module`);
  }
  const exampleIndex = boundedIndex(requestedExample, module.examples.length);
  const example = module.examples[exampleIndex];
  if (example === undefined) {
    throw new TypeError(`Rendered Component ${item.fact.slug} has no example`);
  }
  const frame = module.render(
    example.props,
    resolveCliExampleCapabilities(example, capabilities),
  );
  if (typeof frame !== "string") {
    throw new TypeError(
      `${item.fact.slug} renderer returned a non-string frame`,
    );
  }
  return {
    lines: frame.split("\n"),
    exampleIndex,
    exampleName: example.name,
    exampleCount: module.examples.length,
  };
}

function renderDetailFrame(
  item: CatalogueBrowserItem,
  itemIndex: number,
  itemCount: number,
  detail: CatalogueBrowserDetail,
  requestedScroll: number,
  io: TerminalIO,
): { readonly frame: string; readonly scroll: number } {
  const { columns, rows } = io.size();
  const capabilities = io.capabilities();
  const contentRows = Math.max(1, rows - 5);
  const maximumScroll = Math.max(0, detail.lines.length - contentRows);
  const scroll = boundedIndex(requestedScroll, maximumScroll + 1);
  const visible = detail.lines.slice(scroll, scroll + contentRows);
  const title = styleText(
    `discern CLI catalogue · ${itemIndex + 1}/${itemCount}`,
    { bold: true },
    capabilities,
  );
  const lines = [
    title,
    itemLabel(item),
    `${detail.exampleName} · ${detail.exampleIndex + 1}/${detail.exampleCount}`,
    "",
    ...visible,
  ];
  while (lines.length < rows - 1) lines.push("");
  const above = scroll > 0 ? `↑ ${scroll}` : "";
  const below = maximumScroll > scroll ? `↓ ${maximumScroll - scroll}` : "";
  const overflow = [above, below].filter(Boolean).join(" · ");
  lines.push(
    `↑↓ Component · ←→ Example · PgUp/PgDn Scroll · Esc Index · / Search · q Quit${
      overflow === "" ? "" : ` · ${overflow}`
    }`,
  );
  return {
    frame: exactViewport(lines, rows, columns, capabilities),
    scroll,
  };
}

function movedMatch(
  matches: readonly number[],
  itemIndex: number,
  delta: number,
): number {
  if (matches.length === 0) return itemIndex;
  const current = Math.max(0, matches.indexOf(itemIndex));
  return matches[boundedIndex(current + delta, matches.length)] ?? itemIndex;
}

function isTextKey(key: TerminalKey, text: string): boolean {
  return key.kind === "text" && key.text === text;
}

/**
 * Browse the complete generated inventory in one restored alternate screen.
 * Terminals without cursor control use the compact index or exact selectors
 * instead, rather than receiving control bytes they cannot honour.
 */
export async function runCliCatalogueBrowser(io: TerminalIO): Promise<void> {
  assertInteractiveTerminal(io);
  if (io.capabilities().ansiControl === false) {
    throw new TypeError(
      "The interactive CLI Catalogue needs ANSI cursor control; use --list, all, or an exact selector instead.",
    );
  }
  const items = catalogueBrowserItems();
  if (items.length === 0) {
    throw new TypeError("CLI Catalogue inventory is empty");
  }
  const modules = new Map<string, LoadedCliModule>();
  const examples = new Map<string, number>();
  const search = new GraphemeTextEditor();
  let mode: BrowserMode = "index";
  let itemIndex = 0;
  let scroll = 0;

  await withRawTerminal(io, async () => {
    const painter = new InlineFramePainter(io);
    const reader = new TerminalKeyReader(io);
    let detail: CatalogueBrowserDetail | undefined;

    const paint = async (): Promise<void> => {
      if (mode !== "detail") {
        detail = undefined;
        replaceBrowserFrame(
          painter,
          io,
          renderIndexFrame(items, itemIndex, search.value, mode, io),
        );
        return;
      }
      const item = items[itemIndex];
      if (item === undefined) return;
      detail = await browserDetail(
        item,
        examples.get(item.id) ?? 0,
        io.capabilities(),
        modules,
      );
      examples.set(item.id, detail.exampleIndex);
      const rendered = renderDetailFrame(
        item,
        itemIndex,
        items.length,
        detail,
        scroll,
        io,
      );
      scroll = rendered.scroll;
      replaceBrowserFrame(painter, io, rendered.frame);
    };

    await paint();
    while (true) {
      const key = await reader.readKey();
      if (key === null || isNamedKey(key, "ctrl-c")) return;
      if (mode !== "search" && isTextKey(key, "q")) return;

      if (mode === "search") {
        if (isNamedKey(key, "escape")) {
          search.replace("");
          mode = "index";
        } else {
          const changed = search.handle(key);
          const matches = indexMatches(items, search.value);
          if (changed && !matches.includes(itemIndex)) {
            itemIndex = matches[0] ?? itemIndex;
          } else if (isNamedKey(key, "up")) {
            itemIndex = movedMatch(matches, itemIndex, -1);
          } else if (isNamedKey(key, "down")) {
            itemIndex = movedMatch(matches, itemIndex, 1);
          } else if (isNamedKey(key, "page-up")) {
            itemIndex = movedMatch(
              matches,
              itemIndex,
              -Math.max(1, io.size().rows - 5),
            );
          } else if (isNamedKey(key, "page-down")) {
            itemIndex = movedMatch(
              matches,
              itemIndex,
              Math.max(1, io.size().rows - 5),
            );
          } else if (isNamedKey(key, "enter") && matches.length > 0) {
            mode = "detail";
            scroll = 0;
          }
        }
        await paint();
        continue;
      }

      if (isTextKey(key, "/")) {
        search.replace("");
        mode = "search";
        await paint();
        continue;
      }
      if (isNamedKey(key, "escape")) {
        if (mode === "detail") mode = "index";
        else return;
        await paint();
        continue;
      }

      if (mode === "index") {
        const matches = indexMatches(items, "");
        if (isNamedKey(key, "up")) {
          itemIndex = movedMatch(matches, itemIndex, -1);
        } else if (isNamedKey(key, "down")) {
          itemIndex = movedMatch(matches, itemIndex, 1);
        } else if (isNamedKey(key, "page-up")) {
          itemIndex = movedMatch(
            matches,
            itemIndex,
            -Math.max(1, io.size().rows - 5),
          );
        } else if (isNamedKey(key, "page-down")) {
          itemIndex = movedMatch(
            matches,
            itemIndex,
            Math.max(1, io.size().rows - 5),
          );
        } else if (isNamedKey(key, "home")) itemIndex = 0;
        else if (isNamedKey(key, "end")) itemIndex = items.length - 1;
        else if (isNamedKey(key, "enter")) {
          mode = "detail";
          scroll = 0;
        }
        await paint();
        continue;
      }

      const item = items[itemIndex];
      if (item === undefined || detail === undefined) continue;
      if (isNamedKey(key, "up") || isTextKey(key, "p")) {
        itemIndex = boundedIndex(itemIndex - 1, items.length);
        scroll = 0;
      } else if (isNamedKey(key, "down") || isTextKey(key, "n")) {
        itemIndex = boundedIndex(itemIndex + 1, items.length);
        scroll = 0;
      } else if (isNamedKey(key, "left")) {
        examples.set(
          item.id,
          boundedIndex(detail.exampleIndex - 1, detail.exampleCount),
        );
        scroll = 0;
      } else if (isNamedKey(key, "right")) {
        examples.set(
          item.id,
          boundedIndex(detail.exampleIndex + 1, detail.exampleCount),
        );
        scroll = 0;
      } else if (isNamedKey(key, "page-up")) {
        scroll = Math.max(0, scroll - Math.max(1, io.size().rows - 5));
      } else if (isNamedKey(key, "page-down")) {
        scroll += Math.max(1, io.size().rows - 5);
      } else if (isNamedKey(key, "home")) scroll = 0;
      else if (isNamedKey(key, "end")) scroll = detail.lines.length;
      await paint();
    }
  }, { alternateScreen: true });
}
