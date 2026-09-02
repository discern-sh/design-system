import {
  type ComponentCssHit,
  componentCssHits,
  type CssDeclaration,
  printComponentCssMetric,
  verboseMetricRequested,
} from "./component-css-metrics.ts";

const spacingProperty =
  /^(?:(?:padding|margin)(?:-(?:top|right|bottom|left|block(?:-(?:start|end))?|inline(?:-(?:start|end))?))?|(?:row-|column-)?gap|inset(?:-(?:top|right|bottom|left|block(?:-(?:start|end))?|inline(?:-(?:start|end))?))?|top|right|bottom|left)$/u;
const dimensionLiteral =
  /[+-]?(?:(?:\d*\.\d+)|(?:\d+\.?\d*))(?:[eE][+-]?\d+)?(?:px|rem|em)\b/gu;

/** Find spacing and offset declarations that bypass the spacing role scale. */
export function rawSpacingHits(
  declarations: readonly CssDeclaration[],
): readonly ComponentCssHit[] {
  const hits: ComponentCssHit[] = [];
  for (const declaration of declarations) {
    if (!spacingProperty.test(declaration.property)) continue;
    const literals = [...declaration.value.matchAll(dimensionLiteral)]
      .map((match) => match[0])
      .filter((literal) => Number.parseFloat(literal) !== 0);
    if (literals.length === 0) continue;
    hits.push({
      ...declaration,
      reason: `raw spacing ${literals.join(", ")}`,
    });
  }
  return hits;
}

if (import.meta.main) {
  const verbose = verboseMetricRequested(Deno.args);
  const hits = await componentCssHits(rawSpacingHits);
  printComponentCssMetric("raw_spacing", hits, verbose);
}
