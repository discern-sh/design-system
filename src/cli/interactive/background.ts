/**
 * Terminal background sensing at the effects boundary: ask the terminal its
 * real background colour, fall back to the environment hint, and return a
 * typed ground fact with the evidence used. The caller supplies the
 * `TerminalIO` and the environment snapshot — nothing is read ambiently —
 * and the module mutates no terminal state beyond its raw-mode query
 * round-trip. Non-TTY handles are inert.
 *
 * @module
 */

import type { TerminalRgbColor } from "../ansi-palette.ts";
import type { TerminalIO } from "./io.ts";
import { withRawTerminal } from "./lifecycle.ts";
import {
  adoptTerminalRead,
  filterTerminalReads,
  parkTerminalChunk,
  type TerminalReadFilter,
} from "./read-broker.ts";
import { signalPassthrough, type TerminalSignalOptions } from "./signals.ts";

/** Sensed terminal ground: the tone of the background everything sits on. */
export type TerminalGround = "light" | "dark" | "unknown";

/** Why background sensing returned `unknown`. */
export type TerminalBackgroundUnknownReason =
  | "non-interactive"
  | "ansi-control-unavailable"
  | "unanswered"
  | "unrecognised-report";

/** The evidence behind one background reading. */
export type TerminalBackgroundEvidence =
  | {
    readonly source: "terminal-report";
    /** Raw OSC 11 payload exactly as the terminal reported it. */
    readonly report: string;
    /** Reported background colour reduced to 8-bit sRGB channels. */
    readonly color: TerminalRgbColor;
  }
  | {
    readonly source: "environment-hint";
    /** Raw `COLORFGBG` value the verdict derives from. */
    readonly value: string;
  }
  | {
    readonly source: "none";
    readonly reason: TerminalBackgroundUnknownReason;
  };

/** Typed background verdict plus the evidence that produced it. */
export interface TerminalBackgroundReading {
  readonly ground: TerminalGround;
  readonly evidence: TerminalBackgroundEvidence;
}

/** Inputs for {@linkcode senseTerminalBackground}; nothing is read ambiently. */
export interface TerminalBackgroundOptions extends TerminalSignalOptions {
  /** Terminal whose ground is sensed; the query round-trips on its handles. */
  readonly io: TerminalIO;
  /** Environment snapshot consulted for the `COLORFGBG` fallback hint. */
  readonly environment: Readonly<Record<string, string | undefined>>;
  /**
   * Milliseconds the reported-colour query may take before sensing falls
   * back to the environment hint (default 250).
   */
  readonly timeoutMs?: number;
}

const BACKGROUND_QUERY = "\x1b]11;?\x1b\\";
const REPORT_PREFIX = [0x1b, 0x5d, 0x31, 0x31, 0x3b] as const; // ESC ] 1 1 ;
const BEL = 0x07;
const ESC = 0x1b;
const STRING_TERMINATOR = 0x5c; // the "\" of ESC \
const REPORT_LIMIT = 4096;

const QUERY_ELAPSED = Symbol("background-query-elapsed");

/**
 * Relative luminance above which black text beats white text on the
 * reported ground — the flip point of the WCAG contrast ratio, and
 * therefore the boundary between a light and a dark terminal background.
 */
const LIGHT_LUMINANCE_THRESHOLD = 0.179;

interface ReportedColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

