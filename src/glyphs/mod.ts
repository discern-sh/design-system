/**
 * Curated Unicode glyphs for interfaces, with explicit terminal degradation.
 *
 * Use getGlyph(name).unicode in browser markup. Supply an accessible label from
 * the surrounding action or content. resolveGlyph chooses Unicode or approved
 * ASCII text without detecting the environment or importing a renderer.
 *
 * @module
 */

import { glyphDefinitions } from "../generated/glyphs.ts";
import type {
  Glyph as GlyphRecord,
  GlyphRepertoire,
  GlyphResolution,
} from "./types.ts";

export type {
  GlyphAsciiFallback,
  GlyphFidelity,
  GlyphRepertoire,
  GlyphResolution,
} from "./types.ts";

/** Names derived from the complete published vocabulary. */
export type GlyphName = (typeof glyphDefinitions)[number]["name"];

/** A published glyph whose name is accepted by the typed resolver. */
export type Glyph = Omit<GlyphRecord, "name"> & { readonly name: GlyphName };

/** Immutable published vocabulary in curated discovery order. */
export const glyphs: readonly Glyph[] = Object.freeze(
  glyphDefinitions.map((definition): Glyph =>
    Object.freeze({
      ...definition,
      ...("ascii" in definition
        ? { ascii: Object.freeze({ ...definition.ascii }) }
        : {}),
    })
  ),
);

const byName = new Map<string, Glyph>(
  glyphs.map((glyph) => [glyph.name, glyph]),
);

/** Narrow untrusted input to a published glyph name, without normalization. */
export function isGlyphName(name: string): name is GlyphName {
  return byName.has(name);
}

/** Look up a published glyph; an unknown runtime name raises a TypeError. */
export function getGlyph(name: GlyphName): Glyph {
  const glyph = byName.get(name);
  if (glyph === undefined) throw new TypeError(`Unknown glyph: ${name}`);
  return glyph;
}

/** Resolve plain terminal text under Discern's narrow-A geometry policy. */
export function resolveGlyph(
  name: GlyphName,
  repertoire: GlyphRepertoire = "unicode",
): GlyphResolution {
  if (repertoire !== "unicode" && repertoire !== "ascii") {
    throw new TypeError(`Unknown glyph repertoire: ${repertoire}`);
  }
  const glyph = getGlyph(name);
  if (glyph.terminal === "reference-only") {
    return Object.freeze({ available: false, reason: "terminal-unsupported" });
  }
  if (repertoire === "unicode") {
    return Object.freeze({
      available: true,
      text: glyph.unicode,
      columns: glyph.columns,
      repertoire,
      fidelity: "exact",
    });
  }
  return glyph.ascii === undefined
    ? Object.freeze({ available: false, reason: "ascii-unavailable" })
    : Object.freeze({ available: true, ...glyph.ascii, repertoire });
}
