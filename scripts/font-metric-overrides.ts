interface WeightRange {
  readonly minimum: number;
  readonly maximum: number;
}

interface FontFaceRecord {
  readonly family: string;
  readonly style: string;
  readonly weight: WeightRange;
  readonly sources: readonly FontSourceRecord[];
  readonly sizeAdjust: number | undefined;
  readonly ascentOverride: number | undefined;
  readonly descentOverride: number | undefined;
  readonly lineGapOverride: number | undefined;
}

interface FontSourceRecord {
  readonly kind: "local" | "url";
  readonly value: string;
}

interface CssDeclaration {
  readonly name: string;
  readonly value: string;
}

interface ParsedFontFaces {
  readonly faces: readonly FontFaceRecord[];
  readonly failures: readonly string[];
}

interface TargetFontMetricAuthority {
  readonly family: string;
  readonly fallbackPrefix: string;
  readonly bundledFaces: readonly {
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
        source: "./fonts/crimson-pro-roman.woff2",
        sha256:
          "20ce4189b9e41b3439a2a36dd63deff44b6d91182532202cb96b65521b4a3c23",
        style: "normal",
        weight: { minimum: 200, maximum: 900 },
      },
      {
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

function cssEscapeEnd(value: string, start: number): number {
  let position = start + 1;
  if (position >= value.length) return position;
  if (/[0-9a-f]/i.test(value[position] ?? "")) {
    let digits = 0;
    while (
      position < value.length && digits < 6 &&
      /[0-9a-f]/i.test(value[position] ?? "")
    ) {
      position += 1;
      digits += 1;
    }
    if (/\s/.test(value[position] ?? "")) position += 1;
    return position;
  }
  if (value[position] === "\r" && value[position + 1] === "\n") {
    return position + 2;
  }
  return position + 1;
}

function decodeCssEscapes(value: string): string {
  let decoded = "";
  let position = 0;
  while (position < value.length) {
    if (value[position] !== "\\") {
      decoded += value[position] ?? "";
      position += 1;
      continue;
    }
    const end = cssEscapeEnd(value, position);
    const escaped = value.slice(position + 1, end);
    const hexadecimal = escaped.match(/^([0-9a-f]{1,6})/i)?.[1];
    if (hexadecimal !== undefined) {
      const codePoint = Number.parseInt(hexadecimal, 16);
      decoded += codePoint === 0 || codePoint > 0x10ffff
        ? "\uFFFD"
        : String.fromCodePoint(codePoint);
    } else if (!/^[\r\n\f]/.test(escaped)) {
      decoded += escaped[0] ?? "";
    }
    position = end;
  }
  return decoded;
}

function cssIdentifier(
  value: string,
  start: number,
): { readonly end: number; readonly value: string } | undefined {
  const first = value[start] ?? "";
  if (
    !/[-_a-z]/i.test(first) &&
    first !== "\\" &&
    (first.codePointAt(0) ?? 0) < 0x80
  ) {
    return undefined;
  }
  let position = start;
  while (position < value.length) {
    const character = value[position] ?? "";
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
      continue;
    }
    if (
      /[-_a-z0-9]/i.test(character) ||
      (character.codePointAt(0) ?? 0) >= 0x80
    ) {
      position += 1;
      continue;
    }
    break;
  }
  return {
    end: position,
    value: decodeCssEscapes(value.slice(start, position)),
  };
}

function skipCssString(value: string, start: number): number {
  const quote = value[start];
  let position = start + 1;
  while (position < value.length) {
    const character = value[position];
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
    } else {
      position += 1;
      if (character === quote) break;
    }
  }
  return position;
}

function stripCssComments(
  value: string,
): { readonly css: string; readonly failures: readonly string[] } {
  const chunks: string[] = [];
  const failures: string[] = [];
  let position = 0;
  while (position < value.length) {
    const character = value[position];
    if (character === "'" || character === '"') {
      const end = skipCssString(value, position);
      chunks.push(value.slice(position, end));
      position = end;
      continue;
    }
    if (character === "\\") {
      const end = cssEscapeEnd(value, position);
      chunks.push(value.slice(position, end));
      position = end;
      continue;
    }
    if (character === "/" && value[position + 1] === "*") {
      const commentEnd = value.indexOf("*/", position + 2);
      if (commentEnd < 0) {
        chunks.push(" ".repeat(value.length - position));
        failures.push("font CSS has an unterminated comment");
        break;
      }
      const end = commentEnd + 2;
      chunks.push(" ".repeat(end - position));
      position = end;
      continue;
    }
    chunks.push(character ?? "");
    position += 1;
  }
  return { css: chunks.join(""), failures };
}

function matchingBlockEnd(value: string, start: number): number | undefined {
  let depth = 1;
  let position = start + 1;
  while (position < value.length) {
    const character = value[position];
    if (character === "'" || character === '"') {
      position = skipCssString(value, position);
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return position;
    }
    position += 1;
  }
  return undefined;
}