async function raceQueryDeadline(
  read: Promise<Uint8Array | null>,
  remainingMs: number,
): Promise<Uint8Array | null | typeof QUERY_ELAPSED> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<typeof QUERY_ELAPSED>((resolve) => {
        timer = setTimeout(() => resolve(QUERY_ELAPSED), remainingMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function concatChunks(left: Uint8Array, right: Uint8Array): Uint8Array {
  const joined = new Uint8Array(left.length + right.length);
  joined.set(left, 0);
  joined.set(right, left.length);
  return joined;
}

function reportStart(received: Uint8Array): number {
  outer: for (
    let index = 0;
    index + REPORT_PREFIX.length <= received.length;
    index += 1
  ) {
    for (const [offset, byte] of REPORT_PREFIX.entries()) {
      if (received[index + offset] !== byte) continue outer;
    }
    return index;
  }
  return -1;
}

interface ExtractedReport {
  readonly payload: string;
  readonly leftover: Uint8Array;
}

/**
 * Find one complete OSC 11 report in the received bytes. Bytes before and
 * after the report — for example keys a person typed while the query was in
 * flight — are returned as leftover input rather than swallowed.
 */
function extractReport(received: Uint8Array): ExtractedReport | undefined {
  const start = reportStart(received);
  if (start < 0) return undefined;
  const payloadStart = start + REPORT_PREFIX.length;
  for (let index = payloadStart; index < received.length; index += 1) {
    const byte = received[index];
    const terminated = byte === BEL ||
      (byte === ESC && received[index + 1] === STRING_TERMINATOR);
    if (!terminated) continue;
    const end = index + (byte === BEL ? 1 : 2);
    return {
      payload: new TextDecoder().decode(received.slice(payloadStart, index)),
      leftover: concatChunks(received.slice(0, start), received.slice(end)),
    };
  }
  return undefined;
}

function reportPrefixSuffixLength(received: Uint8Array): number {
  const maximum = Math.min(received.length, REPORT_PREFIX.length - 1);
  for (let length = maximum; length > 0; length -= 1) {
    const start = received.length - length;
    let matches = true;
    for (let offset = 0; offset < length; offset += 1) {
      if (received[start + offset] !== REPORT_PREFIX[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return length;
  }
  return 0;
}

/**
 * Remove this query's eventual OSC 11 reply from later brokered reads while
 * streaming every surrounding byte onward. Only a possible split prefix or
 * unterminated report is retained between chunks.
 */
function lateBackgroundReportFilter(): TerminalReadFilter {
  let held = new Uint8Array(0);
  return {
    transform(chunk) {
      if (chunk === null) {
        const leftover = held;
        held = new Uint8Array(0);
        return {
          chunk: leftover.length === 0 ? null : leftover,
          done: true,
        };
      }

      const received = concatChunks(held, chunk);
      held = new Uint8Array(0);
      const start = reportStart(received);
      if (start >= 0) {
        const report = extractReport(received);
        if (report !== undefined) {
          return { chunk: report.leftover, done: true };
        }
        const safe = received.slice(0, start);
        held = received.slice(start);
        if (held.length > REPORT_LIMIT) {
          held = new Uint8Array(0);
          return { chunk: safe, done: true };
        }
        return { chunk: safe, done: false };
      }

      const suffix = reportPrefixSuffixLength(received);
      const safeEnd = received.length - suffix;
      held = received.slice(safeEnd);
      return { chunk: received.slice(0, safeEnd), done: false };
    },
  };
}

async function readBackgroundReport(
  io: TerminalIO,
  timeoutMs: number,
): Promise<string | undefined> {
  io.write(BACKGROUND_QUERY);
  const deadline = Date.now() + timeoutMs;
  let received: Uint8Array = new Uint8Array(0);
  let timedOut = false;
  while (received.length <= REPORT_LIMIT) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      timedOut = true;
      break;
    }
    const read = adoptTerminalRead(io);
    let chunk: Uint8Array | null | typeof QUERY_ELAPSED;
    try {
      chunk = await raceQueryDeadline(read.result, remaining);
    } catch (error) {
      read.release();
      throw error;
    }
    if (chunk === QUERY_ELAPSED) {
      read.defer();
      timedOut = true;
      break;
    }
    read.release();
    if (chunk === null) break;
    received = concatChunks(received, chunk);
    const report = extractReport(received);
    if (report !== undefined) {
      if (report.leftover.length > 0) parkTerminalChunk(io, report.leftover);
      return report.payload;
    }
  }
  if (timedOut) filterTerminalReads(io, lateBackgroundReportFilter());
  if (received.length > 0) parkTerminalChunk(io, received);
  return undefined;
}

function scaledChannel(hex: string): number | undefined {
  const value = Number.parseInt(hex, 16);
  if (!Number.isFinite(value)) return undefined;
  return value / (16 ** hex.length - 1);
}

/** Parse an XParseColor-style `rgb:`/`rgba:` payload into unit channels. */
function parseReportedColor(report: string): ReportedColor | undefined {
  const match = report.match(
    /^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})(?:\/[0-9a-f]{1,4})?$/iu,
  );
  if (match === null) return undefined;
  const red = scaledChannel(match[1] ?? "");
  const green = scaledChannel(match[2] ?? "");
  const blue = scaledChannel(match[3] ?? "");
  if (red === undefined || green === undefined || blue === undefined) {
    return undefined;
  }
  return { red, green, blue };
}

function linearChannel(encoded: number): number {
  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: ReportedColor): number {
  return 0.2126 * linearChannel(color.red) +
    0.7152 * linearChannel(color.green) +
    0.0722 * linearChannel(color.blue);
}

function evidenceColor(color: ReportedColor): TerminalRgbColor {
  return {
    red: Math.round(color.red * 255),
    green: Math.round(color.green * 255),
    blue: Math.round(color.blue * 255),
  };
}

/**
 * Judge the `COLORFGBG` hint: its final segment is the background's ANSI
 * palette index. Dark palette backgrounds (0–6, 8) read dark, the light
 * pair (7, 15) reads light, and anything else stays unknown.
 */
function hintReading(
  environment: TerminalBackgroundOptions["environment"],
  reason: TerminalBackgroundUnknownReason,
): TerminalBackgroundReading {
  const value = environment.COLORFGBG;
  if (value !== undefined && value !== "") {
    const segments = value.split(";");
    const background = segments.length >= 2
      ? segments.at(-1)?.trim()
      : undefined;
    if (background !== undefined && /^[0-9]{1,2}$/u.test(background)) {
      const index = Number.parseInt(background, 10);
      if ((index >= 0 && index <= 6) || index === 8) {
        return {
          ground: "dark",
          evidence: { source: "environment-hint", value },
        };
      }
      if (index === 7 || index === 15) {
        return {
          ground: "light",
          evidence: { source: "environment-hint", value },
        };
      }
    }
  }
  return { ground: "unknown", evidence: { source: "none", reason } };
}

/**
 * Determine the terminal ground — light, dark, or unknown — with the
 * evidence used. An interactive, control-capable terminal is asked its real
 * background colour through an OSC 11 query inside a raw-mode round-trip
 * bounded by a strict timeout; when the query cannot answer, the
 * caller-supplied environment's `COLORFGBG` hint is consulted; and unknown
 * remains a first-class answer. Theme selection stays the caller's move.
 */
export async function senseTerminalBackground(
  options: TerminalBackgroundOptions,
): Promise<TerminalBackgroundReading> {
  const timeoutMs = options.timeoutMs ?? 250;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError(
      `background query timeout must be a positive safe integer of milliseconds; received ${timeoutMs}`,
    );
  }
  const io = options.io;
  if (!io.isInteractive()) {
    return {
      ground: "unknown",
      evidence: { source: "none", reason: "non-interactive" },
    };
  }
  if (io.capabilities().ansiControl === false) {
    return hintReading(options.environment, "ansi-control-unavailable");
  }
  const report = await withRawTerminal(
    io,
    () => readBackgroundReport(io, timeoutMs),
    { hideCursor: false, ...signalPassthrough(options) },
  );
  if (report === undefined) {
    return hintReading(options.environment, "unanswered");
  }
  const color = parseReportedColor(report);
  if (color === undefined) {
    return hintReading(options.environment, "unrecognised-report");
  }
  return {
    ground: relativeLuminance(color) > LIGHT_LUMINANCE_THRESHOLD
      ? "light"
      : "dark",
    evidence: {
      source: "terminal-report",
      report,
      color: evidenceColor(color),
    },
  };
}
