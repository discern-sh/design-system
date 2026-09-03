/**
 * Symmetric browser scopes for the monochrome and Accent projections. Static
 * pole fallback and feature-gated live CSS both derive from the appearance
 * graph, so a Root or subtree switches Accent on or off without copying roles.
 *
 * @module
 */

import {
  appearanceColorRoleLaws,
  type AppearanceProjection,
  appearanceProjections,
  appearanceShadowRoleLaws,
  DEFAULT_ACCENT_HUE,
  evaluateAppearance,
  evaluateAppearanceShadows,
} from "./appearance.ts";
import {
  ACCENT_HUE_CUSTOM_PROPERTY_NAME,
  APPEARANCE_LIVE_CSS_SUPPORTS,
  appearanceLiveCssDeclarations,
} from "./appearance-live-css.ts";

/** Public attribute that applies the Accent projection to a Root or subtree. */
export const ACCENT_ATTRIBUTE = "data-discern-accent" as const;

/** Attribute value that restores the monochrome projection inside an Accent scope. */
export const ACCENT_NONE_VALUE = "none" as const;

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
  law: (typeof appearanceColorRoleLaws)[number],
  value: string,
): string {
  if (law.accent === "mono") return value;
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

/** Generate one static light or dark pole for either projection from the shared graph. */
export function appearancePoleProjection(
  projection: AppearanceProjection,
  mode: "light" | "dark",
): AppearancePoleProjection {
  const darkness = mode === "light" ? 0 : 1;
  const evaluated = evaluateAppearance(
    projection === "accent"
      ? { darkness, accent: DEFAULT_ACCENT_HUE }
      : { darkness },
  );
  const roles = Object.fromEntries(appearanceColorRoleLaws.map((law) => {
    const value = requiredValue(evaluated, law.name);
    return [
      law.name,
      projection === "accent" ? accentHueTemplate(law, value) : value,
    ];
  })) as Record<`--discern-${string}`, string>;
  return Object.freeze({
    roles: Object.freeze(roles),
    shadows: evaluateAppearanceShadows({ darkness }),
  });
}

/** Attribute selector that activates one projection on an element. */
export function accentScopeAttributeSelector(
  projection: AppearanceProjection,
): string {
  return projection === "accent"
    ? `[${ACCENT_ATTRIBUTE}]:not([${ACCENT_ATTRIBUTE}="${ACCENT_NONE_VALUE}"])`
    : `[${ACCENT_ATTRIBUTE}="${ACCENT_NONE_VALUE}"]`;
}

function scopeSelector(projection: AppearanceProjection): string {
  const attribute = accentScopeAttributeSelector(projection);
  return `:where([data-discern-root]${attribute}, [data-discern-root] ${attribute})`;
}

function darkScopeSelector(projection: AppearanceProjection): string {
  const attribute = accentScopeAttributeSelector(projection);
  return `:where([data-discern-root][data-discern-theme="dark"]${attribute}, [data-discern-root][data-discern-theme="dark"] ${attribute})`;
}

function systemDarkScopeSelector(projection: AppearanceProjection): string {
  const attribute = accentScopeAttributeSelector(projection);
  return `:where([data-discern-root]:not([data-discern-theme])${attribute}, [data-discern-root]:not([data-discern-theme]) ${attribute}, [data-discern-root][data-discern-theme="system"]${attribute}, [data-discern-root][data-discern-theme="system"] ${attribute})`;
}

function poleDeclarations(
  projection: AppearanceProjection,
  mode: "light" | "dark",
): string {
  const pole = appearancePoleProjection(projection, mode);
  return [
    ...appearanceColorRoleLaws.map((law) =>
      `    ${law.name}: ${requiredValue(pole.roles, law.name)};`
    ),
    ...appearanceShadowRoleLaws.map((law) =>
      `    ${law.name}: ${requiredValue(pole.shadows, law.name)};`
    ),
  ].join("\n");
}

function liveDeclarations(projection: AppearanceProjection): string {
  return appearanceLiveCssDeclarations(projection).map((declaration) =>
    `    ${declaration.name}: ${declaration.value};`
  ).join("\n");
}

/**
 * Generate the atomic two-way scope contract. Selecting this surface admits
 * both projections so either can be nested inside the other without copying
 * declarations.
 */
export function generateAppearanceScopeCss(): string {
  const light = appearanceProjections.map((projection) =>
    `  ${scopeSelector(projection)} {\n${
      poleDeclarations(projection, "light")
    }\n  }`
  ).join("\n\n");
  const dark = appearanceProjections.map((projection) =>
    `  ${darkScopeSelector(projection)} {\n${
      poleDeclarations(projection, "dark")
    }\n  }`
  ).join("\n\n");
  const systemDark = appearanceProjections.map((projection) =>
    `    ${systemDarkScopeSelector(projection)} {\n${
      poleDeclarations(projection, "dark")
    }\n    }`
  ).join("\n\n");
  const live = appearanceProjections.map((projection) =>
    `    ${scopeSelector(projection)} {\n${liveDeclarations(projection)}\n    }`
  ).join("\n\n");

  return `@layer discern.theme {
${light}

${dark}

  @media (prefers-color-scheme: dark) {
${systemDark}
  }

  @supports ${APPEARANCE_LIVE_CSS_SUPPORTS} {
${live}
  }
}`;
}

/** Generated symmetric appearance-scope stylesheet. */
export const appearanceScopeCss: string = generateAppearanceScopeCss();
