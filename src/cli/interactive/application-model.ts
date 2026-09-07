/** Pure state and bounded rendering for a two-region terminal application. @module */
import type { CliBlock } from "../block-composition.ts";
import { renderCliBlock } from "../block-composition.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import {
  type CliPresentationOptions,
  cliPresentationPassthrough,
} from "../contracts.ts";
import { renderBox } from "../box.ts";
import { styleText } from "../ansi.ts";
import {
  renderSemanticInlineContent,
  type SemanticInlineContent,
  validateSemanticInlineContent,
} from "../semantic-inline.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../theme.ts";
import {
  allocateTerminalPanes,
  fitTerminalLine,
  terminalScrollOffset,
} from "../viewport.ts";
import { renderSelectCli } from "../../generated/cli-renderers.ts";
import { assertChoices, isInteractionChoice } from "./choice-navigation.ts";
import type { InteractionEntry } from "./types.ts";
import type { TerminalSize } from "./io.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import { fitInteractionFrame } from "./viewport-budget.ts";

/** Minimum geometry for a selectable row, region title, tip, and keyboard help. */
export const TERMINAL_APPLICATION_MINIMUM: TerminalSize = Object.freeze({
  columns: 32,
  rows: 10,
});

/** One bounded region with package-owned selection or reading scroll. */
export type TerminalApplicationRegion<Action> =
  | {
    readonly kind: "choices";
    readonly id: string;
    readonly title: string;
    readonly entries: readonly InteractionEntry<Action>[];
  }
  | {
    readonly kind: "reading";
    readonly id: string;
    readonly title: string;
    readonly content: CliBlock;
  };

/** Caller-authored screen contents. Replace this value to deliver a background update. */
export interface TerminalApplicationView<Action> {
  readonly title: string;
  readonly regions:
    | readonly [TerminalApplicationRegion<Action>]
    | readonly [
      TerminalApplicationRegion<Action>,
      TerminalApplicationRegion<Action>,
    ];
  readonly tip?: SemanticInlineContent;
  /** Explicit focus request on a view change; omission preserves the current region. */
  readonly focusedRegionId?: string;
}

/** Remembered location in a region, retained across view changes and foreground work. */
export interface TerminalApplicationPosition {
  readonly selectedId?: string;
  readonly selectedIndex: number;
  readonly scrollOffset: number;
}

/** Immutable application snapshot. Values belong to the caller; navigation belongs to the package. */
export interface TerminalApplicationState<Action> {
  readonly view: TerminalApplicationView<Action>;
  readonly focusedRegionId: string;
  readonly positions: Readonly<Record<string, TerminalApplicationPosition>>;
}

/** Activated available item; unavailable rows remain inspectable and never emit this event. */
export interface TerminalApplicationAction<Action> {
  readonly regionId: string;
  readonly itemId: string;
  readonly value: Action;
}

interface ChoiceIndex {
  readonly choices: readonly number[];
  readonly ordinal: ReadonlyMap<string, number>;
  readonly headings: readonly number[];
}
const indexes = new WeakMap<object, ChoiceIndex>();
const readingCache = new WeakMap<
  object,
  { key: string; lines: readonly string[] }
>();

function indexEntries(
  entries: readonly InteractionEntry<unknown>[],
): ChoiceIndex {
  const found = indexes.get(entries);
  if (found !== undefined) return found;
  const choices: number[] = [];
  const ordinal = new Map<string, number>();
  const headings: number[] = [];
  let heading = -1;
  for (const [i, entry] of entries.entries()) {
    if (entry.kind === "group-heading") heading = i;
    else {
      ordinal.set(entry.id, choices.length);
      choices.push(i);
    }
    headings.push(heading);
  }
  const result = { choices, ordinal, headings };
  indexes.set(entries, result);
  return result;
}

function annotationSnapshot<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(annotationSnapshot)) as T;
  }
  if (typeof value === "object" && value !== null) {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, annotationSnapshot(v)]),
      ),
    ) as T;
  }
  return value;
}

function plain(value: string, name: string): void {
  if (value.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new TypeError(`${name} must be non-empty control-free text`);
  }
}

