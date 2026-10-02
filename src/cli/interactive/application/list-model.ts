/**
 * Pure list structure: the rows a grouped list shows for its folds,
 * density, and filter; identity keys for selection; movement between
 * selectable rows; and where a selection goes when its row disappears.
 *
 * @module
 */

import type {
  ApplicationList,
  ApplicationListGroup,
  ApplicationListItem,
} from "./view.ts";

/** Selection identity: `i:<item id>` for an item, `g:<group id>` for a fold row or foldable header. */
export type ListRowKey = string;

/** The key of an item row. */
export function itemKey(id: string): ListRowKey {
  return `i:${id}`;
}

/** The key of a foldable header or a fold row led by this group. */
export function groupKey(id: string): ListRowKey {
  return `g:${id}`;
}

/** The item id a key names, if it names an item. */
export function keyItemId(key: ListRowKey | undefined): string | undefined {
  return key?.startsWith("i:") ? key.slice(2) : undefined;
}

/** The group id a key names, if it names a group row. */
export function keyGroupId(key: ListRowKey | undefined): string | undefined {
  return key?.startsWith("g:") ? key.slice(2) : undefined;
}

/** One folded group inside a fold row, with the count it shows. */
export interface FoldedGroup<A> {
  readonly group: ApplicationListGroup<A>;
  readonly count: number;
}

/**
 * Whether a group can fold at all. A headless group has no header to fold
 * into, so neither Enter nor a short screen folds it.
 */
export function groupCanFold<A>(group: ApplicationListGroup<A>): boolean {
  return group.headless !== true;
}

/** Whether the person can fold a group with Enter on its header. */
export function groupFoldable<A>(group: ApplicationListGroup<A>): boolean {
  return group.foldable === true && groupCanFold(group);
}

/**
 * Whether a group's items are the list's searchable, numbered content. An
 * uncounted group's are the application's own entries, which a filter
 * passes over and zoom does not number.
 */
export function groupCounted<A>(group: ApplicationListGroup<A>): boolean {
  return group.counted !== false;
}

/** One display row of a grouped list. */
export type ListRow<A> =
  | { readonly kind: "blank" }
  | {
    readonly kind: "header";
    readonly group: ApplicationListGroup<A>;
    readonly count: number;
    /** Present when the header is selectable (a foldable group). */
    readonly key?: ListRowKey;
  }
  | {
    readonly kind: "item";
    readonly group: ApplicationListGroup<A>;
    readonly item: ApplicationListItem<A>;
    readonly key: ListRowKey;
  }
  | {
    readonly kind: "fold";
    readonly groups: readonly FoldedGroup<A>[];
    readonly key: ListRowKey;
  };

/** The rows a list shows, with indexes the viewport and navigation use. */
export interface ListRows<A> {
  readonly rows: readonly ListRow<A>[];
  /**
   * Counted item rows before each index, which zoom numbers; one longer
   * than `rows`.
   */
  readonly itemPrefix: readonly number[];
  /**
   * Items the rows before each index stand for, counting the items a fold
   * row holds; one longer than `rows`. Overflow markers count with it.
   */
  readonly heldPrefix: readonly number[];
  /**
   * For each row, the index of its group's header, or -1 — as for a
   * headless group's items, which no header heads.
   */
  readonly headerOf: readonly number[];
  /** Counted items the filter matched, or every one without a filter. */
  readonly matched: number;
  /** Every counted item in the list. */
  readonly total: number;
}

/** What shapes a list's rows besides its content. */
export interface ListShape {
  /** Groups the person folded. */
  readonly folds: ReadonlySet<string>;
  /** Groups folded to fit a short screen. */
  readonly densityFolds: ReadonlySet<string>;
  /** Blank rows between groups. */
  readonly separators: boolean;
  /** An active filter query; groups never fold while one applies. */
  readonly query?: string;
}

const layoutKeys = new WeakMap<object, string>();

/**
 * A list's membership and order: which items sit in which group, in what
 * sequence, and which groups show a header. Content changes leave it
 * unchanged.
 */
export function listLayoutKey<A>(list: ApplicationList<A>): string {
  const found = layoutKeys.get(list);
  if (found !== undefined) return found;
  const key = JSON.stringify(
    list.groups.map((group) => [
      group.id,
      group.headless === true,
      group.items.map((item) => item.id),
    ]),
  );
  layoutKeys.set(list, key);
  return key;
}

/**
 * Show a settled list's membership and order with the latest content: each
 * group and item takes its newest version by id, and one the latest list no
 * longer has keeps its last version until the change settles. Whether a
 * group shows a header is structure, so it stays settled too.
 */
