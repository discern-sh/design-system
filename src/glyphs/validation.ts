/**
 * Future-enrolling validation for the private Glyph Atlas data authority.
 *
 * Every check walks the complete canonical and curated populations. Tests add
 * throwaway members to these same loops, so a later member cannot remain
 * outside the safeguards by omission.
 *
 * @module
 */

import {
  EAST_ASIAN_WIDTH_UNICODE_VERSION,
  eastAsianWidthKind,
} from "../unicode/east-asian-width.ts";
import { graphemeWidth, measureText } from "../cli/text.ts";
import {
  CANONICAL_GLYPH_KINDS,
  type CanonicalGlyphRecord,
  derivedGlyphHazards,
  DISCERN_GLYPH_ASCII_FIDELITIES,
  DISCERN_GLYPH_CATEGORIES,
  DISCERN_GLYPH_RECOMMENDATION_STATES,
  type DiscernGlyphAlias,
  expectedCanonicalGlyphSearchTerms,
  expectedGlyphProvenanceSources,
  GLYPH_ATLAS_CURATION_RUBRIC,
  GLYPH_ATLAS_HAZARDS,
  GLYPH_ATLAS_RENDERING_POSTURE,
  GLYPH_ATLAS_UNICODE_SOURCES,
  GLYPH_ATLAS_UNICODE_TERMS_URL,
  GLYPH_ATLAS_UNICODE_VERSION,
  glyphSequenceId,
  normalizeGlyphSearchTerm,
  UNICODE_EAST_ASIAN_WIDTH_PROPERTIES,
  UNICODE_EMOJI_PROPERTIES,
  UNICODE_EMOJI_SEQUENCE_TYPES,
  UNICODE_GENERAL_CATEGORIES,
  UNICODE_NAME_ALIAS_TYPES,
  UNICODE_VARIATION_STYLES,
} from "./atlas.ts";

/** Data shape accepted by {@linkcode validateGlyphAtlas}. */
export interface GlyphAtlasValidationInput {
  readonly canonical: readonly CanonicalGlyphRecord[];
  readonly aliases: readonly DiscernGlyphAlias[];
}

