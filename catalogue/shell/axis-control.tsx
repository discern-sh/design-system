import { useId } from "react";
import { Input } from "../../src/components/forms/input/input.tsx";
import {
  appearanceAxes,
  type AppearanceAxisName,
} from "../../src/tokens/appearance.ts";
import { formatCatalogueAxisNumber } from "./axes-state.ts";

const axisCopy: Readonly<
  Record<
    AppearanceAxisName,
    {
      readonly label: string;
      readonly minimum: string;
      readonly maximum: string;
    }
  >
> = {
  darkness: { label: "Darkness", minimum: "Paper", maximum: "Ink" },
  structure: { label: "Structure", minimum: "Flat", maximum: "Strong" },
  emphasis: { label: "Emphasis", minimum: "Quiet", maximum: "Vivid" },
  density: { label: "Density", minimum: "Compact", maximum: "Airy" },
  paperTint: { label: "Paper tint", minimum: "Plain", maximum: "Full" },
  paperTintHue: { label: "Paper tint hue", minimum: "Hue", maximum: "Hue" },
  inkTint: { label: "Ink tint", minimum: "Plain", maximum: "Full" },
  inkTintHue: { label: "Ink tint hue", minimum: "Hue", maximum: "Hue" },
};

export interface AxisControlProps {
  readonly axis: AppearanceAxisName;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

/** Shared public-Input projection used by the shell and Appearance instrument. */
export function AxisControl(
  { axis, value, onChange }: AxisControlProps,
) {
  const generatedId = useId();
  const id = `discern-catalogue-axis-${axis}-${generatedId}`;
  const descriptionId = `${id}-description`;
  const definition = appearanceAxes[axis];
  const copy = axisCopy[axis];
  return (
    <div
      className="discern-catalogue-axis"
      data-discern-axis={axis}
    >
      <div>
        <label htmlFor={id}>{copy.label}</label>
        <output htmlFor={id}>{formatCatalogueAxisNumber(value)}</output>
      </div>
      <Input
        id={id}
        type="range"
        min={definition.minimum}
        max={definition.maximum}
        step="0.01"
        value={value}
        aria-describedby={descriptionId}
        onInput={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <small id={descriptionId}>
        <span>{copy.minimum} {definition.minimum}</span>
        <span>{copy.maximum} {definition.maximum}</span>
        <span className="discern-catalogue-axis__description">
          {definition.description}
        </span>
      </small>
    </div>
  );
}
