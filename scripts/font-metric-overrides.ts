import {
  cssAtRuleBlocks,
  cssAtRuleNames,
  cssDeclarations,
  cssEscapeEnd,
  cssIdentifier,
  decodeCssEscapes,
  skipCssString,
  stripCssComments,
} from "./css-syntax.ts";
import type { CssDeclaration } from "./css-syntax.ts";

interface WeightRange {
  readonly minimum: number;
  readonly maximum: number;
}

interface FontFaceRecord {
  readonly family: string;
  readonly familyIdentity: string;
  readonly style: string;
  readonly weight: WeightRange;
  readonly sources: readonly FontSourceRecord[];
  readonly sizeAdjust: number | undefined;
  readonly ascentOverride: number | undefined;
  readonly descentOverride: number | undefined;
  readonly lineGapOverride: number | undefined;
}

interface LocalFontSourceRecord {
  readonly kind: "local";
  readonly value: string;
}

interface UrlFontSourceRecord {
  readonly format: string;
  readonly kind: "url";
  readonly value: string;
}

type FontSourceRecord = LocalFontSourceRecord | UrlFontSourceRecord;

interface ParsedFontFaces {
  readonly faces: readonly FontFaceRecord[];
  readonly failures: readonly string[];
}

/** Browser-normalized descriptors for one CSSOM font-face rule. */
export interface FontMetricCssomFace {
  readonly context: readonly string[];
  readonly descriptors: {
    readonly ascentOverride: string;
    readonly descentOverride: string;
    readonly family: string;
    readonly lineGapOverride: string;
    readonly sizeAdjust: string;
    readonly source: string;
    readonly style: string;
    readonly weight: string;
  };
}

/** CSSOM font-face population and browser extraction failures. */
export interface FontMetricCssomSnapshot {
  readonly faces: readonly FontMetricCssomFace[];
  readonly failures: readonly string[];
}

interface TargetFontMetricAuthority {
  readonly family: string;
  readonly fallbackPrefix: string;
  readonly bundledFaces: readonly {
    readonly format: string;
    readonly source: string;
    readonly sha256: string;
    readonly style: string;
    readonly weight: WeightRange;
  }[];
  readonly ascentPercent: number;
  readonly descentPercent: number;
  readonly lineGapPercent: number;
  readonly probeWeights: readonly number[];
}

/**
 * Target vertical metrics recorded from the bundled target font faces. CSS
 * Fonts scales @font-face metric overrides by size-adjust, so the audit
 * compares each effective override with these source-font percentages. Each
 * digest binds that claim to the inspected bytes; replacing a face requires
 * re-reading its OS/2 and hhea metrics before updating both values.
 */
const TARGET_FONT_METRICS: readonly TargetFontMetricAuthority[] = [
  {
    family: "Crimson Pro",
    fallbackPrefix: "Discern Crimson Fallback ",
    bundledFaces: [
      {
        format: "woff2",
        source: "./fonts/crimson-pro-roman.woff2",
        sha256:
          "20ce4189b9e41b3439a2a36dd63deff44b6d91182532202cb96b65521b4a3c23",
        style: "normal",
        weight: { minimum: 200, maximum: 900 },
      },
      {
        format: "woff2",
        source: "./fonts/crimson-pro-italic.woff2",
        sha256:
          "b3faa8f9ce36db53253e11fb107d77b983150c5c21dc8fcf3906234530ab69f2",
        style: "italic",
        weight: { minimum: 200, maximum: 900 },
      },
    ],
    ascentPercent: 90,
    descentPercent: 21,
    lineGapPercent: 0,
    probeWeights: [400, 700],
  },
  {
    family: "Inter",
    fallbackPrefix: "Discern Inter Fallback ",
    bundledFaces: [{
      format: "woff2",
      source: "./fonts/inter.woff2",
      sha256:
        "c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4",
      style: "normal",
      weight: { minimum: 400, maximum: 700 },
    }],
    ascentPercent: 97,
    descentPercent: 24,
    lineGapPercent: 0,
    probeWeights: [400, 650],
  },
] as const;

