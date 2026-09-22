/** Framework-neutral Logo cloud contracts shared by browser and terminal renderers.
 *
 * @module
 */

import type { MarketingFrame } from "../frame.ts";

/** Visual arrangements available to a Logo cloud. */
export type LogoCloudVariant = "grid" | "strip";

/**
 * Content frames available to a Logo cloud: a Marketing frame for a block that
 * spans the page, or `fill` for one set inside another block's slot, which
 * takes the slot's width without its own gutter or block padding.
 */
export type LogoCloudFrame = MarketingFrame | "fill";
