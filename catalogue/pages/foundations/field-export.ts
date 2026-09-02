import type { CatalogueFieldSelection } from "../../shell/field-state.ts";
import {
  catalogueFieldPolarity,
  formatCatalogueFieldNumber,
} from "../../shell/field-state.ts";

/** Copy-only consumer declaration for one field point. */
export function catalogueFieldConsumerSnippet(
  selection: CatalogueFieldSelection,
): string {
  const declaration = [
    `--discern-darkness: ${formatCatalogueFieldNumber(selection.darkness)}`,
    `--discern-structure: ${formatCatalogueFieldNumber(selection.structure)}`,
    `--discern-emphasis: ${formatCatalogueFieldNumber(selection.emphasis)}`,
    `--discern-density: ${formatCatalogueFieldNumber(selection.density)}`,
    `color-scheme: ${catalogueFieldPolarity(selection)}`,
  ].join("; ");
  const root = `<main
  data-discern-root
  style="${declaration}"
>
  <!-- Page content -->
</main>`;
  return selection.preset === "mono"
    ? root
    : `import { BLUE_THEME_NAME } from "@discern-sh/design-system/theme/blue";

// Pass theme: BLUE_THEME_NAME to emitDesignSystemRuntime.
${root}`;
}
