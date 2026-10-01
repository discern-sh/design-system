/**
 * Incremental inline terminal-frame replacement.
 *
 * @module
 */

import { measureText } from "../text.ts";
import { parseStyledSource } from "../styled-sequences.ts";
import type { TerminalIO, TerminalSize } from "./io.ts";
import {
  encodeTerminalStateReport,
  type TerminalApplicationStateReport,
} from "./state-report.ts";

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_SCREEN_END = "\x1b[J";

/** Home the cursor before painting a complete terminal viewport. */
export const HOME_TERMINAL_CURSOR = "\x1b[H";

/** Erase the complete active terminal display without touching scrollback. */
export const ERASE_TERMINAL_DISPLAY = "\x1b[2J";

/** Erase the whole cursor row, leaving the cursor where it is. */
export const ERASE_TERMINAL_LINE = "\x1b[2K";

/**
 * DECSET 2026: hold the display until the matching end, so one paint appears
 * at once. Terminals without synchronized output ignore it.
 */
export const BEGIN_SYNCHRONIZED_UPDATE = "\x1b[?2026h";

/** DECRST 2026: show everything written since the matching begin. */
export const END_SYNCHRONIZED_UPDATE = "\x1b[?2026l";

/** Move the cursor to the first cell of a one-based viewport row. */
export function terminalRowCursor(row: number): string {
  return `\x1b[${row};1H`;
}

/** Why an inline frame could not be painted without corrupting scrollback. */
export type InlineFrameRefusalReason =
  | "ansi-control-unavailable"
  | "frame-exceeds-viewport"
  | "current-frame-exceeds-viewport";

interface InlineFramePaintFacts {
  readonly frameLines: number;
  readonly previousFrameLines: number;
  readonly viewportRows: number;
}

/** Result of attempting to paint one replaceable inline terminal frame. */
export type InlineFramePaintResult =
  | ({ readonly status: "painted" | "unchanged" } & InlineFramePaintFacts)
  | ({
    readonly status: "refused";
    readonly reason: InlineFrameRefusalReason;
  } & InlineFramePaintFacts);

function frameLines(frame: string): number {
  return frame === "" ? 0 : frame.split("\n").length;
}

/** Replace one inline terminal frame without scrolling earlier output. */
export class InlineFramePainter {
  #previous = "";

  constructor(readonly io: TerminalIO) {}

  /** Most recently painted frame, excluding replacement control sequences. */
  get currentFrame(): string {
    return this.#previous;
  }

