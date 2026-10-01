/**
 * Detail rendering: one block builder for the detail column, zoom, and any
 * other surface that shows detail blocks, plus the scroll viewport with its
 * overflow markers and the compact strip.
 *
 * @module
 */

import { stripAnsi } from "../../ansi.ts";
import { renderCliBlock } from "../../block-composition.ts";
import { cliPresentationPassthrough } from "../../contracts.ts";
import { formatKeyChord } from "../../key-hints.ts";
import { terminalGlyph } from "../../terminal-glyphs.ts";
import {
  measureText,
  padText,
  truncateStyledText,
  wrapStyledText,
} from "../../text.ts";
import type { TerminalSurfaceRole } from "../../theme.ts";
import {
  clip,
  ink,
  overflowMarker,
  type PaintContext,
  runsWidth,
  runText,
  spread,
  styleGlyph,
  styleRuns,
} from "./paint.ts";
import { fitCell } from "./list-render.ts";
import type {
  ApplicationDetailBlock,
  ApplicationDetailStrip,
  ApplicationRun,
} from "./view.ts";

/** How blocks render at one place. */
export interface DetailLayout {
  readonly width: number;
  /** Wide screens and zoom put a heading's aside on its title row. */
  readonly wide: boolean;
  readonly surface: TerminalSurfaceRole | undefined;
  /**
   * The key column every hints block shares, so sibling sections line their
   * labels up; measured from the blocks when absent.
   */
  readonly keyWidth?: number;
}

/** The widest key any hints block among these blocks shows, sections included. */
export function hintsKeyWidth(
  context: PaintContext,
  blocks: readonly ApplicationDetailBlock[],
): number {
  let widest = 1;
  for (const block of blocks) {
    if (block.kind === "hints") {
      for (const item of block.items) {
        widest = Math.max(
          widest,
          measureText(formatKeyChord(item.key, context.capabilities)),
        );
      }
    } else if (block.kind === "section") {
      widest = Math.max(widest, hintsKeyWidth(context, block.blocks));
    }
  }
  return widest;
}

const blockCache = new WeakMap<
  object,
  { readonly key: string; readonly lines: readonly string[] }
>();

/** Wrap styled runs, indenting continuation lines by `indent` cells. */
function wrapRuns(
  context: PaintContext,
  runs: readonly ApplicationRun[],
  width: number,
  layout: DetailLayout,
  fallback: "ink" | "muted",
  indent = 0,
): readonly string[] {
  const styled = styleRuns(context, runs, layout.surface, fallback);
  if (styled === "") return [""];
  // A run that fits keeps its spacing; wrapping would fold repeated spaces.
  // The indent is the room a caller's prefix takes on every line.
  if (measureText(styled) <= width - indent) return [styled];
  const lines = wrapStyledText(styled, Math.max(1, width - indent));
  return lines.map((line, index) =>
    index === 0 ? line : `${" ".repeat(indent)}${line}`
  );
}

function heading(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "heading" }>,
  layout: DetailLayout,
): readonly string[] {
  const title = ink(
    context,
    clip(context, block.title, layout.width),
    { tone: "ink", bold: true },
    layout.surface,
  );
  const lines: string[] = [];
  const aside = styleRuns(context, block.aside, layout.surface, "faint");
  const beside = layout.wide && aside !== "" &&
    measureText(title) + 2 + measureText(aside) <= layout.width;
  lines.push(beside ? spread(context, title, aside, layout.width) : title);
  if (aside !== "" && !beside) {
    lines.push(
      truncateStyledText(
        aside,
        layout.width,
        terminalGlyph("ellipsis", context.capabilities),
      ),
    );
  }
  if (block.subtitle !== undefined) {
    lines.push(
      ...wrapRuns(
        context,
        [{ text: block.subtitle }],
        layout.width,
        layout,
        "muted",
      ),
    );
  }
  return lines;
}

