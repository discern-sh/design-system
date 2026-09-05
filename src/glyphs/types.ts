/**
 * Consumer contracts for the curated Glyph vocabulary.
 *
 * @module
 */

/** How closely a fallback preserves a glyph's contextual role. */
export type GlyphFidelity = "semantic" | "approximation" | "lossy";

/** One approved plain-ASCII substitute, measured in terminal cells. */
export interface GlyphAsciiFallback {
  readonly text: string;
  readonly columns: number;
  readonly fidelity: GlyphFidelity;
}

/** A curated interface glyph. Titles describe discovery, never accessible names. */
export interface Glyph {
  readonly name: string;
  readonly title: string;
  readonly unicode: string;
  /** Width under Discern's narrow-A terminal policy, not browser font advance. */
  readonly columns: number;
  readonly category: string;
  readonly recommendation: "recommended" | "reference-only" | "brand-reserved";
  readonly browser: "supported" | "caution" | "reference-only";
  readonly terminal: "supported" | "unicode-only" | "reference-only";
  readonly browserGuidance: string;
  readonly terminalGuidance: string;
  /** Absent when no contextual ASCII degradation is approved. */
  readonly ascii?: GlyphAsciiFallback;
}

/** Caller-selected character repertoire; resolution performs no detection or I/O. */
export type GlyphRepertoire = "unicode" | "ascii";

/** Plain output or an explicit refusal to invent an unsupported substitute. */
export type GlyphResolution =
  | {
    readonly available: true;
    readonly text: string;
    readonly columns: number;
    readonly repertoire: GlyphRepertoire;
    readonly fidelity: "exact" | GlyphFidelity;
  }
  | {
    readonly available: false;
    readonly reason: "ascii-unavailable" | "terminal-unsupported";
  };
