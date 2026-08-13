/**
 * Incremental inline terminal-frame replacement.
 *
 * @module
 */

import type { TerminalIO } from "./io.ts";

const FIRST_COLUMN = "\x1b[1G";
const ERASE_TO_SCREEN_END = "\x1b[J";

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
