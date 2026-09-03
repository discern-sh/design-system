import type { AppearanceName } from "../../../src/tokens/appearance.ts";
import type { CatalogueAxesSelection } from "../../shell/axes-state.ts";
import {
  catalogueAxesPolarity,
  formatCatalogueAxisNumber,
} from "../../shell/axes-state.ts";

/** Copy-only consumer declaration for one orthogonal Appearance state. */
export function catalogueAppearanceConsumerSnippet(
  selection: CatalogueAxesSelection,
  appearance: AppearanceName = "field",
  accentHue = 255,
): string {
  const declaration = [
    `--discern-darkness: ${formatCatalogueAxisNumber(selection.darkness)}`,
    `--discern-structure: ${formatCatalogueAxisNumber(selection.structure)}`,
    `--discern-emphasis: ${formatCatalogueAxisNumber(selection.emphasis)}`,
    `--discern-density: ${formatCatalogueAxisNumber(selection.density)}`,
    `--discern-accent-hue: ${formatCatalogueAxisNumber(accentHue)}`,
    `color-scheme: ${catalogueAxesPolarity(selection)}`,
  ].join("; ");
  return `<main
  data-discern-root
  data-discern-appearance="${appearance}"
  style="${declaration}"
>
  <!-- Page content -->
</main>`;
}
