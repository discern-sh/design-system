import {
  appearanceAxisNames,
  defaultAppearance,
  pigmentTintAxisNames,
} from "../../../src/tokens/appearance.ts";
import { appearanceAxisCustomPropertyName } from "../../../src/tokens/appearance-live-css.ts";
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
  const tinted = pigmentTintAxisNames.some((axis) =>
    selection[axis] !== defaultAppearance[axis]
  );
  const declaration = [
    ...appearanceAxisNames.filter((axis) =>
      tinted || !(pigmentTintAxisNames as readonly string[]).includes(axis)
    ).map((axis) =>
      `${appearanceAxisCustomPropertyName(axis)}: ${
        formatCatalogueAxisNumber(selection[axis])
      }`
    ),
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
