/**
 * Primitive, semantic, and preset design tokens. Base tokens carry one
 * value everywhere; theme tokens carry a light and a dark value under the
 * same role. All public custom properties use the `discern` namespace.
 *
 * @module
 */

import {
  APPEARANCE_SPACING_UNIT_PX,
  appearanceAxes,
  type AppearanceAxisName,
  appearanceColorRoleLaws,
  appearanceShadowRoleLaws,
  DEFAULT_ACCENT_HUE,
  evaluateAppearance,
  evaluateAppearanceShadows,
} from "./appearance.ts";
import { ACCENT_HUE_CUSTOM_PROPERTY_NAME } from "./appearance-live-css.ts";
import {
  type AppearanceAdmissionProof,
  type AppearanceSeriesPair,
  proveAppearanceAdmission,
} from "./appearance-admission.ts";
export * from "./appearance-admission.ts";
export * from "./appearance-scope-css.ts";
export * from "./appearance.ts";

/** Catalogue category a design token belongs to. */
export type TokenCategory =
  | "Color"
  | "Typography"
  | "Spacing"
  | "Shape"
  | "Motion"
  | "Layout";

/** One public custom property with a single theme-independent value. */
export interface DesignToken {
  readonly name: `--discern-${string}`;
  readonly value: string;
  readonly category: TokenCategory;
  readonly description: string;
}

/** One public custom property with distinct light and dark values. */
export interface ThemeToken {
  readonly name: `--discern-${string}`;
  readonly light: string;
  readonly dark: string;
  readonly category: TokenCategory;
  readonly description: string;
}

const token = (
  name: DesignToken["name"],
  value: string,
  category: TokenCategory,
  description: string,
): DesignToken => ({ name, value, category, description });

const themeToken = (
  name: ThemeToken["name"],
  light: string,
  dark: string,
  description: string,
  category: TokenCategory = "Color",
): ThemeToken => ({ name, light, dark, category, description });

const appearanceAxisTokenCategories = {
  darkness: "Color",
  structure: "Color",
  emphasis: "Color",
  density: "Spacing",
} as const satisfies Readonly<Record<AppearanceAxisName, TokenCategory>>;

/** Registered field-axis Tokens exposed as numeric author controls. */
export const appearanceAxisTokens: readonly DesignToken[] = Object.freeze(
  (Object.keys(appearanceAxes) as AppearanceAxisName[]).map((axis) =>
    token(
      `--discern-${axis}`,
      String(appearanceAxes[axis].default),
      appearanceAxisTokenCategories[axis],
      appearanceAxes[axis].description,
    )
  ),
);

/** Public hue primitive read by the Accent projection wherever `data-discern-accent` switches it on. */
export const accentHueToken: DesignToken = token(
  ACCENT_HUE_CUSTOM_PROPERTY_NAME,
  String(DEFAULT_ACCENT_HUE),
  "Color",
  "Accent hue for the Accent projection; any finite hue from 0 through 360, where 360 aliases 0. It changes nothing until an element opts into Accent.",
);

