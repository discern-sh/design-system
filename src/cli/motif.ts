/**
 * Validated terminal motif definitions and the discern preset.
 *
 * A motif is semantic rather than geometric: consumers choose the glyphs
 * used for indeterminate motion, repeated patterns, an accent marker, and
 * complete/incomplete status. Renderers ask for those roles and never name
 * a triangle orientation. A motif speaks in two registers: the everyday
 * roles carry ambient accents, while the optional `brand` register reserves
 * ceremonial glyphs for the moments a surface formally wears its identity.
 * Every definition includes an ASCII repertoire and is frozen after
 * validation, so a bound presenter remains a pure value.
 *
 * @module
 */

import { graphemeWidth } from "./text.ts";
import { TRIANGLES } from "./triangles.ts";

const terminalMotifBrand: unique symbol = Symbol("TerminalMotif");

/** A non-empty immutable cycle used by pattern and spinner roles. */
export type TerminalMotifCycle = readonly [string, ...string[]];

/**
 * The ceremonial glyph roles a motif reserves for brand moments. Renderers
 * select them through the `register` option; when a motif defines no brand
 * register, the everyday `marker` and `pattern` roles stand in.
 */
export interface TerminalMotifBrandRegister {
  readonly marker: string;
  readonly pattern: TerminalMotifCycle;
}

/** Complete glyph roles for one Unicode or ASCII terminal repertoire. */
export interface TerminalMotifRepertoire {
  readonly spinner: TerminalMotifCycle;
  readonly pattern: TerminalMotifCycle;
  readonly marker: string;
  /** Subordinate accent marker; falls back to `marker` when absent. */
  readonly markerQuiet?: string;
  readonly status: {
    readonly complete: string;
    readonly incomplete: string;
  };
  /** Ceremonial register; the everyday roles stand in when absent. */
  readonly brand?: TerminalMotifBrandRegister;
}

