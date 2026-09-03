/**
 * Numerical admission proof for the shared Field/Accent appearance graph.
 * The proof consumes public role evaluation rather than carrying colour
 * coefficients of its own.
 *
 * @module
 */

import {
  compositeOklab,
  type OklabColor,
  oklabContrast,
  oklabDistance,
} from "../internal/oklch.ts";
import {
  accentAppearance,
  ACTION_SHADOW_DISTANCE_FLOOR,
  type Appearance,
  APPEARANCE_INK_CONTRAST_FLOORS,
  APPEARANCE_POLARITY_CROSSOVER_DARKNESS,
  appearanceColorRoleLaws,
  type AppearancePoint,
  defaultAppearancePoint,
  evaluateAppearance,
  fieldAppearance,
  ownedSurfaceRoleNames,
} from "./appearance.ts";

/** Minimum OKLab distance between Accent and semantic families. */
export const APPEARANCE_SEMANTIC_DISTANCE_FLOOR = 0.08;

/** Fixed series-palette distinctness floor inherited from browser admission. */
export const APPEARANCE_SERIES_DISTANCE_FLOOR = 0.09;

/** Fixed series-palette canvas contrast floor inherited from browser admission. */
export const APPEARANCE_SERIES_CANVAS_CONTRAST_FLOOR = 1.25;

/** One fixed series pair supplied by the token inventory. */
export interface AppearanceSeriesPair {
  readonly name: `--discern-color-series-${1 | 2 | 3 | 4 | 5 | 6}`;
  readonly light: string;
  readonly dark: string;
}

/** One signed field point in the package admission sweep. */
export interface AppearanceAdmissionPoint {
  readonly label: string;
  readonly point: AppearancePoint;
}

/** A failed numerical invariant with enough coordinates to reproduce it. */
export interface AppearanceAdmissionFailure {
  readonly appearance: string;
  readonly point: string;
  readonly check: string;
  readonly observed: number;
  readonly floor: number;
}

/** Complete admission result for a role graph and fixed series authority. */
export interface AppearanceAdmissionProof {
  readonly accepted: boolean;
  readonly appearances: number;
  readonly points: number;
  readonly checks: number;
  readonly failures: readonly AppearanceAdmissionFailure[];
}

const point = (
  label: string,
  overrides: Partial<AppearancePoint>,
): AppearanceAdmissionPoint => ({
  label,
  point: { ...defaultAppearancePoint, ...overrides },
});

/** Poles, signed 0A postures, crossover neighbours, and axis stress points. */
export const APPEARANCE_ADMISSION_POINTS: readonly AppearanceAdmissionPoint[] =
  Object.freeze([
    point("light pole", { darkness: 0 }),
    point("0A light posture", {
      darkness: 0.25,
      structure: 0.35,
      emphasis: 0.65,
      density: 0.8,
    }),
    point("polarity light neighbour", {
      darkness: APPEARANCE_POLARITY_CROSSOVER_DARKNESS - 0.0001,
    }),
    point("polarity dark neighbour", {
      darkness: APPEARANCE_POLARITY_CROSSOVER_DARKNESS + 0.0001,
    }),
    point("0A midpoint", { darkness: 0.5 }),
    point("0A dark posture", {
      darkness: 0.75,
      structure: 1.4,
      emphasis: 1.35,
      density: 1.2,
    }),
    point("dark pole", { darkness: 1 }),
    point("low emphasis", { darkness: 0.25, emphasis: 0.5 }),
    point("high emphasis", { darkness: 0.75, emphasis: 1.5 }),
    point("low structure", { darkness: 0.25, structure: 0 }),
    point("high structure", { darkness: 0.75, structure: 2 }),
  ]);

const boundaryHues = [
  0.0001,
  0.5,
  27.75,
  28.25,
  73.75,
  74.25,
  81.75,
  82.25,
  151.75,
  152.25,
  255.5,
  335.5,
  359.5,
  359.9999,
] as const;