export function mergeDisplayList<A>(
  settled: ApplicationList<A>,
  latest: ApplicationList<A>,
): ApplicationList<A> {
  const groups = new Map(latest.groups.map((group) => [group.id, group]));
  const items = new Map<string, ApplicationListItem<A>>();
  for (const group of latest.groups) {
    for (const item of group.items) items.set(item.id, item);
  }
  return {
    ...latest,
    groups: settled.groups.map((group) => {
      const { headless: _headless, ...content } = groups.get(group.id) ??
        group;
      return {
        ...content,
        ...(group.headless === true ? { headless: true } : {}),
        items: group.items.map((item) => items.get(item.id) ?? item),
      };
    }),
  };
}

function subsequence(haystack: string, needle: string): boolean {
  let at = 0;
  for (const character of needle) {
    at = haystack.indexOf(character, at);
    if (at < 0) return false;
    at += character.length;
  }
  return true;
}

/** Whether an item matches a filter query, case-insensitively. */
export function itemMatches<A>(
  list: ApplicationList<A>,
  item: ApplicationListItem<A>,
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return true;
  const fields = list.filter?.fields ?? ["title", "keywords"];
  const haystack = [
    ...(fields.includes("title") ? [item.title, item.titleSuffix ?? ""] : []),
    ...(fields.includes("keywords") ? [item.keywords ?? ""] : []),
  ].join(" ").toLocaleLowerCase();
  return list.filter?.match === "fuzzy"
    ? subsequence(haystack, needle)
    : haystack.includes(needle);
}

/**
 * Every item, and the items an active filter keeps, by group. A filter
 * passes over an uncounted group, whose items hide while it applies.
 */
function visibleItems<A>(
  list: ApplicationList<A>,
  query: string | undefined,
): ReadonlyMap<string, readonly ApplicationListItem<A>[]> {
  return new Map(
    list.groups.map((group) => [
      group.id,
      query === undefined || query.trim() === ""
        ? group.items
        : groupCounted(group)
        ? group.items.filter((item) => itemMatches(list, item, query))
        : [],
    ]),
  );
}

/**
 * Flatten groups into display rows. Empty groups are hidden. A folded group
 * becomes a fold row; folded groups next to each other share one summary
 * row when any of them was folded for density, and otherwise keep a row
 * each. A headless group's items stand without a header and never fold.
 * Blank rows separate groups when `separators` is set.
 */
export function flattenList<A>(
  list: ApplicationList<A>,
  shape: ListShape,
): ListRows<A> {
  const filtering = shape.query !== undefined && shape.query.trim() !== "";
  const shown = visibleItems(list, shape.query);
  type Segment =
    | {
      readonly open: ApplicationListGroup<A>;
      readonly items: readonly ApplicationListItem<A>[];
    }
    | { readonly folded: FoldedGroup<A>[]; density: boolean };
  const segments: Segment[] = [];
  let total = 0;
  let matched = 0;
  for (const group of list.groups) {
    const items = shown.get(group.id) ?? [];
    if (groupCounted(group)) {
      total += group.items.length;
      matched += items.length;
    }
    if (items.length === 0) continue;
    const count = filtering ? items.length : group.count ?? group.items.length;
    const density = !filtering && groupCanFold(group) &&
      shape.densityFolds.has(group.id);
    const folded = !filtering &&
      (density || (groupFoldable(group) && shape.folds.has(group.id)));
    if (!folded) {
      segments.push({ open: group, items });
      continue;
    }
    const previous = segments.at(-1);
    if (
      previous !== undefined && "folded" in previous &&
      (previous.density || density)
    ) {
      previous.folded.push({ group, count });
      previous.density = true;
    } else segments.push({ folded: [{ group, count }], density });
  }
  const rows: ListRow<A>[] = [];
  const headerOf: number[] = [];
  for (const [index, segment] of segments.entries()) {
    if (index > 0 && shape.separators) {
      rows.push({ kind: "blank" });
      headerOf.push(-1);
    }
    if ("folded" in segment) {
      const [first] = segment.folded;
      if (first === undefined) continue;
      rows.push({
        kind: "fold",
        groups: segment.folded,
        key: groupKey(first.group.id),
      });
      headerOf.push(-1);
      continue;
    }
    const header = segment.open.headless === true ? -1 : rows.length;
    if (header >= 0) {
      rows.push({
        kind: "header",
        group: segment.open,
        count: filtering
          ? segment.items.length
          : segment.open.count ?? segment.open.items.length,
        ...(groupFoldable(segment.open) && !filtering
          ? { key: groupKey(segment.open.id) }
          : {}),
      });
      headerOf.push(-1);
    }
    for (const item of segment.items) {
      rows.push({
        kind: "item",
        group: segment.open,
        item,
        key: itemKey(item.id),
      });
      headerOf.push(header);
    }
  }
  const itemPrefix = [0];
  const heldPrefix = [0];
  for (const row of rows) {
    itemPrefix.push(
      (itemPrefix.at(-1) ?? 0) +
        (row.kind === "item" && groupCounted(row.group) ? 1 : 0),
    );
    heldPrefix.push(
      (heldPrefix.at(-1) ?? 0) +
        (row.kind === "item" ? 1 : row.kind === "fold"
          ? row.groups.reduce(
            (sum, folded) => sum + folded.group.items.length,
            0,
          )
          : 0),
    );
  }
  return { rows, itemPrefix, heldPrefix, headerOf, matched, total };
}

