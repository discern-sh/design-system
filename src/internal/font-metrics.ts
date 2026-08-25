/**
 * Deterministic conservative text measurement shared by the kind families.
 *
 * Runtime layout reads only the committed table below. Each table is bound to
 * the bundled face bytes that calibrated it; browser measurement is an audit,
 * never a runtime or code-generation input.
 *
 * @module
 */

import { eastAsianWidthKind } from "../unicode/east-asian-width.ts";
import { roundToPrecision, SCENE_PRECISION } from "./geometry.ts";

/** Font roles admitted by the shared scene vocabulary. */
export type SceneFontRole = "interface" | "mono";

/** One bundled face and conservative advance table used by layout. */
export interface SceneFontMetricAuthority {
  readonly family: string;
  readonly source: string;
  readonly sha256: string;
  readonly wideAdvanceEm: number;
  readonly fallbackAdvanceEm: number;
}

/** Bytes supplied to the independent digest audit. */
export interface SceneFontMetricAsset {
  readonly source: string;
  readonly bytes: Uint8Array;
}

/** Bundled metric authorities, bound to the currently inspected font bytes. */
export const SCENE_FONT_METRICS = Object.freeze(
  {
    interface: Object.freeze({
      family: "Inter",
      source: "./fonts/inter.woff2",
      sha256:
        "c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4",
      wideAdvanceEm: 1.05,
      fallbackAdvanceEm: 1,
    }),
    mono: Object.freeze({
      family: "JetBrains Mono",
      source: "./fonts/jetbrains-mono.woff2",
      sha256:
        "2c32b9b3ee358c119e210f6f5195f9bd34894d78a785ff2e95d60e718e400af4",
      wideAdvanceEm: 1.2,
      fallbackAdvanceEm: 0.64,
    }),
  } as const satisfies Readonly<
    Record<SceneFontRole, SceneFontMetricAuthority>
  >,
);

function inRange(value: number, start: number, end: number): boolean {
  return value >= start && value <= end;
}

function isCombining(codePoint: number): boolean {
  return inRange(codePoint, 0x300, 0x36f) ||
    inRange(codePoint, 0x1ab0, 0x1aff) ||
    inRange(codePoint, 0x1dc0, 0x1dff) ||
    inRange(codePoint, 0x20d0, 0x20ff) ||
    inRange(codePoint, 0xfe20, 0xfe2f) ||
    inRange(codePoint, 0xfe00, 0xfe0f) ||
    inRange(codePoint, 0xe0100, 0xe01ef) ||
    inRange(codePoint, 0x1f3fb, 0x1f3ff);
}

function isRegionalIndicator(codePoint: number): boolean {
  return inRange(codePoint, 0x1f1e6, 0x1f1ff);
}

/** Split the admitted single-line repertoire with a pinned small cluster rule. */
export function sceneGraphemes(value: string): readonly string[] {
  const result: string[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    const lastIndex = result.length - 1;
    const previous = result[lastIndex];
    if (previous !== undefined && isCombining(codePoint)) {
      result[lastIndex] = `${previous}${character}`;
      continue;
    }
    if (
      previous !== undefined && isRegionalIndicator(codePoint) &&
      [...previous].length === 1 &&
      isRegionalIndicator(previous.codePointAt(0) ?? -1)
    ) {
      result[lastIndex] = `${previous}${character}`;
      continue;
    }
    result.push(character);
  }
  return result;
}

/** Count user-visible units through the same segmentation used by wrapping. */
export function sceneGraphemeCount(value: string): number {
  return sceneGraphemes(value).length;
}

