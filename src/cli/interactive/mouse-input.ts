/** Input-side cleanup for reports queued before mouse tracking disabled. */

import type { TerminalIO } from "./io.ts";
import {
  adoptTerminalRead,
  filterTerminalReads,
  parkTerminalChunk,
  type TerminalReadFilter,
} from "./read-broker.ts";

/** Device-status query whose cursor-position report fences earlier input. */
export const QUERY_TERMINAL_CURSOR_POSITION = "\x1b[6n";

const ESCAPE = 0x1b;
const CSI = 0x5b;
const MOUSE = 0x3c;
const SEMICOLON = 0x3b;
const UPPER_M = 0x4d;
const LOWER_M = 0x6d;
const UPPER_R = 0x52;
const DIGIT_ZERO = 0x30;
const DIGIT_NINE = 0x39;
const INPUT_FENCE_TIMEOUT_MS = 100;
const INPUT_FENCE_LIMIT = 1_048_576;
const INPUT_FENCE_ELAPSED = Symbol("terminal-input-fence-elapsed");

interface ProtocolSequence {
  readonly kind: "complete" | "incomplete" | "invalid";
  readonly end?: number;
}

interface SanitizedInput {
  readonly safe: Uint8Array;
  readonly held: Uint8Array;
  readonly fenced: boolean;
}

function concatChunks(left: Uint8Array, right: Uint8Array): Uint8Array {
  const joined = new Uint8Array(left.length + right.length);
  joined.set(left, 0);
  joined.set(right, left.length);
  return joined;
}

function isDigit(byte: number | undefined): boolean {
  return byte !== undefined && byte >= DIGIT_ZERO && byte <= DIGIT_NINE;
}

function digitsEnd(input: Uint8Array, start: number): number | undefined {
  if (!isDigit(input[start])) return undefined;
  let index = start;
  while (isDigit(input[index])) index += 1;
  return index;
}

function sgrMouseAt(input: Uint8Array, start: number): ProtocolSequence {
  let index = start + 3;
  for (let field = 0; field < 3; field += 1) {
    const end = digitsEnd(input, index);
    if (end === undefined) {
      return index >= input.length
        ? { kind: "incomplete" }
        : { kind: "invalid" };
    }
    index = end;
    if (field < 2) {
      if (index >= input.length) return { kind: "incomplete" };
      if (input[index] !== SEMICOLON) return { kind: "invalid" };
      index += 1;
    }
  }
  if (index >= input.length) return { kind: "incomplete" };
  return input[index] === UPPER_M || input[index] === LOWER_M
    ? { kind: "complete", end: index + 1 }
    : { kind: "invalid" };
}

function cursorReportAt(input: Uint8Array, start: number): ProtocolSequence {
  let index = start + 2;
  const rowEnd = digitsEnd(input, index);
  if (rowEnd === undefined) {
    return index >= input.length ? { kind: "incomplete" } : { kind: "invalid" };
  }
  index = rowEnd;
  if (index >= input.length) return { kind: "incomplete" };
  if (input[index] !== SEMICOLON) return { kind: "invalid" };
  index += 1;
  const columnEnd = digitsEnd(input, index);
  if (columnEnd === undefined) {
    return index >= input.length ? { kind: "incomplete" } : { kind: "invalid" };
  }
  index = columnEnd;
  if (index >= input.length) return { kind: "incomplete" };
  return input[index] === UPPER_R
    ? { kind: "complete", end: index + 1 }
    : { kind: "invalid" };
}

