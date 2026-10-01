/**
 * The rows a menu and a palette show: a menu's sections split into columns
 * and its reading order, filtered by a query; a palette's sections, or its
 * items ranked by fuzzy match while a query is typed.
 *
 * @module
 */

import {
  itemControl,
  type LayerControl,
  UNAVAILABLE_SECTION,
  unavailableControl,
} from "./layer-controls.ts";
import type {
  ApplicationMenu,
  ApplicationPalette,
  MenuItem,
  MenuSection,
  PaletteItem,
  UnavailableMenuItem,
} from "./layer-view.ts";

/** One menu section and the items its filter keeps. */
export interface MenuSectionRows<A> {
  readonly section: MenuSection<A>;
  readonly items: readonly MenuItem<A>[];
}

/** What a menu shows for its query and fold. */
export interface MenuRows<A> {
  /** Sections with matches, split into one or two columns read in order. */
  readonly columns: readonly (readonly MenuSectionRows<A>[])[];
  /** Unavailable items shown, or undefined when the section is absent. */
  readonly unavailable?: readonly UnavailableMenuItem[];
  /** Whether the unavailable section shows its rows. */
  readonly unavailableOpen: boolean;
  /** Every highlightable control in reading order. */
  readonly order: readonly LayerControl[];
  /** Controls that start each section, for Tab. */
  readonly sectionStarts: readonly LayerControl[];
}

