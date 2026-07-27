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
  readonly bundledSources: readonly string[];
  readonly ascentPercent: number;
  readonly descentPercent: number;
  readonly lineGapPercent: number;
}

/**
 * Target vertical metrics recorded from the bundled target font faces. CSS
 * Fonts scales @font-face metric overrides by size-adjust, so the audit
 * compares each effective override with these source-font percentages.
 */
const TARGET_FONT_METRICS: readonly TargetFontMetricAuthority[] = [
  {
    family: "Crimson Pro",
    fallbackPrefix: "Discern Crimson Fallback ",
    bundledSources: [
      "./fonts/crimson-pro-roman.woff2",
      "./fonts/crimson-pro-italic.woff2",
    ],
    ascentPercent: 90,
    descentPercent: 21,
    lineGapPercent: 0,
  },
  {
    family: "Inter",
    fallbackPrefix: "Discern Inter Fallback ",
    bundledSources: ["./fonts/inter.woff2"],
    ascentPercent: 97,
    descentPercent: 24,
    lineGapPercent: 0,
  },
] as const;

const METRIC_TOLERANCE_PERCENT = 0.01;

/** Deterministic source-level evidence for metric-adjusted local aliases. */
export interface FontMetricOverrideAudit {
  readonly aliases: readonly string[];
  readonly faces: number;
  readonly failures: readonly string[];
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
    for (const source of authority.bundledSources) {
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
    faces: aliasFaces.length,
    failures,
  };
}
