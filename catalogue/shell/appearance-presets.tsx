import { Select } from "../../src/components/forms/select/select.tsx";
import {
  type CatalogueAxesSelection,
  defaultCatalogueAxesSelection,
} from "./axes-state.ts";
import { appearanceAxisNames } from "../../src/tokens/appearance.ts";

/** Starting points are ordinary coordinates; theme and accent remain independent. */
export const catalogueAppearancePresets = Object.freeze([
  { id: "default", label: "Default", field: defaultCatalogueAxesSelection },
  {
    id: "reading",
    label: "Comfortable reading",
    field: {
      ...defaultCatalogueAxesSelection,
      structure: 0.8,
      emphasis: 0.8,
      density: 1.3,
    },
  },
  {
    id: "tools",
    label: "Dense tools",
    field: { ...defaultCatalogueAxesSelection, structure: 1.1, density: 0.65 },
  },
]);

export function AppearancePresets({ field, onChange }: {
  readonly field: CatalogueAxesSelection;
  readonly onChange: (field: CatalogueAxesSelection) => void;
}) {
  const selected = catalogueAppearancePresets.find((preset) =>
    appearanceAxisNames.every((axis) =>
      axis === "darkness" || preset.field[axis] === field[axis]
    )
  );
  return (
    <div className="discern-catalogue-appearance__presets">
      <Select
        label="Starting point"
        value={selected?.id ?? "custom"}
        options={[
          ...catalogueAppearancePresets.map(({ id, label }) => ({
            value: id,
            label,
          })),
          { value: "custom", label: "Custom coordinates", disabled: true },
        ]}
        onChange={(event) => {
          const preset = catalogueAppearancePresets.find(({ id }) =>
            id === event.currentTarget.value
          );
          if (preset) onChange({ ...preset.field, darkness: field.darkness });
        }}
      />
      <small>
        Keeps theme and accent. Choose Default to reset the other axes.
      </small>
    </div>
  );
}
