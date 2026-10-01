/** Strict settled-frame capture and diagnostic I/O observation. @module */
import { stripAnsi } from "../ansi.ts";
import {
  inspectTerminalLayout,
  projectTerminalHtml,
  type TerminalHtmlOptions,
  type TerminalLayoutInspection,
} from "../projection.ts";
import type { TerminalSize } from "./io.ts";
import type { PtyObservedOutput, PtyOutputCondition } from "./pty-testing.ts";
import {
  type ReplayedTerminalFrame,
  replayTerminalFrame,
} from "./replay-testing.ts";
import type { TerminalApplicationStateReport } from "./state-report.ts";

/** Which paints a capture may settle on. */
export interface TerminalFrameSettleOptions {
  /**
   * A transcript offset the settling paint must complete after. Captures
   * taken while waiting for a reaction pass the offset at which the reaction
   * was requested, so a frame painted before it never satisfies them.
   */
  readonly paintedAfter?: number;
}

function settledReplay(
  transcript: string,
  size: TerminalSize,
  options: TerminalFrameSettleOptions,
): ReplayedTerminalFrame & { readonly geometry: TerminalLayoutInspection } {
  const replayed = replayTerminalFrame(transcript, size);
  if (
    options.paintedAfter !== undefined && replayed.end <= options.paintedAfter
  ) {
    throw new TypeError(
      `capture settled at offset ${replayed.end}, not after ${options.paintedAfter}`,
    );
  }
  return { ...replayed, geometry: inspectTerminalLayout(replayed.frame, size) };
}

/**
 * Replay the package's paints and return the one settled frame they leave,
 * preserving its styled bytes. Keyframes, synchronized row writes, window
 * titles and state reports replay through the package screen model; any other control, a
 * partial row, or a frame that does not fill the viewport exactly throws.
 */
export function settledTerminalFrame(
  transcript: string,
  size: TerminalSize,
  options: TerminalFrameSettleOptions = {},
): string {
  return settledReplay(transcript, size, options).frame;
}

/** A validated settled frame, its plain text, its projections, and its state report. */
export interface TerminalFrameCapture {
  /** Styled rows joined by LF, exactly as painted. */
  readonly frame: string;
  /** The frame without styling. */
  readonly text: string;
  readonly html: string;
  readonly geometry: TerminalLayoutInspection;
  /** The application's state report, when reports were enabled. */
  readonly state?: TerminalApplicationStateReport;
  /** The window title the application set, when it set one. */
  readonly title?: string;
}

/** Settling and HTML projection options for {@linkcode captureTerminalFrame}. */
export interface TerminalFrameCaptureOptions
  extends TerminalHtmlOptions, TerminalFrameSettleOptions {}

/** Project a settled frame without introducing a second ANSI parser or terminal emulator. */
export function captureTerminalFrame(
  transcript: string,
  size: TerminalSize,
  options: TerminalFrameCaptureOptions = {},
): TerminalFrameCapture {
  const { paintedAfter, ...html } = options;
  const replayed = settledReplay(
    transcript,
    size,
    paintedAfter === undefined ? {} : { paintedAfter },
  );
  return {
    frame: replayed.frame,
    text: stripAnsi(replayed.frame),
    html: projectTerminalHtml(replayed.frame, html),
    geometry: replayed.geometry,
    ...(replayed.state === undefined ? {} : { state: replayed.state }),
    ...(replayed.title === undefined ? {} : { title: replayed.title }),
  };
}

/**
 * A PTY readiness condition met when a frame settled during the current
 * phase passes `test`. The whole standard output replays, so a phase whose
 * paints only rewrite changed rows still yields the complete frame, and the
 * settling paint must follow the phase's start. Transcripts that do not yet
 * hold a settled frame are not ready; a throwing `test` propagates.
 */
export function ptySettledFrame(
  size: TerminalSize,
  description: string,
  test: (capture: TerminalFrameCapture) => boolean,
): PtyOutputCondition {
  return {
    description,
    test: (output: PtyObservedOutput): boolean => {
      let capture: TerminalFrameCapture;
      try {
        capture = captureTerminalFrame(output.stdout, size, {
          paintedAfter: output.stdout.length - output.phaseStdout.length,
        });
      } catch (error) {
        if (error instanceof TypeError) return false;
        throw error;
      }
      return test(capture);
    },
  };
}

export * from "./observation.ts";