/** Adopt a view, preserving item identity on reorder and the nearest successor on removal. */
export function updateTerminalApplication<Action>(
  view: TerminalApplicationView<Action>,
  previous?: TerminalApplicationState<Action>,
): TerminalApplicationState<Action> {
  plain(view.title, "application title");
  if (view.regions.length < 1 || view.regions.length > 2) {
    throw new TypeError("an application has one or two regions");
  }
  if (view.tip !== undefined) validateSemanticInlineContent(view.tip);
  const ids = new Set<string>();
  const positions: Record<string, TerminalApplicationPosition> = Object.assign(
    Object.create(null),
    previous?.positions,
  );
  const regions = view.regions.map(
    (region): TerminalApplicationRegion<Action> => {
      plain(region.id, "region id");
      plain(region.title, "region title");
      if (ids.has(region.id)) throw new TypeError("region IDs must be unique");
      ids.add(region.id);
      const old = positions[region.id];
      if (region.kind === "reading") {
        positions[region.id] = old ?? { selectedIndex: -1, scrollOffset: 0 };
        return Object.freeze({ ...region });
      }
      assertChoices(region.entries);
      const entries = Object.freeze(region.entries.map((entry) => {
        if (!isInteractionChoice(entry)) return Object.freeze({ ...entry });
        for (const annotation of [entry.indicator, entry.status]) {
          if (annotation === undefined) continue;
          validateSemanticInlineContent(annotation.content);
          if (annotation.ascii !== undefined) {
            validateSemanticInlineContent(annotation.ascii);
          }
        }
        return Object.freeze({
          ...entry,
          ...(entry.indicator === undefined
            ? {}
            : { indicator: annotationSnapshot(entry.indicator) }),
          ...(entry.status === undefined
            ? {}
            : { status: annotationSnapshot(entry.status) }),
        });
      }));
      const index = indexEntries(entries);
      const retained = old?.selectedId === undefined
        ? undefined
        : index.ordinal.get(old.selectedId);
      const selectedIndex = retained === undefined
        ? index.choices.find((i) => i >= (old?.selectedIndex ?? 0)) ??
          index.choices.at(-1) ?? -1
        : index.choices[retained]!;
      const selectedId = entries[selectedIndex]?.id;
      positions[region.id] = {
        selectedIndex,
        scrollOffset: old?.scrollOffset ?? 0,
        ...(selectedId === undefined ? {} : { selectedId }),
      };
      return Object.freeze({ ...region, entries });
    },
  );
  const requestedFocus = view.focusedRegionId ?? previous?.focusedRegionId;
  if (view.focusedRegionId !== undefined && !ids.has(view.focusedRegionId)) {
    throw new TypeError("focused region must exist in the view");
  }
  const focusedRegionId =
    requestedFocus !== undefined && ids.has(requestedFocus)
      ? requestedFocus
      : regions[0]!.id;
  const snapshot = {
    ...view,
    regions: Object.freeze(regions) as TerminalApplicationView<
      Action
    >["regions"],
    ...(view.tip === undefined ? {} : { tip: annotationSnapshot(view.tip) }),
  };
  return Object.freeze({
    view: Object.freeze(snapshot),
    focusedRegionId,
    positions: Object.freeze(positions),
  });
}

/** Geometry and observable layout work for one exact complete frame. */
export interface TerminalApplicationFrame<Action> {
  readonly frame: string;
  readonly state: TerminalApplicationState<Action>;
  readonly layout: "single" | "columns" | "rows" | "too-small";
  readonly regionRows: Readonly<Record<string, number>>;
  readonly renderCalls: number;
}