/** Strip SGR reports up to the private cursor-position input fence. */
function sanitizeUntilFence(
  input: Uint8Array,
  finish = false,
): SanitizedInput {
  const safe: number[] = [];
  let index = 0;
  while (index < input.length) {
    if (input[index] !== ESCAPE) {
      safe.push(input[index] ?? 0);
      index += 1;
      continue;
    }
    if (index + 1 >= input.length) {
      return finish
        ? { safe: new Uint8Array(safe), held: new Uint8Array(0), fenced: false }
        : {
          safe: new Uint8Array(safe),
          held: input.slice(index),
          fenced: false,
        };
    }
    if (input[index + 1] !== CSI) {
      safe.push(ESCAPE);
      index += 1;
      continue;
    }
    if (index + 2 >= input.length) {
      return finish
        ? { safe: new Uint8Array(safe), held: new Uint8Array(0), fenced: false }
        : {
          safe: new Uint8Array(safe),
          held: input.slice(index),
          fenced: false,
        };
    }

    const marker = input[index + 2];
    const protocol = marker === MOUSE
      ? sgrMouseAt(input, index)
      : isDigit(marker)
      ? cursorReportAt(input, index)
      : { kind: "invalid" as const };
    if (protocol.kind === "incomplete") {
      return finish
        ? { safe: new Uint8Array(safe), held: new Uint8Array(0), fenced: false }
        : {
          safe: new Uint8Array(safe),
          held: input.slice(index),
          fenced: false,
        };
    }
    if (protocol.kind === "invalid" || protocol.end === undefined) {
      safe.push(ESCAPE);
      index += 1;
      continue;
    }
    index = protocol.end;
    if (marker !== MOUSE) {
      safe.push(...input.slice(index));
      return {
        safe: new Uint8Array(safe),
        held: new Uint8Array(0),
        fenced: true,
      };
    }
    // A complete SGR mouse report is intentionally omitted.
  }
  return {
    safe: new Uint8Array(safe),
    held: new Uint8Array(0),
    fenced: false,
  };
}

function lateMouseFenceFilter(): TerminalReadFilter {
  let held: Uint8Array = new Uint8Array(0);
  return {
    transform(chunk) {
      const parsed = sanitizeUntilFence(
        chunk === null ? held : concatChunks(held, chunk),
        chunk === null,
      );
      held = parsed.held;
      return {
        chunk: parsed.safe.length === 0 && chunk === null ? null : parsed.safe,
        done: parsed.fenced || chunk === null,
      };
    },
  };
}

async function raceFenceDeadline(
  read: Promise<Uint8Array | null>,
  remainingMs: number,
): Promise<Uint8Array | null | typeof INPUT_FENCE_ELAPSED> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<typeof INPUT_FENCE_ELAPSED>((resolve) => {
        timer = setTimeout(() => resolve(INPUT_FENCE_ELAPSED), remainingMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Disable-side fence for a terminal that reported mouse input. The terminal's
 * cursor-position reply is ordered after reports already queued when the reset
 * controls arrived. Those reports are consumed, while surrounding input is
 * parked byte-for-byte for the next package reader.
 */
export async function drainTerminalMouseInput(io: TerminalIO): Promise<void> {
  io.write(QUERY_TERMINAL_CURSOR_POSITION);
  const deadline = Date.now() + INPUT_FENCE_TIMEOUT_MS;
  let received: Uint8Array = new Uint8Array(0);
  while (received.length <= INPUT_FENCE_LIMIT) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const read = adoptTerminalRead(io);
    let chunk: Uint8Array | null | typeof INPUT_FENCE_ELAPSED;
    try {
      chunk = await raceFenceDeadline(read.result, remaining);
    } catch (error) {
      read.release();
      throw error;
    }
    if (chunk === INPUT_FENCE_ELAPSED) {
      read.defer();
      break;
    }
    read.release();
    if (chunk === null) {
      const parsed = sanitizeUntilFence(received, true);
      if (parsed.safe.length > 0) parkTerminalChunk(io, parsed.safe);
      return;
    }
    received = concatChunks(received, chunk);
    const parsed = sanitizeUntilFence(received);
    if (!parsed.fenced) continue;
    if (parsed.safe.length > 0) parkTerminalChunk(io, parsed.safe);
    return;
  }

  filterTerminalReads(io, lateMouseFenceFilter());
  if (received.length > 0) parkTerminalChunk(io, received);
}
