/**
 * Canonical standalone SVG document scaffold shared by the kind families.
 *
 * Owns the byte format of emitted scene numbers, the accessible document
 * envelope (root attributes, title, description, embedded style), and the
 * adaptive prefers-color-scheme mechanism. Per-element scene markup stays
 * with the owning family.
 *
 * @module
 */

import { escapeXml } from "./escape.ts";
import {
  roundToPrecision,
  SCENE_PRECISION,
  type ScenePoint,
  type SceneRect,
} from "./geometry.ts";

/** Canonically format one finite scene number for portable SVG bytes. */
export function formatSvgNumber(value: number, subject: string): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${subject} SVG geometry must be finite; received ${value}`,
    );
  }
  return String(roundToPrecision(value, SCENE_PRECISION));
}

/** Format an ordered point population for SVG `points`. */
export function formatSvgPoints(
  points: readonly ScenePoint[],
  subject: string,
): string {
  return points.map(({ x, y }) =>
    `${formatSvgNumber(x, subject)},${formatSvgNumber(y, subject)}`
  ).join(" ");
}

/** Palette variants a standalone document can embed as literal values. */
export type SvgPaletteVariant = "light" | "dark";

/** Embedded palette selection, including the adaptive media mechanism. */
export type SvgThemeSelection = SvgPaletteVariant | "adaptive";

/**
 * Assemble embedded document style for one palette selection: fixed rules
 * plus one variant's literals, or light literals with a self-contained dark
 * prefers-color-scheme rule. Optional trailing rules sit after every palette
 * branch so media overrides cannot be shadowed by the selected literals.
 */
export function assembleSvgThemeStyle(options: {
  readonly theme: SvgThemeSelection;
  readonly common: readonly string[];
  readonly variant: (variant: SvgPaletteVariant) => readonly string[];
  readonly after?: readonly string[];
}): string {
  if (options.theme !== "adaptive") {
    return [
      ...options.common,
      ...options.variant(options.theme),
      ...(options.after ?? []),
    ].join("\n");
  }
  const dark = options.variant("dark").map((rule) => `  ${rule}`);
  return [
    ...options.common,
    ...options.variant("light"),
    "  @media (prefers-color-scheme: dark) {",
    ...dark,
    "  }",
    ...(options.after ?? []),
  ].join("\n");
}

/** Family-owned parts assembled into one standalone SVG document. */
export interface SvgDocumentOptions {
  readonly className: string;
  readonly bounds: SceneRect;
  readonly ariaLabel: string;
  readonly title: string;
  readonly description: string;
  readonly style: string;
  readonly body: readonly string[];
  readonly subject: string;
}

/**
 * Serialize one complete accessible standalone SVG document with fixed root
 * attributes, embedded title, escaped multi-line description, style, and the
 * family-rendered body, in canonical order.
 */
export function renderSvgDocument(options: SvgDocumentOptions): string {
  const width = formatSvgNumber(options.bounds.width, options.subject);
  const height = formatSvgNumber(options.bounds.height, options.subject);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="${options.className}" viewBox="${
      formatSvgNumber(options.bounds.x, options.subject)
    } ${
      formatSvgNumber(options.bounds.y, options.subject)
    } ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${
      escapeXml(options.ariaLabel)
    }">`,
    `  <title>${escapeXml(options.title)}</title>`,
    `  <desc>${
      escapeXml(options.description).replaceAll("\n", "&#10;")
    }</desc>`,
    "  <style>",
    options.style,
    "  </style>",
    ...options.body,
    "</svg>",
    "",
  ].join("\n");
}