/** The key a selectable row carries, or undefined for blanks and fixed headers. */
export function rowKey<A>(row: ListRow<A> | undefined): ListRowKey | undefined {
  if (row === undefined || row.kind === "blank") return undefined;
  return row.key;
}

/** The group a row belongs to, or the first group of a fold row. */
export function rowGroupIds<A>(row: ListRow<A> | undefined): readonly string[] {
  if (row === undefined || row.kind === "blank") return [];
  if (row.kind === "fold") return row.groups.map((folded) => folded.group.id);
  return [row.group.id];
}

/**
 * The row a selection key names: an exact match, or, for a group whose
 * row merged into a summary, the fold row that holds it.
 */
export function rowIndexForKey<A>(
  rows: readonly ListRow<A>[],
  key: ListRowKey | undefined,
): number {
  if (key === undefined) return -1;
  const exact = rows.findIndex((row) => rowKey(row) === key);
  if (exact >= 0) return exact;
  const group = keyGroupId(key);
  if (group === undefined) return -1;
  return rows.findIndex((row) =>
    row.kind === "fold" &&
    row.groups.some((folded) => folded.group.id === group)
  );
}

/** Whether a row can hold the selection; zoom walks items only. */
export function selectableRow<A>(
  row: ListRow<A> | undefined,
  itemsOnly = false,
): boolean {
  const key = rowKey(row);
  return key !== undefined && (!itemsOnly || row?.kind === "item");
}

/** The selectable row nearest `from` in a direction, without wrapping. */
export function stepSelection<A>(
  rows: readonly ListRow<A>[],
  from: number,
  delta: number,
  itemsOnly = false,
): number {
  const direction = Math.sign(delta);
  if (direction === 0) return from;
  let remaining = Math.abs(delta);
  let at = from;
  for (
    let index = from + direction;
    index >= 0 && index < rows.length && remaining > 0;
    index += direction
  ) {
    if (!selectableRow(rows[index], itemsOnly)) continue;
    at = index;
    remaining -= 1;
  }
  return at;
}

/** The first selectable row at or after `from`, or -1. */
export function firstSelectable<A>(
  rows: readonly ListRow<A>[],
  from = 0,
  itemsOnly = false,
): number {
  for (let index = Math.max(0, from); index < rows.length; index += 1) {
    if (selectableRow(rows[index], itemsOnly)) return index;
  }
  return -1;
}

/** The last selectable row before `before`, or -1. */
export function lastSelectable<A>(
  rows: readonly ListRow<A>[],
  before = rows.length,
  itemsOnly = false,
): number {
  for (let index = Math.min(rows.length, before) - 1; index >= 0; index -= 1) {
    if (selectableRow(rows[index], itemsOnly)) return index;
  }
  return -1;
}

/**
 * Where each group's rows start, in display order: its header, its fold
 * row, or, for a headless group, its first item.
 */
function groupStarts<A>(rows: readonly ListRow<A>[]): readonly number[] {
  const starts: number[] = [];
  for (const [index, row] of rows.entries()) {
    const previous = rows[index - 1];
    if (
      row.kind === "header" || row.kind === "fold" ||
      (row.kind === "item" && row.group.headless === true &&
        !(previous?.kind === "item" && previous.group.id === row.group.id))
    ) starts.push(index);
  }
  return starts;
}

/**
 * The first selectable row of the next (or previous) group. Tab reaches
 * groups as an accelerator; it never wraps.
 */