function fontFaceBlocks(
  css: string,
): {
  readonly blocks: readonly string[];
  readonly failures: readonly string[];
} {
  const stripped = stripCssComments(css);
  const blocks: string[] = [];
  const failures = [...stripped.failures];
  let position = 0;
  while (position < stripped.css.length) {
    const character = stripped.css[position];
    if (character === "'" || character === '"') {
      position = skipCssString(stripped.css, position);
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(stripped.css, position);
      continue;
    }
    if (character !== "@") {
      position += 1;
      continue;
    }
    const name = cssIdentifier(stripped.css, position + 1);
    if (name === undefined) {
      position += 1;
      continue;
    }
    position = name.end;
    if (name.value.toLowerCase() !== "font-face") continue;
    while (/\s/.test(stripped.css[position] ?? "")) position += 1;
    if (stripped.css[position] !== "{") continue;
    const end = matchingBlockEnd(stripped.css, position);
    if (end === undefined) {
      failures.push("@font-face has an unterminated declaration block");
      break;
    }
    blocks.push(stripped.css.slice(position + 1, end));
    position = end + 1;
  }
  return { blocks, failures };
}

function cssDeclarations(block: string): CssDeclaration[] {
  const declarations: CssDeclaration[] = [];
  let position = 0;
  while (position < block.length) {
    while (
      position < block.length &&
      (/\s/.test(block[position] ?? "") || block[position] === ";")
    ) {
      position += 1;
    }
    const property = cssIdentifier(block, position);
    if (property === undefined) {
      position += 1;
      continue;
    }
    position = property.end;
    while (/\s/.test(block[position] ?? "")) position += 1;
    if (block[position] !== ":") {
      while (position < block.length && block[position] !== ";") position += 1;
      continue;
    }
    position += 1;
    const valueStart = position;
    let roundDepth = 0;
    let squareDepth = 0;
    let curlyDepth = 0;
    while (position < block.length) {
      const character = block[position];
      if (character === "'" || character === '"') {
        position = skipCssString(block, position);
        continue;
      }
      if (character === "\\") {
        position = cssEscapeEnd(block, position);
        continue;
      }
      if (character === "(") roundDepth += 1;
      else if (character === ")") roundDepth = Math.max(0, roundDepth - 1);
      else if (character === "[") squareDepth += 1;
      else if (character === "]") squareDepth = Math.max(0, squareDepth - 1);
      else if (character === "{") curlyDepth += 1;
      else if (character === "}") curlyDepth = Math.max(0, curlyDepth - 1);
      else if (
        character === ";" &&
        roundDepth === 0 &&
        squareDepth === 0 &&
        curlyDepth === 0
      ) {
        break;
      }
      position += 1;
    }
    declarations.push({
      name: property.value.toLowerCase(),
      value: block.slice(valueStart, position).trim(),
    });
    if (block[position] === ";") position += 1;
  }
  return declarations;
}

function descriptor(
  declarations: readonly CssDeclaration[],
  name: string,
): string | undefined {
  return declarations.findLast((declaration) => declaration.name === name)
    ?.value;
}

function descriptorText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : sourceFunctionValue(value);
}

function sourceFunctionValue(argument: string): string | undefined {
  const trimmed = argument.trim();
  const quote = trimmed[0];
  if (quote === "'" || quote === '"') {
    if (trimmed.at(-1) !== quote || trimmed.length < 2) return undefined;
    return decodeCssEscapes(trimmed.slice(1, -1));
  }
  return trimmed === "" ? undefined : decodeCssEscapes(trimmed);
}

function fontSources(value: string | undefined): readonly FontSourceRecord[] {
  if (value === undefined) return [];
  const sources: FontSourceRecord[] = [];
  let position = 0;
  while (position < value.length) {
    const identifier = cssIdentifier(value, position);
    if (identifier === undefined) {
      position += 1;
      continue;
    }
    position = identifier.end;
    const name = identifier.value.toLowerCase();
    while (/\s/.test(value[position] ?? "")) position += 1;
    if (value[position] !== "(") continue;
    position += 1;
    const argumentStart = position;
    let depth = 1;
    let quote: "'" | '"' | undefined;
    while (position < value.length && depth > 0) {
      const character = value[position];
      if (character === "\\") {
        position = cssEscapeEnd(value, position);
        continue;
      }
      if (quote !== undefined) {
        if (character === quote) quote = undefined;
      } else if (character === "'" || character === '"') {
        quote = character;
      } else if (character === "(") {
        depth += 1;
      } else if (character === ")") {
        depth -= 1;
      }
      position += 1;
    }
    if (depth !== 0 || quote !== undefined) break;
    if (name !== "url" && name !== "local") continue;
    const source = sourceFunctionValue(
      value.slice(argumentStart, position - 1),
    );
    if (source !== undefined) {
      sources.push({ kind: name, value: source });
    }
  }
  return sources;
}

