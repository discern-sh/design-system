/**
 * Markdown in a reading body: the document rendered at its readable measure
 * with the links a reader can reach and the headings a fragment names. Link
 * identity starts in the neutral Markdown document and its cells come from
 * the shared cell projection, so no second byte grammar decides where a
 * link sits.
 *
 * @module
 */

import { stripAnsi } from "../../ansi.ts";
import type { TerminalCapabilities } from "../../capabilities.ts";
import {
  type CliPresentationOptions,
  cliPresentationPassthrough,
} from "../../contracts.ts";
import { projectTerminalCellRows } from "../../projection.ts";
import { mapStyledHyperlinks } from "../../styled-sequences.ts";
import { measureText, truncateText } from "../../text.ts";
import {
  parseMarkdown,
  validateMarkdownChartResources,
  validateMarkdownDiagramResources,
} from "../../../components/editorial/markdown/markdown.model.ts";
import { renderMarkdownCliProjection } from "../../../components/editorial/markdown/markdown.cli.ts";
import type { ApplicationMarkdown } from "./view.ts";

/** The readable measure a Markdown reading body uses when it names none. */
export const DEFAULT_APPLICATION_READING_MEASURE = 72;

/** The narrowest measure a Markdown reading body may ask for. */
export const MINIMUM_APPLICATION_READING_MEASURE = 16;

/** How a link came to have focus, which sets its decoration. */
export type ReadingFocusOrigin = "keyboard" | "pointer";

/** One link occurrence on rendered rows. Rows are zero-based document rows. */
export interface ReadingLink {
  readonly id: string;
  readonly destination: string;
  readonly startRow: number;
  readonly endRow: number;
  /** Cells on each row the link occupies, zero-based, ending before `end`. */
  readonly regions: readonly {
    readonly row: number;
    readonly start: number;
    readonly end: number;
  }[];
}

/** A rendered Markdown document with its links and heading rows. */
export interface ReadingProjection {
  readonly lines: readonly string[];
  readonly links: readonly ReadingLink[];
  /** Heading ids and their rows, for fragments. */
  readonly headings: ReadonlyMap<string, number>;
  /**
   * Every row a heading draws, its rule included, so a viewport never ends
   * on a heading while the lines beneath it are hidden.
   */
  readonly keeps: ReadonlySet<number>;
  /** The cell after the document's measure, where its right edge falls. */
  readonly end: number;
}

/** Whether reading content is Markdown rather than a Component block. */
export function isApplicationMarkdown(
  content: unknown,
): content is ApplicationMarkdown {
  return typeof content === "object" && content !== null &&
    (content as { kind?: unknown }).kind === "markdown";
}

function supportsHyperlinks(capabilities: TerminalCapabilities): boolean {
  return capabilities.hyperlinks ?? capabilities.colorDepth !== "none";
}

const sound = new WeakSet<object>();

/**
 * What is wrong with a Markdown document, as paths below it and messages:
 * a source that is not text, a measure the reading body cannot honour, or
 * image resources that do not match the source. A sound document is
 * remembered, so a view that keeps it is checked once.
 */
export function applicationMarkdownIssues(
  markdown: ApplicationMarkdown,
): readonly { readonly path: string; readonly message: string }[] {
  if (sound.has(markdown)) return [];
  if (typeof markdown.source !== "string") {
    return [{ path: "source", message: "must be Markdown text" }];
  }
  const measure = markdown.measure ?? DEFAULT_APPLICATION_READING_MEASURE;
  if (
    !Number.isSafeInteger(measure) ||
    measure < MINIMUM_APPLICATION_READING_MEASURE
  ) {
    return [{
      path: "measure",
      message:
        `must be a whole number of at least ${MINIMUM_APPLICATION_READING_MEASURE} cells`,
    }];
  }
  try {
    assertMarkdownResources(markdown);
  } catch (error) {
    // A resource the source cannot honour is a caller error, reported as one.
    return [{
      path: "diagrams",
      message: error instanceof Error ? error.message : String(error),
    }];
  }
  sound.add(markdown);
  return [];
}

/**
 * Check a document's diagram and chart resources against its source,
 * throwing the Markdown authority's own errors: a malformed resource, a
 * duplicate source, or an image whose text does not match its resource.
 */
export function assertMarkdownResources(markdown: ApplicationMarkdown): void {
  const diagrams = markdown.diagrams === undefined
    ? undefined
    : validateMarkdownDiagramResources(markdown.diagrams);
  const charts = markdown.charts === undefined
    ? undefined
    : validateMarkdownChartResources(markdown.charts);
  if ((diagrams?.length ?? 0) > 0 || (charts?.length ?? 0) > 0) {
    parseMarkdown(markdown.source, {
      ...(diagrams === undefined ? {} : { diagrams }),
      ...(charts === undefined ? {} : { charts }),
    });
  }
}

/** How a Markdown reading sits in its width and which link has focus. */
export interface MarkdownReadingOptions {
  readonly focus?: {
    readonly link: string;
    readonly origin: ReadingFocusOrigin;
  };
  /**
   * Where the measure sits in a wider width: `center`, the default, as a
   * reading body sets a document, or `start`, at the text column of a
   * detail the document sits in beneath other blocks.
   */
  readonly align?: "center" | "start";
}

/**
 * Render Markdown at a width, at its measure, with every admitted link's
 * identity, destination, and cells, and every heading's row. The internal
 * hyperlink identities are remapped to real destinations, or removed where
 * the terminal shows no hyperlinks, before any line leaves.
 */