export function jumpGroup<A>(
  rows: readonly ListRow<A>[],
  from: number,
  direction: 1 | -1,
  itemsOnly = false,
): number {
  const starts = groupStarts(rows);
  const current = starts.filter((start) => start <= from).at(-1) ?? -1;
  const candidates = direction > 0
    ? starts.filter((start) => start > from)
    : starts.filter((start) => start < current).reverse();
  for (const start of candidates) {
    const next = starts.find((other) => other > start) ?? rows.length;
    const found = firstSelectable(rows, start, itemsOnly);
    if (found >= 0 && found < next) return found;
  }
  return from;
}

function groupBounds<A>(
  rows: readonly ListRow<A>[],
  group: string,
): { readonly first: number; readonly end: number } | undefined {
  let first = -1;
  let end = -1;
  for (const [index, row] of rows.entries()) {
    if (rowGroupIds(row).includes(group)) {
      if (first < 0) first = index;
      end = index + 1;
    }
  }
  return first < 0 ? undefined : { first, end };
}

/**
 * Where the selection goes when its item leaves the visible rows: the next
 * item that stays in its group, otherwise the first row of the next group,
 * otherwise the previous row.
 */
export function successorRow<A>(
  previous: ListRows<A>,
  next: ListRows<A>,
  key: ListRowKey,
  itemsOnly = false,
): number {
  const before = rowIndexForKey(previous.rows, key);
  const row = previous.rows[before];
  if (row === undefined || row.kind === "blank") {
    return firstSelectable(next.rows, 0, itemsOnly);
  }
  const [group] = rowGroupIds(row);
  if (group === undefined) return firstSelectable(next.rows, 0, itemsOnly);
  for (let index = before + 1; index < previous.rows.length; index += 1) {
    const later = previous.rows[index];
    if (later?.kind !== "item" || later.group.id !== group) break;
    const found = next.rows.findIndex((candidate) =>
      candidate.kind === "item" && candidate.key === later.key &&
      candidate.group.id === group
    );
    if (found >= 0 && selectableRow(next.rows[found], itemsOnly)) return found;
  }
  let anchor = next.rows.length;
  const own = groupBounds(next.rows, group);
  if (own !== undefined) anchor = own.end;
  else {
    const order = previous.rows.flatMap(rowGroupIds);
    const later = order.slice(order.indexOf(group) + 1);
    for (const candidate of later) {
      const bounds = groupBounds(next.rows, candidate);
      if (bounds !== undefined) {
        anchor = bounds.first;
        break;
      }
    }
  }
  const after = firstSelectable(next.rows, anchor, itemsOnly);
  return after >= 0 ? after : lastSelectable(next.rows, anchor, itemsOnly);
}

/** How many rows a list needs with these folds and separators. */
function rowCount<A>(list: ApplicationList<A>, shape: ListShape): number {
  return flattenList(list, shape).rows.length;
}

/** A density decision: whether separators stay and which groups fold. */
export interface ListDensityDecision {
  readonly separators: boolean;
  readonly densityFolds: readonly string[];
}

/**
 * Fit a list to `available` rows: keep separators if everything fits, drop
 * them if that fits, then fold quiet groups in order — never a headless
 * group, a `neverFold` group, or the group holding the selection — until it
 * fits or nothing more may fold, and keep separators after all when the
 * folds leave them room; the rest scrolls.
 */
export function decideListDensity<A>(
  list: ApplicationList<A>,
  folds: ReadonlySet<string>,
  available: number,
  selectedGroups: readonly string[],
): ListDensityDecision {
  const none = new Set<string>();
  if (
    rowCount(list, { folds, densityFolds: none, separators: true }) <= available
  ) {
    return { separators: true, densityFolds: [] };
  }
  const tight = { folds, densityFolds: none, separators: false };
  if (rowCount(list, tight) <= available || list.density === undefined) {
    return { separators: false, densityFolds: [] };
  }
  const order = list.density.foldOrder ??
    [...list.groups].reverse().map((group) => group.id);
  const never = new Set([
    ...(list.density.neverFold ?? []),
    ...selectedGroups,
  ]);
  const candidates = new Set(
    list.groups.filter((group) => group.items.length > 0 && groupCanFold(group))
      .map((group) => group.id),
  );
  const folded = new Set<string>();
  for (const id of order) {
    if (never.has(id) || !candidates.has(id) || folds.has(id)) continue;
    folded.add(id);
    if (
      rowCount(list, { folds, densityFolds: folded, separators: false }) <=
        available
    ) break;
  }
  // Folding may free the rows the separators need again.
  const separated = rowCount(list, {
    folds,
    densityFolds: folded,
    separators: true,
  }) <= available;
  return { separators: separated, densityFolds: [...folded] };
}
