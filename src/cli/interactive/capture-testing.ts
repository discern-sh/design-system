/** Strict settled-frame capture and diagnostic I/O observation. @module */
import {
  inspectTerminalLayout,
  projectTerminalHtml,
  type TerminalHtmlOptions,
  type TerminalLayoutInspection,
} from "../projection.ts";
import { measureText } from "../text.ts";
import type { TerminalSize } from "./io.ts";
import { ERASE_TERMINAL_DISPLAY, HOME_TERMINAL_CURSOR } from "./painter.ts";

/** Extract one complete, settled full-screen repaint, preserving the package's styled bytes. */
export function settledTerminalFrame(
  transcript: string,
  size: TerminalSize,
): string {
  const prefix = ERASE_TERMINAL_DISPLAY + HOME_TERMINAL_CURSOR;
  const at = transcript.lastIndexOf(prefix);
  if (at < 0) throw new TypeError("capture contains no complete-frame repaint");
  const tail = transcript.slice(at + prefix.length);
  // Restoration ends this frame. Child output and the normal screen do not
  // belong to the application capture. Other cursor controls are rejected.
  const boundaries = ["\x1b[?25h", "\x1b[?1049l"].map((control) =>
    tail.indexOf(control)
  ).filter((index) => index >= 0);
  const end = boundaries.length === 0 ? -1 : Math.min(...boundaries);
  const frame = (end < 0 ? tail : tail.slice(0, end)).replaceAll("\r\r\n", "\n")
    .replaceAll("\r\n", "\n");
  const lines = frame.split("\n");
  if (
    lines.length !== size.rows ||
    lines.some((line) => measureText(line) !== size.columns)
  ) {
    throw new TypeError(
      "capture is incomplete or does not match the requested geometry",
    );
  }
  inspectTerminalLayout(frame, size);
  return frame;
}

/** A validated visible frame and its existing package HTML and geometry projections. */
export interface TerminalFrameCapture {
  readonly frame: string;
  readonly html: string;
  readonly geometry: TerminalLayoutInspection;
}

/** Project a settled complete repaint without introducing a second ANSI parser or terminal emulator. */
export function captureTerminalFrame(
  transcript: string,
  size: TerminalSize,
  options: TerminalHtmlOptions = {},
): TerminalFrameCapture {
  const frame = settledTerminalFrame(transcript, size);
  return {
    frame,
    html: projectTerminalHtml(frame, options),
    geometry: inspectTerminalLayout(frame, size),
  };
}

export * from "./observation.ts";
