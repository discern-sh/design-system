import { useEffect, useId, useState } from "react";
import { Button } from "../../src/components/core/button/button.tsx";
import { Input } from "../../src/components/forms/input/input.tsx";
import {
  appearanceAxes,
  type AppearanceAxisName,
} from "../../src/tokens/appearance.ts";
import { formatCatalogueAxisNumber, parseCatalogueAxis } from "./axes-state.ts";

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
  readonly label?: string;
  readonly onChange: (value: number) => void;
}

/** Shared public-Input projection used by the shell and Appearance instrument. */
export function AxisControl(
  { axis, value, label, onChange }: AxisControlProps,
) {
  const generatedId = useId();
  const id = `discern-catalogue-axis-${axis}-${generatedId}`;
  const descriptionId = `${id}-description`;
  const definition = appearanceAxes[axis];
  const copy = axisCopy[axis];
  const name = label ?? copy.label;
  const [draft, setDraft] = useState(formatCatalogueAxisNumber(value));
  useEffect(() => setDraft(formatCatalogueAxisNumber(value)), [value]);
  const parsed = parseCatalogueAxis(axis, draft);
  const commit = (): void => {
    if (parsed !== undefined) onChange(parsed);
  };
  const unit = axis.endsWith("Hue") ? "degrees" : "relative units";
  return (
    <div
      className="discern-catalogue-axis"
      data-discern-axis={axis}
    >
      <div>
        <label htmlFor={id}>{name}</label>
        <output htmlFor={id}>{formatCatalogueAxisNumber(value)}</output>
      </div>
      <Input
        id={id}
        type="range"
        min={definition.minimum}
        max={definition.maximum}
        step="any"
        value={value}
        aria-describedby={descriptionId}
        onInput={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <div className="discern-catalogue-axis__exact">
        <Input
          type="number"
          label={`${name} exact value`}
          min={definition.minimum}
          max={definition.maximum}
          step="any"
          value={draft}
          aria-describedby={descriptionId}
          aria-invalid={draft !== "" && parsed === undefined ? true : undefined}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (
              event.key === "Escape" &&
              draft !== formatCatalogueAxisNumber(value)
            ) {
              event.preventDefault();
              event.stopPropagation();
              setDraft(formatCatalogueAxisNumber(value));
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Reset ${name.toLowerCase()}`}
          onClick={() => {
            setDraft(formatCatalogueAxisNumber(definition.default));
            onChange(definition.default);
          }}
        >
          Reset
        </Button>
      </div>
      <small id={descriptionId}>
        <span>{copy.minimum} {definition.minimum}</span>
        <span>{copy.maximum} {definition.maximum} · {unit}</span>
        <span className="discern-catalogue-axis__description">
          {definition.description}{" "}
          Exact values apply on Enter or leaving the field; Escape restores an
          unfinished edit.
        </span>
      </small>
    </div>
  );
}
