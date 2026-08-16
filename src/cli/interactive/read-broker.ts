/**
 * The package-internal authority over each terminal's buffered input and
 * single in-flight raw read. A consumer may relinquish a still-pending read
 * without cancelling it; the next consumer then adopts the same operation.
 * Buffered bytes remain a separate FIFO in front of that operation, so
 * preserving already-read input can never orphan the read behind it.
 *
 * @module
 */

import type { TerminalIO } from "./io.ts";

/** Result of applying one package-internal filter to a terminal chunk. */
export interface TerminalReadFilterResult {
  /** Bytes safe to expose to the next filter or terminal consumer. */
  readonly chunk: Uint8Array | null;
  /** Whether this filter has finished and should leave the read pipeline. */
  readonly done: boolean;
}

/**
 * Stateful package-protocol filter over terminal input. Filters see buffered
 * and newly read chunks in byte order, including `null` at end-of-input.
 */
export interface TerminalReadFilter {
  transform(chunk: Uint8Array | null): TerminalReadFilterResult;
}

/** One consumer's ownership of the brokered terminal read. */
export interface TerminalReadLease {
  readonly result: Promise<Uint8Array | null>;
  /** Release a settled read so the next consumer may advance the stream. */
  release(): void;
  /** Relinquish an unsettled read while preserving its underlying operation. */
  defer(): void;
}

interface TerminalReadState {
  readonly buffered: Uint8Array[];
  readonly filters: TerminalReadFilter[];
  raw: Promise<Uint8Array | null> | undefined;
  active: TerminalReadLease | undefined;
  ended: boolean;
}

const terminalReads = new WeakMap<TerminalIO, TerminalReadState>();

function stateFor(io: TerminalIO): TerminalReadState {
  const existing = terminalReads.get(io);
  if (existing !== undefined) return existing;
  const created: TerminalReadState = {
    buffered: [],
    filters: [],
    raw: undefined,
    active: undefined,
    ended: false,
  };
  terminalReads.set(io, created);
  return created;
}

function applyFilters(
  state: TerminalReadState,
  source: Uint8Array | null,
): Uint8Array | null {
  let chunk = source;
  let index = 0;
  while (index < state.filters.length) {
    const filter = state.filters[index];
    if (filter === undefined) break;
    const result = filter.transform(chunk);
    chunk = result.chunk;
    if (result.done) state.filters.splice(index, 1);
    else index += 1;
  }
  return chunk;
}

async function nextTerminalChunk(
  io: TerminalIO,
  state: TerminalReadState,
  isDeferred: () => boolean,
): Promise<Uint8Array | null> {
  if (state.buffered.length > 0) {
    const buffered = state.buffered.shift();
    return applyFilters(state, buffered ?? new Uint8Array(0));
  }
  if (state.ended) return applyFilters(state, null);

  const raw = state.raw ?? io.read();
  state.raw = raw;
  let chunk: Uint8Array | null;
  try {
    chunk = await raw;
  } catch (error) {
    if (!isDeferred() && state.raw === raw) state.raw = undefined;
    throw error;
  }
  if (isDeferred()) return chunk;
  if (state.raw === raw) state.raw = undefined;
  if (chunk === null) state.ended = true;
  return applyFilters(state, chunk);
}

/**
 * Adopt buffered input or the terminal's one raw read. Repeated adoption
 * before release receives the same lease rather than starting a parallel
 * operation.
 */
export function adoptTerminalRead(io: TerminalIO): TerminalReadLease {
  const state = stateFor(io);
  if (state.active !== undefined) return state.active;

  let deferred = false;
  const lease: TerminalReadLease = {
    result: nextTerminalChunk(io, state, () => deferred),
    release() {
      if (state.active === lease) state.active = undefined;
    },
    defer() {
      deferred = true;
      if (state.active === lease) state.active = undefined;
    },
  };
  state.active = lease;
  return lease;
}

/** Park already-read bytes ahead of, without replacing, any pending read. */
export function parkTerminalChunk(io: TerminalIO, chunk: Uint8Array): void {
  if (chunk.length === 0) return;
  stateFor(io).buffered.push(chunk.slice());
}

/**
 * Install a stateful filter over subsequent brokered input. This lets an
 * effect retain ownership of its late protocol reply without racing or
 * swallowing ordinary terminal input.
 */
export function filterTerminalReads(
  io: TerminalIO,
  filter: TerminalReadFilter,
): void {
  stateFor(io).filters.push(filter);
}