function state(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "state" }>,
  layout: DetailLayout,
): readonly string[] {
  const separator = terminalGlyph("separator", context.capabilities);
  const labelTone = block.tone === "muted" || block.tone === "faint"
    ? "ink"
    : block.tone;
  const runs: ApplicationRun[] = [
    { text: block.label, tone: labelTone, role: "title" },
    ...(block.qualifier === undefined ? [] : [{
      text: ` ${separator} ${block.qualifier}`,
      tone: "muted" as const,
    }]),
  ];
  const glyph = styleGlyph(
    context,
    { ...block.glyph, tone: block.glyph.tone ?? block.tone },
    layout.surface,
  );
  return wrapRuns(context, runs, Math.max(1, layout.width - 2), layout, "ink")
    .map((line, index) => index === 0 ? `${glyph} ${line}` : `  ${line}`);
}

function facts(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "facts" }>,
  layout: DetailLayout,
): readonly string[] {
  const longest = Math.max(
    0,
    ...block.rows.map((row) => measureText(row.label)),
  );
  // The label column never leaves less than eight cells for values.
  const labelWidth = Math.max(
    1,
    Math.min(
      Math.max(
        layout.wide ? 10 : 9,
        Math.min(longest + 2, Math.floor(layout.width / 3)),
      ),
      layout.width - 8,
    ),
  );
  const lines: string[] = [];
  for (const row of block.rows) {
    const label = ink(
      context,
      padText(clip(context, row.label, labelWidth - 1), labelWidth),
      { tone: "faint" },
      layout.surface,
    );
    const values = row.value.length === 0 ? [[]] : row.value;
    for (const [index, value] of values.entries()) {
      const wrapped = wrapRuns(
        context,
        value,
        Math.max(1, layout.width - labelWidth),
        layout,
        "ink",
      );
      for (const [part, line] of wrapped.entries()) {
        lines.push(
          `${
            index === 0 && part === 0 ? label : " ".repeat(labelWidth)
          }${line}`,
        );
      }
    }
  }
  return lines;
}

function meter(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "meter" }>,
  layout: DetailLayout,
): readonly string[] {
  const ratio = Math.max(0, Math.min(1, block.value / (block.max ?? 1)));
  // The caption drops before the track shrinks below four cells.
  const shown = layout.width - measureText(block.caption) - 1 >= 4;
  const caption = shown ? measureText(block.caption) : 0;
  const cells = shown
    ? Math.max(4, Math.min(15, layout.width - caption - 1))
    : Math.max(1, Math.min(15, layout.width));
  const filled = Math.round(ratio * cells);
  const line = `${
    ink(
      context,
      terminalGlyph("meterFill", context.capabilities).repeat(filled),
      { tone: "accent" },
      layout.surface,
    )
  }${
    ink(
      context,
      terminalGlyph("meterTrack", context.capabilities).repeat(cells - filled),
      { tone: "faint" },
      layout.surface,
    )
  }${
    caption === 0
      ? ""
      : ink(context, ` ${block.caption}`, { tone: "muted" }, layout.surface)
  }`;
  return [line];
}

/** Cells a mark's text starts after: the mark and two spaces. */
const MARK_INDENT = 3;
/** Further cells a mark's own lines hang beneath its text. */
const MARK_LINE_INDENT = 2;

function marks(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "marks" }>,
  layout: DetailLayout,
): readonly string[] {
  const hanging = MARK_INDENT + MARK_LINE_INDENT;
  return block.items.flatMap((item) => {
    const mark = styleGlyph(context, item.mark, layout.surface, "muted");
    return [
      ...wrapRuns(context, item.runs, layout.width, layout, "ink", MARK_INDENT)
        .map((line, index) =>
          index === 0 ? `${mark}  ${line.trimStart()}` : line
        ),
      ...(item.lines ?? []).flatMap((runs) =>
        wrapRuns(context, runs, layout.width - hanging, layout, "muted", 0)
          .map((line) => `${" ".repeat(hanging)}${line}`)
      ),
    ];
  });
}

