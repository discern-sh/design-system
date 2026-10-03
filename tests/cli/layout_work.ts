/**
 * Counts the layout work a call causes. Segmentation is counted by wrapping
 * the platform segmenter for the call's duration — segmenter calls, code
 * units handed to it, and graphemes read back — so the count covers every
 * path to segmentation, whichever module asks. Beside it come the steps the
 * text helpers tally themselves where segmentation does not show them:
 * pieces tried on a line, and styled runs read.
 *
 * @module
 */

import {
  countLayoutSteps,
  type LayoutSteps,
} from "../../src/cli/layout-steps.ts";

/** Segmentation work one call caused. */
interface SegmentationWork {
  calls: number;
  units: number;
  graphemes: number;
}

/** Layout work one call caused, by measure. */
export type LayoutWork = SegmentationWork & LayoutSteps;

/** Run `run` and return the layout work it caused. */
export function layoutWork(run: () => unknown): LayoutWork {
  const work: SegmentationWork = { calls: 0, units: 0, graphemes: 0 };
  const prototype = Intl.Segmenter.prototype;
  const segment = prototype.segment;
  prototype.segment = function (this: Intl.Segmenter, input?: string) {
    const value = String(input);
    work.calls += 1;
    work.units += value.length;
    const segments = segment.call(this, value);
    return {
      containing: (index?: number) => segments.containing(index),
      *[Symbol.iterator]() {
        for (const part of segments) {
          work.graphemes += 1;
          yield part;
        }
      },
    } as Intl.Segments;
  };
  try {
    const steps = countLayoutSteps(run);
    return { ...work, ...steps };
  } finally {
    prototype.segment = segment;
  }
}
