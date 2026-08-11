/**
 * Framework-neutral vocabulary shared by Article header renderers.
 *
 * @module
 */

/** Heading depth accepted by Article header renderers. */
export type ArticleHeaderHeadingLevel = 1 | 2;

/** Surface treatment shared by web and CLI Article header renderers. */
export type ArticleHeaderSurface = "canvas" | "sunken" | "accent";
