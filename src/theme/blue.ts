/**
 * Optional blue appearance preset. Its membership derives from field-role
 * metadata, while this module owns the chromatic values and CSS projection.
 *
 * @module
 */

import {
  type BluePresetRoleName,
  evaluateField,
  fieldColorRoleLaws,
} from "../tokens/field.ts";
import type { DesignToken, ThemeToken } from "../tokens/tokens.ts";

/** Name selected by runtime consumers that opt into the blue preset. */
export const BLUE_THEME_NAME = "blue" as const;

/** Public primitive owned by the blue preset. */
export const blueThemeTokens: readonly DesignToken[] = Object.freeze([
  {
    name: "--discern-accent-hue",
    value: "255",
    category: "Color",
    description:
      "Master hue for the optional blue accent family. Consumer overrides near a semantic role must override that role coherently and re-run contrast and distinction checks.",
  },
]);

interface BlueRolePair {
  readonly light: string;
  readonly dark: string;
}

const blueRoleValues = Object.freeze(
  {
    "--discern-color-action": {
      light: "oklch(96.2% 0.019 var(--discern-accent-hue))",
      dark: "oklch(35% 0.055 var(--discern-accent-hue))",
    },
    "--discern-color-on-action": {
      light: "oklch(34% 0.13 var(--discern-accent-hue))",
      dark: "oklch(90% 0.06 var(--discern-accent-hue))",
    },
    "--discern-color-accent-100": {
      light: "oklch(96.2% 0.019 var(--discern-accent-hue))",
      dark: "oklch(35% 0.055 var(--discern-accent-hue))",
    },
    "--discern-color-accent-200": {
      light: "oklch(92% 0.045 var(--discern-accent-hue))",
      dark: "oklch(40% 0.08 var(--discern-accent-hue))",
    },
    "--discern-color-accent-300": {
      light: "oklch(85% 0.082 var(--discern-accent-hue))",
      dark: "oklch(46% 0.115 var(--discern-accent-hue))",
    },
    "--discern-color-accent-400": {
      light: "oklch(73% 0.128 var(--discern-accent-hue))",
      dark: "oklch(58% 0.15 var(--discern-accent-hue))",
    },
    "--discern-color-accent-500": {
      light: "oklch(61% 0.185 var(--discern-accent-hue))",
      dark: "oklch(67% 0.165 var(--discern-accent-hue))",
    },
    "--discern-color-accent-600": {
      light: "oklch(52% 0.208 var(--discern-accent-hue))",
      dark: "oklch(74% 0.14 var(--discern-accent-hue))",
    },
    "--discern-color-accent-700": {
      light: "oklch(44% 0.185 var(--discern-accent-hue))",
      dark: "oklch(82% 0.105 var(--discern-accent-hue))",
    },
    "--discern-color-accent-800": {
      light: "oklch(34% 0.13 var(--discern-accent-hue))",
      dark: "oklch(90% 0.06 var(--discern-accent-hue))",
    },
    "--discern-color-success": {
      light: "oklch(64% 0.165 152)",
      dark: "oklch(70% 0.155 152)",
    },
    "--discern-color-success-soft": {
      light: "oklch(95% 0.05 152)",
      dark: "oklch(29% 0.06 152)",
    },
    "--discern-color-success-deep": {
      light: "oklch(37% 0.09 152)",
      dark: "oklch(88% 0.1 152)",
    },
    "--discern-color-warning": {
      light: "oklch(61% 0.14 74)",
      dark: "oklch(76% 0.13 82)",
    },
    "--discern-color-warning-soft": {
      light: "oklch(96% 0.045 82)",
      dark: "oklch(30% 0.055 82)",
    },
    "--discern-color-warning-deep": {
      light: "oklch(50% 0.12 74)",
      dark: "oklch(86% 0.1 82)",
    },
    "--discern-color-danger": {
      light: "oklch(54% 0.19 28)",
      dark: "oklch(70% 0.17 28)",
    },
    "--discern-color-danger-soft": {
      light: "oklch(96% 0.035 28)",
      dark: "oklch(29% 0.055 28)",
    },
  } as const satisfies Readonly<Record<BluePresetRoleName, BlueRolePair>>,
);

const blueRoleLaws = fieldColorRoleLaws.filter((law) => law.bluePreset);
const blueRoleNames = blueRoleLaws.map((law) => law.name);
const valueNames = Object.keys(blueRoleValues) as BluePresetRoleName[];
if (
  blueRoleNames.some((name) => !valueNames.includes(name)) ||
  valueNames.some((name) => !blueRoleNames.includes(name))
) {
  throw new TypeError("Blue preset values do not match field-role metadata");
}

/** Chromatic Theme Token overrides, enrolled from the field-role metadata. */
/** One blue preset override enrolled by field-role metadata. */
export interface BlueThemeRoleToken extends ThemeToken {
  readonly name: BluePresetRoleName;
}

export const blueThemeRoleTokens: readonly BlueThemeRoleToken[] = Object.freeze(
  blueRoleLaws.map((law) => {
    const pair = blueRoleValues[law.name as BluePresetRoleName];
    return {
      name: law.name,
      light: pair.light,
      dark: pair.dark,
      category: "Color" as const,
      description: law.description,
    };
  }),
);

/** Shape of the optional blue preset. */
export interface BlueTheme {
  readonly name: typeof BLUE_THEME_NAME;
  readonly primitives: readonly DesignToken[];
  readonly roles: readonly ThemeToken[];
}

/** Optional blue appearance preset. */
export const blueTheme: BlueTheme = Object.freeze({
  name: BLUE_THEME_NAME,
  primitives: blueThemeTokens,
  roles: blueThemeRoleTokens,
});

function declarations(mode: "light" | "dark"): string {
  const primitiveDeclarations = blueThemeTokens.map((token) =>
    `    ${token.name}: ${token.value};`
  );
  const roleDeclarations = blueThemeRoleTokens.map((token) =>
    `    ${token.name}: ${token[mode]};`
  );
  return [...primitiveDeclarations, ...roleDeclarations].join("\n");
}

const lightDeclarations = declarations("light");
const darkDeclarations = declarations("dark");

/** Root-scoped CSS for consumers that select the optional blue preset. */
export const blueThemeCss = `@layer discern.theme {
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
}`;

const fieldLight = evaluateField({ darkness: 0 });
const fieldDark = evaluateField({ darkness: 1 });
for (const token of blueThemeRoleTokens) {
  if (
    token.light === fieldLight[token.name] &&
    token.dark === fieldDark[token.name]
  ) {
    throw new TypeError(`Blue preset redundantly overrides ${token.name}`);
  }
}
