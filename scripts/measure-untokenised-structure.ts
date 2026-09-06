import {
  type ComponentCssHit,
  componentCssHits,
  type CssDeclaration,
  printComponentCssMetric,
  verboseMetricRequested,
} from "./component-css-metrics.ts";

const edge =
  "(?:top|right|bottom|left|block(?:-(?:start|end))?|inline(?:-(?:start|end))?)";
const borderShorthand = new RegExp(`^border(?:-${edge})?$`, "u");
const borderColor = new RegExp(
  `^border(?:-${edge})?-color$|^border-color$`,
  "u",
);
const roleProperty = /^--discern-(?:color|shadow)-/u;
const customProperty = /var\(\s*(--[-_a-zA-Z0-9]+)/gu;
const shadowRoleList =
  /^(?:var\(\s*--discern-shadow-(?!color\b)[-_a-zA-Z0-9]+\s*\))(?:\s*,\s*var\(\s*--discern-shadow-(?!color\b)[-_a-zA-Z0-9]+\s*\))*$/u;

function carriesOnlyRoleProperties(value: string): boolean {
  const properties = [...value.matchAll(customProperty)].map((match) =>
    match[1] ?? ""
  );
  return properties.length > 0 &&
    properties.every((name) => roleProperty.test(name));
}

function paintsNoEdge(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/\s*!important$/u, "");
  return normalized === "none" ||
    /^(?:0+(?:\.0+)?(?:px|rem|em)?)(?:\s+(?:none|hidden|solid|dashed|dotted|double|transparent))*$/u
      .test(normalized);
}

function isUntokenisedEdge(declaration: CssDeclaration): boolean {
  if (declaration.property === "outline") {
    return !paintsNoEdge(declaration.value) &&
      !carriesOnlyRoleProperties(declaration.value);
  }
  if (declaration.property === "outline-color") {
    return !carriesOnlyRoleProperties(declaration.value);
  }
  if (borderColor.test(declaration.property)) {
    return !carriesOnlyRoleProperties(declaration.value);
  }
  if (borderShorthand.test(declaration.property)) {
    return !paintsNoEdge(declaration.value) &&
      !carriesOnlyRoleProperties(declaration.value);
  }
  return false;
}

function isUntokenisedShadow(declaration: CssDeclaration): boolean {
  if (declaration.property !== "box-shadow") return false;
  const value = declaration.value.trim();
  if (value.toLowerCase() === "none") return false;
  return !shadowRoleList.test(value) &&
    !/var\(\s*--discern-shadow-color\b/u.test(value);
}

/** Find structural ink and shadows that bypass their public role tokens. */
export function untokenisedStructureHits(
  declarations: readonly CssDeclaration[],
): readonly ComponentCssHit[] {
  const hits: ComponentCssHit[] = [];
  for (const declaration of declarations) {
    if (isUntokenisedEdge(declaration)) {
      hits.push({
        ...declaration,
        reason: "edge colour bypasses a role token",
      });
    } else if (isUntokenisedShadow(declaration)) {
      hits.push({
        ...declaration,
        reason: "shadow bypasses a shadow role or shadow colour",
      });
    }
  }
  return hits;
}

if (import.meta.main) {
  const verbose = verboseMetricRequested(Deno.args);
  const hits = await componentCssHits(untokenisedStructureHits);
  printComponentCssMetric("untokenised_structure", hits, verbose);
}