const METRIC_TOLERANCE_PERCENT = 0.01;
const AUDITED_FONT_DESCRIPTORS = new Set([
  "font-family",
  "font-style",
  "font-weight",
  "src",
  "size-adjust",
  "ascent-override",
  "descent-override",
  "line-gap-override",
]);

/** CSSOM grouping-rule contexts in which font-face rules remain live. */
export const fontMetricCssomGroupingRules = [
  "CSSMediaRule",
  "CSSSupportsRule",
  "CSSContainerRule",
  "CSSLayerBlockRule",
  "CSSScopeRule",
] as const;

/** Deterministic source-level evidence for metric-adjusted local aliases. */
export interface FontMetricOverrideAudit {
  readonly aliases: readonly string[];
  readonly browserCases: readonly FontMetricBrowserCase[];
  readonly faces: number;
  readonly failures: readonly string[];
}

/** One metric-adjusted alias/style population for live browser measurement. */
export interface FontMetricBrowserCase {
  readonly name: string;
  readonly target: string;
  readonly fallback: string;
  readonly style: string;
  readonly weights: readonly number[];
}

/** Bytes supplied for one target face named by the metric authority. */
export interface BundledFontMetricAsset {
  readonly source: string;
  readonly bytes: Uint8Array;
}

function descriptor(
  declarations: readonly CssDeclaration[],
  name: string,
): string | undefined {
  return declarations.findLast((declaration) => declaration.name === name)
    ?.value;
}

const CSS_WHITESPACE = /[\t\n\f\r ]/;
const CSS_WHITESPACE_RUN = /[\t\n\f\r ]+/g;

interface FontFamilyRecord {
  readonly identity: string;
  readonly name: string;
  readonly syntax: "quoted" | "unquoted";
}

interface ParsedCssFunction {
  readonly argument: string;
  readonly end: number;
  readonly name: string;
}

interface ParsedFontSources {
  readonly sources: readonly FontSourceRecord[];
  readonly valid: boolean;
}

function skipCssWhitespace(value: string, start: number): number {
  let position = start;
  while (CSS_WHITESPACE.test(value[position] ?? "")) position += 1;
  return position;
}

function trimCssWhitespace(value: string): string {
  const start = skipCssWhitespace(value, 0);
  let end = value.length;
  while (end > start && CSS_WHITESPACE.test(value[end - 1] ?? "")) end -= 1;
  return value.slice(start, end);
}

function fontFamilyIdentity(value: string): string {
  return value.toLowerCase();
}

function cssStringValue(
  value: string,
  start: number,
): { readonly end: number; readonly value: string } | undefined {
  const quote = value[start];
  if (quote !== "'" && quote !== '"') return undefined;
  const end = skipCssString(value, start);
  if (end > value.length || value[end - 1] !== quote) return undefined;
  return {
    end,
    value: decodeCssEscapes(value.slice(start + 1, end - 1)),
  };
}

function fontFamily(value: string | undefined): FontFamilyRecord | undefined {
  if (value === undefined) return undefined;
  let position = skipCssWhitespace(value, 0);
  const quoted = cssStringValue(value, position);
  if (quoted !== undefined) {
    position = skipCssWhitespace(value, quoted.end);
    if (position !== value.length) return undefined;
    const name = quoted.value;
    return name === ""
      ? undefined
      : { identity: fontFamilyIdentity(name), name, syntax: "quoted" };
  }

  const words: string[] = [];
  while (position < value.length) {
    const word = cssIdentifier(value, position);
    if (word === undefined) return undefined;
    words.push(word.value);
    const afterWord = word.end;
    position = skipCssWhitespace(value, afterWord);
    if (position === afterWord && position < value.length) return undefined;
  }
  const name = words.join(" ");
  return name === ""
    ? undefined
    : { identity: fontFamilyIdentity(name), name, syntax: "unquoted" };
}