/** Integer circle plus fractional, wrap-boundary, and semantic-neighbour hues. */
export const APPEARANCE_ADMISSION_HUES: readonly number[] = Object.freeze([
  ...new Set([
    ...Array.from({ length: 361 }, (_, hue) => hue),
    ...boundaryHues,
  ]),
].toSorted((left, right) => left - right));

interface ParsedPaint {
  readonly color: OklabColor;
  readonly alpha: number;
}

function parseOklch(value: string): ParsedPaint {
  const match = value.match(
    /^oklch\(([+-]?[\d.]+)%\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s+\/\s+([+-]?[\d.]+))?\)$/u,
  );
  if (match === null) {
    throw new TypeError(`Expected concrete oklch(), got ${value}`);
  }
  const chroma = Number(match[2]);
  const radians = Number(match[3]) * Math.PI / 180;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  return {
    color: {
      lightness: Number(match[1]) / 100,
      a: chroma * Math.cos(radians),
      b: chroma * Math.sin(radians),
    },
    alpha,
  };
}

function requiredPaint(
  values: Readonly<Record<string, string>>,
  name: string,
): ParsedPaint {
  const value = values[name];
  if (value === undefined) throw new TypeError(`Appearance omitted ${name}`);
  return parseOklch(value);
}

const semanticRoles = ["success", "warning", "danger"] as const;

/**
 * Exhaust the public Accent hue circle and all signed field samples. Series
 * pairs are injected from their independent authored palette authority.
 */
