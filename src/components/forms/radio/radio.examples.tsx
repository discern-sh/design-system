import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Field } from "../field/field.tsx";
import meta, { componentExampleVocabulary } from "./radio.meta.ts";
import { Radio } from "./radio.tsx";

function RadioGroup(
  { name, selected, disabled = false, focused }: {
    readonly name: string;
    readonly selected?: string;
    readonly disabled?: boolean;
    readonly focused?: string;
  },
) {
  return (
    <Field group controlId={name} label="Channel" disabled={disabled}>
      {[
        ["alpha", "Alpha"],
        ["bravo", "Bravo"],
        ["charlie", "Charlie"],
      ].map(([value, label]) => (
        <Radio
          key={value}
          name={name}
          value={value}
          label={label}
          defaultChecked={selected === value}
          disabled={value === "charlie"}
          autoFocus={focused === value}
        />
      ))}
    </Field>
  );
}

function DefaultRadioState() {
  return <RadioGroup name="radio-default" />;
}

function MultilineRadioState() {
  return (
    <Field group controlId="radio-multiline" label="Delivery">
      <Radio
        name="radio-multiline"
        value="bundle"
        label="Bundle every artefact into one downloadable archive at the end of the run"
        description="Slower to appear, but a single file to fetch and keep."
        defaultChecked
      />
      <Radio
        name="radio-multiline"
        value="stream"
        label="Stream artefacts as they finish"
      />
    </Field>
  );
}

function ActiveRadioState() {
  return <RadioGroup name="radio-active" focused="bravo" />;
}

function FilledRadioState() {
  return <RadioGroup name="radio-filled" selected="bravo" />;
}

function ValidationErrorRadioState() {
  return (
    <Field
      group
      controlId="radio-error"
      label="Channel"
      error="Choose a channel"
    >
      <Radio name="radio-error" label="Alpha" />
      <Radio name="radio-error" label="Bravo" />
      <Radio name="radio-error" label="Charlie" disabled />
    </Field>
  );
}

function DisabledRadioState() {
  return <RadioGroup name="radio-disabled" selected="alpha" disabled />;
}

function SubmittedRadioState() {
  return <RadioGroup name="radio-submitted" selected="bravo" disabled />;
}

function CancelledRadioState() {
  return (
    <Field
      group
      controlId="radio-cancelled"
      label="Channel"
      hint="Selection cancelled"
      disabled
    >
      <Radio name="radio-cancelled" label="Alpha" />
      <Radio name="radio-cancelled" label="Bravo" />
      <Radio name="radio-cancelled" label="Charlie" />
    </Field>
  );
}

function GroupedRadioState() {
  return (
    <Field group controlId="radio-grouped" label="Channel">
      <Field group controlId="radio-grouped-stable" label="Stable">
        <Radio name="radio-grouped" label="Alpha" />
        <Radio name="radio-grouped" label="Bravo" defaultChecked autoFocus />
      </Field>
      <Field group controlId="radio-grouped-preview" label="Preview">
        <Radio name="radio-grouped" label="Charlie" disabled />
      </Field>
    </Field>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultRadioState },
    { id: "grouped", Example: GroupedRadioState },
    { id: "multiline", Example: MultilineRadioState },
    { id: "active", Example: ActiveRadioState },
    { id: "filled", Example: FilledRadioState },
    { id: "validation-error", Example: ValidationErrorRadioState },
    { id: "disabled", Example: DisabledRadioState },
    { id: "submitted", Example: SubmittedRadioState },
    { id: "cancelled", Example: CancelledRadioState },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-radio",
    label: "Pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: {
          selector: '.discern-choice__label:has(input[value="alpha"])',
        },
      },
      {
        checkpoint: {
          id: "radio-pressed",
          label: "Pointer held",
        },
      },
      {
        action: "pointer-up",
        target: {
          selector: '.discern-choice__label:has(input[value="alpha"])',
        },
      },
    ],
  }] as const,
);

export default function RadioExamples() {
  return <DefaultRadioState />;
}
