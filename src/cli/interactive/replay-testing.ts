/**
 * The package's screen model: replays the paints an owned screen writes and
 * returns the frame they leave settled. It understands exactly the grammar
 * {@linkcode TerminalScreenPainter} emits and rejects every other byte; it is
 * not a terminal emulator.
 *
 * ```text
 * paint      = [BSU] [mouse] [push] [title] [report] body [ESU]
 * body       = keyframe | row-write* | (empty: a title or report alone)
 * keyframe   = ESC[2J ESC[H row (CR LF row)*      rows exactly the viewport
 * row-write  = ESC[<row>;1H ESC[2K row             one-based row, column 1
 * row        = text with closed SGR and OSC 8 styling, no control characters
 * report     = ESC]<private OSC>;<flat JSON object> ESC\
 * title      = ESC]2;<plain text> ESC\                window title
 * push, pop  = ESC[22;0t, ESC[23;0t                save and restore the title
 * mouse      = ESC[?1000h ESC[?1006h | ESC[?1006l ESC[?1000l   SGR mouse reports on, off
 * query      = ESC[6n                               fences input after reports stop
 * BSU, ESU   = ESC[?2026h, ESC[?2026l               synchronized update
 * boundary   = ESC[?25h | ESC[?1049l               restoration ends the session
 * ```
 *
 * Replay starts at the last keyframe (with the synchronized-update, mouse,
 * title, and report prefix that opened its paint) and stops at the first
 * restoration boundary; a title pop, mouse reports turning off, and the
 * cursor-position query that fences their late input may precede that
 * boundary,
 * so earlier output, earlier sessions and foreground children never reach
 * the frame. A synchronized update is a transaction: an update still open at
 * the end of the transcript is in flight and leaves the previous settled
 * frame in place. A PTY may expand LF into CR LF, so a keyframe also accepts
 * CR CR LF between rows.
 *
 * @module
 */

import { projectTerminalSpans } from "../projection.ts";
import { measureText } from "../text.ts";
import type { TerminalSize } from "./io.ts";
import { QUERY_TERMINAL_CURSOR_POSITION } from "./mouse-input.ts";
import {
  assertPaintableRow,
  BEGIN_SYNCHRONIZED_UPDATE,
  DISABLE_TERMINAL_MOUSE_REPORTS,
  ENABLE_TERMINAL_MOUSE_REPORTS,
  END_SYNCHRONIZED_UPDATE,
  ERASE_TERMINAL_DISPLAY,
  ERASE_TERMINAL_LINE,
  HOME_TERMINAL_CURSOR,
  POP_TERMINAL_TITLE,
  PUSH_TERMINAL_TITLE,
} from "./painter.ts";
import {
  decodeTerminalStateReport,
  TERMINAL_STATE_REPORT_PREFIX,
  type TerminalApplicationStateReport,
} from "./state-report.ts";

/** One frame the replayed paints leave on the screen. */
export interface ReplayedTerminalFrame {
  /** The settled rows, joined by LF, with the package's styled bytes. */
  readonly frame: string;
  /** The state report in force when the frame settled, if any was emitted. */
  readonly state?: TerminalApplicationStateReport;
  /** The window title in force when the frame settled, if one was set. */
  readonly title?: string;
  /** True when mouse reports were on as the frame settled. */
  readonly mouse?: true;
  /** Transcript offset just after the paint that settled the frame. */
  readonly end: number;
}

const KEYFRAME = `${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}`;
const TITLE_PREFIX = "\x1b]2;";
const RESTORATION_BOUNDARIES = ["\x1b[?25h", "\x1b[?1049l"] as const;

function literal(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&").replaceAll(
    "\x1b",
    "\\x1b",
  );
}

