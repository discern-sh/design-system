interface WeightRange {
  readonly minimum: number;
  readonly maximum: number;
}

interface FontFaceRecord {
  readonly family: string;
  readonly style: string;
  readonly weight: WeightRange;
  readonly source: string;
  readonly sizeAdjust: number | undefined;
  readonly ascentOverride: number | undefined;
  readonly descentOverride: number | undefined;
  readonly lineGapOverride: number | undefined;
}

interface TargetFontMetricAuthority {
  readonly family: string;
  readonly fallbackPrefix: string;
  readonly bundledFaces: readonly {
    readonly source: string;
    readonly sha256: string;
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
      },
      {
        source: "./fonts/crimson-pro-italic.woff2",
        sha256:
          "b3faa8f9ce36db53253e11fb107d77b983150c5c21dc8fcf3906234530ab69f2",
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
    }],
    ascentPercent: 97,
    descentPercent: 24,
    lineGapPercent: 0,
    probeWeights: [400, 650],
  },
] as const;

const METRIC_TOLERANCE_PERCENT = 0.01;

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

function descriptor(block: string, name: string): string | undefined {
  return block.match(
    new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i"),
  )?.[1]?.trim();
}

function unquote(value: string): string {
  return value.replace(/^(["'])(.*)\1$/, "$2");
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

function fontFaces(css: string): FontFaceRecord[] {
  return [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].flatMap((match) => {
    const block = match[1];
    if (block === undefined) return [];
    const family = descriptor(block, "font-family");
    if (family === undefined) return [];
    return [{
      family: unquote(family),
      style: descriptor(block, "font-style") ?? "normal",
      weight: weightRange(descriptor(block, "font-weight")),
      source: descriptor(block, "src") ?? "",
      sizeAdjust: percentage(descriptor(block, "size-adjust")),
      ascentOverride: percentage(descriptor(block, "ascent-override")),
      descentOverride: percentage(descriptor(block, "descent-override")),
      lineGapOverride: percentage(descriptor(block, "line-gap-override")),
    }];
  });
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
  const faces = fontFaces(css);
  const aliasFaces = faces.filter(({ family }) =>
    family.includes(" Fallback ")
  );
  const failures: string[] = [];

  for (const authority of TARGET_FONT_METRICS) {
    const targetFaces = faces.filter(({ family }) =>
      family === authority.family
    );
    for (const { source } of authority.bundledFaces) {
      if (!targetFaces.some((face) => face.source.includes(source))) {
        failures.push(
          `${authority.family} target metric authority is missing bundled face ${source}`,
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
