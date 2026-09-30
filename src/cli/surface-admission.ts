/**
 * Numerical admission proof for terminal surfaces: every text tone a
 * surface carries, and every pair of fills a reader must tell apart, at
 * each colour depth on both grounds.
 *
 * @module
 */

import {
  ANSI_256_RGB,
  terminalContrastRatio,
  type TerminalRgbColor,
} from "./ansi-palette.ts";
import type {
  TerminalCapabilities,
  TerminalColorDepth,
} from "./capabilities.ts";
import { styleCodes } from "./styled-sequences.ts";
import {
  decodeSrgbChannel,
  linearRgbToOklab,
  type OklabColor,
  oklabDistance,
} from "../internal/oklch.ts";
import {
  type Appearance,
  APPEARANCE_ADMISSION_HUES,
} from "../tokens/tokens.ts";
import {
  deriveTerminalTheme,
  TERMINAL_SURFACE_ROLES,
  TERMINAL_SURFACE_SEPARATIONS,
  TERMINAL_TEXT_CONTRAST_FLOOR,
  TERMINAL_TEXT_TONES,
  type TerminalSurfaceRole,
  terminalTextToneColor,
  type TerminalTheme,
  terminalThemeColor,
  type TerminalThemeVariant,
} from "./theme.ts";

/**
 * Smallest OKLab distance at which two truecolor fills read as different
 * regions, about twice the just-noticeable difference.
 */
export const TERMINAL_SURFACE_DISTANCE_FLOOR = 0.02;

/** A failed terminal surface invariant with the coordinates to reproduce it. */
export interface TerminalSurfaceAdmissionFailure {
  readonly appearance: string;
  readonly variant: TerminalThemeVariant;
  readonly depth: TerminalColorDepth;
  readonly check: string;
  readonly observed: number;
  readonly floor: number;
}

/** Complete terminal surface admission result. */
export interface TerminalSurfaceAdmissionProof {
  readonly accepted: boolean;
  readonly appearances: number;
  readonly checks: number;
  readonly failures: readonly TerminalSurfaceAdmissionFailure[];
}

type Painted = "truecolor" | "ansi256";

type Recorder = (
  depth: TerminalColorDepth,
  check: string,
  observed: number,
  floor: number,
) => void;

function oklab(color: TerminalRgbColor): OklabColor {
  return linearRgbToOklab(
    decodeSrgbChannel(color.red / 255),
    decodeSrgbChannel(color.green / 255),
    decodeSrgbChannel(color.blue / 255),
  );
}

function painted(
  color: TerminalRgbColor & { readonly ansi256: number },
  depth: Painted,
): TerminalRgbColor {
  if (depth === "truecolor") return color;
  const entry = ANSI_256_RGB[color.ansi256];
  if (entry === undefined) {
    throw new TypeError(
      `ANSI 256 index ${color.ansi256} is outside the palette`,
    );
  }
  return entry;
}

function appearanceLabel(appearance: Partial<Appearance>): string {
  return appearance.accent === undefined
    ? "mono"
    : `accent(${appearance.accent})`;
}

/**
 * Prove terminal surfaces on both grounds for each appearance — by default
 * the monochrome projection and the complete Accent hue sweep the browser
 * admission uses. Where fills are painted (truecolor and ANSI 256), every
 * tone on every surface meets {@linkcode TERMINAL_TEXT_CONTRAST_FLOOR},
 * every separated pair stays apart — a distinct palette entry at 256, and
 * at least {@linkcode TERMINAL_SURFACE_DISTANCE_FLOOR} apart in truecolor —
 * and a pair with a contrast floor keeps it at both depths. At 16 colours and without colour no fill is
 * painted, so text sits on the terminal's own ground in its own palette:
 * the proof checks that no fill emits a background there, that colourless
 * output emits no colour, and that no tone takes the ground's own index.
 */
export function proveTerminalSurfaceAdmission(
  appearances: readonly Partial<Appearance>[] = [
    {},
    ...APPEARANCE_ADMISSION_HUES.map((accent) => ({ accent })),
  ],
): TerminalSurfaceAdmissionProof {
  const failures: TerminalSurfaceAdmissionFailure[] = [];
  let checks = 0;
  for (const appearance of appearances) {
    for (const variant of ["dark", "light"] as const) {
      const theme = deriveTerminalTheme(
        variant,
        appearance.accent === undefined ? {} : { accent: appearance.accent },
      );
      const record: Recorder = (depth, check, observed, floor) => {
        checks += 1;
        if (observed + 1e-9 < floor) {
          failures.push({
            appearance: appearanceLabel(appearance),
            variant,
            depth,
            check,
            observed,
            floor,
          });
        }
      };
      provePaintedDepth(theme, "truecolor", record);
      provePaintedDepth(theme, "ansi256", record);
      proveUnpaintedDepths(theme, record);
    }
  }
  return Object.freeze({
    accepted: failures.length === 0,
    appearances: appearances.length,
    checks,
    failures: Object.freeze(failures),
  });
}

function provePaintedDepth(
  theme: TerminalTheme,
  depth: Painted,
  record: Recorder,
): void {
  const canvas = terminalThemeColor(theme, "--discern-color-canvas");
  const region = (role: TerminalSurfaceRole | "canvas") =>
    role === "canvas" ? canvas : theme.surfaces[role];
  for (const surface of TERMINAL_SURFACE_ROLES) {
    const fill = painted(region(surface), depth);
    for (const tone of TERMINAL_TEXT_TONES) {
      record(
        depth,
        `${tone} on ${surface}`,
        terminalContrastRatio(
          painted(terminalTextToneColor(theme, tone, surface), depth),
          fill,
        ),
        TERMINAL_TEXT_CONTRAST_FLOOR,
      );
    }
  }
  for (const { first, second, contrast } of TERMINAL_SURFACE_SEPARATIONS) {
    const apart = depth === "truecolor"
      ? oklabDistance(oklab(region(first)), oklab(region(second)))
      : region(first).ansi256 === region(second).ansi256
      ? 0
      : TERMINAL_SURFACE_DISTANCE_FLOOR;
    record(
      depth,
      `${first} apart from ${second}`,
      apart,
      TERMINAL_SURFACE_DISTANCE_FLOOR,
    );
    if (contrast !== undefined) {
      record(
        depth,
        `${second} against ${first}`,
        terminalContrastRatio(
          painted(region(first), depth),
          painted(region(second), depth),
        ),
        contrast,
      );
    }
  }
}

function proveUnpaintedDepths(theme: TerminalTheme, record: Recorder): void {
  const ground = terminalThemeColor(theme, "--discern-color-canvas").ansi16;
  for (const depth of ["ansi16", "none"] as const) {
    const capabilities: TerminalCapabilities = {
      colorDepth: depth,
      columns: 80,
      unicode: true,
    };
    for (const surface of TERMINAL_SURFACE_ROLES) {
      record(
        depth,
        `${surface} paints no fill`,
        styleCodes({ background: theme.surfaces[surface] }, capabilities)
            .length === 0
          ? 1
          : 0,
        1,
      );
    }
    for (const tone of TERMINAL_TEXT_TONES) {
      const color = terminalTextToneColor(theme, tone);
      record(
        depth,
        `${tone} stays distinct from the ground`,
        depth === "none"
          ? styleCodes({ color }, capabilities).length === 0 ? 1 : 0
          : color.ansi16 === ground
          ? 0
          : 1,
        1,
      );
    }
  }
}