/** Apply a key using only in-memory state. Background discovery is never invoked here. */
export function transitionTerminalApplication<Action>(
  state: TerminalApplicationState<Action>,
  key: TerminalKey,
  regionRows: Readonly<Record<string, number>> = {},
): {
  readonly state: TerminalApplicationState<Action>;
  readonly action?: TerminalApplicationAction<Action>;
} {
  const regions = state.view.regions;
  const active = regions.find((region) => region.id === state.focusedRegionId)!;
  if (
    (isNamedKey(key, "tab") || isNamedKey(key, "shift-tab")) &&
    regions.length === 2
  ) {
    return {
      state: {
        ...state,
        focusedRegionId: regions.find((region) => region.id !== active.id)!.id,
      },
    };
  }
  const current = state.positions[active.id]!;
  let position = current;
  const page = Math.max(1, regionRows[active.id] ?? 1);
  const delta = isNamedKey(key, "down")
    ? 1
    : isNamedKey(key, "up")
    ? -1
    : isNamedKey(key, "page-down")
    ? page
    : isNamedKey(key, "page-up")
    ? -page
    : 0;
  if (active.kind === "choices") {
    const index = indexEntries(active.entries);
    const ordinal = current.selectedId === undefined
      ? 0
      : index.ordinal.get(current.selectedId) ?? 0;
    const target = isNamedKey(key, "home")
      ? 0
      : isNamedKey(key, "end")
      ? index.choices.length - 1
      : Math.max(0, Math.min(index.choices.length - 1, ordinal + delta));
    const selectedIndex = index.choices[target] ?? -1;
    const selected = active.entries[selectedIndex];
    if (selectedIndex !== current.selectedIndex) {
      position = {
        ...current,
        selectedIndex,
        ...(selected === undefined ? {} : { selectedId: selected.id }),
      };
    }
    if (
      isNamedKey(key, "enter") && selected !== undefined &&
      isInteractionChoice(selected) && selected.disabled !== true
    ) {
      return {
        state,
        action: {
          regionId: active.id,
          itemId: selected.id,
          value: selected.value,
        },
      };
    }
  } else {
    const scrollOffset = isNamedKey(key, "home")
      ? 0
      : isNamedKey(key, "end")
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, current.scrollOffset + delta);
    if (scrollOffset !== current.scrollOffset) {
      position = { ...current, scrollOffset };
    }
  }
  return {
    state: position === current
      ? state
      : { ...state, positions: { ...state.positions, [active.id]: position } },
  };
}