const TOKEN = new RegExp(
  [
    `(?<begin>${literal(BEGIN_SYNCHRONIZED_UPDATE)})`,
    `(?<end>${literal(END_SYNCHRONIZED_UPDATE)})`,
    `(?<keyframe>${literal(KEYFRAME)})`,
    `(?:\\x1b\\[(?<row>\\d+);1H${literal(ERASE_TERMINAL_LINE)})`,
    `(?:${
      literal(TERMINAL_STATE_REPORT_PREFIX)
    }(?<report>[^\\x07\\x1b]*)\\x1b\\\\)`,
    `(?:${literal(TITLE_PREFIX)}(?<title>[^\\x07\\x1b]*)\\x1b\\\\)`,
    `(?<push>${literal(PUSH_TERMINAL_TITLE)})`,
    `(?<pop>${literal(POP_TERMINAL_TITLE)})`,
    `(?<mouseOn>${literal(ENABLE_TERMINAL_MOUSE_REPORTS)})`,
    `(?<mouseOff>${literal(DISABLE_TERMINAL_MOUSE_REPORTS)})`,
    `(?<query>${literal(QUERY_TERMINAL_CURSOR_POSITION)})`,
    `(?<newline>\\r\\r?\\n)`,
    `(?<boundary>${RESTORATION_BOUNDARIES.map(literal).join("|")})`,
  ].join("|"),
  "gu",
);

/** The optional sequences a paint may carry before its body, last first. */
const PAINT_PREFIXES = [
  new RegExp(
    `${literal(TERMINAL_STATE_REPORT_PREFIX)}[^\\x07\\x1b]*\\x1b\\\\$`,
    "u",
  ),
  new RegExp(
    `(?:${literal(TITLE_PREFIX)}[^\\x07\\x1b]*\\x1b\\\\|${
      literal(POP_TERMINAL_TITLE)
    })$`,
    "u",
  ),
  new RegExp(`${literal(PUSH_TERMINAL_TITLE)}$`, "u"),
  new RegExp(
    `(?:${literal(ENABLE_TERMINAL_MOUSE_REPORTS)}|${
      literal(DISABLE_TERMINAL_MOUSE_REPORTS)
    })$`,
    "u",
  ),
] as const;

function reject(reason: string, transcript: string, at: number): never {
  throw new TypeError(
    `capture ${reason} at ${JSON.stringify(transcript.slice(at, at + 16))}`,
  );
}

/**
 * Back up from a keyframe across the mouse reports, push, title, and report
 * that opened its paint, then the synchronized update around them.
 */
function paintStart(transcript: string, keyframe: number): number {
  let start = keyframe;
  for (const prefix of PAINT_PREFIXES) {
    const window = transcript.slice(Math.max(0, start - 4096), start);
    const found = prefix.exec(window);
    if (found !== null) start -= found[0].length;
  }
  return transcript.endsWith(BEGIN_SYNCHRONIZED_UPDATE, start)
    ? start - BEGIN_SYNCHRONIZED_UPDATE.length
    : start;
}

interface Transaction {
  rows: string[] | undefined;
  report: TerminalApplicationStateReport | undefined;
  /** A title set inside the update; null when the update restored the saved one. */
  title: string | null | undefined;
  /** Mouse reports turned on or off inside the update. */
  mouse: boolean | undefined;
}

