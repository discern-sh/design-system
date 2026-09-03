import { useId } from "react";
import { Input } from "../../src/components/forms/input/input.tsx";
import { fieldAxes, type FieldAxisName } from "../../src/tokens/field.ts";
import { formatCatalogueFieldNumber } from "./field-state.ts";

const axisCopy: Readonly<
  Record<
    FieldAxisName,
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
};

export interface FieldAxisControlProps {
  readonly axis: FieldAxisName;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

/** Shared public-Input projection used by the shell and Field instrument. */
export function FieldAxisControl(
  { axis, value, onChange }: FieldAxisControlProps,
) {
  const generatedId = useId();
  const id = `discern-catalogue-field-${axis}-${generatedId}`;
  const descriptionId = `${id}-description`;
  const definition = fieldAxes[axis];
  const copy = axisCopy[axis];
  return (
    <div
      className="discern-catalogue-field-axis"
      data-discern-field-axis={axis}
    >
      <div>
        <label htmlFor={id}>{copy.label}</label>
        <output htmlFor={id}>{formatCatalogueFieldNumber(value)}</output>
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
        <span className="discern-catalogue-field-axis__description">
          {definition.description}
        </span>
      </small>
    </div>
  );
}
