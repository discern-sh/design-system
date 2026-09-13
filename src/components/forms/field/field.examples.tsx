import type { CSSProperties } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Button } from "../../core/button/button.tsx";
import { Checkbox } from "../checkbox/checkbox.tsx";
import { Input } from "../input/input.tsx";
import { Select } from "../select/select.tsx";
import { Textarea } from "../textarea/textarea.tsx";
import meta, { componentExampleVocabulary } from "./field.meta.ts";
import { Field, fieldDescriptionId } from "./field.tsx";

function ExampleField(
  { id, value, hint, error, disabled = false, autoFocus = false }: {
    readonly id: string;
    readonly value?: string;
    readonly hint?: string;
    readonly error?: string;
    readonly disabled?: boolean;
    readonly autoFocus?: boolean;
  },
) {
  return (
    <Field controlId={id} label="Environment" hint={hint} error={error}>
      <input
        id={id}
        className="discern-control"
        defaultValue={value}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={fieldDescriptionId(id, hint, error)}
      />
    </Field>
  );
}

function DefaultFieldState() {
  return <ExampleField id="field-idle" hint="Choose a value" />;
}

function ActiveFieldState() {
  return (
    <ExampleField
      id="field-active"
      value="staging"
      hint="Use a configured environment"
      autoFocus
    />
  );
}

function FilledFieldState() {
  return <ExampleField id="field-filled" value="staging" />;
}

function ValidationErrorFieldState() {
  return (
    <ExampleField
      id="field-error"
      value="staging"
      hint="Use a configured environment"
      error="Environment is unavailable; choose another"
    />
  );
}

function DisabledFieldState() {
  return <ExampleField id="field-disabled" value="staging" disabled />;
}

function SubmittedFieldState() {
  return (
    <ExampleField
      id="field-submitted"
      value="staging"
      hint="Submitted"
      disabled
    />
  );
}

function CancelledFieldState() {
  return (
    <ExampleField
      id="field-cancelled"
      value="staging"
      hint="Selection cancelled"
      disabled
    />
  );
}

function AcknowledgementFieldState() {
  return (
    <Field
      controlId="field-acknowledgement"
      label="Heads up"
      hint="Continue when you have reviewed the summary."
    >
      <div id="field-acknowledgement" className="discern-control">
        Review the summary above.
      </div>
    </Field>
  );
}

const regionOptions = [
  { value: "europe", label: "Europe" },
  { value: "americas", label: "Americas" },
  { value: "asia-pacific", label: "Asia-Pacific" },
] as const;

function MixedFormFieldState() {
  return (
    <form
      className="discern-example-stack"
      action="#"
      method="get"
    >
      <Input
        label="Team name"
        name="team"
        placeholder="e.g. Platform"
        hint="Use at least three characters"
        required
        minLength={3}
      />
      <div className="discern-field-row">
        <Input label="City" name="city" defaultValue="Lisbon" />
        <Select
          label="Region"
          name="region"
          defaultValue="europe"
          options={regionOptions}
          hint="Sets times and dates"
        />
      </div>
      <Textarea label="About the team" name="about" rows={3} />
      <Checkbox
        label="Show this team in the directory"
        name="directory"
        defaultChecked
      />
      <div
        className="discern-field-row"
        style={{
          "--discern-field-row-columns": "max-content",
        } as CSSProperties}
      >
        <Button type="submit">Save team</Button>
        <Button type="reset" variant="secondary">Reset</Button>
      </div>
    </form>
  );
}

function InlineFormFieldState() {
  return (
    <div
      className="discern-field-row"
      style={{
        "--discern-field-row-columns":
          "minmax(0, 2fr) minmax(0, 1fr) max-content",
      } as CSSProperties}
    >
      <Input label="Seats" name="seats" defaultValue="4" hint="Up to 100" />
      <Select
        aria-label="Billing period"
        name="period"
        defaultValue="monthly"
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
      />
      <Button type="submit">Add seats</Button>
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultFieldState },
    { id: "active", Example: ActiveFieldState },
    { id: "filled", Example: FilledFieldState },
    { id: "validation-error", Example: ValidationErrorFieldState },
    { id: "disabled", Example: DisabledFieldState },
    { id: "submitted", Example: SubmittedFieldState },
    { id: "cancelled", Example: CancelledFieldState },
    { id: "acknowledgement", Example: AcknowledgementFieldState },
    { id: "mixed-form", Example: MixedFormFieldState },
    { id: "inline-form", Example: InlineFormFieldState },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "invalid-submission",
      label: "Invalid submission",
      example: "mixed-form",
      category: "validation",
      sequence: [
        { action: "click", target: { role: "button", name: "Save team" } },
        { expect: "focused", target: { selector: 'input[name="team"]' } },
        {
          checkpoint: {
            id: "mixed-form-invalid",
            label: "Blocked submit marks and focuses the empty required field",
          },
        },
      ],
    },
    {
      id: "corrected-resubmission",
      label: "Corrected value",
      example: "mixed-form",
      category: "validation",
      sequence: [
        { action: "click", target: { role: "button", name: "Save team" } },
        {
          action: "fill",
          target: { selector: 'input[name="team"]' },
          value: "Platform",
        },
        {
          checkpoint: {
            id: "mixed-form-corrected",
            label: "Correction is retained and clears the invalid mark",
          },
        },
      ],
    },
    {
      id: "inline-form-narrow",
      label: "Inline form at a narrow allocation",
      example: "inline-form",
      category: "responsive",
      requirements: { inlineSize: "narrow" },
      sequence: [
        {
          checkpoint: {
            id: "inline-form-contained",
            label: "Controls and action stay level and contained",
          },
        },
      ],
    },
  ] as const,
);

export default function FieldExamples() {
  return <DefaultFieldState />;
}