/** Replay from one paint start; undefined when no paint has completed yet. */
function replayFrom(
  transcript: string,
  start: number,
  size: TerminalSize,
): ReplayedTerminalFrame | undefined {
  let screen: string[] | undefined;
  let state: TerminalApplicationStateReport | undefined;
  let title: string | undefined;
  let mouse = false;
  let settled: ReplayedTerminalFrame | undefined;
  let transaction: Transaction | undefined;
  let target: { readonly row: number; readonly keyframe: boolean } | undefined;
  const rows = (): string[] | undefined =>
    transaction === undefined ? screen : transaction.rows;
  const settle = (end: number): void => {
    if (screen === undefined) return;
    settled = {
      frame: screen.join("\n"),
      ...(state === undefined ? {} : { state }),
      ...(title === undefined ? {} : { title }),
      ...(mouse ? { mouse: true as const } : {}),
      end,
    };
  };
  const finishRow = (): void => {
    const written = target === undefined ? undefined : rows()?.[target.row];
    target = undefined;
    if (written === undefined) return;
    assertPaintableRow(written, size.columns);
    projectTerminalSpans(written);
  };
  let cursor = start;
  TOKEN.lastIndex = start;
  for (
    let match = TOKEN.exec(transcript);;
    match = TOKEN.exec(transcript)
  ) {
    const textEnd = match?.index ?? transcript.length;
    if (textEnd > cursor) {
      const current = rows();
      if (target === undefined || current === undefined) {
        reject("has bytes outside a painted row", transcript, cursor);
      }
      current[target.row] += transcript.slice(cursor, textEnd);
    }
    if (match === null) {
      if (transaction === undefined) {
        finishRow();
        settle(transcript.length);
      }
      break;
    }
    cursor = TOKEN.lastIndex;
    const groups = match.groups ?? {};
    if (groups.boundary !== undefined) {
      if (transaction === undefined) {
        finishRow();
        settle(match.index);
      }
      break;
    }
    if (groups.newline !== undefined) {
      if (target?.keyframe !== true) {
        reject("has a line break outside a keyframe", transcript, match.index);
      }
      const row = target.row + 1;
      finishRow();
      if (row >= size.rows) {
        reject(
          "has more keyframe rows than the viewport",
          transcript,
          match.index,
        );
      }
      target = { row, keyframe: true };
      continue;
    }
    finishRow();
    if (groups.begin !== undefined) {
      if (transaction !== undefined) {
        reject("nests a synchronized update", transcript, match.index);
      }
      transaction = {
        rows: screen === undefined ? undefined : [...screen],
        report: undefined,
        title: undefined,
        mouse: undefined,
      };
      continue;
    }
    if (groups.end !== undefined) {
      if (transaction === undefined) {
        reject("ends an update that never began", transcript, match.index);
      }
      if (transaction.rows === undefined) {
        reject("ends an update that painted nothing", transcript, match.index);
      }
      screen = transaction.rows;
      state = transaction.report ?? state;
      title = transaction.title === undefined
        ? title
        : transaction.title ?? undefined;
      mouse = transaction.mouse ?? mouse;
      transaction = undefined;
      settle(cursor);
      continue;
    }
    if (groups.report !== undefined) {
      const report = decodeTerminalStateReport(groups.report);
      if (transaction === undefined) {
        state = report;
        settle(cursor);
      } else transaction.report = report;
      continue;
    }
    if (groups.title !== undefined || groups.pop !== undefined) {
      if (transaction === undefined) {
        title = groups.title;
        settle(cursor);
      } else transaction.title = groups.title ?? null;
      continue;
    }
    if (groups.mouseOn !== undefined || groups.mouseOff !== undefined) {
      const on = groups.mouseOn !== undefined;
      if (transaction === undefined) {
        mouse = on;
        settle(cursor);
      } else transaction.mouse = on;
      continue;
    }
    if (groups.query !== undefined) {
      if (transaction !== undefined) {
        reject("queries the cursor inside an update", transcript, match.index);
      }
      continue;
    }
    if (groups.push !== undefined) continue;
    if (groups.keyframe !== undefined) {
      const blank = Array.from({ length: size.rows }, () => "");
      if (transaction === undefined) screen = blank;
      else transaction.rows = blank;
      target = { row: 0, keyframe: true };
      continue;
    }
    const row = Number(groups.row);
    const current = rows();
    if (current === undefined) {
      reject("writes a row before any keyframe", transcript, match.index);
    }
    if (!Number.isSafeInteger(row) || row < 1 || row > size.rows) {
      reject("writes a row outside the viewport", transcript, match.index);
    }
    current[row - 1] = "";
    target = { row: row - 1, keyframe: false };
  }
  return settled;
}

/**
 * Replay a transcript's last session and return its settled frame. Throws a
 * `TypeError` when the transcript holds no complete keyframe, departs from
 * the paint grammar, or settles on a frame that does not fill the viewport
 * exactly.
 */
export function replayTerminalFrame(
  transcript: string,
  size: TerminalSize,
): ReplayedTerminalFrame {
  for (
    let keyframe = transcript.lastIndexOf(KEYFRAME);
    keyframe >= 0;
    keyframe = keyframe === 0 ? -1 : transcript.lastIndexOf(
      KEYFRAME,
      keyframe - 1,
    )
  ) {
    const start = paintStart(transcript, keyframe);
    const settled = replayFrom(transcript, start, size);
    if (settled === undefined) continue;
    const lines = settled.frame.split("\n");
    if (
      lines.length !== size.rows ||
      lines.some((line) => measureText(line) !== size.columns)
    ) {
      throw new TypeError(
        "capture is incomplete or does not match the requested geometry",
      );
    }
    return settled;
  }
  throw new TypeError("capture contains no complete keyframe");
}