export function proveAppearanceAdmission(
  seriesPairs: readonly AppearanceSeriesPair[],
): AppearanceAdmissionProof {
  const failures: AppearanceAdmissionFailure[] = [];
  let checks = 0;
  const appearances: readonly Appearance[] = [
    fieldAppearance,
    ...APPEARANCE_ADMISSION_HUES.map(accentAppearance),
  ];
  const record = (
    appearance: string,
    sample: string,
    check: string,
    observed: number,
    floor: number,
  ): void => {
    checks += 1;
    if (observed + 1e-9 < floor) {
      failures.push({
        appearance,
        point: sample,
        check,
        observed,
        floor,
      });
    }
  };

  for (const appearance of appearances) {
    const appearanceLabel = appearance.name === "field"
      ? "field"
      : `accent(${appearance.hue})`;
    for (const sample of APPEARANCE_ADMISSION_POINTS) {
      const values = evaluateAppearance(appearance, sample.point);
      if (Object.keys(values).length !== appearanceColorRoleLaws.length) {
        throw new TypeError(`${appearanceLabel} did not enrol every role`);
      }
      const canvasPaint = requiredPaint(values, "--discern-color-canvas");
      const canvas = canvasPaint.color;
      const opaque = (name: string): OklabColor => {
        const paint = requiredPaint(values, name);
        return compositeOklab(paint.color, paint.alpha, canvas);
      };

      record(
        appearanceLabel,
        sample.label,
        "canvas opacity",
        canvasPaint.alpha,
        1,
      );
      for (const name of ownedSurfaceRoleNames(appearanceColorRoleLaws)) {
        record(
          appearanceLabel,
          sample.label,
          `${name} opacity`,
          requiredPaint(values, name).alpha,
          1,
        );
      }

      const maximumInkContrast = oklabContrast(
        opaque("--discern-color-action"),
        canvas,
      );
      for (const [name, authoredFloor] of APPEARANCE_INK_CONTRAST_FLOORS) {
        record(
          appearanceLabel,
          sample.label,
          `${name} on canvas`,
          oklabContrast(opaque(name), canvas),
          Math.min(authoredFloor, maximumInkContrast),
        );
      }

      const inverseSurface = opaque("--discern-color-inverse-surface");
      const inverseInk = requiredPaint(values, "--discern-color-inverse-ink");
      record(
        appearanceLabel,
        sample.label,
        "inverse pair",
        oklabContrast(
          compositeOklab(inverseInk.color, inverseInk.alpha, inverseSurface),
          inverseSurface,
        ),
        4.5,
      );

      const action = opaque("--discern-color-action");
      const onAction = requiredPaint(values, "--discern-color-on-action");
      record(
        appearanceLabel,
        sample.label,
        "action pair",
        oklabContrast(
          compositeOklab(onAction.color, onAction.alpha, action),
          action,
        ),
        4.5,
      );

      const actionShadow = opaque("--discern-color-action-shadow");
      record(
        appearanceLabel,
        sample.label,
        "action shadow to fill",
        oklabDistance(actionShadow, action),
        ACTION_SHADOW_DISTANCE_FLOOR,
      );
      record(
        appearanceLabel,
        sample.label,
        "action shadow to canvas",
        oklabDistance(actionShadow, canvas),
        ACTION_SHADOW_DISTANCE_FLOOR,
      );

      const accentSoft = opaque("--discern-color-accent-100");
      for (const ink of ["700", "800"] as const) {
        record(
          appearanceLabel,
          sample.label,
          `accent-${ink} on accent-100`,
          oklabContrast(opaque(`--discern-color-accent-${ink}`), accentSoft),
          4.5,
        );
      }

      const focus = opaque("--discern-color-accent-500");
      for (const role of ["accent", ...semanticRoles] as const) {
        const surface = role === "accent"
          ? accentSoft
          : opaque(`--discern-color-${role}-soft`);
        record(
          appearanceLabel,
          sample.label,
          `focus on ${role}`,
          oklabContrast(focus, surface),
          3,
        );
      }
      record(
        appearanceLabel,
        sample.label,
        "danger on danger-soft",
        oklabContrast(
          opaque("--discern-color-danger"),
          opaque("--discern-color-danger-soft"),
        ),
        4.5,
      );

      const accent = opaque("--discern-color-accent-600");
      const semantics = semanticRoles.map((role) =>
        [role, opaque(`--discern-color-${role}`)] as const
      );
      for (const [role, color] of semantics) {
        record(
          appearanceLabel,
          sample.label,
          `accent to ${role}`,
          oklabDistance(accent, color),
          APPEARANCE_SEMANTIC_DISTANCE_FLOOR,
        );
      }
      for (const [index, [firstRole, first]] of semantics.entries()) {
        for (const [secondRole, second] of semantics.slice(index + 1)) {
          record(
            appearanceLabel,
            sample.label,
            `${firstRole} to ${secondRole}`,
            oklabDistance(first, second),
            APPEARANCE_SEMANTIC_DISTANCE_FLOOR,
          );
        }
      }

      const series = seriesPairs.map((pair) => {
        const light = parseOklch(pair.light).color;
        const dark = parseOklch(pair.dark).color;
        return [
          pair.name,
          oklabContrast(light, canvas) >= oklabContrast(dark, canvas)
            ? light
            : dark,
        ] as const;
      });
      for (const [name, color] of series) {
        record(
          appearanceLabel,
          sample.label,
          `${name} on canvas`,
          oklabContrast(color, canvas),
          APPEARANCE_SERIES_CANVAS_CONTRAST_FLOOR,
        );
      }
      for (const [index, [firstName, first]] of series.entries()) {
        for (const [secondName, second] of series.slice(index + 1)) {
          record(
            appearanceLabel,
            sample.label,
            `${firstName} to ${secondName}`,
            oklabDistance(first, second),
            APPEARANCE_SERIES_DISTANCE_FLOOR,
          );
        }
      }
    }
  }

  return Object.freeze({
    accepted: failures.length === 0,
    appearances: appearances.length,
    points: APPEARANCE_ADMISSION_POINTS.length,
    checks,
    failures: Object.freeze(failures),
  });
}
