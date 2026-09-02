import { useEffect, useRef, useState } from "react";
import { Input } from "../../../src/components/forms/input/input.tsx";
import { Switch } from "../../../src/components/forms/switch/switch.tsx";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import {
  catalogueFieldPointProof,
  type CatalogueFieldProofCheck,
} from "../../shell/appearance-options.ts";
import {
  evaluateField,
  fieldAxes,
  type FieldAxisName,
  fieldColorRoleLaws,
} from "../../../src/tokens/field.ts";
import type { CatalogueFieldSelection } from "../../shell/field-state.ts";
import {
  catalogueFieldPolarity,
  catalogueFieldStyle,
  defaultCatalogueFieldSelection,
} from "../../shell/field-state.ts";
import { CataloguePageHeader } from "../shared.tsx";
import { catalogueFieldConsumerSnippet } from "./field-export.ts";

function axisLabel(axis: FieldAxisName): string {
  return (axis[0]?.toUpperCase() ?? "") + axis.slice(1);
}

function proofValue(
  value: number,
  unit: CatalogueFieldProofCheck["unit"],
): string {
  const formatted = value.toFixed(unit === "contrast" ? 2 : 3);
  return unit === "contrast" ? `${formatted}:1` : `${formatted} ${unit}`;
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
  const descriptionId = `discern-catalogue-field-${axis}-description`;
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
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <small id={descriptionId}>{definition.description}</small>
    </div>
  );
}

export interface FieldPageProps {
  readonly field?: CatalogueFieldSelection | undefined;
  readonly fieldScheme?: "light" | "dark" | undefined;
  readonly onFieldChange?:
    | ((field: CatalogueFieldSelection) => void)
    | undefined;
}

/** Live browser instrument for the four public field axes. */
export function FieldPage(
  { field, fieldScheme, onFieldChange }: FieldPageProps = {},
) {
  const [localSelection, setLocalSelection] = useState(
    defaultCatalogueFieldSelection,
  );
  const selection = field ?? localSelection;
  const [computedRoles, setComputedRoles] = useState<
    Readonly<Record<string, string>>
  >({});
  const pageRef = useRef<HTMLDivElement>(null);
  const evaluated = evaluateField(selection);
  const polarity = catalogueFieldPolarity(selection);
  const proof = catalogueFieldPointProof(
    selection,
    fieldScheme ?? polarity,
  );
  const consumerSnippet = catalogueFieldConsumerSnippet(selection);

  useEffect(() => {
    if (field === undefined && onFieldChange !== undefined) {
      onFieldChange(defaultCatalogueFieldSelection);
    }
  }, [field, onFieldChange]);

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
  }, [selection, fieldScheme]);

  const changeSelection = (next: CatalogueFieldSelection): void => {
    if (onFieldChange === undefined) setLocalSelection(next);
    else onFieldChange(next);
  };
  const changeAxis = (axis: FieldAxisName, value: number): void => {
    changeSelection({ ...selection, [axis]: value });
  };

  return (
    <div
      ref={pageRef}
      className="discern-catalogue-page discern-catalogue-field"
      data-discern-foundations-page="field"
      style={onFieldChange === undefined
        ? catalogueFieldStyle(selection, fieldScheme)
        : undefined}
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
              changeSelection({
                ...selection,
                preset: event.currentTarget.checked ? "blue" : "mono",
              })}
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
              the live control holds native colour scheme briefly around the
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
        className="discern-catalogue-field__proof"
        data-discern-field-proof={proof.accepted ? "accepted" : "refused"}
        aria-labelledby="discern-catalogue-field-proof-heading"
      >
        <div className="discern-catalogue-field__proof-heading">
          <div>
            <h2 id="discern-catalogue-field-proof-heading">
              Admission proof
            </h2>
            <p>
              The browser runs the same numerical floor loop that admits the
              named Appearance presets in tests.
            </p>
          </div>
          <strong>{proof.accepted ? "Admitted" : "Refused"}</strong>
        </div>
        {proof.failures.length === 0
          ? null
          : (
            <ul className="discern-catalogue-field__refusals">
              {proof.failures.map((failure) => <li key={failure}>{failure}
              </li>)}
            </ul>
          )}
        <div className="discern-catalogue-field__proof-grid">
          {proof.checks.map((check) => (
            <article
              key={check.label}
              data-discern-field-check={check.pass ? "pass" : "fail"}
            >
              <strong>{check.label}</strong>
              <span>
                observed {proofValue(check.observed, check.unit)} · floor{" "}
                {proofValue(check.floor, check.unit)}
              </span>
              <output>
                margin {check.margin >= 0 ? "+" : ""}
                {proofValue(check.margin, check.unit)}
              </output>
            </article>
          ))}
        </div>
      </section>

      <section
        className="discern-catalogue-field__export"
        aria-labelledby="discern-catalogue-field-export-heading"
      >
        <div>
          <h2 id="discern-catalogue-field-export-heading">Take this point</h2>
          <p>
            Copy the same Root declaration documented by the Token map. Nothing
            is downloaded or sent from this page.
          </p>
        </div>
        <pre><code>{consumerSnippet}</code></pre>
        <CopyButton
          value={consumerSnippet}
          label="Copy consumer field snippet"
          copiedLabel="Consumer field snippet copied"
        />
      </section>

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