/** The least the text of an aligned row keeps before trailing columns drop. */
const ROW_MIN_TEXT = 12;

/**
 * Aligned rows: a lead cell, text that takes the remaining width and
 * truncates, and trailing columns that drop lowest priority first while the
 * text would keep fewer than twelve cells.
 */
function rows(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "rows" }>,
  layout: DetailLayout,
): readonly string[] {
  const gap = 2;
  const lead = block.lead;
  const leadCells = lead === undefined ? 0 : lead.width + 1;
  let shown = [...(block.columns ?? [])];
  const trailing = () =>
    shown.reduce((total, column) => total + column.width + gap, 0);
  while (layout.width - leadCells - trailing() < ROW_MIN_TEXT) {
    let drop = -1;
    for (const [index, column] of shown.entries()) {
      if (column.priority === undefined) continue;
      const current = shown[drop]?.priority;
      if (drop < 0 || current === undefined || column.priority <= current) {
        drop = index;
      }
    }
    if (drop < 0) break;
    shown = shown.filter((_, index) => index !== drop);
  }
  const textWidth = Math.max(1, layout.width - leadCells - trailing());
  return block.items.map((item) => {
    const leadText = lead === undefined
      ? ""
      : `${fitCell(context, item.lead ?? [], lead, layout.surface)} `;
    const text = padText(
      truncateStyledText(
        styleRuns(context, item.text, layout.surface, "ink"),
        textWidth,
        terminalGlyph("ellipsis", context.capabilities),
      ),
      textWidth,
    );
    const cells = shown.map((column) =>
      `${" ".repeat(gap)}${
        fitCell(context, item.cells?.[column.id] ?? [], column, layout.surface)
      }`
    ).join("");
    return `${leadText}${text}${cells}`;
  });
}

function hints(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "hints" }>,
  layout: DetailLayout,
): readonly string[] {
  const keys = block.items.map((item) =>
    formatKeyChord(item.key, context.capabilities)
  );
  const keyWidth = Math.max(
    layout.keyWidth ?? 1,
    ...keys.map(measureText),
  );
  const labelWidth =
    Math.max(...block.items.map((item) => measureText(item.label))) +
    3;
  const describe = layout.width - keyWidth - 2 - labelWidth >= 12;
  return block.items.map((item, index) => {
    const key = ink(
      context,
      padText(keys[index] ?? "", keyWidth),
      { tone: item.primary === true ? "accent" : "ink", bold: true },
      layout.surface,
    );
    const label = ink(
      context,
      describe ? padText(item.label, labelWidth) : item.label,
      { tone: "ink" },
      layout.surface,
    );
    const description = describe && item.description !== undefined
      ? ink(
        context,
        clip(
          context,
          item.description,
          layout.width - keyWidth - 2 - labelWidth,
        ),
        { tone: "faint" },
        layout.surface,
      )
      : "";
    // A hint names one key; at a width too narrow for it the label clips.
    return truncateStyledText(
      `${key}  ${label}${description}`,
      layout.width,
      terminalGlyph("ellipsis", context.capabilities),
    );
  });
}

/**
 * A Component block at the layout's width. Under a layer it recedes like
 * every other block: its own styling gives way to faint text without
 * weight, so it never reads as part of the layer above it.
 */
function cliBlock(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "block" }>,
  layout: DetailLayout,
): readonly string[] {
  const capabilities = { ...context.capabilities, columns: layout.width };
  const receded = context.recede === true;
  const key = JSON.stringify([
    capabilities,
    cliPresentationPassthrough(context.presentation),
    receded,
    layout.surface ?? "",
  ]);
  const cached = blockCache.get(block.content);
  if (cached?.key === key) return cached.lines;
  const rendered = renderCliBlock(
    block.content,
    capabilities,
    context.presentation,
  )
    .split("\n");
  const lines = receded
    ? rendered.map((line) =>
      ink(context, stripAnsi(line), { tone: "faint" }, layout.surface)
    )
    : rendered;
  blockCache.set(block.content, { key, lines });
  return lines;
}