function cssFunction(
  value: string,
  start: number,
): ParsedCssFunction | undefined {
  const identifier = cssIdentifier(value, start);
  if (identifier === undefined) return undefined;
  let position = identifier.end;
  if (value[position] !== "(") return undefined;
  const argumentStart = position + 1;
  position = argumentStart;
  let depth = 1;
  while (position < value.length) {
    const character = value[position];
    if (character === "'" || character === '"') {
      const end = skipCssString(value, position);
      if (end > value.length || value[end - 1] !== character) return undefined;
      position = end;
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
      continue;
    }
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          argument: value.slice(argumentStart, position),
          end: position + 1,
          name: identifier.value.toLowerCase(),
        };
      }
    }
    position += 1;
  }
  return undefined;
}

function sourceFunctionValue(argument: string): string | undefined {
  const start = skipCssWhitespace(argument, 0);
  const quoted = cssStringValue(argument, start);
  if (quoted !== undefined) {
    return skipCssWhitespace(argument, quoted.end) === argument.length
      ? quoted.value
      : undefined;
  }
  const trimmed = trimCssWhitespace(argument);
  if (trimmed === "") return undefined;
  let position = 0;
  while (position < trimmed.length) {
    const character = trimmed[position];
    if (
      character === "'" ||
      character === '"' ||
      character === "(" ||
      character === ")" ||
      CSS_WHITESPACE.test(character ?? "") ||
      (character?.codePointAt(0) ?? 0) < 0x20
    ) {
      return undefined;
    }
    position = character === "\\"
      ? cssEscapeEnd(trimmed, position)
      : position + 1;
  }
  return decodeCssEscapes(trimmed);
}

function fontSourceFormat(argument: string): string | undefined {
  const trimmed = trimCssWhitespace(argument);
  if (trimmed === "") return undefined;
  const quoted = cssStringValue(trimmed, 0);
  if (quoted !== undefined) {
    return quoted.end === trimmed.length
      ? quoted.value.toLowerCase()
      : undefined;
  }
  const identifier = cssIdentifier(trimmed, 0);
  return identifier !== undefined && identifier.end === trimmed.length
    ? identifier.value.toLowerCase()
    : undefined;
}

function fontSources(value: string | undefined): ParsedFontSources {
  if (value === undefined) return { sources: [], valid: false };
  const sources: FontSourceRecord[] = [];
  let position = skipCssWhitespace(value, 0);
  if (position === value.length) return { sources, valid: false };
  while (position < value.length) {
    const sourceFunction = cssFunction(value, position);
    if (
      sourceFunction === undefined ||
      (sourceFunction.name !== "url" && sourceFunction.name !== "local")
    ) {
      return { sources, valid: false };
    }
    const source = sourceFunction.name === "url"
      ? sourceFunctionValue(sourceFunction.argument)
      : fontFamily(sourceFunction.argument)?.name;
    if (source === undefined) return { sources, valid: false };
    position = skipCssWhitespace(value, sourceFunction.end);

    if (sourceFunction.name === "url") {
      const modifier = cssFunction(value, position);
      if (modifier === undefined || modifier.name !== "format") {
        return { sources, valid: false };
      }
      const format = fontSourceFormat(modifier.argument);
      if (format === undefined) return { sources, valid: false };
      sources.push({ format, kind: "url", value: source });
      position = skipCssWhitespace(value, modifier.end);
    } else {
      sources.push({ kind: "local", value: source });
    }
    if (position < value.length && value[position] !== ",") {
      return { sources, valid: false };
    }
    if (position === value.length) return { sources, valid: true };
    position = skipCssWhitespace(value, position + 1);
    if (position === value.length) return { sources, valid: false };
  }
  return { sources, valid: true };
}