/** Input accepted for one complete terminal repertoire. */
export interface TerminalMotifRepertoireDefinition {
  readonly spinner: readonly string[];
  readonly pattern: readonly string[];
  readonly marker: string;
  /** Optional subordinate accent marker; omit to reuse `marker`. */
  readonly markerQuiet?: string;
  readonly status: {
    readonly complete: string;
    readonly incomplete: string;
  };
  /** Optional ceremonial register; omit to reuse the everyday roles. */
  readonly brand?: {
    readonly marker: string;
    readonly pattern: readonly string[];
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
  /** Replaces the subordinate accent marker as one atomic value. */
  readonly markerQuiet?: string;
  readonly status?: {
    readonly complete?: string;
    readonly incomplete?: string;
  };
  /** Replaces the ceremonial register as one atomic value. */
  readonly brand?: {
    readonly marker: string;
    readonly pattern: readonly string[];
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

/**
 * The voice a renderer speaks its motif roles in. The everyday `plain`
 * register is the default; `brand` selects the motif's ceremonial glyphs
 * for the moments a surface formally wears its identity.
 */
export type TerminalMotifRegister = "plain" | "brand";

/** Shared optional motif binding used by renderers and interaction options. */
export interface TerminalMotifOptions {
  readonly motif?: TerminalMotif;
  /** Motif voice for this rendering; defaults to `plain`. */
  readonly register?: TerminalMotifRegister;
}

/**
 * Forward an optional motif binding without materialising absent
 * properties. This keeps exact-optional option bags concise across nested
 * renderers.
 */
export function motifPassthrough(
  options: TerminalMotifOptions,
): TerminalMotifOptions {
  return {
    ...(options.motif === undefined ? {} : { motif: options.motif }),
    ...(options.register === undefined ? {} : { register: options.register }),
  };
}

/**
 * Resolve the marker and pattern roles a repertoire speaks in the given
 * register. The `brand` register falls back to the everyday roles when the
 * motif defines no ceremonial glyphs.
 */
export function terminalMotifRegisterRoles(
  repertoire: TerminalMotifRepertoire,
  register: TerminalMotifRegister = "plain",
): TerminalMotifBrandRegister {
  if (register === "brand" && repertoire.brand !== undefined) {
    return repertoire.brand;
  }
  return { marker: repertoire.marker, pattern: repertoire.pattern };
}

/**
 * Resolve the subordinate accent marker, falling back to the everyday
 * marker when the repertoire defines no quiet variant.
 */
export function terminalMotifQuietMarker(
  repertoire: TerminalMotifRepertoire,
): string {
  return repertoire.markerQuiet ?? repertoire.marker;
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
  if (graphemeWidth(glyph) !== 1) {
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
  if (definition.markerQuiet !== undefined) {
    assertGlyph(definition.markerQuiet, `${prefix}.markerQuiet`, name);
  }
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
  if (definition.brand !== undefined) {
    assertGlyph(definition.brand.marker, `${prefix}.brand.marker`, name);
  }
  return Object.freeze({
    spinner: validateCycle(definition.spinner, `${prefix}.spinner`, name),
    pattern: validateCycle(definition.pattern, `${prefix}.pattern`, name),
    marker: definition.marker,
    ...(definition.markerQuiet === undefined
      ? {}
      : { markerQuiet: definition.markerQuiet }),
    status: Object.freeze({
      complete: definition.status.complete,
      incomplete: definition.status.incomplete,
    }),
    ...(definition.brand === undefined ? {} : {
      brand: Object.freeze({
        marker: definition.brand.marker,
        pattern: validateCycle(
          definition.brand.pattern,
          `${prefix}.brand.pattern`,
          name,
        ),
      }),
    }),
  });
}

/**
 * Validate and freeze a complete motif definition. Unicode glyphs must each
 * be one assigned, visible scalar whose width is one cell under the package's
 * pinned narrow-A measurement policy. ASCII fallbacks must each be one
 * printable non-space ASCII character.
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
  const markerQuiet = overrides?.markerQuiet ?? base.markerQuiet;
  const brand = overrides?.brand ?? base.brand;
  return {
    spinner: overrides?.spinner ?? base.spinner,
    pattern: overrides?.pattern ?? base.pattern,
    marker: overrides?.marker ?? base.marker,
    ...(markerQuiet === undefined ? {} : { markerQuiet }),
    status: {
      complete: overrides?.status?.complete ?? base.status.complete,
      incomplete: overrides?.status?.incomplete ?? base.status.incomplete,
    },
    ...(brand === undefined ? {} : { brand }),
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
 * The package's discern-flavoured default. Half-filled circles animate in a
 * clockwise cycle; plain triangles speak the everyday register — a filled
 * lead marker, an outline quiet marker, and an alternating-fill clockwise
 * pattern — while the ceremonial brand register reserves the half-filled
 * discern mark and its rotation for the moments a surface wears the brand.
 */
export const DISCERN_TERMINAL_MOTIF: TerminalMotif = defineTerminalMotif({
  unicode: {
    spinner: ["◐", "◓", "◑", "◒"],
    pattern: [
      TRIANGLES.filled.up.unicode,
      TRIANGLES.unfilled.right.unicode,
      TRIANGLES.filled.down.unicode,
      TRIANGLES.unfilled.left.unicode,
    ],
    marker: TRIANGLES.filled.up.unicode,
    markerQuiet: TRIANGLES.unfilled.up.unicode,
    status: {
      complete: TRIANGLES.filled.up.unicode,
      incomplete: TRIANGLES.unfilled.up.unicode,
    },
    brand: {
      marker: "◮",
      pattern: ["◮", "⧩", "◭", "⧨"],
    },
  },
  ascii: {
    spinner: ["^", "<", "v", ">"],
    pattern: [
      TRIANGLES.filled.up.ascii,
      TRIANGLES.unfilled.right.ascii,
      TRIANGLES.filled.down.ascii,
      TRIANGLES.unfilled.left.ascii,
    ],
    marker: TRIANGLES.filled.up.ascii,
    status: {
      complete: "^",
      incomplete: "v",
    },
    brand: {
      marker: ">",
      pattern: [">", "v", "^", "<"],
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
