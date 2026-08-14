/**
 * The package-internal authority over each terminal's single in-flight raw
 * read. A raw read left pending by an earlier consumer on the same terminal
 * — for example after Escape cancelled an interaction while the read waited
 * for more input, or after a background query timed out — is parked here and
 * adopted by the next consumer instead of a parallel read racing the
 * abandoned one for the terminal's next bytes.
 *
 * @module
 */

import type { TerminalIO } from "./io.ts";

const inflightTerminalReads = new WeakMap<
  TerminalIO,
  Promise<Uint8Array | null>
>();

/**
 * Adopt the terminal's parked raw read, or begin a new one, leaving it
 * parked until {@linkcode releaseTerminalRead} runs after it settles.
 */
export function adoptTerminalRead(
  io: TerminalIO,
): Promise<Uint8Array | null> {
  const read = inflightTerminalReads.get(io) ?? io.read();
  inflightTerminalReads.set(io, read);
  return read;
}

/** Release the parked read once it has settled or failed. */
export function releaseTerminalRead(io: TerminalIO): void {
  inflightTerminalReads.delete(io);
}

/**
 * Park an already-read chunk for the next consumer — the way bytes that
 * arrived alongside a background query's answer stay available as input.
 */
export function parkTerminalChunk(io: TerminalIO, chunk: Uint8Array): void {
  inflightTerminalReads.set(io, Promise.resolve(chunk));
}