function percentage(value: string | undefined): number | undefined {
  const match = trimCssWhitespace(value ?? "").match(
    /^(\d+(?:\.\d+)?|\.\d+)%$/,
  );
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function fontStyle(value: string | undefined): string | undefined {
  if (value === undefined) return "normal";
  const trimmed = trimCssWhitespace(value);
  const identifier = cssIdentifier(trimmed, 0);
  if (identifier === undefined) return undefined;
  const keyword = identifier.value.toLowerCase();
  const remainder = trimCssWhitespace(trimmed.slice(identifier.end));
  if (keyword === "normal" || keyword === "italic") {
    return remainder === "" ? keyword : undefined;
  }
  if (keyword !== "oblique") return undefined;
  if (remainder === "") return keyword;
  const angles = remainder.split(CSS_WHITESPACE_RUN);
  if (
    angles.length > 2 ||
    angles.some((angle) =>
      !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|grad|rad|turn)$/i.test(angle)
    )
  ) {
    return undefined;
  }
  return `${keyword} ${angles.map((angle) => angle.toLowerCase()).join(" ")}`;
}

function weightRange(value: string | undefined): WeightRange | undefined {
  if (value === undefined) return { minimum: 400, maximum: 400 };
  const trimmed = trimCssWhitespace(value);
  const keyword = cssIdentifier(trimmed, 0);
  if (keyword !== undefined && keyword.end === trimmed.length) {
    if (keyword.value.toLowerCase() === "normal") {
      return { minimum: 400, maximum: 400 };
    }
    if (keyword.value.toLowerCase() === "bold") {
      return { minimum: 700, maximum: 700 };
    }
    return undefined;
  }
  const match = trimmed.match(
    /^(\d+(?:\.\d+)?|\.\d+)(?:[\t\n\f\r ]+(\d+(?:\.\d+)?|\.\d+))?$/,
  );
  if (match?.[1] === undefined) return undefined;
  const minimum = Number(match[1]);
  const maximum = Number(match[2] ?? match[1]);
  if (
    minimum < 1 ||
    minimum > 1000 ||
    maximum < minimum ||
    maximum > 1000
  ) {
    return undefined;
  }
  return { minimum, maximum };
}

/** Raw-source policies that CSSOM normalization cannot retain. */
export interface FontMetricSourcePolicyAudit {
  readonly failures: readonly string[];
  readonly fontFaceRules: number;
}

/** Audit duplicate descriptors and count every authored font-face at-keyword. */
export function auditFontMetricSourcePolicy(
  css: string,
): FontMetricSourcePolicyAudit {
  const atRuleNames = cssAtRuleNames(css).map((name) => name.toLowerCase());
  const fontFaceRules =
    atRuleNames.filter((name) => name === "font-face").length;
  const importRules = atRuleNames.filter((name) => name === "import").length;
  const parsedBlocks = cssAtRuleBlocks(css, "font-face");
  const failures = [...parsedBlocks.failures];
  if (importRules > 0) {
    failures.push(
      `font source has ${importRules} @import ${
        importRules === 1 ? "rule" : "rules"
      }; inline ${
        importRules === 1 ? "that rule" : "those rules"
      } so the optional font asset stays self-contained and every live face enters the audit`,
    );
  }
  if (parsedBlocks.blocks.length !== fontFaceRules) {
    failures.push(
      `font source policy parsed ${parsedBlocks.blocks.length} of ${fontFaceRules} authored @font-face rules`,
    );
  }
  for (const { block } of parsedBlocks.blocks) {
    const declarations = cssDeclarations(block);
    const family = fontFamily(descriptor(declarations, "font-family"));
    const label = family === undefined
      ? "@font-face"
      : `${family.name} @font-face`;
    if (family === undefined) {
      failures.push("@font-face has invalid font-family descriptor");
    }
    for (const name of AUDITED_FONT_DESCRIPTORS) {
      if (
        declarations.filter((declaration) => declaration.name === name)
          .length > 1
      ) {
        failures.push(`${label} has duplicate ${name} descriptor`);
      }
    }
    if (fontStyle(descriptor(declarations, "font-style")) === undefined) {
      failures.push(`${label} has invalid font-style descriptor`);
    }
    if (weightRange(descriptor(declarations, "font-weight")) === undefined) {
      failures.push(`${label} has invalid font-weight descriptor`);
    }
    if (!fontSources(descriptor(declarations, "src")).valid) {
      failures.push(`${label} has invalid src descriptor`);
    }
    for (
      const [name, value] of [
        ["size-adjust", descriptor(declarations, "size-adjust")],
        ["ascent-override", descriptor(declarations, "ascent-override")],
        ["descent-override", descriptor(declarations, "descent-override")],
        ["line-gap-override", descriptor(declarations, "line-gap-override")],
      ] as const
    ) {
      if (value !== undefined && percentage(value) === undefined) {
        failures.push(`${label} has invalid ${name} descriptor`);
      }
    }
  }
  return { failures, fontFaceRules };
}

