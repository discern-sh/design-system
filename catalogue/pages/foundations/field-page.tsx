import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Input } from "../../../src/components/forms/input/input.tsx";
import { Switch } from "../../../src/components/forms/switch/switch.tsx";
import {
  defaultFieldPoint,
  evaluateField,
  evaluateFieldExpression,
  fieldAxes,
  type FieldAxisName,
  fieldColorRoleLaws,
  type FieldPoint,
  fieldPolarityExpression,
} from "../../../src/tokens/field.ts";
import {
  catalogueAppearanceOption,
  catalogueAppearanceStyle,
} from "../../shell/appearance-options.ts";
import { CataloguePageHeader } from "../shared.tsx";

type FieldPreset = "mono" | "blue";

interface LocalFieldSelection extends FieldPoint {
  readonly preset: FieldPreset;
}

const defaultSelection: LocalFieldSelection = {
  ...defaultFieldPoint,
  preset: "mono",
};

function pointPolarity(point: FieldPoint): "light" | "dark" {
  return evaluateFieldExpression(fieldPolarityExpression, point) === 1
    ? "dark"
    : "light";
}

function fieldStyle(selection: LocalFieldSelection): CSSProperties {
  const polarity = pointPolarity(selection);
  const blue = catalogueAppearanceOption("blue");
  return {
    "--discern-darkness": selection.darkness,
    "--discern-structure": selection.structure,
    "--discern-emphasis": selection.emphasis,
    "--discern-density": selection.density,
    colorScheme: polarity,
    ...(selection.preset === "blue" && blue !== undefined
      ? catalogueAppearanceStyle(blue, polarity)
      : {}),
  } as CSSProperties;
}

function axisLabel(axis: FieldAxisName): string {
  return (axis[0]?.toUpperCase() ?? "") + axis.slice(1);
}

function FieldAxisControl(
  {
    axis,
    value,
    onChange,
  }: {
    readonly axis: FieldAxisName;
    readonly value: number;
    readonly onChange: (value: number) => void;
  },
) {
  const definition = fieldAxes[axis];
  return (
    <div className="discern-catalogue-field-axis">
      <div>
        <label htmlFor={`discern-catalogue-field-${axis}`}>
          {axisLabel(axis)}
        </label>
        <output htmlFor={`discern-catalogue-field-${axis}`}>
          {value.toFixed(2)}
        </output>
      </div>
      <Input
        id={`discern-catalogue-field-${axis}`}
        type="range"
        min={definition.minimum}
        max={definition.maximum}
        step="0.01"
        value={value}
        aria-description={definition.description}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <small>{definition.description}</small>
    </div>
  );
}

/** Live browser instrument for the four public field axes. */
export function FieldPage() {
  const [selection, setSelection] = useState(defaultSelection);
  const [computedRoles, setComputedRoles] = useState<
    Readonly<Record<string, string>>
  >({});
  const pageRef = useRef<HTMLDivElement>(null);
  const evaluated = evaluateField(selection);
  const polarity = pointPolarity(selection);

  useEffect(() => {
    const root = pageRef.current;
    if (root === null) return;
    const roles = Object.fromEntries(
      [...root.querySelectorAll<HTMLElement>("[data-discern-field-role]")]
        .map((swatch) => [
          swatch.dataset.discernFieldRole ?? "",
          getComputedStyle(swatch).backgroundColor,
        ]),
    );
    setComputedRoles(roles);
  }, [selection]);

  const changeAxis = (axis: FieldAxisName, value: number): void => {
    setSelection((current) => ({ ...current, [axis]: value }));
  };

  return (
    <div
      ref={pageRef}
      className="discern-catalogue-page discern-catalogue-field"
      data-discern-foundations-page="field"
      style={fieldStyle(selection)}
    >
      <a
        className="discern-catalogue-foundations__back"
        href="/catalogue/foundations/"
      >
        ← Foundations
      </a>
      <CataloguePageHeader
        index="03"
        eyebrow="Foundations"
        title="Field"
        description="Place the live system at one point, inspect every derived role, and take the declaration with you."
      />

      <div className="discern-catalogue-field__instrument">
        <section
          className="discern-catalogue-field__controls"
          aria-labelledby="discern-catalogue-field-controls-heading"
        >
          <div>
            <h2 id="discern-catalogue-field-controls-heading">Field point</h2>
            <p>
              These controls write the registered axis properties used by the
              emitted runtime.
            </p>
          </div>
          {(
            ["darkness", "structure", "emphasis", "density"] as const
          ).map((axis) => (
            <FieldAxisControl
              key={axis}
              axis={axis}
              value={selection[axis]}
              onChange={(value) => changeAxis(axis, value)}
            />
          ))}
          <Switch
            checked={selection.preset === "blue"}
            label="Blue preset"
            description="Layer the optional chromatic preset over this field point."
            onChange={(event) =>
              setSelection((current) => ({
                ...current,
                preset: event.currentTarget.checked ? "blue" : "mono",
              }))}
          />
        </section>

        <section
          className="discern-catalogue-field__reading"
          aria-labelledby="discern-catalogue-field-reading-heading"
        >
          <div>
            <h2 id="discern-catalogue-field-reading-heading">Current field</h2>
            <p>
              Token polarity is{" "}
              <strong>{polarity}</strong>. The token model has no hysteresis;
              the live control will hold native colour scheme briefly around the
              crossover.
            </p>
          </div>
          <div className="discern-catalogue-field__pair">
            {(
              [
                ["Canvas", "--discern-color-canvas"],
                ["Ink", "--discern-color-ink"],
              ] as const
            ).map(([label, role]) => (
              <div key={role}>
                <span
                  data-discern-field-role={role}
                  style={{ background: `var(${role})` }}
                />
                <strong>{label}</strong>
                <code>{computedRoles[role] ?? evaluated[role]}</code>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section
        className="discern-catalogue-field__roles"
        aria-labelledby="discern-catalogue-field-roles-heading"
      >
        <div>
          <h2 id="discern-catalogue-field-roles-heading">Derived roles</h2>
          <p>
            Each swatch paints through the emitted custom property; the value
            beside it is read back from the browser.
          </p>
        </div>
        <div className="discern-catalogue-field__role-grid">
          {fieldColorRoleLaws.map(({ name }) => (
            <article key={name}>
              <span
                data-discern-field-role={name}
                style={{ background: `var(${name})` }}
              />
              <code>{name}</code>
              <small>{computedRoles[name] ?? evaluated[name]}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
