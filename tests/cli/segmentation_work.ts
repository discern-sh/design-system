/**
 * Counts the grapheme segmentation a call causes, by wrapping the platform
 * segmenter for its duration: segmenter calls, code units handed to it, and
 * graphemes read back. Wrapping the platform rather than a package helper
 * means the count covers every path to segmentation, whichever module asks.
 *
 * @module
 */

/** Segmentation work one call caused. */
export interface SegmentationWork {
  calls: number;
  units: number;
  graphemes: number;
}

/** Run `run` and return the segmentation work it caused. */
export function segmentationWork(run: () => unknown): SegmentationWork {
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
    run();
  } finally {
    prototype.segment = segment;
  }
  return work;
}
