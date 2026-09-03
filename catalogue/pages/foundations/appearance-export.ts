import type { CatalogueAxesSelection } from "../../shell/axes-state.ts";
import {
  catalogueAxesPolarity,
  formatCatalogueAxisNumber,
} from "../../shell/axes-state.ts";

/** Copy-only consumer declaration for one complete Appearance. */
export function catalogueAppearanceConsumerSnippet(
  selection: CatalogueAxesSelection,
  accent?: number,
): string {
  const declaration = [
    `--discern-darkness: ${formatCatalogueAxisNumber(selection.darkness)}`,
    `--discern-structure: ${formatCatalogueAxisNumber(selection.structure)}`,
    `--discern-emphasis: ${formatCatalogueAxisNumber(selection.emphasis)}`,
    `--discern-density: ${formatCatalogueAxisNumber(selection.density)}`,
    ...(accent === undefined
      ? []
      : [`--discern-accent-hue: ${formatCatalogueAxisNumber(accent)}`]),
    `color-scheme: ${catalogueAxesPolarity(selection)}`,
  ].join("; ");
  return `<main
  data-discern-root${accent === undefined ? "" : "\n  data-discern-accent"}
  style="${declaration}"
>
  <!-- Page content -->
</main>`;
}