function optionalCssomDescriptor(value: string): string | undefined {
  return value === "" ? undefined : value;
}

function fontFaces(snapshot: FontMetricCssomSnapshot): ParsedFontFaces {
  const failures = [...snapshot.failures];
  const allowedContexts = new Set<string>(fontMetricCssomGroupingRules);
  const faces = snapshot.faces.flatMap(({ context, descriptors }) => {
    const unsupportedContext = context.find((name) =>
      !allowedContexts.has(name)
    );
    if (unsupportedContext !== undefined) {
      failures.push(
        `@font-face has unsupported CSSOM context ${context.join(" > ")}`,
      );
      return [];
    }
    const parsedFamily = fontFamily(
      optionalCssomDescriptor(descriptors.family),
    );
    if (parsedFamily === undefined) {
      failures.push("@font-face has invalid font-family descriptor");
      return [];
    }
    const style = fontStyle(optionalCssomDescriptor(descriptors.style));
    if (style === undefined) {
      failures.push(
        `${parsedFamily.name} @font-face has invalid font-style descriptor`,
      );
      return [];
    }
    const weight = weightRange(optionalCssomDescriptor(descriptors.weight));
    if (weight === undefined) {
      failures.push(
        `${parsedFamily.name} @font-face has invalid font-weight descriptor`,
      );
      return [];
    }
    const parsedSources = fontSources(
      optionalCssomDescriptor(descriptors.source),
    );
    if (!parsedSources.valid) {
      failures.push(
        `${parsedFamily.name} @font-face has invalid src descriptor`,
      );
      return [];
    }
    const metricDescriptors = [
      ["size-adjust", optionalCssomDescriptor(descriptors.sizeAdjust)],
      ["ascent-override", optionalCssomDescriptor(descriptors.ascentOverride)],
      [
        "descent-override",
        optionalCssomDescriptor(descriptors.descentOverride),
      ],
      [
        "line-gap-override",
        optionalCssomDescriptor(descriptors.lineGapOverride),
      ],
    ] as const;
    for (const [name, value] of metricDescriptors) {
      if (value !== undefined && percentage(value) === undefined) {
        failures.push(
          `${parsedFamily.name} @font-face has invalid ${name} descriptor`,
        );
      }
    }
    return [{
      family: parsedFamily.name,
      familyIdentity: parsedFamily.identity,
      style,
      weight,
      sources: parsedSources.sources,
      sizeAdjust: percentage(optionalCssomDescriptor(descriptors.sizeAdjust)),
      ascentOverride: percentage(
        optionalCssomDescriptor(descriptors.ascentOverride),
      ),
      descentOverride: percentage(
        optionalCssomDescriptor(descriptors.descentOverride),
      ),
      lineGapOverride: percentage(
        optionalCssomDescriptor(descriptors.lineGapOverride),
      ),
    }];
  });
  return { faces, failures };
}