function section(
  context: PaintContext,
  block: Extract<ApplicationDetailBlock, { kind: "section" }>,
  layout: DetailLayout,
): readonly string[] {
  const title = [
    block.title,
    ...(block.count === undefined ? [] : [String(block.count)]),
    ...(block.caption === undefined ? [] : [block.caption]),
  ].join("  ");
  return [
    ink(
      context,
      clip(context, title, layout.width),
      { tone: "faint" },
      layout.surface,
    ),
    ...renderDetailBlocks(context, block.blocks, layout),
  ];
}

function renderBlock(
  context: PaintContext,
  block: ApplicationDetailBlock,
  layout: DetailLayout,
): readonly string[] {
  switch (block.kind) {
    case "heading":
      return heading(context, block, layout);
    case "state":
      return state(context, block, layout);
    case "text":
      return wrapRuns(context, block.runs, layout.width, layout, "muted");
    case "facts":
      return facts(context, block, layout);
    case "meter":
      return meter(context, block, layout);
    case "marks":
      return marks(context, block, layout);
    case "rows":
      return rows(context, block, layout);
    case "hints":
      // The footer already names the keys; the fuller list needs room.
      return layout.wide ? hints(context, block, layout) : [];
    case "block":
      return cliBlock(context, block, layout);
    case "pending":
      return [
        ink(
          context,
          clip(context, block.label, layout.width),
          { tone: "faint" },
          layout.surface,
        ),
      ];
    case "section":
      return section(context, block, layout);
  }
}

/**
 * Render blocks top to bottom, one blank line apart. Text and a meter that
 * follow a state belong to it and sit directly beneath.
 */
export function renderDetailBlocks(
  context: PaintContext,
  blocks: readonly ApplicationDetailBlock[],
  given: DetailLayout,
): readonly string[] {
  const layout = given.keyWidth === undefined
    ? { ...given, keyWidth: hintsKeyWidth(context, blocks) }
    : given;
  const lines: string[] = [];
  let previous: ApplicationDetailBlock["kind"] | undefined;
  for (const block of blocks) {
    const rendered = renderBlock(context, block, layout);
    if (rendered.length === 0) continue;
    const hugs = (previous === "state" || previous === "meter") &&
      (block.kind === "text" || block.kind === "meter");
    if (previous !== undefined && !hugs) lines.push("");
    lines.push(...rendered);
    previous = block.kind;
  }
  return lines;
}

/** One scrolled slice of detail lines. */
export interface DetailViewport {
  readonly lines: readonly string[];
  readonly scroll: number;
}

function hiddenCount(lines: readonly string[]): number {
  return lines.filter((line) => line.trim() !== "").length;
}

/**
 * Show `lines` in `height` rows from `scroll`, clamped so the end is
 * reachable. Hidden content is named by `↑ N more · PgUp` on the first row —
 * the padding row when there is one — and `↓ N more · PgDn` on the last.
 */
