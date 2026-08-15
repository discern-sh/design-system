/**
 * Validated terminal motif definitions and the discern preset.
 *
 * A motif is semantic rather than geometric: consumers choose the glyphs
 * used for indeterminate motion, repeated patterns, an accent marker, and
 * complete/incomplete status. Renderers ask for those roles and never name
 * a triangle orientation. Every definition includes an ASCII repertoire and
 * is frozen after validation, so a bound presenter remains a pure value.
 *
 * @module
 */

import { eastAsianWidthKind } from "./east-asian-width.ts";
import { graphemeWidth } from "./text.ts";

const terminalMotifBrand: unique symbol = Symbol("TerminalMotif");

/** A non-empty immutable cycle used by pattern and spinner roles. */
export type TerminalMotifCycle = readonly [string, ...string[]];

/** Complete glyph roles for one Unicode or ASCII terminal repertoire. */
export interface TerminalMotifRepertoire {
  readonly spinner: TerminalMotifCycle;
  readonly pattern: TerminalMotifCycle;
  readonly marker: string;
  readonly status: {
    readonly complete: string;
    readonly incomplete: string;
  };
}

/** Input accepted for one complete terminal repertoire. */
export interface TerminalMotifRepertoireDefinition {
  readonly spinner: readonly string[];
  readonly pattern: readonly string[];
  readonly marker: string;
  readonly status: {
    readonly complete: string;
    readonly incomplete: string;
  };
}

/** Complete input accepted by {@linkcode defineTerminalMotif}. */
export interface TerminalMotifDefinition {
  readonly unicode: TerminalMotifRepertoireDefinition;
  readonly ascii: TerminalMotifRepertoireDefinition;
}

/** Partial role replacements accepted by {@linkcode deriveTerminalMotif}. */
export interface TerminalMotifRepertoireOverrides {
  readonly spinner?: readonly string[];
  readonly pattern?: readonly string[];
  readonly marker?: string;
  readonly status?: {
    readonly complete?: string;
    readonly incomplete?: string;
  };
}

/** Partial Unicode and ASCII replacements for one existing motif. */
export interface TerminalMotifOverrides {
  readonly unicode?: TerminalMotifRepertoireOverrides;
  readonly ascii?: TerminalMotifRepertoireOverrides;
}

/**
 * A validated immutable terminal motif. Construct one through
 * {@linkcode defineTerminalMotif} or {@linkcode deriveTerminalMotif}; the
 * hidden brand prevents an unchecked object literal reaching a renderer.
 */
export interface TerminalMotif {
  readonly unicode: TerminalMotifRepertoire;
  readonly ascii: TerminalMotifRepertoire;
  readonly [terminalMotifBrand]: true;
}

/** Shared optional motif binding used by renderers and interaction options. */
export interface TerminalMotifOptions {
  readonly motif?: TerminalMotif;
}

/**
 * Forward an optional motif without materialising an absent property. This
 * keeps exact-optional option bags concise across nested renderers.
 */
export function motifPassthrough(
  options: TerminalMotifOptions,
): TerminalMotifOptions {
  return options.motif === undefined ? {} : { motif: options.motif };
}

type TerminalMotifRepertoireName = "unicode" | "ascii";

function assertGlyph(
  glyph: string,
  path: string,
  repertoire: TerminalMotifRepertoireName,
): void {
  if (typeof glyph !== "string") {
    throw new TypeError(`${path} must be a string`);
  }
  if (repertoire === "ascii") {
    const codePoint = glyph.codePointAt(0);
    if (
      glyph.length !== 1 || codePoint === undefined ||
      codePoint < 0x21 || codePoint > 0x7E
    ) {
      throw new TypeError(
        `${path} must be exactly one printable non-space ASCII character`,
      );
    }
    return;
  }

  const scalars = [...glyph];
  if (scalars.length !== 1) {
    throw new TypeError(`${path} must be exactly one Unicode scalar`);
  }
  if (/[\p{C}\p{M}\p{Z}]/u.test(glyph)) {
    throw new TypeError(
      `${path} must be one assigned, visible, non-combining Unicode scalar`,
    );
  }
  const codePoint = glyph.codePointAt(0);
  if (codePoint === undefined) {
    throw new TypeError(`${path} must contain one Unicode scalar`);
  }
  const eastAsianWidth = eastAsianWidthKind(codePoint);
  if (eastAsianWidth === "ambiguous") {
    throw new TypeError(
      `${path} uses an East Asian Width Ambiguous scalar and may occupy two terminal cells`,
    );
  }
  if (eastAsianWidth === "wide" || graphemeWidth(glyph) !== 1) {
    throw new TypeError(`${path} must occupy exactly one terminal cell`);
  }
}

