/**
 * Named hue-255 compatibility projection of the generic Accent appearance.
 * The shared appearance graph owns every role value; this module only keeps
 * the historical runtime selection and public token shapes available.
 *
 * @module
 */

import {
  appearanceColorRoleLaws,
  DEFAULT_ACCENT_HUE,
  evaluateField,
} from "../tokens/appearance.ts";
import { appearancePoleProjection } from "../tokens/appearance-scope-css.ts";
import {
  ACCENT_HUE_CUSTOM_PROPERTY_NAME,
  APPEARANCE_LIVE_CSS_SUPPORTS,
  appearanceLiveCssDeclarations,
} from "../tokens/appearance-live-css.ts";
import type { DesignToken, ThemeToken } from "../tokens/tokens.ts";

/** Name selected by runtime consumers that opt into the Blue compatibility preset. */
export const BLUE_THEME_NAME = "blue" as const;

/** Public primitive selecting the Blue compatibility hue. */
export const blueThemeTokens: readonly DesignToken[] = Object.freeze([
  {
    name: ACCENT_HUE_CUSTOM_PROPERTY_NAME,
    value: String(DEFAULT_ACCENT_HUE),
    category: "Color",
    description:
      "Hue primitive for the named Blue compatibility projection. Generic Accent accepts every finite hue from 0 through 360.",
  },
]);

const blueRoleLaws = appearanceColorRoleLaws.filter((law) =>
  law.accent !== "field"
);
const blueLight = appearancePoleProjection("accent", "light").roles;
const blueDark = appearancePoleProjection("accent", "dark").roles;

function requiredRoleValue(
  values: Readonly<Record<`--discern-${string}`, string>>,
  name: `--discern-${string}`,
): string {
  const value = values[name];
  if (value === undefined) throw new TypeError(`Accent omitted ${name}`);
  return value;
}

/** One Blue compatibility override enrolled by appearance-role metadata. */
export interface BlueThemeRoleToken extends ThemeToken {
  readonly name: `--discern-${string}`;
}

/** Hue-255 pole values generated from the shared Accent projection. */
export const blueThemeRoleTokens: readonly BlueThemeRoleToken[] = Object.freeze(
  blueRoleLaws.map((law) => ({
    name: law.name,
    light: requiredRoleValue(blueLight, law.name),
    dark: requiredRoleValue(blueDark, law.name),
    category: "Color" as const,
    description: law.description,
  })),
);

/** Shape of the optional Blue compatibility preset. */
export interface BlueTheme {
  readonly name: typeof BLUE_THEME_NAME;
  readonly primitives: readonly DesignToken[];
  readonly roles: readonly ThemeToken[];
}

/** Optional Blue compatibility projection. */
export const blueTheme: BlueTheme = Object.freeze({
  name: BLUE_THEME_NAME,
  primitives: blueThemeTokens,
  roles: blueThemeRoleTokens,
});

function declarations(mode: "light" | "dark"): string {
  return [
    ...blueThemeTokens.map((token) => `    ${token.name}: ${token.value};`),
    ...blueThemeRoleTokens.map((token) => `    ${token.name}: ${token[mode]};`),
  ].join("\n");
}

const lightDeclarations = declarations("light");
const darkDeclarations = declarations("dark");
const liveDeclarations = appearanceLiveCssDeclarations("accent").map((item) =>
  `    ${item.name}: ${item.value};`
).join("\n");

/** Root-scoped CSS for legacy runtime consumers selecting `theme: "blue"`. */
export const blueThemeCss: string = `@layer discern.theme {
  :where([data-discern-root]) {
${lightDeclarations}
  }

  :where([data-discern-root][data-discern-theme="dark"]) {
${darkDeclarations}
  }

  @media (prefers-color-scheme: dark) {
    :where([data-discern-root]:not([data-discern-theme])),
    :where([data-discern-root][data-discern-theme="system"]) {
${darkDeclarations}
    }
  }

  @supports ${APPEARANCE_LIVE_CSS_SUPPORTS} {
    :where([data-discern-root]) {
${liveDeclarations}
    }
  }
}`;

const fieldLight = evaluateField({ darkness: 0 });
const fieldDark = evaluateField({ darkness: 1 });
for (const token of blueThemeRoleTokens) {
  if (
    token.light === fieldLight[token.name] &&
    token.dark === fieldDark[token.name]
  ) {
    throw new TypeError(`Blue projection redundantly overrides ${token.name}`);
  }
}