  /**
   * Paint a new frame when the terminal can replace it completely. Refusals
   * write nothing, so callers can stop live updates and choose a static view.
   */
  replace(frame: string): InlineFramePaintResult {
    const viewportRows = Math.max(1, this.io.size().rows);
    const nextLines = frameLines(frame);
    const previousFrameLines = frameLines(this.#previous);
    const facts = {
      frameLines: nextLines,
      previousFrameLines,
      viewportRows,
    } as const;
    if (frame === this.#previous && previousFrameLines === 0) {
      return { status: "unchanged", ...facts };
    }
    if (this.io.capabilities().ansiControl === false) {
      return {
        status: "refused",
        reason: "ansi-control-unavailable",
        ...facts,
      };
    }
    if (previousFrameLines > viewportRows) {
      return {
        status: "refused",
        reason: "current-frame-exceeds-viewport",
        ...facts,
      };
    }
    if (nextLines > viewportRows) {
      return {
        status: "refused",
        reason: "frame-exceeds-viewport",
        ...facts,
      };
    }
    if (frame === this.#previous) return { status: "unchanged", ...facts };
    if (this.#previous === "") {
      this.io.write(frame);
      this.#previous = frame;
      return { status: "painted", ...facts };
    }
    this.io.write(`${this.#replacementPrefix(previousFrameLines)}${frame}`);
    this.#previous = frame;
    return { status: "painted", ...facts };
  }

  /** Erase the current frame and forget it. */
  clear(): void {
    if (this.#previous === "") return;
    const previousFrameLines = frameLines(this.#previous);
    const viewportRows = Math.max(1, this.io.size().rows);
    if (
      this.io.capabilities().ansiControl === false ||
      previousFrameLines > viewportRows
    ) {
      this.io.write("\n");
      this.#previous = "";
      return;
    }
    this.io.write(this.#replacementPrefix(previousFrameLines));
    this.#previous = "";
  }

  /** Leave the current frame visible, move below it, and begin a fresh region. */
  finish(): void {
    if (this.#previous === "") return;
    this.io.write("\n");
    this.#previous = "";
  }

  #replacementPrefix(previousLines: number): string {
    const linesUp = Math.max(0, previousLines - 1);
    return `${FIRST_COLUMN}${
      linesUp > 0 ? `\x1b[${linesUp}A` : ""
    }${ERASE_TO_SCREEN_END}`;
  }
}

/**
 * Throw unless one painted row is a single line of cells: package styling
 * and hyperlinks only, both closed, no control character that would move the
 * cursor, and no cell beyond the viewport. Every row an owned screen writes
 * passes through here.
 */
export function assertPaintableRow(line: string, columns: number): void {
  const sentinel = "~";
  const segments = parseStyledSource(`${line}${sentinel}`);
  if (segments.some((segment) => /\p{Cc}/u.test(segment.text))) {
    throw new TypeError(
      "complete frame rows must not contain control characters",
    );
  }
  const last = segments.at(-1);
  if (
    last === undefined || !last.text.endsWith(sentinel) ||
    last.codes.length > 0 || last.link !== undefined
  ) {
    throw new TypeError(
      "complete terminal frames must close styling and hyperlinks on every line",
    );
  }
  if (measureText(line) > columns) {
    throw new TypeError(
      `complete frame row exceeds its ${columns}-cell viewport`,
    );
  }
}

/** How an owned screen writes its frames. */
export interface TerminalPaintOptions {
  /** Bracket every paint in DECSET 2026 synchronized output. */
  readonly synchronized: boolean;
  /** Between keyframes, rewrite only the rows that changed. */
  readonly rowDiff: boolean;
  /**
   * The first paint at least this long after the previous keyframe is itself
   * a keyframe, so a damaged screen heals; an idle screen is not repainted.
   */
  readonly keyframeEveryMs: number;
}

/** Synchronized row-diff painting with a keyframe at least every 30 seconds. */
export const DEFAULT_TERMINAL_PAINT_OPTIONS: TerminalPaintOptions = Object
  .freeze({
    synchronized: true,
    rowDiff: true,
    keyframeEveryMs: 30_000,
  });

/** Resolve caller paint preferences, rejecting an unusable keyframe interval. */
export function terminalPaintOptions(
  options: Partial<TerminalPaintOptions> = {},
): TerminalPaintOptions {
  const resolved = { ...DEFAULT_TERMINAL_PAINT_OPTIONS, ...options };
  if (
    !Number.isFinite(resolved.keyframeEveryMs) || resolved.keyframeEveryMs <= 0
  ) {
    throw new TypeError(
      `keyframe interval must be a positive number of milliseconds; received ${resolved.keyframeEveryMs}`,
    );
  }
  return Object.freeze(resolved);
}

/** One fitted viewport offered to {@linkcode TerminalScreenPainter}. */
export interface TerminalScreenPaint {
  /** Exactly one line per viewport row, each closed and within the width. */
  readonly frame: string;
  /** The geometry the frame was rendered against. */
  readonly size: TerminalSize;
  /**
   * Identity of the frame's composition, such as the topmost open layer. A
   * change paints a keyframe even when rows could be diffed.
   */
  readonly layer?: string;
  /** Announced before the paint when present; omitted reports stay silent. */
  readonly report?: TerminalApplicationStateReport;
}

/** What one paint did. */
export type TerminalScreenPaintResult =
  | {
    /** The viewport changed after rendering; nothing was written. */
    readonly status: "resized";
  }
  | {
    /** Rows, layer and report all match the screen; nothing was written. */
    readonly status: "unchanged";
  }
  | {
    readonly status: "painted";
    /** A keyframe clears and rewrites every row; a diff rewrites changed rows. */
    readonly kind: "keyframe" | "rows";
    /** Rows written, including every row of a keyframe. */
    readonly rows: number;
    /** UTF-8 bytes written, including control sequences and any report. */
    readonly bytes: number;
  };

const encoder = new TextEncoder();

/**
 * Paint complete, already-fitted viewports inside an alternate screen. The
 * first paint, a new geometry, a new layer, and the first paint after the
 * keyframe interval clear the display and write every row; other paints
 * position the cursor at each changed row, erase it and write it. This
 * authority does not enter or leave that screen; the lifecycle bracket owns
 * matching terminal modes.
 */
export class TerminalScreenPainter {
  readonly options: TerminalPaintOptions;
  #rows: readonly string[] | undefined;
  #size: TerminalSize | undefined;
  #layer: string | undefined;
  #report: string | undefined;
  #keyframeAt = 0;

  constructor(
    readonly io: TerminalIO,
    readonly now: () => number,
    options: Partial<TerminalPaintOptions> = {},
  ) {
    this.options = terminalPaintOptions(options);
  }

  /** Forget the screen so the next paint is a keyframe. */
  invalidate(): void {
    this.#rows = undefined;
  }

  /**
   * Validate and paint one exact viewport. A frame rendered against stale
   * geometry returns `resized` without writing, so the caller can reflow.
   */
  paint(request: TerminalScreenPaint): TerminalScreenPaintResult {
    const size = this.io.size();
    if (
      size.columns !== request.size.columns || size.rows !== request.size.rows
    ) {
      return { status: "resized" };
    }
    const rows = request.frame.split("\n");
    if (rows.length !== size.rows) {
      throw new TypeError(
        `complete frame has ${rows.length} rows for a ${size.rows}-row viewport`,
      );
    }
    const previous = this.#rows;
    const recomposed = previous === undefined ||
      this.#size?.columns !== size.columns || this.#size.rows !== size.rows ||
      this.#layer !== request.layer;
    const differing = recomposed
      ? rows.map((_, index) => index)
      : rows.flatMap((row, index) => row === previous[index] ? [] : [index]);
    const report = request.report === undefined
      ? undefined
      : encodeTerminalStateReport(request.report);
    if (!recomposed && differing.length === 0 && report === this.#report) {
      return { status: "unchanged" };
    }
    const now = this.now();
    const keyframe = recomposed || !this.options.rowDiff ||
      now - this.#keyframeAt >= this.options.keyframeEveryMs;
    const changed = keyframe ? rows.map((_, index) => index) : differing;
    for (const index of differing) {
      assertPaintableRow(rows[index]!, size.columns);
    }
    const body = keyframe
      ? `${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}${rows.join("\r\n")}`
      : changed.map((index) =>
        `${terminalRowCursor(index + 1)}${ERASE_TERMINAL_LINE}${rows[index]}`
      ).join("");
    const output = this.options.synchronized
      ? `${BEGIN_SYNCHRONIZED_UPDATE}${
        report ?? ""
      }${body}${END_SYNCHRONIZED_UPDATE}`
      : `${report ?? ""}${body}`;
    // A failed write leaves the screen unknown, so the next paint is a keyframe.
    this.#rows = undefined;
    this.io.write(output);
    this.#rows = rows;
    this.#size = size;
    this.#layer = request.layer;
    this.#report = report;
    if (keyframe) this.#keyframeAt = now;
    return {
      status: "painted",
      kind: keyframe ? "keyframe" : "rows",
      rows: changed.length,
      bytes: encoder.encode(output).length,
    };
  }
}
