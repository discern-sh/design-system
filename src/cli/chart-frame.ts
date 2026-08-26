/** Shared viability arithmetic for honesty-bearing Chart terminal frames. */

import { measureText } from "./text.ts";

/**
 * Smallest outer box width that embeds a bottom honesty label byte-for-byte.
 * `renderBox` reserves both corners, one leading/trailing space around the
 * label, and one fill cell; narrower frames would truncate the declaration.
 */
export function chartFrameLabelMinimumWidth(label: string): number {
  return measureText(label) + 5;
}