function matches(text: string, query: string): boolean {
  return text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

/**
 * Split sections into columns of similar height without splitting a
 * section: the first column takes sections until it holds at least half of
 * the rows.
 */
function splitColumns<A>(
  sections: readonly MenuSectionRows<A>[],
  columns: 1 | 2,
): readonly (readonly MenuSectionRows<A>[])[] {
  if (columns === 1 || sections.length < 2) return [sections];
  const height = (part: readonly MenuSectionRows<A>[]) =>
    part.reduce((total, entry) => total + entry.items.length + 1, 0) +
    Math.max(0, part.length - 1);
  const total = height(sections);
  let split = 1;
  let best = Number.POSITIVE_INFINITY;
  for (let at = 1; at < sections.length; at += 1) {
    const left = height(sections.slice(0, at));
    const right = height(sections.slice(at));
    const tallest = Math.max(left, right);
    if (tallest < best || (tallest === best && left >= total / 2)) {
      best = tallest;
      split = at;
    }
  }
  return [sections.slice(0, split), sections.slice(split)];
}

/** The rows a menu shows for a query, a column count, and its fold. */
export function menuRows<A>(
  menu: ApplicationMenu<A>,
  query: string,
  columns: 1 | 2,
  unavailableOpen: boolean,
): MenuRows<A> {
  const filtering = query.trim() !== "";
  const sections = menu.sections.map((section) => ({
    section,
    items: filtering
      ? section.items.filter((item) => matches(item.label, query))
      : section.items,
  })).filter((entry) => entry.items.length > 0);
  const split = splitColumns(sections, columns);
  const unavailable = menu.unavailable === undefined
    ? undefined
    : filtering
    ? menu.unavailable.items.filter((item) => matches(item.label, query))
    : menu.unavailable.items;
  const open = filtering || unavailableOpen;
  const order: LayerControl[] = [];
  const sectionStarts: LayerControl[] = [];
  for (const entry of split.flat()) {
    const [first] = entry.items;
    if (first !== undefined) sectionStarts.push(itemControl(first.id));
    order.push(...entry.items.map((item) => itemControl(item.id)));
  }
  if (unavailable !== undefined && unavailable.length > 0) {
    if (!filtering) {
      sectionStarts.push(UNAVAILABLE_SECTION);
      order.push(UNAVAILABLE_SECTION);
    } else if (unavailable[0] !== undefined) {
      sectionStarts.push(unavailableControl(unavailable[0].id));
    }
    if (open) {
      order.push(...unavailable.map((item) => unavailableControl(item.id)));
    }
  }
  return {
    columns: split,
    ...(unavailable === undefined || unavailable.length === 0
      ? {}
      : { unavailable }),
    unavailableOpen: open,
    order,
    sectionStarts,
  };
}

/** Find a menu item by id among the available items. */
export function menuItem<A>(
  menu: ApplicationMenu<A>,
  id: string,
): MenuItem<A> | undefined {
  for (const section of menu.sections) {
    const found = section.items.find((item) => item.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Score how well `query` matches `text` as an in-order subsequence: matches
 * at word starts and runs of consecutive matches rank higher, gaps lower.
 * Undefined when a query character is missing.
 */
export function fuzzyScore(text: string, query: string): number | undefined {
  const haystack = text.toLocaleLowerCase();
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return 0;
  let score = 0;
  let at = 0;
  let previous = -2;
  for (const character of needle) {
    if (character === " ") continue;
    const found = haystack.indexOf(character, at);
    if (found < 0) return undefined;
    const before = haystack[found - 1];
    const wordStart = found === 0 || before === undefined ||
      /[\s\-_/.:·]/u.test(before);
    score += 1 + (wordStart ? 3 : 0) + (found === previous + 1 ? 2 : 0) -
      Math.min(2, (found - at) * 0.05);
    previous = found;
    at = found + character.length;
  }
  return score;
}

/** One row a palette shows: a section title or an item. */
export type PaletteRow<A> =
  | { readonly kind: "section"; readonly title: string }
  | {
    readonly kind: "item";
    readonly item: PaletteItem<A>;
    readonly section: string;
  };

/** What a palette shows for a query. */
export interface PaletteRows<A> {
  readonly rows: readonly PaletteRow<A>[];
  /** Items in display order, for movement. */
  readonly items: readonly PaletteItem<A>[];
}

/** Rankings by palette value, then query; one keystroke reads them several times. */
const rankings = new WeakMap<object, Map<string, PaletteRows<unknown>>>();

/**
 * A blank query shows every section in order. A typed query ranks matching
 * items across sections by label, then context, then keywords, best first,
 * keeping declaration order between equal scores.
 */
export function paletteRows<A>(
  palette: ApplicationPalette<A>,
  query: string,
): PaletteRows<A> {
  const known = rankings.get(palette);
  const found = known?.get(query);
  if (found !== undefined) return found as PaletteRows<A>;
  const result = rankPalette(palette, query);
  const queries = known ?? new Map<string, PaletteRows<unknown>>();
  if (queries.size >= 16) queries.clear();
  queries.set(query, result as PaletteRows<unknown>);
  rankings.set(palette, queries);
  return result;
}

function rankPalette<A>(
  palette: ApplicationPalette<A>,
  query: string,
): PaletteRows<A> {
  if (query.trim() === "") {
    const rows: PaletteRow<A>[] = [];
    for (const section of palette.sections) {
      if (section.items.length === 0) continue;
      rows.push({ kind: "section", title: section.title });
      rows.push(
        ...section.items.map((item) => ({
          kind: "item" as const,
          item,
          section: section.title,
        })),
      );
    }
    return {
      rows,
      items: rows.flatMap((row) => row.kind === "item" ? [row.item] : []),
    };
  }
  const ranked: {
    readonly item: PaletteItem<A>;
    readonly section: string;
    readonly score: number;
    readonly order: number;
  }[] = [];
  let order = 0;
  for (const section of palette.sections) {
    for (const item of section.items) {
      const scores = [
        fuzzyScore(item.label, query),
        ...[item.context, item.keywords].map((text, index) => {
          const score = text === undefined
            ? undefined
            : fuzzyScore(text, query);
          return score === undefined ? undefined : score * (0.8 - index * 0.2);
        }),
      ].filter((score): score is number => score !== undefined);
      if (scores.length > 0) {
        ranked.push({
          item,
          section: section.title,
          score: Math.max(...scores),
          order,
        });
      }
      order += 1;
    }
  }
  ranked.sort((left, right) =>
    right.score - left.score || left.order - right.order
  );
  return {
    rows: ranked.map((entry) => ({
      kind: "item",
      item: entry.item,
      section: entry.section,
    })),
    items: ranked.map((entry) => entry.item),
  };
}