/** Aggregate failure containing every offending glyph and field found. */
export class GlyphAtlasValidationError extends TypeError {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Glyph Atlas validation failed:\n${
        issues.map((issue) => `- ${issue}`).join("\n")
      }`,
    );
    this.name = "GlyphAtlasValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const CONTROL = /\p{Cc}/u;
const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;
const MACHINE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/u;
const PLATFORM_PROMISE =
  /\b(?:all|every) (?:platform|font)s?\b|identical across|universally rendered/iu;

function membership(values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}

const canonicalKinds = membership(CANONICAL_GLYPH_KINDS);
const generalCategories = membership(UNICODE_GENERAL_CATEGORIES);
const eastAsianWidthProperties = membership(
  UNICODE_EAST_ASIAN_WIDTH_PROPERTIES,
);
const emojiProperties = membership(UNICODE_EMOJI_PROPERTIES);
const nameAliasTypes = membership(UNICODE_NAME_ALIAS_TYPES);
const variationStyles = membership(UNICODE_VARIATION_STYLES);
const emojiSequenceTypes = membership(UNICODE_EMOJI_SEQUENCE_TYPES);
const atlasHazards = membership(GLYPH_ATLAS_HAZARDS);
const aliasCategories = membership(DISCERN_GLYPH_CATEGORIES);
const recommendationStates = membership(
  DISCERN_GLYPH_RECOMMENDATION_STATES,
);
const asciiFidelities = membership(DISCERN_GLYPH_ASCII_FIDELITIES);

function addAuthoredTextIssue(
  issues: string[],
  path: string,
  value: unknown,
): void {
  if (
    typeof value !== "string" || value === "" || value.trim() !== value ||
    value.includes("\n") || value.includes("\r") ||
    CONTROL_OR_FORMAT.test(value)
  ) {
    issues.push(
      `${path}: must be non-empty, trimmed, single-line, and control- and format-free`,
    );
    return;
  }
  if (PLATFORM_PROMISE.test(value)) {
    issues.push(
      `${path}: must not promise universal or identical font rendering`,
    );
  }
}

function addUniqueVocabularyIssues(
  issues: string[],
  path: string,
  values: readonly string[],
  vocabulary: ReadonlySet<string>,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (!vocabulary.has(value)) {
      issues.push(`${path}[${index}]: unknown value ${JSON.stringify(value)}`);
    }
    if (seen.has(value)) {
      issues.push(`${path}[${index}]: duplicates ${JSON.stringify(value)}`);
    }
    seen.add(value);
  });
}

function equalArrays<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function isPrivateUse(codePoint: number): boolean {
  return (codePoint >= 0xE000 && codePoint <= 0xF8FF) ||
    (codePoint >= 0xF0000 && codePoint <= 0xFFFFD) ||
    (codePoint >= 0x100000 && codePoint <= 0x10FFFD);
}

function expectedWidthKind(
  property: string,
): "ambiguous" | "wide" | "narrow" {
  if (property === "A") return "ambiguous";
  if (property === "W" || property === "F") return "wide";
  return "narrow";
}

function validateSourceDeclarations(issues: string[]): void {
  if (EAST_ASIAN_WIDTH_UNICODE_VERSION !== GLYPH_ATLAS_UNICODE_VERSION) {
    issues.push(
      `sources.unicodeVersion: Atlas ${GLYPH_ATLAS_UNICODE_VERSION} disagrees with terminal width ${EAST_ASIAN_WIDTH_UNICODE_VERSION}`,
    );
  }
  if (!GLYPH_ATLAS_UNICODE_TERMS_URL.startsWith("https://www.unicode.org/")) {
    issues.push("sources.terms: must name the Unicode terms URL");
  }
  for (const [id, source] of Object.entries(GLYPH_ATLAS_UNICODE_SOURCES)) {
    addAuthoredTextIssue(issues, `sources.${id}.title`, source.title);
    addAuthoredTextIssue(issues, `sources.${id}.version`, source.version);
    if (!source.url.startsWith("https://www.unicode.org/")) {
      issues.push(`sources.${id}.url: must be an official Unicode HTTPS URL`);
    }
    if (
      source.url.includes("/Public/") &&
      !source.url.includes(`/${GLYPH_ATLAS_UNICODE_VERSION}/`)
    ) {
      issues.push(
        `sources.${id}.url: data URL must pin Unicode ${GLYPH_ATLAS_UNICODE_VERSION}`,
      );
    }
  }
  const rubricSeen = new Set<string>();
  GLYPH_ATLAS_CURATION_RUBRIC.forEach((entry, index) => {
    addAuthoredTextIssue(issues, `curationRubric[${index}]`, entry);
    const normalized = normalizeGlyphSearchTerm(entry);
    if (rubricSeen.has(normalized)) {
      issues.push(`curationRubric[${index}]: duplicates another rubric rule`);
    }
    rubricSeen.add(normalized);
  });
  addAuthoredTextIssue(
    issues,
    "renderingPosture",
    GLYPH_ATLAS_RENDERING_POSTURE,
  );
}

function validateScalarFacts(
  issues: string[],
  record: CanonicalGlyphRecord,
  recordPath: string,
): void {
  if (record.scalars.length !== record.codePoints.length) {
    issues.push(
      `${recordPath}.scalars: count must match the exact code-point list`,
    );
  }
  record.scalars.forEach((scalar, index) => {
    const path = `${recordPath}.scalars[${index}]`;
    if (
      !Number.isSafeInteger(scalar.codePoint) || scalar.codePoint < 0 ||
      scalar.codePoint > 0x10FFFF ||
      (scalar.codePoint >= 0xD800 && scalar.codePoint <= 0xDFFF)
    ) {
      issues.push(`${path}.codePoint: must be a Unicode scalar value`);
    }
    if (record.codePoints[index] !== scalar.codePoint) {
      issues.push(`${path}.codePoint: must match codePoints[${index}]`);
    }
    addAuthoredTextIssue(issues, `${path}.name`, scalar.name);
    addAuthoredTextIssue(issues, `${path}.block`, scalar.block);
    if (!/^\d+\.\d+$/u.test(scalar.age)) {
      issues.push(`${path}.age: must be a Unicode major.minor version`);
    }
    if (!generalCategories.has(scalar.generalCategory)) {
      issues.push(
        `${path}.generalCategory: unknown value ${
          JSON.stringify(scalar.generalCategory)
        }`,
      );
    }
    if (!eastAsianWidthProperties.has(scalar.eastAsianWidth)) {
      issues.push(
        `${path}.eastAsianWidth: unknown value ${
          JSON.stringify(scalar.eastAsianWidth)
        }`,
      );
    } else if (
      Number.isSafeInteger(scalar.codePoint) &&
      eastAsianWidthKind(scalar.codePoint) !==
        expectedWidthKind(scalar.eastAsianWidth)
    ) {
      issues.push(
        `${path}.eastAsianWidth: ${scalar.eastAsianWidth} disagrees with the pinned package width table`,
      );
    }
    const seenNameAliases = new Set<string>();
    scalar.nameAliases.forEach((alias, aliasIndex) => {
      const aliasPath = `${path}.nameAliases[${aliasIndex}]`;
      addAuthoredTextIssue(issues, `${aliasPath}.name`, alias.name);
      if (!nameAliasTypes.has(alias.type)) {
        issues.push(
          `${aliasPath}.type: unknown value ${JSON.stringify(alias.type)}`,
        );
      }
      const normalized = normalizeGlyphSearchTerm(alias.name);
      if (seenNameAliases.has(normalized)) {
        issues.push(`${aliasPath}.name: duplicates another formal alias`);
      }
      seenNameAliases.add(normalized);
    });
    addUniqueVocabularyIssues(
      issues,
      `${path}.emojiProperties`,
      scalar.emojiProperties,
      emojiProperties,
    );
    addUniqueVocabularyIssues(
      issues,
      `${path}.standardizedVariations`,
      scalar.standardizedVariations,
      variationStyles,
    );
    if (isPrivateUse(scalar.codePoint)) {
      issues.push(
        `${path}.codePoint: private-use scalars are outside the Atlas rubric`,
      );
    }
  });

  const first = record.scalars[0];
  if (
    first !== undefined &&
    (/^C[cfosn]$/u.test(first.generalCategory) ||
      /^M[nce]$/u.test(first.generalCategory))
  ) {
    issues.push(
      `${recordPath}.scalars[0].generalCategory: a glyph cannot begin with a control, private-use, surrogate, unassigned, or combining scalar`,
    );
  }
  if (
    record.kind === "scalar" && first !== undefined &&
    (/^C/u.test(first.generalCategory) || /^M/u.test(first.generalCategory))
  ) {
    issues.push(
      `${recordPath}.kind: scalar records cannot be controls, format characters, or isolated combining marks`,
    );
  }
}

function validatePresentation(
  issues: string[],
  record: CanonicalGlyphRecord,
  recordPath: string,
): void {
  const base = record.scalars[0];
  const baseEmoji = base?.emojiProperties.includes("Emoji") === true;
  const baseDefault = base?.emojiProperties.includes("Emoji_Presentation") ===
      true
    ? "emoji"
    : "text";
  const isEmojiSequence = record.kind === "emoji-sequence" ||
    record.kind === "emoji-zwj-sequence";
  const expectedEmojiCapable = isEmojiSequence || baseEmoji;
  if (record.presentation.emojiCapable !== expectedEmojiCapable) {
    issues.push(
      `${recordPath}.presentation.emojiCapable: must derive from the base Emoji property or standardized emoji sequence`,
    );
  }
  const expectedDefault = isEmojiSequence ? "not-applicable" : baseDefault;
  if (record.presentation.defaultPresentation !== expectedDefault) {
    issues.push(
      `${recordPath}.presentation.defaultPresentation: expected ${expectedDefault}`,
    );
  }
  if (
    !equalArrays(
      record.presentation.standardizedVariations,
      isEmojiSequence ? [] : base?.standardizedVariations ?? [],
    )
  ) {
    issues.push(
      `${recordPath}.presentation.standardizedVariations: must derive from the base scalar facts`,
    );
  }

  if (record.kind === "scalar") {
    if (record.codePoints.length !== 1) {
      issues.push(
        `${recordPath}.kind: scalar records require exactly one code point`,
      );
    }
    if (record.presentation.effectivePresentation !== baseDefault) {
      issues.push(
        `${recordPath}.presentation.effectivePresentation: scalar records must use their default presentation`,
      );
    }
    if (record.presentation.selectedVariation !== undefined) {
      issues.push(
        `${recordPath}.presentation.selectedVariation: scalar records do not select a variation`,
      );
    }
  } else if (record.kind === "variation-sequence") {
    const selected = record.presentation.selectedVariation;
    const selector = record.codePoints[1];
    if (record.codePoints.length !== 2) {
      issues.push(
        `${recordPath}.kind: variation sequences require a base and one selector`,
      );
    }
    if (
      (selected === "text" && selector !== 0xFE0E) ||
      (selected === "emoji" && selector !== 0xFE0F)
    ) {
      issues.push(
        `${recordPath}.presentation.selectedVariation: must agree with VS15 or VS16`,
      );
    }
    if (
      selected === undefined ||
      !record.presentation.standardizedVariations.includes(selected)
    ) {
      issues.push(
        `${recordPath}.presentation.selectedVariation: must be standardized for the base scalar`,
      );
    }
    if (record.presentation.effectivePresentation !== selected) {
      issues.push(
        `${recordPath}.presentation.effectivePresentation: must equal the explicit variation`,
      );
    }
  } else {
    if (record.codePoints.length < 2) {
      issues.push(
        `${recordPath}.kind: emoji sequences require multiple code points`,
      );
    }
    if (record.presentation.effectivePresentation !== "emoji") {
      issues.push(
        `${recordPath}.presentation.effectivePresentation: standardized emoji sequences render in emoji presentation`,
      );
    }
    if (
      record.presentation.sequenceType === undefined ||
      !emojiSequenceTypes.has(record.presentation.sequenceType)
    ) {
      issues.push(
        `${recordPath}.presentation.sequenceType: unknown or missing standardized sequence type`,
      );
    }
    if (!/^E\d+\.\d+$/u.test(record.presentation.emojiVersion ?? "")) {
      issues.push(
        `${recordPath}.presentation.emojiVersion: must use the pinned emoji-version label`,
      );
    }
    const hasJoiner = record.codePoints.includes(0x200D);
    if (record.kind === "emoji-zwj-sequence" && !hasJoiner) {
      issues.push(`${recordPath}.kind: ZWJ sequences must contain U+200D`);
    }
    if (
      record.kind === "emoji-zwj-sequence" &&
      record.presentation.sequenceType !== "RGI_Emoji_ZWJ_Sequence"
    ) {
      issues.push(
        `${recordPath}.presentation.sequenceType: ZWJ records require RGI_Emoji_ZWJ_Sequence`,
      );
    }
    if (record.kind === "emoji-sequence" && hasJoiner) {
      issues.push(
        `${recordPath}.kind: sequences containing U+200D use emoji-zwj-sequence`,
      );
    }
  }
}

function validateCanonicalRecord(
  issues: string[],
  record: CanonicalGlyphRecord,
  index: number,
): void {
  const label = typeof record.id === "string" && record.id !== ""
    ? record.id
    : `canonical[${index}]`;
  const path = `canonical ${label}`;
  if (!canonicalKinds.has(record.kind)) {
    issues.push(`${path}.kind: unknown value ${JSON.stringify(record.kind)}`);
  }
  if (typeof record.text !== "string" || record.text === "") {
    issues.push(`${path}.text: must be non-empty`);
  } else if (CONTROL.test(record.text)) {
    issues.push(`${path}.text: must not contain control characters`);
  }
  addAuthoredTextIssue(issues, `${path}.officialLabel`, record.officialLabel);
  const expectedSearchTerms = expectedCanonicalGlyphSearchTerms(record);
  if (!equalArrays(record.searchTerms, expectedSearchTerms)) {
    issues.push(
      `${path}.searchTerms: must derive from official identity facts as ${
        expectedSearchTerms.join(", ")
      }`,
    );
  }
  record.searchTerms.forEach((term, termIndex) => {
    const termPath = `${path}.searchTerms[${termIndex}]`;
    addAuthoredTextIssue(issues, termPath, term);
    if (term !== normalizeGlyphSearchTerm(term)) {
      issues.push(`${termPath}: must be normalized`);
    }
  });

  let roundTrip: string | undefined;
  if (
    record.codePoints.every((codePoint) =>
      Number.isSafeInteger(codePoint) && codePoint >= 0 &&
      codePoint <= 0x10FFFF &&
      !(codePoint >= 0xD800 && codePoint <= 0xDFFF)
    )
  ) {
    roundTrip = String.fromCodePoint(...record.codePoints);
    const expectedId = glyphSequenceId(...record.codePoints);
    if (record.id !== expectedId) {
      issues.push(`${path}.id: expected ${expectedId}`);
    }
  } else {
    issues.push(`${path}.codePoints: must contain only Unicode scalar values`);
  }
  if (roundTrip !== undefined && record.text !== roundTrip) {
    issues.push(`${path}.text: must round-trip exactly from codePoints`);
  }

  validateScalarFacts(issues, record, path);
  validatePresentation(issues, record, path);

  const graphemeCount = [...graphemeSegmenter.segment(record.text)].length;
  if (record.graphemeCount !== graphemeCount) {
    issues.push(
      `${path}.graphemeCount: expected derived count ${graphemeCount}`,
    );
  }
  if (graphemeCount !== 1) {
    issues.push(`${path}.text: canonical glyph records must be one grapheme`);
  }
  const measuredWidth = graphemeWidth(record.text);
  if (record.terminalWidth !== measuredWidth) {
    issues.push(
      `${path}.terminalWidth: expected graphemeWidth() result ${measuredWidth}`,
    );
  }
  if (measuredWidth < 1) {
    issues.push(`${path}.terminalWidth: display must occupy a measured cell`);
  }

  if (record.provenance.unicodeVersion !== GLYPH_ATLAS_UNICODE_VERSION) {
    issues.push(
      `${path}.provenance.unicodeVersion: expected ${GLYPH_ATLAS_UNICODE_VERSION}`,
    );
  }
  const expectedSources = expectedGlyphProvenanceSources(record);
  if (!equalArrays(record.provenance.sources, expectedSources)) {
    issues.push(
      `${path}.provenance.sources: expected ${expectedSources.join(", ")}`,
    );
  }
  addUniqueVocabularyIssues(
    issues,
    `${path}.provenance.sources`,
    record.provenance.sources,
    new Set(Object.keys(GLYPH_ATLAS_UNICODE_SOURCES)),
  );

  addAuthoredTextIssue(
    issues,
    `${path}.atlas.rationale`,
    record.atlas.rationale,
  );
  addUniqueVocabularyIssues(
    issues,
    `${path}.atlas.hazards`,
    record.atlas.hazards,
    atlasHazards,
  );
  for (const hazard of derivedGlyphHazards(record)) {
    if (!record.atlas.hazards.includes(hazard)) {
      issues.push(`${path}.atlas.hazards: missing derived hazard ${hazard}`);
    }
  }
}

function validateAlias(
  issues: string[],
  alias: DiscernGlyphAlias,
  index: number,
  canonicalById: ReadonlyMap<string, CanonicalGlyphRecord>,
): void {
  const label = typeof alias.name === "string" && alias.name !== ""
    ? alias.name
    : `aliases[${index}]`;
  const path = `alias ${label}`;
  if (!MACHINE_NAME.test(alias.name)) {
    issues.push(`${path}.name: must be a normalized kebab-case machine name`);
  }
  addAuthoredTextIssue(
    issues,
    `${path}.discoveryTitle`,
    alias.discoveryTitle,
  );
  const canonical = canonicalById.get(alias.canonicalId);
  if (canonical === undefined) {
    issues.push(
      `${path}.canonicalId: does not reference a live canonical record`,
    );
  }
  if (!aliasCategories.has(alias.category)) {
    issues.push(
      `${path}.category: unknown value ${JSON.stringify(alias.category)}`,
    );
  }
  if (!recommendationStates.has(alias.recommendation.state)) {
    issues.push(
      `${path}.recommendation.state: unknown value ${
        JSON.stringify(alias.recommendation.state)
      }`,
    );
  }
  addAuthoredTextIssue(
    issues,
    `${path}.recommendation.rationale`,
    alias.recommendation.rationale,
  );
  if (alias.recommendation.state === "brand-reserved") {
    if (alias.category !== "brand") {
      issues.push(
        `${path}.category: brand-reserved aliases must use the brand category`,
      );
    }
    if (
      canonical !== undefined &&
      !canonical.atlas.hazards.includes("brand-reserved")
    ) {
      issues.push(
        `${path}.canonicalId: brand-reserved aliases require a brand-reserved canonical candidate`,
      );
    }
  }

  const normalizedTerms = new Set<string>();
  if (alias.searchTerms.length === 0) {
    issues.push(`${path}.searchTerms: must contain discovery terms`);
  }
  alias.searchTerms.forEach((term, termIndex) => {
    const termPath = `${path}.searchTerms[${termIndex}]`;
    addAuthoredTextIssue(issues, termPath, term);
    const normalized = normalizeGlyphSearchTerm(term);
    if (term !== normalized) {
      issues.push(
        `${termPath}: must equal normalized term ${JSON.stringify(normalized)}`,
      );
    }
    if (normalizedTerms.has(normalized)) {
      issues.push(
        `${termPath}: duplicates normalized term ${JSON.stringify(normalized)}`,
      );
    }
    normalizedTerms.add(normalized);
  });

  for (
    const [field, values] of [
      ["recommendedUses", alias.recommendedUses],
      ["discouragedUses", alias.discouragedUses],
    ] as const
  ) {
    if (values.length === 0) issues.push(`${path}.${field}: must not be empty`);
    const seen = new Set<string>();
    values.forEach((value, valueIndex) => {
      addAuthoredTextIssue(issues, `${path}.${field}[${valueIndex}]`, value);
      const normalized = normalizeGlyphSearchTerm(value);
      if (seen.has(normalized)) {
        issues.push(`${path}.${field}[${valueIndex}]: duplicates another use`);
      }
      seen.add(normalized);
    });
  }

  if (
    alias.surfaces.browser.posture !== "supported" &&
    alias.surfaces.browser.posture !== "caution" &&
    alias.surfaces.browser.posture !== "reference-only"
  ) {
    issues.push(
      `${path}.surfaces.browser.posture: unknown value ${
        JSON.stringify(alias.surfaces.browser.posture)
      }`,
    );
  }
  addAuthoredTextIssue(
    issues,
    `${path}.surfaces.browser.guidance`,
    alias.surfaces.browser.guidance,
  );

  const terminal = alias.surfaces.terminal;
  addAuthoredTextIssue(
    issues,
    `${path}.surfaces.terminal.guidance`,
    terminal.guidance,
  );
  if (terminal.posture === "supported") {
    if (
      terminal.geometry !== "one-cell" && terminal.geometry !== "width-aware"
    ) {
      issues.push(
        `${path}.surfaces.terminal.geometry: unknown value ${
          JSON.stringify(terminal.geometry)
        }`,
      );
    }
    const fallback = terminal.asciiFallback;
    if (
      typeof fallback.text !== "string" ||
      fallback.text.trim() !== fallback.text ||
      !PRINTABLE_ASCII.test(fallback.text)
    ) {
      issues.push(
        `${path}.surfaces.terminal.asciiFallback.text: must be non-empty trimmed printable ASCII`,
      );
    } else if (measureText(fallback.text) < 1) {
      issues.push(
        `${path}.surfaces.terminal.asciiFallback.text: must have positive measured width`,
      );
    }
    if (!asciiFidelities.has(fallback.fidelity)) {
      issues.push(
        `${path}.surfaces.terminal.asciiFallback.fidelity: unknown value ${
          JSON.stringify(fallback.fidelity)
        }`,
      );
    }
    addAuthoredTextIssue(
      issues,
      `${path}.surfaces.terminal.asciiFallback.guidance`,
      fallback.guidance,
    );
    if (
      canonical !== undefined && terminal.geometry === "one-cell" &&
      canonical.terminalWidth !== 1
    ) {
      issues.push(
        `${path}.surfaces.terminal.geometry: cannot claim one-cell geometry for measured width ${canonical.terminalWidth}`,
      );
    }
    if (
      canonical !== undefined && fallback.widthParityRequired === true &&
      measureText(fallback.text) !== canonical.terminalWidth
    ) {
      issues.push(
        `${path}.surfaces.terminal.asciiFallback.widthParityRequired: fallback and Unicode widths differ`,
      );
    }
  } else if (terminal.posture === "reference-only") {
    if (terminal.geometry !== "width-aware") {
      issues.push(
        `${path}.surfaces.terminal.geometry: reference-only aliases must stay width-aware`,
      );
    }
    if ("asciiFallback" in terminal) {
      issues.push(
        `${path}.surfaces.terminal.asciiFallback: reference-only aliases do not declare CLI support`,
      );
    }
  } else {
    issues.push(
      `${path}.surfaces.terminal.posture: unknown value ${
        JSON.stringify((terminal as { posture?: unknown }).posture)
      }`,
    );
  }
  if (alias.recommendation.state === "reference-only") {
    if (alias.surfaces.browser.posture !== "reference-only") {
      issues.push(
        `${path}.surfaces.browser.posture: reference-only recommendations must remain reference-only on the browser surface`,
      );
    }
    if (terminal.posture !== "reference-only") {
      issues.push(
        `${path}.surfaces.terminal.posture: reference-only recommendations do not declare CLI support`,
      );
    }
  }
}

/**
 * Validate the complete canonical and curated populations, throwing one
 * aggregate error whose issue paths identify the offending glyph and field.
 */
export function validateGlyphAtlas(data: GlyphAtlasValidationInput): void {
  const issues: string[] = [];
  validateSourceDeclarations(issues);

  const canonicalIds = new Set<string>();
  const canonicalById = new Map<string, CanonicalGlyphRecord>();
  data.canonical.forEach((record, index) => {
    validateCanonicalRecord(issues, record, index);
    if (canonicalIds.has(record.id)) {
      issues.push(
        `canonical ${record.id}.id: duplicates another canonical record`,
      );
    }
    canonicalIds.add(record.id);
    canonicalById.set(record.id, record);
  });

  const aliasNames = new Set<string>();
  data.aliases.forEach((alias, index) => {
    validateAlias(issues, alias, index, canonicalById);
    if (aliasNames.has(alias.name)) {
      issues.push(`alias ${alias.name}.name: duplicates another curated name`);
    }
    aliasNames.add(alias.name);
  });

  if (issues.length > 0) throw new GlyphAtlasValidationError(issues);
}
