/**
 * Framework-neutral vocabulary shared by Standard meter renderers.
 *
 * @module
 */

/** Limit direction shared by web and CLI Standard meter renderers. */
export type StandardDirection = "floor" | "ceiling";

/** Optional trajectory shared by web and CLI Standard meter renderers. */
export type StandardTrend = "improving" | "drifting" | "flat";
