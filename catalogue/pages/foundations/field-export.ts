import type { AppearanceName } from "../../../src/tokens/field.ts";
import type { CatalogueFieldSelection } from "../../shell/field-state.ts";
import {
  catalogueFieldPolarity,
  formatCatalogueFieldNumber,
} from "../../shell/field-state.ts";

/** Copy-only consumer declaration for one orthogonal Appearance state. */
export function catalogueFieldConsumerSnippet(
  selection: CatalogueFieldSelection,
  appearance: AppearanceName = "field",
  accentHue = 255,
): string {
  const declaration = [
    `--discern-darkness: ${formatCatalogueFieldNumber(selection.darkness)}`,
    `--discern-structure: ${formatCatalogueFieldNumber(selection.structure)}`,
    `--discern-emphasis: ${formatCatalogueFieldNumber(selection.emphasis)}`,
    `--discern-density: ${formatCatalogueFieldNumber(selection.density)}`,
    `--discern-accent-hue: ${formatCatalogueFieldNumber(accentHue)}`,
    `color-scheme: ${catalogueFieldPolarity(selection)}`,
  ].join("; ");
  return `<main
  data-discern-root
  data-discern-appearance="${appearance}"
  style="${declaration}"
>
  <!-- Page content -->
</main>`;
}
