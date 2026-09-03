/**
 * Private, React-free data authority for the Glyph Atlas reference layer and
 * the curated Discern glyph collection.
 *
 * Canonical facts derive from the pinned Unicode 17.0.0 sources declared in
 * this module. Selection reasons, hazards, aliases, recommendations, and
 * degradation guidance are authored Discern judgement, kept visibly separate
 * from Unicode identity. The data is intentionally absent from every package
 * export while its shape is under review.
 *
 * Unicode terms: https://www.unicode.org/terms_of_use.html
 *
 * @module
 */

import { graphemeWidth } from "../cli/text.ts";

/** Unicode Character Database version used by every Atlas record. */
export const GLYPH_ATLAS_UNICODE_VERSION = "17.0.0" as const;

/** Terms governing the Unicode sources named by this module. */
export const GLYPH_ATLAS_UNICODE_TERMS_URL =
  "https://www.unicode.org/terms_of_use.html" as const;

/** Primary Unicode sources from which the starter facts were researched. */
export const GLYPH_ATLAS_UNICODE_SOURCES = Object.freeze({
  "unicode-data": Object.freeze({
    title: "UnicodeData.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt",
  }),
  "name-aliases": Object.freeze({
    title: "NameAliases.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/ucd/NameAliases.txt",
  }),
  blocks: Object.freeze({
    title: "Blocks.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/ucd/Blocks.txt",
  }),
  "derived-age": Object.freeze({
    title: "DerivedAge.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/ucd/DerivedAge.txt",
  }),
  "east-asian-width": Object.freeze({
    title: "EastAsianWidth.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/ucd/EastAsianWidth.txt",
  }),
  "emoji-data": Object.freeze({
    title: "emoji-data.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/ucd/emoji/emoji-data.txt",
  }),
  "emoji-variation-sequences": Object.freeze({
    title: "emoji-variation-sequences.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url:
      "https://www.unicode.org/Public/17.0.0/ucd/emoji/emoji-variation-sequences.txt",
  }),
  "emoji-sequences": Object.freeze({
    title: "emoji-sequences.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/emoji/emoji-sequences.txt",
  }),
  "emoji-zwj-sequences": Object.freeze({
    title: "emoji-zwj-sequences.txt",
    version: GLYPH_ATLAS_UNICODE_VERSION,
    url: "https://www.unicode.org/Public/17.0.0/emoji/emoji-zwj-sequences.txt",
  }),
  "uax-11": Object.freeze({
    title: "Unicode Standard Annex #11: East Asian Width",
    version: "Unicode 17.0.0 / Revision 44",
    url: "https://www.unicode.org/reports/tr11/tr11-44.html",
  }),
  "uts-51": Object.freeze({
    title: "Unicode Technical Standard #51: Unicode Emoji",
    version: "Unicode Emoji 17.0 / Revision 29",
    url: "https://www.unicode.org/reports/tr51/tr51-29.html",
  }),
});

/** Identifier of one source in {@linkcode GLYPH_ATLAS_UNICODE_SOURCES}. */
export type GlyphAtlasUnicodeSourceId =
  keyof typeof GLYPH_ATLAS_UNICODE_SOURCES;

/** Stable Unicode General_Category vocabulary. */
export const UNICODE_GENERAL_CATEGORIES = Object.freeze(
  [
    "Lu",
    "Ll",
    "Lt",
    "Lm",
    "Lo",
    "Mn",
    "Mc",
    "Me",
    "Nd",
    "Nl",
    "No",
    "Pc",
    "Pd",
    "Ps",
    "Pe",
    "Pi",
    "Pf",
    "Po",
    "Sm",
    "Sc",
    "Sk",
    "So",
    "Zs",
    "Zl",
    "Zp",
    "Cc",
    "Cf",
    "Cs",
    "Co",
    "Cn",
  ] as const,
);

/** One value of the Unicode General_Category property. */
export type UnicodeGeneralCategory =
  (typeof UNICODE_GENERAL_CATEGORIES)[number];

/** Stable Unicode East_Asian_Width source-property vocabulary. */
export const UNICODE_EAST_ASIAN_WIDTH_PROPERTIES = Object.freeze(
  [
    "N",
    "Na",
    "A",
    "H",
    "W",
    "F",
  ] as const,
);

/** One raw East_Asian_Width property from the pinned Unicode source. */
export type UnicodeEastAsianWidthProperty =
  (typeof UNICODE_EAST_ASIAN_WIDTH_PROPERTIES)[number];

/** Emoji binary properties represented by the starter scalar facts. */
export const UNICODE_EMOJI_PROPERTIES = Object.freeze(
  [
    "Emoji",
    "Emoji_Presentation",
    "Emoji_Modifier",
    "Emoji_Modifier_Base",
    "Emoji_Component",
    "Extended_Pictographic",
  ] as const,
);

/** One binary property from the pinned emoji data. */
export type UnicodeEmojiProperty = (typeof UNICODE_EMOJI_PROPERTIES)[number];

/** Formal alias types from the pinned Unicode NameAliases source. */
export const UNICODE_NAME_ALIAS_TYPES = Object.freeze(
  [
    "correction",
    "control",
    "alternate",
    "figment",
    "abbreviation",
  ] as const,
);

/** One formal name alias type. */
export type UnicodeNameAliasType = (typeof UNICODE_NAME_ALIAS_TYPES)[number];

/** One formal Unicode character-name alias. */
export interface UnicodeNameAlias {
  readonly name: string;
  readonly type: UnicodeNameAliasType;
}

/** Standard text and emoji variation requests. */
export const UNICODE_VARIATION_STYLES = Object.freeze(
  [
    "text",
    "emoji",
  ] as const,
);

/** One standardized presentation variation. */
export type UnicodeVariationStyle = (typeof UNICODE_VARIATION_STYLES)[number];

/** Standardized emoji sequence types represented by this model. */
export const UNICODE_EMOJI_SEQUENCE_TYPES = Object.freeze(
  [
    "Basic_Emoji",
    "Emoji_Keycap_Sequence",
    "RGI_Emoji_Flag_Sequence",
    "RGI_Emoji_Tag_Sequence",
    "RGI_Emoji_Modifier_Sequence",
    "RGI_Emoji_ZWJ_Sequence",
  ] as const,
);

/** One sequence type from the pinned emoji sequence files. */
export type UnicodeEmojiSequenceType =
  (typeof UNICODE_EMOJI_SEQUENCE_TYPES)[number];

