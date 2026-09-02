/**
 * Symmetric browser scopes for the Field and Accent projections. Static pole
 * fallback and feature-gated live CSS both derive from the appearance graph.
 *
 * @module
 */

import {
  accentAppearance,
  type AppearanceName,
  DEFAULT_ACCENT_HUE,
  evaluateAppearance,
  evaluateFieldShadows,
  fieldAppearance,
  fieldColorRoleLaws,
  fieldShadowRoleLaws,
} from "./field.ts";
import {
  ACCENT_HUE_CUSTOM_PROPERTY_NAME,
  appearanceLiveCssDeclarations,
  FIELD_LIVE_CSS_SUPPORTS,
} from "./field-css.ts";

/** Public attribute selecting one browser appearance projection. */
export const APPEARANCE_ATTRIBUTE = "data-discern-appearance" as const;

/** Public appearance values accepted by the namespaced browser scope. */
export const browserAppearances: readonly AppearanceName[] = Object.freeze([
  "field",
  "accent",
]);

/** One generated pole projection used by fallback CSS and compatibility APIs. */
export interface AppearancePoleProjection {
  readonly roles: Readonly<Record<`--discern-${string}`, string>>;
  readonly shadows: Readonly<Record<`--discern-${string}`, string>>;
}

function requiredValue(
  values: Readonly<Record<`--discern-${string}`, string>>,
  name: `--discern-${string}`,
): string {
  const value = values[name];
  if (value === undefined) throw new TypeError(`Appearance omitted ${name}`);
  return value;
}

function accentHueTemplate(
  law: (typeof fieldColorRoleLaws)[number],
  value: string,
): string {
  if (law.accent === "field") return value;
  const usesAccentHue = JSON.stringify(law.accent.hue).includes("accent-hue");
  if (!usesAccentHue) return value;
  const marker = ` ${DEFAULT_ACCENT_HUE}`;
  const markerIndex = value.lastIndexOf(marker);
  if (markerIndex < 0) {
    if (/^oklch\([^)]*\s0\s0(?:\s\/|\))/u.test(value)) return value;
    throw new TypeError(`${law.name} did not emit the Accent hue marker`);
  }
  return `${
    value.slice(0, markerIndex)
  } var(${ACCENT_HUE_CUSTOM_PROPERTY_NAME})${
    value.slice(markerIndex + marker.length)
  }`;
}

/** Generate one static light or dark appearance pole from the shared graph. */
export function appearancePoleProjection(
  appearance: AppearanceName,
  mode: "light" | "dark",
): AppearancePoleProjection {
  const darkness = mode === "light" ? 0 : 1;
  const identity = appearance === "field"
    ? fieldAppearance
    : accentAppearance(DEFAULT_ACCENT_HUE);
  const evaluated = evaluateAppearance(identity, { darkness });
  const roles = Object.fromEntries(fieldColorRoleLaws.map((law) => {
    const value = requiredValue(evaluated, law.name);
    return [
      law.name,
      appearance === "accent" ? accentHueTemplate(law, value) : value,
    ];
  })) as Record<`--discern-${string}`, string>;
  return Object.freeze({
    roles: Object.freeze(roles),
    shadows: evaluateFieldShadows({ darkness }),
  });
}

function scopeSelector(appearance: AppearanceName): string {
  return `:where([data-discern-root][${APPEARANCE_ATTRIBUTE}="${appearance}"], [data-discern-root] [${APPEARANCE_ATTRIBUTE}="${appearance}"])`;
}

function darkScopeSelector(appearance: AppearanceName): string {
  const attribute = `[${APPEARANCE_ATTRIBUTE}="${appearance}"]`;
  return `:where([data-discern-root][data-discern-theme="dark"]${attribute}, [data-discern-root][data-discern-theme="dark"] ${attribute})`;
}

function systemDarkScopeSelector(appearance: AppearanceName): string {
  const attribute = `[${APPEARANCE_ATTRIBUTE}="${appearance}"]`;
  return `:where([data-discern-root]:not([data-discern-theme])${attribute}, [data-discern-root]:not([data-discern-theme]) ${attribute}, [data-discern-root][data-discern-theme="system"]${attribute}, [data-discern-root][data-discern-theme="system"] ${attribute})`;
}

function poleDeclarations(
  appearance: AppearanceName,
  mode: "light" | "dark",
): string {
  const projection = appearancePoleProjection(appearance, mode);
  return [
    ...fieldColorRoleLaws.map((law) =>
      `    ${law.name}: ${requiredValue(projection.roles, law.name)};`
    ),
    ...fieldShadowRoleLaws.map((law) =>
      `    ${law.name}: ${requiredValue(projection.shadows, law.name)};`
    ),
  ].join("\n");
}

function liveDeclarations(appearance: AppearanceName): string {
  return appearanceLiveCssDeclarations(appearance).map((declaration) =>
    `    ${declaration.name}: ${declaration.value};`
  ).join("\n");
}

/**
 * Generate the atomic two-way scope contract. Selecting this surface admits
 * both identities so either can be nested inside the other without copying
 * declarations.
 */
export function generateAppearanceScopeCss(): string {
  const light = browserAppearances.map((appearance) =>
    `  ${scopeSelector(appearance)} {\n${
      poleDeclarations(appearance, "light")
    }\n  }`
  ).join("\n\n");
  const dark = browserAppearances.map((appearance) =>
    `  ${darkScopeSelector(appearance)} {\n${
      poleDeclarations(appearance, "dark")
    }\n  }`
  ).join("\n\n");
  const systemDark = browserAppearances.map((appearance) =>
    `    ${systemDarkScopeSelector(appearance)} {\n${
      poleDeclarations(appearance, "dark")
    }\n    }`
  ).join("\n\n");
  const live = browserAppearances.map((appearance) =>
    `    ${scopeSelector(appearance)} {\n${liveDeclarations(appearance)}\n    }`
  ).join("\n\n");

  return `@layer discern.theme {
${light}

${dark}

  @media (prefers-color-scheme: dark) {
${systemDark}
  }

  @supports ${FIELD_LIVE_CSS_SUPPORTS} {
${live}
  }
}`;
}

/** Generated symmetric appearance-scope stylesheet. */
export const appearanceScopeCss = generateAppearanceScopeCss();