function cssCommaSeparated(value: string): readonly string[] | undefined {
  const parts: string[] = [];
  let start = 0;
  let position = 0;
  let depth = 0;
  while (position < value.length) {
    const character = value[position];
    if (character === "'" || character === '"') {
      const end = skipCssString(value, position);
      if (end > value.length || value[end - 1] !== character) return undefined;
      position = end;
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
      continue;
    }
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) return undefined;
    } else if (character === "," && depth === 0) {
      const part = trimCssWhitespace(value.slice(start, position));
      if (part === "") return undefined;
      parts.push(part);
      start = position + 1;
    }
    position += 1;
  }
  if (depth !== 0) return undefined;
  const part = trimCssWhitespace(value.slice(start));
  if (part === "") return undefined;
  parts.push(part);
  return parts;
}

function fontRoleAliases(css: string): FontFamilyRecord[] {
  const aliases = new Map<string, FontFamilyRecord>();
  const stripped = stripCssComments(css).css;
  for (
    const declaration of stripped.matchAll(
      /--discern-font-[-\w]+\s*:\s*([^;]+);/g,
    )
  ) {
    for (const value of cssCommaSeparated(declaration[1] ?? "") ?? []) {
      const family = fontFamily(value);
      if (
        family !== undefined &&
        family.identity.includes(" fallback ") &&
        !aliases.has(family.identity)
      ) {
        aliases.set(family.identity, family);
      }
    }
  }
  return [...aliases.values()].toSorted((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function authorityForAliasIdentity(
  identity: string,
): TargetFontMetricAuthority | undefined {
  return TARGET_FONT_METRICS.find(({ fallbackPrefix }) =>
    identity.startsWith(fontFamilyIdentity(fallbackPrefix))
  );
}

function effectiveMetric(
  sizeAdjust: number,
  override: number,
): number {
  return sizeAdjust * override / 100;
}

function describeFace(face: FontFaceRecord): string {
  return `${face.family} ${face.style} ${face.weight.minimum}–${face.weight.maximum}`;
}

function sameWeight(left: WeightRange, right: WeightRange): boolean {
  return left.minimum === right.minimum && left.maximum === right.maximum;
}

function describeSource(source: FontSourceRecord): string {
  return source.kind === "url"
    ? `url("${source.value}") format("${source.format}")`
    : `local("${source.value}")`;
}

function covers(
  ranges: readonly WeightRange[],
  target: WeightRange,
): boolean {
  let next = target.minimum;
  for (
    const range of [...ranges].toSorted((left, right) =>
      left.minimum - right.minimum
    )
  ) {
    if (range.maximum < next) continue;
    if (range.minimum > next) return false;
    next = Math.max(next, range.maximum + 1);
    if (next > target.maximum) return true;
  }
  return next > target.maximum;
}

function browserCases(
  aliases: readonly FontFamilyRecord[],
  faces: readonly FontFaceRecord[],
): FontMetricBrowserCase[] {
  return aliases.flatMap((alias) => {
    const authority = authorityForAliasIdentity(alias.identity);
    if (authority === undefined) return [];
    const targetIdentity = fontFamilyIdentity(authority.family);
    const targetFaces = faces.filter(({ familyIdentity }) =>
      familyIdentity === targetIdentity
    );
    const aliasFaces = faces.filter(({ familyIdentity }) =>
      familyIdentity === alias.identity
    );
    return [...new Set(targetFaces.map(({ style }) => style))]
      .toSorted()
      .flatMap((style) => {
        const targetRanges = targetFaces
          .filter((face) => face.style === style)
          .map(({ weight }) => weight);
        const aliasRanges = aliasFaces
          .filter((face) => face.style === style)
          .map(({ weight }) => weight);
        const weights = authority.probeWeights.filter((weight) =>
          targetRanges.some((range) =>
            weight >= range.minimum && weight <= range.maximum
          ) &&
          aliasRanges.some((range) =>
            weight >= range.minimum && weight <= range.maximum
          )
        );
        if (weights.length === 0) return [];
        return [{
          name: `${authority.family}/${
            alias.name.slice(
              authority.fallbackPrefix.length,
            )
          } ${style}`,
          target: `"${authority.family}"`,
          fallback: `"${alias.name}"`,
          style,
          weights,
        }];
      });
  });
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** The target-face population owned by the metric authority. */
export function bundledFontMetricSources(): readonly string[] {
  return TARGET_FONT_METRICS.flatMap(({ bundledFaces }) =>
    bundledFaces.map(({ source }) => source)
  );
}

/**
 * Verify that every target metric claim still names the bytes from which its
 * percentages were established.
 */
export async function auditBundledFontMetricAssets(
  assets: readonly BundledFontMetricAsset[],
): Promise<readonly string[]> {
  const failures: string[] = [];
  const bySource = new Map<string, Uint8Array>();
  for (const asset of assets) {
    if (bySource.has(asset.source)) {
      failures.push(`duplicate target font asset ${asset.source}`);
    } else {
      bySource.set(asset.source, asset.bytes);
    }
  }
  for (const authority of TARGET_FONT_METRICS) {
    for (const face of authority.bundledFaces) {
      const bytes = bySource.get(face.source);
      if (bytes === undefined) {
        failures.push(
          `${authority.family} target metric authority is missing bytes for ${face.source}`,
        );
        continue;
      }
      const actual = await sha256(bytes);
      if (actual !== face.sha256) {
        failures.push(
          `${authority.family} target metric authority expects ${face.source} digest ${face.sha256}, found ${actual}; re-measure the font before updating the authority`,
        );
      }
    }
  }
  return failures;
}

/**
 * Audit every metric-adjusted alias against a browser CSSOM face snapshot.
 * A new alias joins from the public font-role stacks.
 */
export function auditFontMetricOverrides(
  css: string,
  snapshot: FontMetricCssomSnapshot,
): FontMetricOverrideAudit {
  const aliases = fontRoleAliases(css);
  const aliasIdentities = new Set(aliases.map(({ identity }) => identity));
  const sourcePolicy = auditFontMetricSourcePolicy(css);
  const parsedFaces = fontFaces(snapshot);
  const faces = parsedFaces.faces;
  const aliasFaces = faces.filter(({ familyIdentity }) =>
    familyIdentity.includes(" fallback ")
  );
  const failures = [...sourcePolicy.failures, ...parsedFaces.failures];
  if (sourcePolicy.fontFaceRules !== snapshot.faces.length) {
    failures.push(
      `browser CSSOM retained ${snapshot.faces.length} of ${sourcePolicy.fontFaceRules} authored @font-face rules`,
    );
  }

  for (const authority of TARGET_FONT_METRICS) {
    const targetIdentity = fontFamilyIdentity(authority.family);
    const targetFaces = faces.filter(({ familyIdentity }) =>
      familyIdentity === targetIdentity
    );
    const liveSources = targetFaces.flatMap((face) =>
      face.sources.map((source) => ({ face, source }))
    );
    for (const face of targetFaces) {
      if (face.sources.length === 0) {
        failures.push(
          `${describeFace(face)} has no parseable target font source`,
        );
      }
    }
    for (const live of liveSources) {
      const authorized = authority.bundledFaces.some((face) =>
        live.source.kind === "url" &&
        face.source === live.source.value &&
        face.format === live.source.format &&
        face.style === live.face.style &&
        sameWeight(face.weight, live.face.weight)
      );
      if (!authorized) {
        failures.push(
          `${describeFace(live.face)} target source ${
            describeSource(live.source)
          } has no exact metric authority`,
        );
      }
    }
    for (const authorized of authority.bundledFaces) {
      const matches = liveSources.filter(({ face, source }) =>
        source.kind === "url" &&
        source.value === authorized.source &&
        source.format === authorized.format &&
        face.style === authorized.style &&
        sameWeight(face.weight, authorized.weight)
      );
      if (matches.length === 0) {
        failures.push(
          `${authority.family} target metric authority has no live ${authorized.style} ${authorized.weight.minimum}–${authorized.weight.maximum} face for url("${authorized.source}")`,
        );
      } else if (matches.length > 1) {
        failures.push(
          `${authority.family} target metric authority matches ${matches.length} live ${authorized.style} ${authorized.weight.minimum}–${authorized.weight.maximum} faces for url("${authorized.source}")`,
        );
      }
    }
  }

  for (const face of aliasFaces) {
    if (!aliasIdentities.has(face.familyIdentity)) {
      failures.push(
        `${describeFace(face)} is not enrolled by a public font-role stack`,
      );
    }
    const authority = authorityForAliasIdentity(face.familyIdentity);
    if (authority === undefined) {
      failures.push(
        `${describeFace(face)} has no target metric authority`,
      );
      continue;
    }
    if (
      face.sizeAdjust === undefined ||
      face.ascentOverride === undefined ||
      face.descentOverride === undefined ||
      face.lineGapOverride === undefined
    ) {
      failures.push(
        `${
          describeFace(face)
        } must declare numeric size-adjust, ascent, descent, and line-gap overrides`,
      );
      continue;
    }
    for (
      const [name, override, expected] of [
        ["ascent", face.ascentOverride, authority.ascentPercent],
        ["descent", face.descentOverride, authority.descentPercent],
        ["line gap", face.lineGapOverride, authority.lineGapPercent],
      ] as const
    ) {
      const effective = effectiveMetric(face.sizeAdjust, override);
      if (Math.abs(effective - expected) > METRIC_TOLERANCE_PERCENT) {
        failures.push(
          `${describeFace(face)} effective ${name} ${
            effective.toFixed(3)
          }% does not match bundled ${authority.family} ${
            expected.toFixed(3)
          }%`,
        );
      }
    }
  }

  for (const alias of aliases) {
    const authority = authorityForAliasIdentity(alias.identity);
    if (authority === undefined) {
      failures.push(`${alias.name} has no target metric authority`);
      continue;
    }
    const enrolledFaces = aliasFaces.filter(({ familyIdentity }) =>
      familyIdentity === alias.identity
    );
    if (enrolledFaces.length === 0) {
      failures.push(`${alias.name} has no @font-face declarations`);
      continue;
    }
    for (const style of new Set(enrolledFaces.map((face) => face.style))) {
      const ranges = enrolledFaces
        .filter((face) => face.style === style)
        .map((face) => face.weight)
        .toSorted((left, right) => left.minimum - right.minimum);
      for (let index = 1; index < ranges.length; index += 1) {
        const previous = ranges[index - 1];
        const current = ranges[index];
        if (
          previous !== undefined && current !== undefined &&
          current.minimum <= previous.maximum
        ) {
          failures.push(
            `${alias.name} ${style} has overlapping or duplicate weight faces ${previous.minimum}–${previous.maximum} and ${current.minimum}–${current.maximum}`,
          );
        }
      }
    }
    const targetIdentity = fontFamilyIdentity(authority.family);
    const targetFaces = faces.filter(({ familyIdentity }) =>
      familyIdentity === targetIdentity
    );
    for (const targetFace of targetFaces) {
      const matchingRanges = enrolledFaces
        .filter(({ style }) => style === targetFace.style)
        .map(({ weight }) => weight);
      if (matchingRanges.length === 0) {
        const article = /^[aeiou]/i.test(targetFace.style) ? "an" : "a";
        failures.push(
          `${alias.name} is missing ${article} ${targetFace.style} face for bundled ${authority.family}`,
        );
      } else if (!covers(matchingRanges, targetFace.weight)) {
        failures.push(
          `${alias.name} ${targetFace.style} faces do not cover bundled ${authority.family} weights ${targetFace.weight.minimum}–${targetFace.weight.maximum}`,
        );
      }
    }
  }

  return {
    aliases: aliases.map(({ name }) => name),
    browserCases: browserCases(aliases, faces),
    faces: aliasFaces.length,
    failures,
  };
}