export function scrollDetail(
  context: PaintContext,
  lines: readonly string[],
  height: number,
  requested: number,
  width: number,
  padded: boolean,
): DetailViewport {
  // A single row has no room for padding; it shows a line.
  const topPadding = padded && height >= 2;
  const pad = topPadding ? 1 : 0;
  const visible = Math.max(1, height - pad);
  const blank = () => "";
  if (lines.length <= visible) {
    return {
      lines: [
        ...Array.from({ length: pad }, blank),
        ...lines,
        ...Array.from({ length: visible - lines.length }, blank),
      ],
      scroll: 0,
    };
  }
  // Without a padding row the upper marker takes the first row once
  // scrolled, and stands for the line beneath it too, so each step down
  // reveals a new line — while the first page shows at least two lines;
  // otherwise that line would never be on screen. A viewport too short for
  // a marker and a line shows the line.
  const marks = !topPadding && visible >= 2;
  const covers = marks && visible >= 3;
  const viewport = (scroll: number) => {
    const up = scroll > 0 && marks ? 1 : 0;
    const first = scroll + (covers ? up : 0);
    let rows = visible - up;
    const below = first + rows < lines.length && rows >= 2;
    if (below) rows -= 1;
    return { first, rows, below };
  };
  let maxScroll = Math.max(0, lines.length - visible - 1);
  while (
    viewport(maxScroll).first + viewport(maxScroll).rows < lines.length
  ) maxScroll += 1;
  const scroll = Math.max(0, Math.min(requested, maxScroll));
  const at = viewport(scroll);
  const marker = (text: string) =>
    spread(context, "", ink(context, text, { tone: "faint" }), width);
  const top: string[] = [];
  if (scroll > 0 && (topPadding || marks)) {
    top.push(
      marker(
        overflowMarker(
          context,
          "up",
          hiddenCount(lines.slice(0, at.first)),
          "page-up",
        ),
      ),
    );
  } else if (topPadding) top.push("");
  const shown = lines.slice(at.first, at.first + at.rows);
  const bottom = at.below
    ? [
      marker(
        overflowMarker(
          context,
          "down",
          hiddenCount(lines.slice(at.first + at.rows)),
          "page-down",
        ),
      ),
    ]
    : [];
  const result = [...top, ...shown, ...bottom];
  while (result.length < height) result.push("");
  return { lines: result.slice(0, height), scroll };
}

/**
 * The strip a narrow screen shows above the footer: the item's title line
 * with the Space key against the end, then whole facts joined by a
 * separator; on a short screen, one line of facts and the key.
 */
export function renderStrip(
  context: PaintContext,
  strip: ApplicationDetailStrip | undefined,
  fallback: readonly ApplicationRun[],
  width: number,
  lines: 1 | 2,
  surface: TerminalSurfaceRole | undefined,
  zoomable: boolean,
): readonly string[] {
  const room = Math.max(1, width - 4);
  const key = zoomable
    ? ink(
      context,
      formatKeyChord("space", context.capabilities),
      { tone: "ink", bold: true },
      surface,
    )
    : "";
  const separator = ink(
    context,
    ` ${terminalGlyph("separator", context.capabilities)} `,
    { tone: "faint" },
    surface,
  );
  // Whole facts in order, skipping any that would not fit so a later,
  // shorter one still shows.
  const factsLine = (limit: number) => {
    const kept: string[] = [];
    let used = 0;
    for (const fact of strip?.facts ?? []) {
      const width = runsWidth(context, fact) + (kept.length === 0 ? 0 : 3);
      if (used + width > limit) continue;
      kept.push(styleRuns(context, fact, surface, "muted"));
      used += width;
    }
    return kept.join(separator);
  };
  // A title too wide for its room drops whole trailing toned runs, such as
  // a state word, before it truncates, so no word is cut mid-way.
  const titleIn = (limit: number) => {
    const runs = [...(strip?.title ?? fallback)];
    while (
      runs.length > 1 && runsWidth(context, runs) > limit &&
      (runs.at(-1)?.tone !== undefined ||
        runText(context, runs.at(-1) ?? { text: "" }).trim() === "")
    ) runs.pop();
    return truncateStyledText(
      styleRuns(context, runs, surface, "ink"),
      Math.max(1, limit),
      terminalGlyph("ellipsis", context.capabilities),
    );
  };
  if (lines === 1) {
    const reserved = key === "" ? 0 : measureText(key) + 2;
    const facts = factsLine(room - reserved);
    const shown = facts === "" ? titleIn(room - reserved) : facts;
    return [`  ${spread(context, shown, key, room)}`];
  }
  const reserved = key === "" ? 0 : measureText(key) + 2;
  return [
    `  ${spread(context, titleIn(room - reserved), key, room)}`,
    `  ${factsLine(room)}`,
  ];
}