/** Framework-neutral primitives and system-font defaults shared by every theme. */
export const baseTokens: readonly DesignToken[] = [
  ...appearanceAxisTokens,
  accentHueToken,
  token(
    "--discern-font-display",
    '"Iowan Old Style", "Palatino Linotype", Georgia, ui-serif, serif',
    "Typography",
    "System display stack; optional font assets may override it.",
  ),
  token(
    "--discern-font-body",
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "Typography",
    "System body stack; optional font assets may override it.",
  ),
  token(
    "--discern-font-mono",
    'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    "Typography",
    "System code and annotation stack.",
  ),
  token(
    "--discern-font-ui",
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "Typography",
    "System interface stack; optional font assets may override it.",
  ),
  token(
    "--discern-font-features-ui",
    "'liga' 1, 'calt' 1, 'dlig' 1, 'tnum' 1, 'zero' 1, 'ss03' 1, 'salt' 1",
    "Typography",
    "OpenType features for interface chrome.",
  ),
  token(
    "--discern-font-size-xs",
    "0.85rem",
    "Typography",
    "Authored interface-text floor for fine print and compact labels; density never scales font size.",
  ),
  token(
    "--discern-font-size-sm",
    "0.95rem",
    "Typography",
    "Secondary interface copy.",
  ),
  token("--discern-font-size-md", "1.05rem", "Typography", "Body copy."),
  token("--discern-font-size-lg", "1.125rem", "Typography", "Lead copy."),
  token(
    "--discern-font-size-card-title",
    "var(--discern-font-size-lg)",
    "Typography",
    "Primary title within a card surface.",
  ),
  token(
    "--discern-font-size-display-sm",
    "1.5rem",
    "Typography",
    "Small display heading.",
  ),
  token(
    "--discern-font-size-display-md",
    "2rem",
    "Typography",
    "Medium display heading.",
  ),
  token(
    "--discern-font-size-display-lg",
    "2.75rem",
    "Typography",
    "Large display heading.",
  ),
  token(
    "--discern-font-size-display-xl",
    "clamp(2.75rem, 5.4vw, 4.125rem)",
    "Typography",
    "Hero display heading.",
  ),
  token(
    "--discern-font-weight-body",
    "400",
    "Typography",
    "Normal body weight.",
  ),
  token(
    "--discern-font-weight-strong",
    "650",
    "Typography",
    "Strong body and UI weight.",
  ),
  token(
    "--discern-font-weight-display",
    "700",
    "Typography",
    "Display heading weight.",
  ),
  token(
    "--discern-leading-tight",
    "1.08",
    "Typography",
    "Display line height.",
  ),
  token(
    "--discern-leading-snug",
    "1.3",
    "Typography",
    "Compact heading line height.",
  ),
  token("--discern-leading-body", "1.58", "Typography", "Body line height."),
  ...([1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24] as const).map((step) =>
    token(
      `--discern-space-${step}`,
      `${step * APPEARANCE_SPACING_UNIT_PX}px`,
      "Spacing",
      step === 1
        ? `${APPEARANCE_SPACING_UNIT_PX}px spacing unit. Density scales spacing only and never font size; interface-text and component-owned touch-target floors do not shrink.`
        : `${
          step * APPEARANCE_SPACING_UNIT_PX
        }px authored spacing step; browser emission multiplies it by density.`,
    )
  ),
  token("--discern-radius-xs", "4px", "Shape", "Fine control radius."),
  token("--discern-radius-sm", "6px", "Shape", "Input radius."),
  token("--discern-radius-md", "8px", "Shape", "Button and card radius."),
  token("--discern-radius-lg", "12px", "Shape", "Window and dialog radius."),
  token(
    "--discern-radius-pill",
    "999px",
    "Shape",
    "Badge and tag pill radius.",
  ),
  token(
    "--discern-duration-fast",
    "150ms",
    "Motion",
    "Hover and press response.",
  ),
  token(
    "--discern-duration-medium",
    "300ms",
    "Motion",
    "Ordinary state transition.",
  ),
  token(
    "--discern-duration-reveal",
    "650ms",
    "Motion",
    "Choreographed reveal.",
  ),
  token(
    "--discern-ease-out",
    "cubic-bezier(0.22, 1, 0.36, 1)",
    "Motion",
    "Primary deceleration curve.",
  ),
  token(
    "--discern-ease-in-out",
    "cubic-bezier(0.65, 0, 0.35, 1)",
    "Motion",
    "Balanced state curve.",
  ),
  token(
    "--discern-page-max",
    "66.25rem",
    "Layout",
    "Maximum editorial page width.",
  ),
  token("--discern-measure", "62ch", "Layout", "Readable prose measure."),
  ...([
    ["xs", "1.5rem"],
    ["sm", "2rem"],
    ["md", "2.5rem"],
    ["lg", "3.25rem"],
    ["xl", "4.5rem"],
  ] as const).map(([step, size]) =>
    token(
      `--discern-avatar-size-${step}`,
      size,
      "Layout",
      `Identity tile ${step} size step shared by Avatar and Agent avatar.`,
    )
  ),
  token(
    "--discern-section-space",
    "clamp(4.5rem, 9vw, 7.75rem)",
    "Layout",
    "Section rhythm.",
  ),
];

/** Theme-independent Tokens shared by every emitted identity. */
export const designTokens: readonly DesignToken[] = baseTokens;

const lightPole = evaluateAppearance({ darkness: 0 });
const darkPole = evaluateAppearance({ darkness: 1 });
const lightShadows = evaluateAppearanceShadows({ darkness: 0 });
const darkShadows = evaluateAppearanceShadows({ darkness: 1 });