export function projectMarkdownReading(
  markdown: ApplicationMarkdown,
  width: number,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
  options: MarkdownReadingOptions = {},
): ReadingProjection {
  const focus = options.focus;
  const measure = Math.min(
    markdown.measure ?? DEFAULT_APPLICATION_READING_MEASURE,
    width,
  );
  const documentCapabilities = { ...capabilities, columns: measure };
  const projected = renderMarkdownCliProjection(
    {
      source: markdown.source,
      ...cliPresentationPassthrough(presentation),
      maxWidth: measure,
      headings: "reading",
      ...(markdown.diagrams === undefined
        ? {}
        : { diagrams: markdown.diagrams }),
      ...(markdown.charts === undefined ? {} : { charts: markdown.charts }),
    },
    documentCapabilities,
    focus === undefined
      ? {}
      : { focusedLinkId: focus.link, focusOrigin: focus.origin },
  );
  const linkByTarget = new Map(
    projected.links.map((link) => [link.projectionTarget, link] as const),
  );
  const headingTargets = new Set(
    projected.headings.map((heading) => heading.projectionTarget),
  );
  const hyperlinks = supportsHyperlinks(capabilities);
  const rendered = mapStyledHyperlinks(projected.output, (target) => {
    const link = linkByTarget.get(target);
    if (link !== undefined) return hyperlinks ? link.destination : undefined;
    if (headingTargets.has(target)) return undefined;
    return hyperlinks ? target : undefined;
  });
  const indent = options.align === "start"
    ? 0
    : Math.floor((width - measure) / 2);
  const pad = " ".repeat(indent);
  const lines = rendered === "" ? [] : rendered.split("\n").map((line) => {
    const value = `${pad}${line}`;
    if (measureText(value) > width) {
      throw new TypeError(
        `a Markdown reading row exceeds its ${width}-cell measure`,
      );
    }
    return value;
  });
  const cells = projectTerminalCellRows(projected.output);
  const links = projected.links.map((link): ReadingLink => {
    const ranges = new Map<number, { start: number; end: number }>();
    for (const row of cells) {
      for (const span of row.spans) {
        if (span.link !== link.projectionTarget) continue;
        const prior = ranges.get(row.row);
        ranges.set(row.row, {
          start: Math.min(prior?.start ?? span.startColumn, span.startColumn),
          end: Math.max(prior?.end ?? span.endColumn, span.endColumn),
        });
      }
    }
    // Cell rows and columns are one-based and inclusive.
    const regions = [...ranges.entries()].sort(([left], [right]) =>
      left - right
    ).map(([row, range]) => ({
      row: row - 1,
      start: indent + range.start - 1,
      end: indent + range.end,
    }));
    return {
      id: link.id,
      destination: link.destination,
      startRow: regions[0]?.row ?? 0,
      endRow: regions.at(-1)?.row ?? 0,
      regions,
    };
  });
  const headings = new Map<string, number>();
  const keeps = new Set<number>();
  for (const heading of projected.headings) {
    const row = cells.find((candidate) =>
      candidate.spans.some((span) => span.link === heading.projectionTarget)
    );
    if (row === undefined) continue;
    if (!headings.has(heading.id)) headings.set(heading.id, row.row - 1);
    // A heading draws its title and rule up to the blank line after it.
    for (
      let index = row.row - 1;
      index < lines.length && stripAnsi(lines[index] ?? "").trim() !== "";
      index += 1
    ) keeps.add(index);
  }
  return { lines, links, headings, keeps, end: indent + measure };
}

/** The heading id a fragment such as `#details` names, decoded. */
export function fragmentHeading(destination: string): string | undefined {
  if (!destination.startsWith("#")) return undefined;
  const value = destination.slice(1);
  if (value === "") return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function normalizedAnchor(value: string): string {
  return stripAnsi(value).trim().replace(/\s+/gu, " ");
}

/**
 * The visible text at or after a row, which identifies the reading position
 * across rewrapping.
 */
export function readingAnchor(
  lines: readonly string[],
  row: number,
): string | undefined {
  for (let index = Math.max(0, row); index < lines.length; index += 1) {
    const anchor = normalizedAnchor(lines[index] ?? "");
    if (anchor !== "") return truncateText(anchor, 80, "");
  }
  return undefined;
}

/**
 * The row of rewrapped lines that best matches a reading anchor, nearest
 * the proportional fallback among equal matches, so repeated rows such as
 * blank lines, rules, or table borders never pull the position to the
 * first duplicate.
 */
export function rowForReadingAnchor(
  lines: readonly string[],
  anchor: string | undefined,
  fallback: number,
): number {
  const safeFallback = Math.max(0, fallback);
  if (anchor === undefined) return safeFallback;
  const wanted = normalizedAnchor(anchor);
  if (wanted === "") return safeFallback;
  const words = wanted.split(" ").filter((word) => word !== "").slice(0, 4);
  let best: { readonly index: number; readonly score: number } | undefined;
  const nearer = (index: number, than: { readonly index: number }) =>
    Math.abs(index - safeFallback) < Math.abs(than.index - safeFallback);
  for (const [index, line] of lines.entries()) {
    const candidate = normalizedAnchor(line);
    if (candidate === "") continue;
    const whole = candidate.includes(wanted) ||
      (wanted.startsWith(candidate) && candidate.split(" ").length >= 2);
    const score = whole
      ? words.length + 1
      : words.filter((word) => candidate.includes(word)).length;
    if (
      best === undefined || score > best.score ||
      (score === best.score && nearer(index, best))
    ) best = { index, score };
  }
  return best !== undefined &&
      (best.score > words.length || best.score >= Math.min(2, words.length))
    ? best.index
    : safeFallback;
}
