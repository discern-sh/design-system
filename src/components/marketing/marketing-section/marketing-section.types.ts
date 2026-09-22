/**
 * Framework-neutral vocabulary for the Marketing section component.
 *
 * @module
 */

import type { MarketingFrame } from "../frame.ts";

/** Content-frame widths available to a Marketing section. */
export type MarketingSectionFrame = MarketingFrame;

/** Vertical rhythm presets available to a Marketing section. */
export type MarketingSectionSpacing = "standard" | "spacious" | "compact";

/** Semantic surfaces available to a Marketing section. */
export type MarketingSectionSurface =
  | "canvas"
  | "surface"
  | "sunken"
  | "contrast"
  | "inherit";