function validateCycle(
  values: readonly string[],
  path: string,
  repertoire: TerminalMotifRepertoireName,
): TerminalMotifCycle {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${path} must contain at least one glyph`);
  }
  for (const [index, glyph] of values.entries()) {
    assertGlyph(glyph, `${path}[${index}]`, repertoire);
  }
  return Object.freeze([...values]) as unknown as TerminalMotifCycle;
}

function validateRepertoire(
  definition: TerminalMotifRepertoireDefinition,
  name: TerminalMotifRepertoireName,
): TerminalMotifRepertoire {
  const prefix = `terminal motif ${name}`;
  assertGlyph(definition.marker, `${prefix}.marker`, name);
  assertGlyph(
    definition.status.complete,
    `${prefix}.status.complete`,
    name,
  );
  assertGlyph(
    definition.status.incomplete,
    `${prefix}.status.incomplete`,
    name,
  );
  return Object.freeze({
    spinner: validateCycle(definition.spinner, `${prefix}.spinner`, name),
    pattern: validateCycle(definition.pattern, `${prefix}.pattern`, name),
    marker: definition.marker,
    status: Object.freeze({
      complete: definition.status.complete,
      incomplete: definition.status.incomplete,
    }),
  });
}

/**
 * Validate and freeze a complete motif definition. Unicode glyphs must each
 * be one assigned, visible scalar whose East Asian Width is neither
 * Ambiguous nor Wide/Fullwidth and whose measured width is one cell. ASCII
 * fallbacks must each be one printable non-space ASCII character.
 */
export function defineTerminalMotif(
  definition: TerminalMotifDefinition,
): TerminalMotif {
  return Object.freeze({
    unicode: validateRepertoire(definition.unicode, "unicode"),
    ascii: validateRepertoire(definition.ascii, "ascii"),
    [terminalMotifBrand]: true as const,
  });
}

function mergeRepertoire(
  base: TerminalMotifRepertoire,
  overrides: TerminalMotifRepertoireOverrides | undefined,
): TerminalMotifRepertoireDefinition {
  return {
    spinner: overrides?.spinner ?? base.spinner,
    pattern: overrides?.pattern ?? base.pattern,
    marker: overrides?.marker ?? base.marker,
    status: {
      complete: overrides?.status?.complete ?? base.status.complete,
      incomplete: overrides?.status?.incomplete ?? base.status.incomplete,
    },
  };
}

/**
 * Create a validated motif by replacing only selected roles on an existing
 * one. This is the concise path for a product that wants its own spinner or
 * accent mark while retaining the preset's remaining terminal language.
 */
export function deriveTerminalMotif(
  base: TerminalMotif,
  overrides: TerminalMotifOverrides,
): TerminalMotif {
  assertDefinedTerminalMotif(base);
  return defineTerminalMotif({
    unicode: mergeRepertoire(base.unicode, overrides.unicode),
    ascii: mergeRepertoire(base.ascii, overrides.ascii),
  });
}

function assertDefinedTerminalMotif(
  motif: TerminalMotif,
): asserts motif is TerminalMotif {
  if (
    typeof motif !== "object" || motif === null ||
    motif[terminalMotifBrand] !== true
  ) {
    throw new TypeError(
      "terminal motif must be created by defineTerminalMotif() or deriveTerminalMotif()",
    );
  }
}

/**
 * The package's discern-flavoured default. Small solid triangles animate in
 * a centered clockwise cycle; the established half-filled weave, marker,
 * and up/down status grammar remain available to every other motif role.
 */
export const DISCERN_TERMINAL_MOTIF: TerminalMotif = defineTerminalMotif({
  unicode: {
    spinner: ["▴", "▸", "▾", "◂"],
    pattern: ["◮", "⧩", "◭", "⧨"],
    marker: "◮",
    status: {
      complete: "◭",
      incomplete: "⧩",
    },
  },
  ascii: {
    spinner: ["^", ">", "v", "<"],
    pattern: [">", "v", "^", "<"],
    marker: ">",
    status: {
      complete: "^",
      incomplete: "v",
    },
  },
});

/**
 * Resolve the effective Unicode or ASCII repertoire. Omission selects the
 * discern preset; supplied values must carry the factory's validation brand.
 */
export function terminalMotifRepertoire(
  motif: TerminalMotif | undefined,
  unicode: boolean,
): TerminalMotifRepertoire {
  const resolved = motif ?? DISCERN_TERMINAL_MOTIF;
  assertDefinedTerminalMotif(resolved);
  return unicode ? resolved.unicode : resolved.ascii;
}