/** Official Unicode facts for one scalar within a canonical record. */
export interface UnicodeScalarFacts {
  readonly codePoint: number;
  readonly name: string;
  readonly nameAliases: readonly UnicodeNameAlias[];
  readonly generalCategory: UnicodeGeneralCategory;
  readonly block: string;
  readonly age: string;
  readonly eastAsianWidth: UnicodeEastAsianWidthProperty;
  readonly emojiProperties: readonly UnicodeEmojiProperty[];
  readonly standardizedVariations: readonly UnicodeVariationStyle[];
}

/** Freeze one authored scalar-fact record. */
export function defineUnicodeScalarFacts(
  facts: UnicodeScalarFacts,
): UnicodeScalarFacts {
  return Object.freeze({
    ...facts,
    nameAliases: Object.freeze(
      facts.nameAliases.map((alias) => Object.freeze({ ...alias })),
    ),
    emojiProperties: Object.freeze([...facts.emojiProperties]),
    standardizedVariations: Object.freeze([
      ...facts.standardizedVariations,
    ]),
  });
}

function scalar(
  codePoint: number,
  name: string,
  generalCategory: UnicodeGeneralCategory,
  block: string,
  age: string,
  eastAsianWidth: UnicodeEastAsianWidthProperty,
  emojiProperties: readonly UnicodeEmojiProperty[] = [],
  standardizedVariations: readonly UnicodeVariationStyle[] = [],
  nameAliases: readonly UnicodeNameAlias[] = [],
): UnicodeScalarFacts {
  return defineUnicodeScalarFacts({
    codePoint,
    name,
    nameAliases,
    generalCategory,
    block,
    age,
    eastAsianWidth,
    emojiProperties,
    standardizedVariations,
  });
}

/** Canonical record kinds supported by the Glyph Atlas MVP. */
export const CANONICAL_GLYPH_KINDS = Object.freeze(
  [
    "scalar",
    "variation-sequence",
    "emoji-sequence",
    "emoji-zwj-sequence",
  ] as const,
);

/** Exact scalar-or-sequence shape of one canonical Glyph Atlas member. */
export type CanonicalGlyphKind = (typeof CANONICAL_GLYPH_KINDS)[number];

/** Reviewable hazards carried by Atlas members. */
export const GLYPH_ATLAS_HAZARDS = Object.freeze(
  [
    "ambiguous-width",
    "brand-reserved",
    "emoji-rendering",
    "font-fallback-risk",
    "mixed-block-family",
    "semantic-overload",
    "sequence-complexity",
    "two-cell",
    "variation-sensitive",
  ] as const,
);

/** One Atlas-specific warning, separate from official Unicode identity. */
export type GlyphAtlasHazard = (typeof GLYPH_ATLAS_HAZARDS)[number];

/** Authored reason that one canonical identity belongs in the starter Atlas. */
export interface GlyphAtlasSelection {
  readonly rationale: string;
  readonly hazards: readonly GlyphAtlasHazard[];
}

/** Presentation facts derived from official scalar and sequence properties. */
export interface CanonicalGlyphPresentation {
  readonly emojiCapable: boolean;
  readonly defaultPresentation: "text" | "emoji" | "not-applicable";
  readonly effectivePresentation: "text" | "emoji";
  readonly standardizedVariations: readonly UnicodeVariationStyle[];
  readonly selectedVariation?: UnicodeVariationStyle;
  readonly sequenceType?: UnicodeEmojiSequenceType;
  readonly emojiVersion?: string;
}

/** Pinned source references attached to one canonical record. */
export interface CanonicalGlyphProvenance {
  readonly unicodeVersion: typeof GLYPH_ATLAS_UNICODE_VERSION;
  readonly sources: readonly GlyphAtlasUnicodeSourceId[];
}

/** One canonical Unicode scalar or standardized sequence in the Atlas. */
export interface CanonicalGlyphRecord {
  /** Exact ordered code-point identity, e.g. `U+26A0 U+FE0E`. */
  readonly id: string;
  /** Exact display string derived from {@linkcode codePoints}. */
  readonly text: string;
  /** Exact ordered scalar values. */
  readonly codePoints: readonly number[];
  /** Canonical scalar name or authoritative sequence label. */
  readonly officialLabel: string;
  /** Normalized discovery terms derived from official identity facts. */
  readonly searchTerms: readonly string[];
  readonly kind: CanonicalGlyphKind;
  readonly scalars: readonly UnicodeScalarFacts[];
  readonly presentation: CanonicalGlyphPresentation;
  readonly provenance: CanonicalGlyphProvenance;
  /** Grapheme count derived with the runtime's Unicode segmenter. */
  readonly graphemeCount: number;
  /** Discern cell width derived only through `graphemeWidth()`. */
  readonly terminalWidth: number;
  /** Atlas membership judgement, never a Unicode semantic claim. */
  readonly atlas: GlyphAtlasSelection;
}

interface CanonicalGlyphDefinitionBase {
  readonly atlas: GlyphAtlasSelection;
}

/** Authored input whose mechanical identity fields are derived by the factory. */
export type CanonicalGlyphDefinition =
  | (CanonicalGlyphDefinitionBase & {
    readonly kind: "scalar";
    readonly scalar: UnicodeScalarFacts;
  })
  | (CanonicalGlyphDefinitionBase & {
    readonly kind: "variation-sequence";
    readonly scalars: readonly [UnicodeScalarFacts, UnicodeScalarFacts];
    readonly officialLabel: string;
    readonly selectedVariation: UnicodeVariationStyle;
  })
  | (CanonicalGlyphDefinitionBase & {
    readonly kind: "emoji-sequence" | "emoji-zwj-sequence";
    readonly scalars: readonly [
      UnicodeScalarFacts,
      UnicodeScalarFacts,
      ...UnicodeScalarFacts[],
    ];
    readonly officialLabel: string;
    readonly sequenceType: UnicodeEmojiSequenceType;
    readonly emojiVersion: string;
  });

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

/** Format an exact ordered code-point sequence as its Atlas identity. */
export function glyphSequenceId(...codePoints: readonly number[]): string {
  return codePoints.map((codePoint) =>
    `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`
  ).join(" ");
}