/** Render a bounded application through Select, Box, semantic inline, and caller Component blocks. */
export function renderTerminalApplication<Action>(
  source: TerminalApplicationState<Action>,
  size: TerminalSize,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions = {},
): TerminalApplicationFrame<Action> {
  for (const dimension of [size.columns, size.rows]) {
    if (!Number.isSafeInteger(dimension) || dimension < 1) {
      throw new TypeError(
        "application geometry must be positive safe integers",
      );
    }
  }
  if (capabilities.columns !== size.columns) {
    throw new TypeError("application width must match terminal capabilities");
  }
  const { columns, rows } = size;
  const fit = (line: string, width = columns) =>
    fitTerminalLine(line, width, capabilities);
  if (
    columns < TERMINAL_APPLICATION_MINIMUM.columns ||
    rows < TERMINAL_APPLICATION_MINIMUM.rows
  ) {
    const notice = [
      `Resize to ${TERMINAL_APPLICATION_MINIMUM.columns} x ${TERMINAL_APPLICATION_MINIMUM.rows}`,
      "Esc exits",
    ];
    return {
      frame: Array.from({ length: rows }, (_, i) => fit(notice[i] ?? "")).join(
        "\n",
      ),
      state: source,
      layout: "too-small",
      regionRows: {},
      renderCalls: 0,
    };
  }
  const theme = resolveTerminalTheme(presentation);
  const quiet = (text: string) =>
    styleText(text, {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
  const paneRows = rows - 3;
  const regions = source.view.regions;
  let layout: TerminalApplicationFrame<Action>["layout"] = "single";
  let sizes: readonly [number, number] = [paneRows, 0];
  const focusedIndex = regions[0].id === source.focusedRegionId ? 0 : 1;
  if (regions.length === 2 && columns >= 100) {
    layout = "columns";
    sizes = allocateTerminalPanes(columns - 1, 36, 40, focusedIndex);
  } else if (regions.length === 2 && rows >= 32) {
    layout = "rows";
    sizes = allocateTerminalPanes(paneRows, 7, 8, focusedIndex);
  }
  const visible = layout === "single" ? [regions[focusedIndex]!] : [...regions];
  const positions = { ...source.positions };
  const regionRows: Record<string, number> = {};
  let renderCalls = 0;
  const panes = visible.map((region, i) => {
    const width = layout === "columns" ? sizes[i]! : columns;
    const height = layout === "rows" ? sizes[i]! : paneRows;
    const bodyRows = height - 2;
    const bodyWidth = width - 4;
    const caps = { ...capabilities, columns: bodyWidth };
    let position = positions[region.id]!;
    let lines: readonly string[];
    let bottomLabel = "";
    if (region.kind === "reading") {
      const key = JSON.stringify([
        caps,
        cliPresentationPassthrough(presentation),
      ]);
      let cached = readingCache.get(region.content);
      if (cached?.key !== key) {
        cached = {
          key,
          lines: renderCliBlock(region.content, caps, presentation).split("\n"),
        };
        readingCache.set(region.content, cached);
        renderCalls += 1;
      }
      const offset = terminalScrollOffset(
        position.scrollOffset,
        cached.lines.length,
        bodyRows,
      );
      position = { ...position, scrollOffset: offset };
      lines = cached.lines.slice(offset, offset + bodyRows);
      bottomLabel = `${offset + 1}-${
        Math.min(cached.lines.length, offset + bodyRows)
      }/${cached.lines.length}`;
      regionRows[region.id] = bodyRows;
    } else if (region.entries.length === 0 || position.selectedIndex < 0) {
      lines = [quiet("No items")];
      regionRows[region.id] = bodyRows;
    } else {
      const entries = region.entries;
      const index = indexEntries(entries);
      const focused = source.focusedRegionId === region.id;
      const fitted = fitInteractionFrame({
        viewportRows: bodyRows,
        frame: (viewport) => {
          const count = viewport.controlRows(
            Math.max(1, Math.min(entries.length, bodyRows)),
          );
          const start = Math.max(
            0,
            Math.min(
              position.selectedIndex - Math.floor(count / 2),
              entries.length - count,
            ),
          );
          const heading = index.headings[start] ?? -1;
          const window = entries.slice(start, start + count);
          if (heading >= 0 && heading < start) {
            window.unshift(entries[heading]!);
          }
          return {
            options: window,
            highlightedIndex: window.findIndex((entry) =>
              entry.id === position.selectedId
            ),
            count,
          };
        },
        render: (state) => {
          renderCalls += 1;
          return renderSelectCli({
            ...state,
            ...presentation,
            kind: "select",
            label: region.title,
            lifecycle: { status: "active" },
            presentation: "menu",
            chrome: "none",
            focused,
            maximumLabelLines: 2,
            menuDetailLineLimit: bodyRows >= 8 ? 2 : 0,
          }, caps);
        },
      });
      lines = fitted.rendered.split("\n");
      regionRows[region.id] = Math.max(
        1,
        fitted.state.options.filter(isInteractionChoice).length,
      );
      bottomLabel = `${
        (index.ordinal.get(position.selectedId ?? "") ?? 0) + 1
      }/${index.choices.length}`;
    }
    positions[region.id] = position;
    const body = Array.from(
      { length: bodyRows },
      (_, row) => ` ${fit(lines[row] ?? "", bodyWidth)} `,
    ).join("\n");
    const active = source.focusedRegionId === region.id;
    return renderBox({
      body,
      title: `${
        active ? capabilities.unicode ? "› " : "> " : ""
      }${region.title}`,
      width,
      padding: 0,
      bottomLabel,
      borderStyle: {
        color: active
          ? terminalToneColor(theme, "accent")
          : terminalThemeColor(theme, "--discern-color-border-strong"),
      },
    }, { ...capabilities, columns: width });
  });
  const body = layout === "columns"
    ? panes[0]!.split("\n").map((line, row) =>
      `${line} ${panes[1]!.split("\n")[row] ?? ""}`
    ).join("\n")
    : panes.join("\n");
  const title = renderSemanticInlineContent(source.view.title, capabilities, {
    ...presentation,
    baseRole: "strong",
  });
  const tip = source.view.tip === undefined
    ? ""
    : renderSemanticInlineContent(source.view.tip, capabilities, {
      ...presentation,
      baseRole: "muted",
    });
  const isReading =
    regions.find((region) => region.id === source.focusedRegionId)?.kind ===
      "reading";
  const controls = isReading
    ? (columns < 48
      ? "↑↓/Pg scroll  Tab pane  Esc"
      : "↑↓/Pg scroll  Home/End  Tab pane  Esc back")
    : columns < 48
    ? "↑↓ move  Enter  Tab pane  Esc"
    : "↑↓/Pg move  Enter open  Tab pane  Esc back";
  const help = capabilities.unicode
    ? controls
    : controls.replace("↑↓", "Up/Dn");
  return {
    frame: [fit(title), body, fit(tip), fit(quiet(help))].join("\n"),
    state: { ...source, positions },
    layout,
    regionRows,
    renderCalls,
  };
}
