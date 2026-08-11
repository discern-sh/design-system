/**
 * Incremental inline terminal-frame replacement.
 *
 * @module
 */

import type { TerminalIO } from "./io.ts";

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_SCREEN_END = "\x1b[J";

/** Replace one inline terminal frame without scrolling earlier output. */
export class InlineFramePainter {
  #previous = "";

  constructor(readonly io: TerminalIO) {}

  /** Most recently painted frame, excluding replacement control sequences. */
  get currentFrame(): string {
    return this.#previous;
  }

  /** Paint a new frame, erasing the previous frame in place when necessary. */
  replace(frame: string): void {
    if (frame === this.#previous) return;
    if (this.#previous === "") {
      this.io.write(frame);
      this.#previous = frame;
      return;
    }
    this.io.write(`${this.#replacementPrefix()}${frame}`);
    this.#previous = frame;
  }

  /** Erase the current frame and forget it. */
  clear(): void {
    if (this.#previous === "") return;
    this.io.write(this.#replacementPrefix());
    this.#previous = "";
  }

  /** Leave the current frame visible, move below it, and begin a fresh region. */
  finish(): void {
    if (this.#previous === "") return;
    this.io.write("\n");
    this.#previous = "";
  }

  #replacementPrefix(): string {
    const previousLines = this.#previous.split("\n").length;
    const rows = Math.max(1, this.io.size().rows);
    const linesUp = Math.max(0, Math.min(rows, previousLines) - 1);
    return `${FIRST_COLUMN}${
      linesUp > 0 ? `\x1b[${linesUp}A` : ""
    }${ERASE_TO_SCREEN_END}`;
  }
}