function percentage(value: string | undefined): number | undefined {
  const match = value?.match(/^(\d+(?:\.\d+)?)%$/);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function weightRange(value: string | undefined): WeightRange {
  const weights = value?.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [400];
  const minimum = weights[0] ?? 400;
  return {
    minimum,
    maximum: weights[1] ?? minimum,
  };
}

function fontFaces(css: string): ParsedFontFaces {
  const parsedBlocks = fontFaceBlocks(css);
  const failures = [...parsedBlocks.failures];
  const faces = parsedBlocks.blocks.flatMap((block) => {
    const declarations = cssDeclarations(block);
    const family = descriptorText(descriptor(declarations, "font-family"));
    if (family === undefined) return [];
    for (const name of AUDITED_FONT_DESCRIPTORS) {
      if (
        declarations.filter((declaration) => declaration.name === name)
          .length > 1
      ) {
        failures.push(`${family} @font-face has duplicate ${name} descriptor`);
      }
    }
    return [{
      family,
      style: (
        descriptorText(descriptor(declarations, "font-style")) ?? "normal"
      ).toLowerCase(),
      weight: weightRange(descriptor(declarations, "font-weight")),
      sources: fontSources(descriptor(declarations, "src")),
      sizeAdjust: percentage(descriptor(declarations, "size-adjust")),
      ascentOverride: percentage(
        descriptor(declarations, "ascent-override"),
      ),
      descentOverride: percentage(
        descriptor(declarations, "descent-override"),
      ),
      lineGapOverride: percentage(
        descriptor(declarations, "line-gap-override"),
      ),
    }];
  });
  return { faces, failures };
}

function fontRoleAliases(css: string): string[] {
  const aliases = new Set<string>();
  for (
    const declaration of css.matchAll(
      /--discern-font-[-\w]+\s*:\s*([^;]+);/g,
    )
  ) {
    for (const family of (declaration[1] ?? "").matchAll(/"([^"]+)"/g)) {
      const name = family[1];
      if (name?.includes(" Fallback ") === true) aliases.add(name);
    }
  }
  return [...aliases].toSorted();
}

function authorityForAlias(
  alias: string,
): TargetFontMetricAuthority | undefined {
  return TARGET_FONT_METRICS.find(({ fallbackPrefix }) =>
    alias.startsWith(fallbackPrefix)
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
  return `${source.kind}("${source.value}")`;
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
  aliases: readonly string[],
  faces: readonly FontFaceRecord[],
): FontMetricBrowserCase[] {
  return aliases.flatMap((alias) => {
    const authority = authorityForAlias(alias);
    if (authority === undefined) return [];
    const targetFaces = faces.filter(({ family }) =>
      family === authority.family
    );
    const aliasFaces = faces.filter(({ family }) => family === alias);
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
            alias.slice(
              authority.fallbackPrefix.length,
            )
          } ${style}`,
          target: `"${authority.family}"`,
          fallback: `"${alias}"`,
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
 * Audit every metric-adjusted alias discovered from the public font-role
 * stacks. A new alias joins without being added to a second list.
 */
export function auditFontMetricOverrides(
  css: string,
): FontMetricOverrideAudit {
  const aliases = fontRoleAliases(css);
  const parsedFaces = fontFaces(css);
  const faces = parsedFaces.faces;
  const aliasFaces = faces.filter(({ family }) =>
    family.includes(" Fallback ")
  );
  const failures = [...parsedFaces.failures];

  for (const authority of TARGET_FONT_METRICS) {
    const targetFaces = faces.filter(({ family }) =>
      family === authority.family
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
    if (!aliases.includes(face.family)) {
      failures.push(
        `${describeFace(face)} is not enrolled by a public font-role stack`,
      );
    }
    const authority = authorityForAlias(face.family);
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
    const authority = authorityForAlias(alias);
    if (authority === undefined) {
      failures.push(`${alias} has no target metric authority`);
      continue;
    }
    const enrolledFaces = aliasFaces.filter(({ family }) => family === alias);
    if (enrolledFaces.length === 0) {
      failures.push(`${alias} has no @font-face declarations`);
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
            `${alias} ${style} has overlapping or duplicate weight faces ${previous.minimum}–${previous.maximum} and ${current.minimum}–${current.maximum}`,
          );
        }
      }
    }
    const targetFaces = faces.filter(({ family }) =>
      family === authority.family
    );
    for (const targetFace of targetFaces) {
      const matchingRanges = enrolledFaces
        .filter(({ style }) => style === targetFace.style)
        .map(({ weight }) => weight);
      if (matchingRanges.length === 0) {
        const article = /^[aeiou]/i.test(targetFace.style) ? "an" : "a";
        failures.push(
          `${alias} is missing ${article} ${targetFace.style} face for bundled ${authority.family}`,
        );
      } else if (!covers(matchingRanges, targetFace.weight)) {
        failures.push(
          `${alias} ${targetFace.style} faces do not cover bundled ${authority.family} weights ${targetFace.weight.minimum}–${targetFace.weight.maximum}`,
        );
      }
    }
  }

  return {
    aliases,
    browserCases: browserCases(aliases, faces),
    faces: aliasFaces.length,
    failures,
  };
}