function interfaceAsciiAdvance(character: string): number {
  if (character === " ") return 0.35;
  if (/[mMwW@%&]/u.test(character)) return 1.05;
  if (/[ilIjtfr.,:;!'|`]/u.test(character)) return 0.5;
  if (/[0-9]/u.test(character)) return 0.68;
  if (/[A-Z]/u.test(character)) return 0.84;
  if (/[a-z]/u.test(character)) return 0.74;
  return 0.62;
}

function graphemeAdvanceEm(
  grapheme: string,
  role: SceneFontRole,
): number {
  const base = [...grapheme].find((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && !isCombining(codePoint);
  });
  const codePoint = base?.codePointAt(0);
  if (base === undefined || codePoint === undefined) return 0;
  const authority = SCENE_FONT_METRICS[role];
  if (eastAsianWidthKind(codePoint) === "wide") {
    return authority.wideAdvanceEm;
  }
  if (role === "mono") return authority.fallbackAdvanceEm;
  return codePoint <= 0x7f
    ? interfaceAsciiAdvance(base)
    : authority.fallbackAdvanceEm;
}

/** Conservatively measure one text run at an explicit size. */
export function measureSceneText(
  value: string,
  fontSize: number,
  role: SceneFontRole,
): number {
  const width = sceneGraphemes(value).reduce(
    (total, grapheme) => total + graphemeAdvanceEm(grapheme, role),
    0,
  ) * fontSize;
  const factor = 10 ** 2;
  return roundToPrecision(Math.ceil(width * factor) / factor, SCENE_PRECISION);
}

/** One wrapped line and its conservative measured width. */
export interface SceneMeasuredLine {
  readonly text: string;
  readonly width: number;
}

function splitMeasuredWord(
  word: string,
  maximumWidth: number,
  fontSize: number,
  role: SceneFontRole,
): SceneMeasuredLine[] {
  const lines: SceneMeasuredLine[] = [];
  let text = "";
  for (const grapheme of sceneGraphemes(word)) {
    const next = `${text}${grapheme}`;
    if (
      text !== "" && measureSceneText(next, fontSize, role) > maximumWidth
    ) {
      lines.push({ text, width: measureSceneText(text, fontSize, role) });
      text = grapheme;
    } else {
      text = next;
    }
  }
  if (text !== "") {
    lines.push({ text, width: measureSceneText(text, fontSize, role) });
  }
  return lines;
}

/** Greedily wrap normalized single-line text without splitting a cluster. */
export function wrapSceneText(
  value: string,
  maximumWidth: number,
  fontSize: number,
  role: SceneFontRole,
): readonly SceneMeasuredLine[] {
  const words = value.split(" ");
  const lines: SceneMeasuredLine[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (measureSceneText(candidate, fontSize, role) <= maximumWidth) {
      current = candidate;
      continue;
    }
    if (current !== "") {
      lines.push({
        text: current,
        width: measureSceneText(current, fontSize, role),
      });
      current = "";
    }
    const pieces = splitMeasuredWord(word, maximumWidth, fontSize, role);
    const finalPiece = pieces.at(-1);
    lines.push(...pieces.slice(0, -1));
    current = finalPiece?.text ?? "";
  }
  if (current !== "") {
    lines.push({
      text: current,
      width: measureSceneText(current, fontSize, role),
    });
  }
  return Object.freeze(lines.map((line) => Object.freeze(line)));
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify that every committed measurement still names its calibrated bytes. */
export async function auditSceneFontMetricAssets(
  assets: readonly SceneFontMetricAsset[],
  subject: string,
): Promise<readonly string[]> {
  const failures: string[] = [];
  const bySource = new Map<string, Uint8Array>();
  for (const asset of assets) {
    if (bySource.has(asset.source)) {
      failures.push(`duplicate ${subject} font metric asset ${asset.source}`);
    } else {
      bySource.set(asset.source, asset.bytes);
    }
  }
  for (const authority of Object.values(SCENE_FONT_METRICS)) {
    const bytes = bySource.get(authority.source);
    if (bytes === undefined) {
      failures.push(
        `${subject} font metric authority is missing ${authority.source}`,
      );
      continue;
    }
    const actual = await sha256(bytes);
    if (actual !== authority.sha256) {
      failures.push(
        `${authority.family} ${subject} metrics expect ${authority.source} digest ${authority.sha256}, found ${actual}; recalibrate before changing the authority`,
      );
    }
  }
  return failures;
}