function requiredProjectedValue(
  values: Readonly<Record<`--discern-${string}`, string>>,
  name: `--discern-${string}`,
): string {
  const value = values[name];
  if (value === undefined) {
    throw new TypeError(`Missing projected Token ${name}`);
  }
  return value;
}

const appearanceThemeTokens: readonly ThemeToken[] = appearanceColorRoleLaws
  .map((law) =>
    themeToken(
      law.name,
      requiredProjectedValue(lightPole, law.name),
      requiredProjectedValue(darkPole, law.name),
      law.description,
    )
  );

const seriesThemeTokens: readonly ThemeToken[] = [
  themeToken(
    "--discern-color-series-1",
    "oklch(66.76% 0.0939 249.4)",
    "oklch(76.73% 0.0773 248.9)",
    "First of the six fixed-order categorical data-series colours (soft blue). Browser consumers may override these custom properties; terminal series colours stay package-authored because overrides cannot re-run the palette's colour-vision and ANSI safety proofs.",
  ),
  themeToken(
    "--discern-color-series-2",
    "oklch(39.22% 0.1285 254.9)",
    "oklch(67.08% 0.1055 247.3)",
    "Second categorical data-series colour (deep blue); pairs with the second series marker and fill glyph.",
  ),
  themeToken(
    "--discern-color-series-3",
    "oklch(85.43% 0.127 91.1)",
    "oklch(87.88% 0.115 93.9)",
    "Third categorical data-series colour (gold); pairs with the third series marker and fill glyph.",
  ),
  themeToken(
    "--discern-color-series-4",
    "oklch(50.17% 0.1147 9.7)",
    "oklch(71.49% 0.094 0.4)",
    "Fourth categorical data-series colour (burgundy); pairs with the fourth series marker and fill glyph.",
  ),
  themeToken(
    "--discern-color-series-5",
    "oklch(58.59% 0.1197 88.6)",
    "oklch(73.81% 0.1175 92.7)",
    "Fifth categorical data-series colour (ochre); pairs with the fifth series marker and fill glyph.",
  ),
  themeToken(
    "--discern-color-series-6",
    "oklch(77.29% 0.1036 6.7)",
    "oklch(83.8% 0.0682 7.1)",
    "Sixth categorical data-series colour (rose); pairs with the sixth series marker and fill glyph.",
  ),
];

const appearanceSeriesPairs: readonly AppearanceSeriesPair[] = Object.freeze(
  seriesThemeTokens.map((series) => {
    if (!/^--discern-color-series-[1-6]$/u.test(series.name)) {
      throw new TypeError(`Appearance admission received ${series.name}`);
    }
    return {
      name: series.name as AppearanceSeriesPair["name"],
      light: series.light,
      dark: series.dark,
    };
  }),
);

const shadowThemeTokens: readonly ThemeToken[] = appearanceShadowRoleLaws.map((
  law,
) =>
  themeToken(
    law.name,
    requiredProjectedValue(lightShadows, law.name),
    requiredProjectedValue(darkShadows, law.name),
    law.description,
    "Shape",
  )
);

const presentationThemeTokens: readonly ThemeToken[] = [
  themeToken(
    "--discern-brand-artwork-opacity",
    "1",
    "0",
    "Visibility of original multicolour artwork when a monochrome dark-mode mask is available.",
    "Motion",
  ),
  themeToken(
    "--discern-backdrop-theme-gain",
    "1",
    "0.78",
    "Optical opacity correction for decorative backdrops across light and dark canvases.",
    "Motion",
  ),
];

/** Semantic light/dark role Tokens projected from the field's two poles. */
export const themeTokens: readonly ThemeToken[] = [
  ...appearanceThemeTokens,
  ...seriesThemeTokens,
  ...shadowThemeTokens,
  ...presentationThemeTokens,
];

/** Every token in the neutral field identity. Optional presets stay separate. */
export const allTokens: readonly (DesignToken | ThemeToken)[] = [
  ...designTokens,
  ...themeTokens,
];

let cachedAppearanceAdmission: AppearanceAdmissionProof | undefined;

/** Lazily run and retain the exhaustive Field, Accent, and series proof. */
export function appearanceAdmission(): AppearanceAdmissionProof {
  return cachedAppearanceAdmission ??= proveAppearanceAdmission(
    appearanceSeriesPairs,
  );
}
