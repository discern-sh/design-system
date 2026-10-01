/**
 * The package's screen model: replays the paints an owned screen writes and
 * returns the frame they leave settled. It understands exactly the grammar
 * {@linkcode TerminalScreenPainter} emits and rejects every other byte; it is
 * not a terminal emulator.
 *
 * ```text
 * paint      = [BSU] [report] body [ESU]
 * body       = keyframe | row-write* | (empty: a report alone)
 * keyframe   = ESC[2J ESC[H row (CR LF row)*      rows exactly the viewport
 * row-write  = ESC[<row>;1H ESC[2K row             one-based row, column 1
 * row        = text with closed SGR and OSC 8 styling, no control characters
 * report     = ESC]<private OSC>;<flat JSON object> ESC\
 * BSU, ESU   = ESC[?2026h, ESC[?2026l               synchronized update
 * boundary   = ESC[?25h | ESC[?1049l               restoration ends the session
 * ```
 *
 * Replay starts at the last keyframe (with the synchronized-update and report
 * prefix that opened its paint) and stops at the first restoration boundary,
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
import {
  assertPaintableRow,
  BEGIN_SYNCHRONIZED_UPDATE,
  END_SYNCHRONIZED_UPDATE,
  ERASE_TERMINAL_DISPLAY,
  ERASE_TERMINAL_LINE,
  HOME_TERMINAL_CURSOR,
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
  /** Transcript offset just after the paint that settled the frame. */
  readonly end: number;
}

const KEYFRAME = `${ERASE_TERMINAL_DISPLAY}${HOME_TERMINAL_CURSOR}`;
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
    `(?<newline>\\r\\r?\\n)`,
    `(?<boundary>${RESTORATION_BOUNDARIES.map(literal).join("|")})`,
  ].join("|"),
  "gu",
);

const REPORT_ONLY = new RegExp(
  `^${literal(TERMINAL_STATE_REPORT_PREFIX)}[^\\x07\\x1b]*\\x1b\\\\$`,
  "u",
);

function reject(reason: string, transcript: string, at: number): never {
  throw new TypeError(
    `capture ${reason} at ${JSON.stringify(transcript.slice(at, at + 16))}`,
  );
}

/** Back up from a keyframe to the synchronized update and report that opened its paint. */
function paintStart(transcript: string, keyframe: number): number {
  const begin = transcript.lastIndexOf(BEGIN_SYNCHRONIZED_UPDATE, keyframe);
  if (begin < 0) return keyframe;
  const between = transcript.slice(
    begin + BEGIN_SYNCHRONIZED_UPDATE.length,
    keyframe,
  );
  return between === "" || REPORT_ONLY.test(between) ? begin : keyframe;
}

interface Transaction {
  rows: string[] | undefined;
  report: TerminalApplicationStateReport | undefined;
  readonly at: number;
}

/** Replay from one paint start; undefined when no paint has completed yet. */
function replayFrom(
  transcript: string,
  start: number,
  size: TerminalSize,
): ReplayedTerminalFrame | undefined {
  let screen: string[] | undefined;
  let state: TerminalApplicationStateReport | undefined;
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
        at: match.index,
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