/** Normalize an authored or queried discovery term deterministically. */
export function normalizeGlyphSearchTerm(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

type GlyphSearchShape = Pick<
  CanonicalGlyphRecord,
  "id" | "officialLabel" | "scalars"
>;

/**
 * Derive canonical discovery terms from official labels, names, aliases,
 * blocks, and the exact code-point identity. Contextual meaning stays with
 * curated aliases.
 */
export function expectedCanonicalGlyphSearchTerms(
  record: GlyphSearchShape,
): readonly string[] {
  return Object.freeze([
    ...new Set(
      [
        record.id,
        record.officialLabel,
        ...record.scalars.flatMap((member) => [
          member.name,
          ...member.nameAliases.map((alias) => alias.name),
          member.block,
        ]),
      ].map(normalizeGlyphSearchTerm),
    ),
  ]);
}

function presentationFor(
  definition: CanonicalGlyphDefinition,
  scalars: readonly UnicodeScalarFacts[],
): CanonicalGlyphPresentation {
  const base = scalars[0];
  const emojiCapable = definition.kind === "emoji-sequence" ||
    definition.kind === "emoji-zwj-sequence" ||
    base?.emojiProperties.includes("Emoji") === true;
  const baseDefault = base?.emojiProperties.includes("Emoji_Presentation") ===
      true
    ? "emoji"
    : "text";
  if (definition.kind === "scalar") {
    return Object.freeze({
      emojiCapable,
      defaultPresentation: baseDefault,
      effectivePresentation: baseDefault,
      standardizedVariations: Object.freeze([
        ...(base?.standardizedVariations ?? []),
      ]),
    });
  }
  if (definition.kind === "variation-sequence") {
    return Object.freeze({
      emojiCapable,
      defaultPresentation: baseDefault,
      effectivePresentation: definition.selectedVariation,
      standardizedVariations: Object.freeze([
        ...(base?.standardizedVariations ?? []),
      ]),
      selectedVariation: definition.selectedVariation,
    });
  }
  return Object.freeze({
    emojiCapable: true,
    defaultPresentation: "not-applicable",
    effectivePresentation: "emoji",
    standardizedVariations: Object.freeze([]),
    sequenceType: definition.sequenceType,
    emojiVersion: definition.emojiVersion,
  });
}

type GlyphProvenanceShape = Pick<
  CanonicalGlyphRecord,
  "kind" | "scalars" | "presentation"
>;

/** Derive the exact source set required by one canonical record's facts. */
export function expectedGlyphProvenanceSources(
  record: GlyphProvenanceShape,
): readonly GlyphAtlasUnicodeSourceId[] {
  const sources: GlyphAtlasUnicodeSourceId[] = [
    "unicode-data",
    "blocks",
    "derived-age",
    "east-asian-width",
    "emoji-data",
    "uax-11",
    "uts-51",
  ];
  if (record.scalars.some((member) => member.nameAliases.length > 0)) {
    sources.push("name-aliases");
  }
  if (
    record.kind === "variation-sequence" ||
    record.scalars.some((member) => member.standardizedVariations.length > 0)
  ) {
    sources.push("emoji-variation-sequences");
  }
  if (record.kind === "emoji-sequence") sources.push("emoji-sequences");
  if (record.kind === "emoji-zwj-sequence") {
    sources.push("emoji-zwj-sequences");
  }
  return Object.freeze(sources);
}

/** Derive objective display hazards; authored hazards remain additive. */
export function derivedGlyphHazards(
  record: Pick<
    CanonicalGlyphRecord,
    "kind" | "scalars" | "presentation" | "terminalWidth"
  >,
): readonly GlyphAtlasHazard[] {
  const hazards: GlyphAtlasHazard[] = [];
  if (record.scalars.some((member) => member.eastAsianWidth === "A")) {
    hazards.push("ambiguous-width");
  }
  if (record.terminalWidth === 2) hazards.push("two-cell");
  if (
    record.kind === "variation-sequence" ||
    record.presentation.standardizedVariations.length > 0
  ) {
    hazards.push("variation-sensitive");
  }
  if (record.presentation.effectivePresentation === "emoji") {
    hazards.push("emoji-rendering");
  }
  if (
    record.kind === "emoji-sequence" ||
    record.kind === "emoji-zwj-sequence"
  ) {
    hazards.push("sequence-complexity");
  }
  return Object.freeze(hazards);
}

/**
 * Define one canonical record while deriving its string, identity, grapheme
 * count, terminal width, presentation summary, provenance, and objective
 * hazards from the authored scalar and sequence facts.
 */
export function defineCanonicalGlyph(
  definition: CanonicalGlyphDefinition,
): CanonicalGlyphRecord {
  const scalars = Object.freeze([
    ...(definition.kind === "scalar"
      ? [definition.scalar]
      : definition.scalars),
  ]);
  const codePoints = Object.freeze(
    scalars.map((member) => member.codePoint),
  );
  const text = String.fromCodePoint(...codePoints);
  const id = glyphSequenceId(...codePoints);
  const officialLabel = definition.kind === "scalar"
    ? definition.scalar.name
    : definition.officialLabel;
  const presentation = presentationFor(definition, scalars);
  const recordCore = {
    kind: definition.kind,
    scalars,
    presentation,
    terminalWidth: graphemeWidth(text),
  } as const;
  const hazards = Object.freeze([
    ...new Set([
      ...derivedGlyphHazards(recordCore),
      ...definition.atlas.hazards,
    ]),
  ]);
  const searchTerms = expectedCanonicalGlyphSearchTerms({
    id,
    officialLabel,
    scalars,
  });
  return Object.freeze({
    id,
    text,
    codePoints,
    officialLabel,
    searchTerms,
    kind: definition.kind,
    scalars,
    presentation,
    provenance: Object.freeze({
      unicodeVersion: GLYPH_ATLAS_UNICODE_VERSION,
      sources: expectedGlyphProvenanceSources(recordCore),
    }),
    graphemeCount: [...graphemeSegmenter.segment(text)].length,
    terminalWidth: recordCore.terminalWidth,
    atlas: Object.freeze({
      rationale: definition.atlas.rationale,
      hazards,
    }),
  });
}

/** Authored rubric governing starter-Atlas membership. */
export const GLYPH_ATLAS_CURATION_RUBRIC = Object.freeze([
  "Useful as a generic interface, workflow, status, navigation, information, series, or decorative symbol.",
  "Visually intelligible as a standalone character while retaining its exact Unicode identity.",
  "Assigned in Unicode 17.0.0 or listed as a standardized sequence in the pinned Unicode sources.",
  "Excludes private-use characters, controls, and isolated combining marks.",
  "Keeps measurable presentation, width, fallback, and font hazards visible instead of filtering them away.",
  "Makes no promise of identical shape, weight, baseline, or font coverage across platforms.",
]);

/** Global rendering posture applied to every Atlas member. */
export const GLYPH_ATLAS_RENDERING_POSTURE =
  "Unicode standardizes identity and properties, not identical glyph artwork or font availability; inspect the target font and surface before relying on visual detail." as const;

const ICON_INVENTORY_REASON =
  "A compact generic interface mark already useful to the package's terminal icon vocabulary; Atlas membership separates its Unicode identity from any contextual alias.";
const MOTIF_INVENTORY_REASON =
  "A member of the package's established motion or ceremonial motif repertoire, retained as reference data without transferring motif ownership.";
const TRIANGLE_INVENTORY_REASON =
  "A member of the complete plain-triangle geometry used for fixed direction, disclosure, and status shapes; the triangle authority remains independently owned.";
const SERIES_INVENTORY_REASON =
  "A standalone geometric or density cue useful for non-colour series distinction and reference; chart ramps remain independently owned.";
const STATUS_INVENTORY_REASON =
  "A recurring compact status, separation, or information mark whose contextual meaning belongs in curated aliases rather than Unicode identity.";
const DIRECTION_ADJACENCY_REASON =
  "A coherent directional neighbour to the existing right arrow, useful for navigation and workflow references without assigning a universal action meaning.";
const SEQUENCE_REASON =
  "A standardized multi-code-point grapheme that exercises sequence identity, presentation, and measured two-cell behaviour in the starter Atlas.";

function selection(
  rationale: string,
  hazards: readonly GlyphAtlasHazard[] = [],
): GlyphAtlasSelection {
  return Object.freeze({ rationale, hazards: Object.freeze([...hazards]) });
}

function scalarRecord(
  facts: UnicodeScalarFacts,
  rationale: string,
  hazards: readonly GlyphAtlasHazard[] = [],
): CanonicalGlyphRecord {
  return defineCanonicalGlyph({
    kind: "scalar",
    scalar: facts,
    atlas: selection(rationale, hazards),
  });
}

const variationSelector15 = scalar(
  0xFE0E,
  "VARIATION SELECTOR-15",
  "Mn",
  "Variation Selectors",
  "3.2",
  "A",
  [],
  [],
  [{ name: "VS15", type: "abbreviation" }],
);
const variationSelector16 = scalar(
  0xFE0F,
  "VARIATION SELECTOR-16",
  "Mn",
  "Variation Selectors",
  "3.2",
  "A",
  ["Emoji_Component"],
  [],
  [{ name: "VS16", type: "abbreviation" }],
);
const warningSign = scalar(
  0x26A0,
  "WARNING SIGN",
  "So",
  "Miscellaneous Symbols",
  "4.0",
  "N",
  ["Emoji", "Extended_Pictographic"],
  ["text", "emoji"],
);
const informationSource = scalar(
  0x2139,
  "INFORMATION SOURCE",
  "Ll",
  "Letterlike Symbols",
  "3.0",
  "N",
  ["Emoji", "Extended_Pictographic"],
  ["text", "emoji"],
);
const digitOne = scalar(
  0x0031,
  "DIGIT ONE",
  "Nd",
  "Basic Latin",
  "1.1",
  "Na",
  ["Emoji", "Emoji_Component"],
  ["text", "emoji"],
);
const combiningKeycap = scalar(
  0x20E3,
  "COMBINING ENCLOSING KEYCAP",
  "Me",
  "Combining Diacritical Marks for Symbols",
  "3.0",
  "N",
  ["Emoji_Component"],
);
const woman = scalar(
  0x1F469,
  "WOMAN",
  "So",
  "Miscellaneous Symbols and Pictographs",
  "6.0",
  "W",
  [
    "Emoji",
    "Emoji_Presentation",
    "Emoji_Modifier_Base",
    "Extended_Pictographic",
  ],
);
const zeroWidthJoiner = scalar(
  0x200D,
  "ZERO WIDTH JOINER",
  "Cf",
  "General Punctuation",
  "1.1",
  "N",
  ["Emoji_Component"],
  [],
  [{ name: "ZWJ", type: "abbreviation" }],
);
const personalComputer = scalar(
  0x1F4BB,
  "PERSONAL COMPUTER",
  "So",
  "Miscellaneous Symbols and Pictographs",
  "6.0",
  "W",
  ["Emoji", "Emoji_Presentation", "Extended_Pictographic"],
  ["text", "emoji"],
);

/** Complete private canonical population for the starter Glyph Atlas. */
export const glyphAtlasCanonicalRecords: readonly CanonicalGlyphRecord[] =
  Object.freeze([
    scalarRecord(
      scalar(0x2726, "BLACK FOUR POINTED STAR", "So", "Dingbats", "1.1", "N"),
      ICON_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x2192, "RIGHTWARDS ARROW", "Sm", "Arrows", "1.1", "A"),
      ICON_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(0x2713, "CHECK MARK", "So", "Dingbats", "1.1", "N"),
      ICON_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x24D8,
        "CIRCLED LATIN SMALL LETTER I",
        "So",
        "Enclosed Alphanumerics",
        "1.1",
        "A",
      ),
      ICON_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x263E,
        "LAST QUARTER MOON",
        "So",
        "Miscellaneous Symbols",
        "1.1",
        "N",
      ),
      ICON_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x00D7,
        "MULTIPLICATION SIGN",
        "Sm",
        "Latin-1 Supplement",
        "1.1",
        "A",
      ),
      ICON_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x25D0,
        "CIRCLE WITH LEFT HALF BLACK",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      MOTIF_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25D3,
        "CIRCLE WITH UPPER HALF BLACK",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      MOTIF_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25D1,
        "CIRCLE WITH RIGHT HALF BLACK",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      MOTIF_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25D2,
        "CIRCLE WITH LOWER HALF BLACK",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      MOTIF_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25EE,
        "UP-POINTING TRIANGLE WITH RIGHT HALF BLACK",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      MOTIF_INVENTORY_REASON,
      ["brand-reserved"],
    ),
    scalarRecord(
      scalar(
        0x29E9,
        "DOWN-POINTING TRIANGLE WITH RIGHT HALF BLACK",
        "Sm",
        "Miscellaneous Mathematical Symbols-B",
        "3.2",
        "N",
      ),
      MOTIF_INVENTORY_REASON,
      ["brand-reserved", "mixed-block-family"],
    ),
    scalarRecord(
      scalar(
        0x25ED,
        "UP-POINTING TRIANGLE WITH LEFT HALF BLACK",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      MOTIF_INVENTORY_REASON,
      ["brand-reserved"],
    ),
    scalarRecord(
      scalar(
        0x29E8,
        "DOWN-POINTING TRIANGLE WITH LEFT HALF BLACK",
        "Sm",
        "Miscellaneous Mathematical Symbols-B",
        "3.2",
        "N",
      ),
      MOTIF_INVENTORY_REASON,
      ["brand-reserved", "mixed-block-family"],
    ),
    scalarRecord(
      scalar(
        0x25B2,
        "BLACK UP-POINTING TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25B6,
        "BLACK RIGHT-POINTING TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
        ["Emoji", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      TRIANGLE_INVENTORY_REASON,
      ["variation-sensitive"],
    ),
    scalarRecord(
      scalar(
        0x25BC,
        "BLACK DOWN-POINTING TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25C0,
        "BLACK LEFT-POINTING TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
        ["Emoji", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      TRIANGLE_INVENTORY_REASON,
      ["variation-sensitive"],
    ),
    scalarRecord(
      scalar(
        0x25B3,
        "WHITE UP-POINTING TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25B7,
        "WHITE RIGHT-POINTING TRIANGLE",
        "Sm",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25BD,
        "WHITE DOWN-POINTING TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25C1,
        "WHITE LEFT-POINTING TRIANGLE",
        "Sm",
        "Geometric Shapes",
        "1.1",
        "A",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25B4,
        "BLACK UP-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25B8,
        "BLACK RIGHT-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25BE,
        "BLACK DOWN-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25C2,
        "BLACK LEFT-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x25B5,
        "WHITE UP-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
      ["font-fallback-risk"],
    ),
    scalarRecord(
      scalar(
        0x25B9,
        "WHITE RIGHT-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
      ["font-fallback-risk"],
    ),
    scalarRecord(
      scalar(
        0x25BF,
        "WHITE DOWN-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
      ["font-fallback-risk"],
    ),
    scalarRecord(
      scalar(
        0x25C3,
        "WHITE LEFT-POINTING SMALL TRIANGLE",
        "So",
        "Geometric Shapes",
        "1.1",
        "N",
      ),
      TRIANGLE_INVENTORY_REASON,
      ["font-fallback-risk"],
    ),
    scalarRecord(
      scalar(0x25CF, "BLACK CIRCLE", "So", "Geometric Shapes", "1.1", "A"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x25A0, "BLACK SQUARE", "So", "Geometric Shapes", "1.1", "A"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x25C6, "BLACK DIAMOND", "So", "Geometric Shapes", "1.1", "A"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(
        0x2605,
        "BLACK STAR",
        "So",
        "Miscellaneous Symbols",
        "1.1",
        "A",
      ),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x2588, "FULL BLOCK", "So", "Block Elements", "1.1", "A"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x2593, "DARK SHADE", "So", "Block Elements", "1.1", "A"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x2592, "MEDIUM SHADE", "So", "Block Elements", "1.1", "A"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x2591, "LIGHT SHADE", "So", "Block Elements", "1.1", "N"),
      SERIES_INVENTORY_REASON,
    ),
    scalarRecord(
      scalar(0x00B7, "MIDDLE DOT", "Po", "Latin-1 Supplement", "1.1", "A"),
      STATUS_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(0x2715, "MULTIPLICATION X", "So", "Dingbats", "1.1", "N"),
      STATUS_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(0x25C7, "WHITE DIAMOND", "So", "Geometric Shapes", "1.1", "A"),
      STATUS_INVENTORY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      warningSign,
      STATUS_INVENTORY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    defineCanonicalGlyph({
      kind: "variation-sequence",
      scalars: [warningSign, variationSelector15],
      officialLabel: "WARNING SIGN",
      selectedVariation: "text",
      atlas: selection(STATUS_INVENTORY_REASON, ["semantic-overload"]),
    }),
    defineCanonicalGlyph({
      kind: "variation-sequence",
      scalars: [warningSign, variationSelector16],
      officialLabel: "WARNING SIGN",
      selectedVariation: "emoji",
      atlas: selection(STATUS_INVENTORY_REASON, ["semantic-overload"]),
    }),
    scalarRecord(
      scalar(
        0x2705,
        "WHITE HEAVY CHECK MARK",
        "So",
        "Dingbats",
        "6.0",
        "W",
        ["Emoji", "Emoji_Presentation", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      STATUS_INVENTORY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    scalarRecord(
      scalar(0x2190, "LEFTWARDS ARROW", "Sm", "Arrows", "1.1", "A"),
      DIRECTION_ADJACENCY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(0x2191, "UPWARDS ARROW", "Sm", "Arrows", "1.1", "A"),
      DIRECTION_ADJACENCY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(0x2193, "DOWNWARDS ARROW", "Sm", "Arrows", "1.1", "A"),
      DIRECTION_ADJACENCY_REASON,
      ["semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x2194,
        "LEFT RIGHT ARROW",
        "Sm",
        "Arrows",
        "1.1",
        "A",
        ["Emoji", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      DIRECTION_ADJACENCY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x2195,
        "UP DOWN ARROW",
        "So",
        "Arrows",
        "1.1",
        "A",
        ["Emoji", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      DIRECTION_ADJACENCY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x2197,
        "NORTH EAST ARROW",
        "So",
        "Arrows",
        "1.1",
        "A",
        ["Emoji", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      DIRECTION_ADJACENCY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    scalarRecord(
      scalar(
        0x2198,
        "SOUTH EAST ARROW",
        "So",
        "Arrows",
        "1.1",
        "A",
        ["Emoji", "Extended_Pictographic"],
        ["text", "emoji"],
      ),
      DIRECTION_ADJACENCY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    defineCanonicalGlyph({
      kind: "emoji-sequence",
      scalars: [digitOne, variationSelector16, combiningKeycap],
      officialLabel: "keycap: 1",
      sequenceType: "Emoji_Keycap_Sequence",
      emojiVersion: "E0.6",
      atlas: selection(SEQUENCE_REASON, ["semantic-overload"]),
    }),
    defineCanonicalGlyph({
      kind: "emoji-zwj-sequence",
      scalars: [woman, zeroWidthJoiner, personalComputer],
      officialLabel: "woman technologist",
      sequenceType: "RGI_Emoji_ZWJ_Sequence",
      emojiVersion: "E4.0",
      atlas: selection(SEQUENCE_REASON, ["semantic-overload"]),
    }),
    scalarRecord(
      informationSource,
      STATUS_INVENTORY_REASON,
      ["variation-sensitive", "semantic-overload"],
    ),
    defineCanonicalGlyph({
      kind: "variation-sequence",
      scalars: [informationSource, variationSelector15],
      officialLabel: "INFORMATION SOURCE",
      selectedVariation: "text",
      atlas: selection(STATUS_INVENTORY_REASON, ["semantic-overload"]),
    }),
    defineCanonicalGlyph({
      kind: "variation-sequence",
      scalars: [informationSource, variationSelector16],
      officialLabel: "INFORMATION SOURCE",
      selectedVariation: "emoji",
      atlas: selection(STATUS_INVENTORY_REASON, ["semantic-overload"]),
    }),
  ]);

/** Generic category vocabulary for curated Discern aliases. */
export const DISCERN_GLYPH_CATEGORIES = Object.freeze(
  [
    "action",
    "appearance",
    "brand",
    "decoration",
    "direction",
    "disclosure",
    "information",
    "people",
    "selection",
    "shape",
    "status",
    "workflow",
  ] as const,
);

/** One authored category in the curated collection. */
export type DiscernGlyphCategory = (typeof DISCERN_GLYPH_CATEGORIES)[number];

/** Recommendation states for the curated collection. */
export const DISCERN_GLYPH_RECOMMENDATION_STATES = Object.freeze(
  [
    "recommended",
    "reference-only",
    "brand-reserved",
  ] as const,
);

/** One recommendation state in the curated collection. */
export type DiscernGlyphRecommendationState =
  (typeof DISCERN_GLYPH_RECOMMENDATION_STATES)[number];

/** Publication review outcomes, separate from contextual recommendation. */
export const DISCERN_GLYPH_PUBLICATION_DISPOSITIONS = Object.freeze(
  ["candidate", "deferred"] as const,
);

/** One owner-approved publication disposition for a curated alias. */
export type DiscernGlyphPublicationDisposition =
  (typeof DISCERN_GLYPH_PUBLICATION_DISPOSITIONS)[number];

/** Fidelity of a context-specific ASCII degradation. */
export const DISCERN_GLYPH_ASCII_FIDELITIES = Object.freeze(
  [
    "semantic",
    "approximation",
    "lossy",
  ] as const,
);

/** One ASCII fallback posture. */
export type DiscernGlyphAsciiFidelity =
  (typeof DISCERN_GLYPH_ASCII_FIDELITIES)[number];

/** Browser guidance for a curated alias. */
export interface DiscernGlyphBrowserGuidance {
  readonly posture: "supported" | "caution" | "reference-only";
  readonly guidance: string;
}

/** Intentional ASCII degradation attached to one curated terminal use. */
export interface DiscernGlyphAsciiFallback {
  readonly text: string;
  readonly fidelity: DiscernGlyphAsciiFidelity;
  readonly guidance: string;
  /** Present only when the contextual use truly requires equal cell width. */
  readonly widthParityRequired?: true;
}

/** Terminal guidance for a curated alias. */
export type DiscernGlyphTerminalGuidance =
  | {
    readonly posture: "supported";
    readonly geometry: "one-cell" | "width-aware";
    readonly guidance: string;
    readonly asciiFallback: DiscernGlyphAsciiFallback;
  }
  | {
    readonly posture: "unicode-only";
    readonly geometry: "one-cell" | "width-aware";
    readonly guidance: string;
  }
  | {
    readonly posture: "reference-only";
    readonly geometry: "width-aware";
    readonly guidance: string;
  };

/** One stable, authored Discern name referencing canonical Unicode identity. */
export interface DiscernGlyphAlias {
  readonly name: string;
  readonly discoveryTitle: string;
  readonly canonicalId: string;
  readonly searchTerms: readonly string[];
  readonly category: DiscernGlyphCategory;
  readonly publication: DiscernGlyphPublicationDisposition;
  readonly recommendation: {
    readonly state: DiscernGlyphRecommendationState;
    readonly rationale: string;
  };
  readonly recommendedUses: readonly string[];
  readonly discouragedUses: readonly string[];
  readonly surfaces: {
    readonly browser: DiscernGlyphBrowserGuidance;
    readonly terminal: DiscernGlyphTerminalGuidance;
  };
}

/** Freeze one curated alias without normalising away authored mistakes. */
export function defineDiscernGlyphAlias(
  alias: DiscernGlyphAlias,
): DiscernGlyphAlias {
  const terminal = alias.surfaces.terminal.posture === "supported"
    ? Object.freeze({
      ...alias.surfaces.terminal,
      asciiFallback: Object.freeze({
        ...alias.surfaces.terminal.asciiFallback,
      }),
    })
    : Object.freeze({ ...alias.surfaces.terminal });
  return Object.freeze({
    ...alias,
    searchTerms: Object.freeze([...alias.searchTerms]),
    recommendation: Object.freeze({ ...alias.recommendation }),
    recommendedUses: Object.freeze([...alias.recommendedUses]),
    discouragedUses: Object.freeze([...alias.discouragedUses]),
    surfaces: Object.freeze({
      browser: Object.freeze({ ...alias.surfaces.browser }),
      terminal,
    }),
  });
}

/** Discovery titles describe records; they never supply accessible names. */
export const DISCERN_GLYPH_ACCESSIBILITY_POSTURE =
  "A discovery title is search metadata, not an accessible name; components and consumers provide localized labels for the action or content in context." as const;

function browser(
  posture: DiscernGlyphBrowserGuidance["posture"],
  guidance: string,
): DiscernGlyphBrowserGuidance {
  return Object.freeze({ posture, guidance });
}

function terminal(
  text: string,
  fidelity: DiscernGlyphAsciiFidelity,
  guidance: string,
  fallbackGuidance: string,
  geometry: "one-cell" | "width-aware" = "one-cell",
): DiscernGlyphTerminalGuidance {
  return Object.freeze({
    posture: "supported",
    geometry,
    guidance,
    asciiFallback: Object.freeze({
      text,
      fidelity,
      guidance: fallbackGuidance,
    }),
  });
}

/** Complete private curated Discern glyph collection. */
export const discernGlyphAliases: readonly DiscernGlyphAlias[] = Object.freeze([
  defineDiscernGlyphAlias({
    name: "spark",
    discoveryTitle: "Spark",
    canonicalId: glyphSequenceId(0x2726),
    searchTerms: ["generate", "magic", "new", "shine"],
    category: "action",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A compact text-presentation accent for generative or newly created results.",
    },
    recommendedUses: [
      "Generate actions",
      "Newly produced output",
      "Decorative emphasis with a contextual label",
    ],
    discouragedUses: [
      "Unlabelled claims of artificial intelligence",
      "Success status",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Use beside a localized action or result label; exact star geometry follows the active font.",
      ),
      terminal: terminal(
        "*",
        "approximation",
        "Safe in one-cell terminal geometry under the package measurement policy.",
        "An asterisk keeps the accent but loses the four-pointed silhouette.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "arrow-right",
    discoveryTitle: "Right arrow",
    canonicalId: glyphSequenceId(0x2192),
    searchTerms: [
      "forward",
      "mapping",
      "next",
      "output",
      "relationship",
      "right",
    ],
    category: "direction",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A neutral rightward shape whose intended action is supplied by the surrounding context.",
    },
    recommendedUses: [
      "Forward navigation",
      "Input-to-output relationships",
      "Directional flow",
    ],
    discouragedUses: [
      "Right-to-left navigation without mirroring policy",
      "Unlabelled universal next semantics",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Direction remains contextual; mirror only when the owning interaction defines that behaviour.",
      ),
      terminal: terminal(
        ">",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A greater-than sign retains direction but can read as comparison in technical prose.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "arrow-left",
    discoveryTitle: "Left arrow",
    canonicalId: glyphSequenceId(0x2190),
    searchTerms: ["back", "input", "left", "previous", "return"],
    category: "direction",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A neutral leftward partner to the right arrow for contextual navigation and flow.",
    },
    recommendedUses: ["Back navigation", "Return flow", "Leftward direction"],
    discouragedUses: [
      "Right-to-left navigation without an explicit mirroring policy",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Pair with the interaction's localized label and direction policy.",
      ),
      terminal: terminal(
        "<",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A less-than sign retains direction but can read as comparison in technical prose.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "arrow-up",
    discoveryTitle: "Up arrow",
    canonicalId: glyphSequenceId(0x2191),
    searchTerms: ["increase", "move up", "previous", "sort ascending", "up"],
    category: "direction",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A general upward direction mark that does not prescribe movement, sorting, or status semantics.",
    },
    recommendedUses: [
      "Move-up controls",
      "Upward navigation",
      "Explicit ascending direction",
    ],
    discouragedUses: [
      "Positive status without a label",
      "Growth claims without data",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Use a label when up could mean movement, sorting, or increase.",
      ),
      terminal: terminal(
        "^",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A caret preserves direction but may read as exponent or shell syntax.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "arrow-down",
    discoveryTitle: "Down arrow",
    canonicalId: glyphSequenceId(0x2193),
    searchTerms: [
      "decrease",
      "download",
      "move down",
      "sort descending",
      "down",
    ],
    category: "direction",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A general downward direction mark that leaves movement, sorting, and transfer meaning to context.",
    },
    recommendedUses: [
      "Move-down controls",
      "Downward navigation",
      "Explicit descending direction",
    ],
    discouragedUses: [
      "Negative status without a label",
      "Download without contextual text",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Use a label when down could mean movement, sorting, disclosure, or transfer.",
      ),
      terminal: terminal(
        "v",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A lowercase v preserves direction but loses the arrow shaft.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "arrow-bidirectional",
    discoveryTitle: "Bidirectional arrow",
    canonicalId: glyphSequenceId(0x2194),
    searchTerms: ["both ways", "exchange", "relationship", "sync", "two way"],
    category: "direction",
    publication: "deferred",
    recommendation: {
      state: "recommended",
      rationale:
        "A concise two-way relationship mark whose exact relationship remains caller-authored.",
    },
    recommendedUses: [
      "Two-way relationships",
      "Exchange",
      "Bidirectional synchronization",
    ],
    discouragedUses: [
      "Guaranteed synchronization state",
      "Width-critical columns requiring parity with ASCII",
    ],
    surfaces: {
      browser: browser(
        "caution",
        "Request text presentation when emoji styling would change density or colour.",
      ),
      terminal: terminal(
        "<->",
        "semantic",
        "Use width-aware layout; the Unicode form is one measured cell under narrow-A geometry.",
        "The three-cell ASCII arrow preserves two-way direction; equal width is intentionally not required.",
        "width-aware",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "selection-selected",
    discoveryTitle: "Selected",
    canonicalId: glyphSequenceId(0x2713),
    searchTerms: ["chosen", "selected", "selection"],
    category: "selection",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A compact selected-state mark whose native state or adjacent wording remains authoritative.",
    },
    recommendedUses: [
      "Selected option with native state",
      "Confirmed choice with an adjacent label",
    ],
    discouragedUses: [
      "Completion or passing status",
      "Checkbox appearance without native state",
      "Glyph-only selection meaning",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Pair with native selection state or a localized label; the glyph alone supplies no control semantics.",
      ),
      terminal: terminal(
        "x",
        "semantic",
        "Safe in one-cell geometry when native selection state or adjacent wording carries the meaning.",
        "A lowercase x preserves selection only inside an established selection control or beside a selected-state label.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "status-complete",
    discoveryTitle: "Complete status",
    canonicalId: glyphSequenceId(0x2713),
    searchTerms: ["complete", "done", "finished", "passed", "success"],
    category: "status",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A contextual status alias over the check identity, kept separate from the action-oriented check alias.",
    },
    recommendedUses: [
      "Completed workflow step",
      "Passing verification with a visible label",
    ],
    discouragedUses: [
      "Selection controls",
      "Colour-only or glyph-only success announcements",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Keep the visible or accessible status wording authoritative.",
      ),
      terminal: terminal(
        "+",
        "semantic",
        "Safe in one-cell geometry when a status word remains visible.",
        "A plus preserves affirmative status only when the adjacent wording carries completion.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "info",
    discoveryTitle: "Information",
    canonicalId: glyphSequenceId(0x24D8),
    searchTerms: ["about", "details", "help", "info", "note"],
    category: "information",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A text-presentation circled letter suited to contextual help and detail affordances.",
    },
    recommendedUses: [
      "Information action",
      "Supplementary details",
      "Explanatory note",
    ],
    discouragedUses: ["Automatic accessible name", "Critical warning"],
    surfaces: {
      browser: browser(
        "supported",
        "Supply the localized purpose through the owning component; this title is discovery metadata only.",
      ),
      terminal: terminal(
        "i",
        "semantic",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A lowercase i keeps the information convention without the enclosing circle.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "theme-dark",
    discoveryTitle: "Dark theme",
    canonicalId: glyphSequenceId(0x263E),
    searchTerms: ["appearance", "dark", "theme", "theme toggle"],
    category: "appearance",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A labelled appearance action targeting dark theme, not an indicator of the current theme.",
    },
    recommendedUses: ["Dark-theme action with localized text"],
    discouragedUses: [
      "Unlabelled current-theme state",
      "Night-time decoration",
      "Astronomical meaning",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Use beside localized target-theme wording because the moon shape does not encode current versus target state.",
      ),
      terminal: terminal(
        "D",
        "semantic",
        "Safe in one-cell geometry when a localized label names the target theme.",
        "The letter D preserves dark-theme intent only when adjacent wording carries the appearance action.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "close",
    discoveryTitle: "Close",
    canonicalId: glyphSequenceId(0x00D7),
    searchTerms: ["cancel", "clear", "dismiss", "remove", "x"],
    category: "action",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A contextual dismiss alias over the multiplication-sign identity, with mathematical use explicitly excluded.",
    },
    recommendedUses: [
      "Dismiss action",
      "Remove chip",
      "Clear value with a label",
    ],
    discouragedUses: [
      "Mathematical multiplication",
      "Failure status",
      "Unlabelled destructive action",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "The owning control supplies button semantics and a localized action label.",
      ),
      terminal: terminal(
        "x",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A lowercase x keeps the familiar dismiss shape but remains semantically contextual.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "warning",
    discoveryTitle: "Warning",
    canonicalId: glyphSequenceId(0x26A0, 0xFE0E),
    searchTerms: ["alert", "attention", "caution", "risk", "warning"],
    category: "status",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "The explicit text-presentation warning sequence avoids silently opting into emoji styling on compact interfaces.",
    },
    recommendedUses: [
      "Warning status with text",
      "Risk callout",
      "Attention marker",
    ],
    discouragedUses: [
      "Danger or failure when a stronger semantic role exists",
      "Glyph-only announcement",
    ],
    surfaces: {
      browser: browser(
        "caution",
        "Variation selectors request presentation but the selected font still controls exact artwork.",
      ),
      terminal: terminal(
        "!",
        "semantic",
        "The explicit text sequence measures one cell in the package authority.",
        "An exclamation mark preserves warning intent when adjacent wording names the condition.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "disclosure-right",
    discoveryTitle: "Collapsed disclosure",
    canonicalId: glyphSequenceId(0x25B8),
    searchTerms: ["collapsed", "disclosure", "expand", "right"],
    category: "disclosure",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A compact filled small triangle for the collapsed state of a labelled disclosure.",
    },
    recommendedUses: ["Collapsed disclosure", "Forward tree branch"],
    discouragedUses: ["Media playback", "Next navigation without a label"],
    surfaces: {
      browser: browser(
        "supported",
        "The owning disclosure state and accessible control remain authoritative.",
      ),
      terminal: terminal(
        ">",
        "semantic",
        "Safe in one-cell terminal geometry.",
        "A greater-than sign preserves collapsed direction beside the disclosure label.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "disclosure-down",
    discoveryTitle: "Expanded disclosure",
    canonicalId: glyphSequenceId(0x25BE),
    searchTerms: ["down", "disclosure", "expanded", "open"],
    category: "disclosure",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale:
        "A compact filled small triangle for the expanded state of a labelled disclosure.",
    },
    recommendedUses: ["Expanded disclosure", "Open tree branch"],
    discouragedUses: ["Download action", "Descending sort without a label"],
    surfaces: {
      browser: browser(
        "supported",
        "The owning disclosure state and accessible control remain authoritative.",
      ),
      terminal: terminal(
        "v",
        "semantic",
        "Safe in one-cell terminal geometry.",
        "A lowercase v preserves expanded direction beside the disclosure label.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "brand-mark",
    discoveryTitle: "Discern brand mark",
    canonicalId: glyphSequenceId(0x25EE),
    searchTerms: ["brand", "discern", "identity", "logo", "mark"],
    category: "brand",
    publication: "candidate",
    recommendation: {
      state: "brand-reserved",
      rationale:
        "Reserved for moments where a surface formally wears Discern identity; ordinary accents use the plain motif register.",
    },
    recommendedUses: ["Discern logo treatment", "Ceremonial brand register"],
    discouragedUses: [
      "Generic bullet",
      "Routine status",
      "Consumer product identity",
    ],
    surfaces: {
      browser: browser(
        "caution",
        "Use only under Discern brand ownership and inspect the selected display font.",
      ),
      terminal: {
        posture: "unicode-only",
        geometry: "one-cell",
        guidance:
          "Supported as measured one-cell Unicode under Discern brand ownership; no ASCII fallback is approved because none preserves the identity.",
      },
    },
  }),
  defineDiscernGlyphAlias({
    name: "shape-circle",
    discoveryTitle: "Filled circle",
    canonicalId: glyphSequenceId(0x25CF),
    searchTerms: ["bullet", "circle", "dot", "marker", "series"],
    category: "shape",
    publication: "deferred",
    recommendation: {
      state: "recommended",
      rationale:
        "A generic filled marker shape for contexts where colour is not the only distinguishing cue.",
    },
    recommendedUses: ["Legend marker", "Point marker", "Neutral bullet"],
    discouragedUses: [
      "Record button without a label",
      "Sole selected-state indicator",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Size and align through the owning component rather than assuming font artwork metrics.",
      ),
      terminal: terminal(
        "o",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A lowercase o preserves the circular cue without fill.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "shape-square",
    discoveryTitle: "Filled square",
    canonicalId: glyphSequenceId(0x25A0),
    searchTerms: ["block", "marker", "series", "square"],
    category: "shape",
    publication: "deferred",
    recommendation: {
      state: "recommended",
      rationale:
        "A generic square marker for non-colour distinction and compact categorical references.",
    },
    recommendedUses: [
      "Legend marker",
      "Categorical series marker",
      "Geometric bullet",
    ],
    discouragedUses: [
      "Checkbox without native state",
      "Stop action without a label",
    ],
    surfaces: {
      browser: browser(
        "supported",
        "Size and align through the owning component rather than assuming font artwork metrics.",
      ),
      terminal: terminal(
        "#",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "A number sign provides a dense square-like cue but changes the silhouette.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "shape-diamond",
    discoveryTitle: "Filled diamond",
    canonicalId: glyphSequenceId(0x25C6),
    searchTerms: ["diamond", "marker", "milestone", "series"],
    category: "shape",
    publication: "deferred",
    recommendation: {
      state: "recommended",
      rationale:
        "A generic diamond marker suited to milestones and categorical distinction when context carries meaning.",
    },
    recommendedUses: [
      "Milestone marker",
      "Categorical series marker",
      "Geometric bullet",
    ],
    discouragedUses: ["Decision semantics without a legend", "Brand mark"],
    surfaces: {
      browser: browser(
        "supported",
        "Keep milestone or series meaning in the legend or surrounding text.",
      ),
      terminal: terminal(
        "*",
        "approximation",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "An asterisk stays visually distinct but loses the diamond outline.",
      ),
    },
  }),
  defineDiscernGlyphAlias({
    name: "shape-star",
    discoveryTitle: "Filled star",
    canonicalId: glyphSequenceId(0x2605),
    searchTerms: ["favorite", "featured", "marker", "rating", "star"],
    category: "shape",
    publication: "deferred",
    recommendation: {
      state: "recommended",
      rationale:
        "A familiar star shape for a labelled favourite or featured state, separate from rating arithmetic.",
    },
    recommendedUses: [
      "Favourite state with text",
      "Featured marker",
      "Categorical series marker",
    ],
    discouragedUses: ["Unlabelled rating value", "Spark or generation action"],
    surfaces: {
      browser: browser(
        "supported",
        "A component owns filled versus unfilled state and its accessible wording.",
      ),
      terminal: terminal(
        "x",
        "lossy",
        "Safe in one-cell terminal geometry under narrow-A measurement.",
        "The x remains distinct in a series but does not preserve star meaning outside a legend.",
      ),
    },
  }),
]);

/** Complete private data pair consumed by validation and future projections. */
export const glyphAtlasData = Object.freeze({
  canonical: glyphAtlasCanonicalRecords,
  aliases: discernGlyphAliases,
});

/** Shape accepted by the future-enrolling Atlas validator. */
export type GlyphAtlasData = typeof glyphAtlasData;
