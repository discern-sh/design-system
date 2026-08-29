import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
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
    <fieldset className="discern-example-stack">
      <legend>Channel</legend>
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
          disabled={disabled || value === "charlie"}
          autoFocus={focused === value}
        />
      ))}
    </fieldset>
  );
}

function DefaultRadioState() {
  return <RadioGroup name="radio-default" />;
}

function ActiveRadioState() {
  return <RadioGroup name="radio-active" focused="bravo" />;
}

function FilledRadioState() {
  return <RadioGroup name="radio-filled" selected="bravo" />;
}

function ValidationErrorRadioState() {
  return (
    <fieldset className="discern-example-stack" aria-invalid="true">
      <legend>Channel</legend>
      <Radio
        name="radio-error"
        label="Alpha"
        description="Choose a channel"
      />
      <Radio name="radio-error" label="Bravo" />
      <Radio name="radio-error" label="Charlie" disabled />
    </fieldset>
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
    <fieldset className="discern-example-stack" disabled>
      <legend>Channel — selection cancelled</legend>
      <Radio name="radio-cancelled" label="Alpha" />
      <Radio name="radio-cancelled" label="Bravo" />
      <Radio name="radio-cancelled" label="Charlie" />
    </fieldset>
  );
}

function GroupedRadioState() {
  return (
    <fieldset className="discern-example-stack">
      <legend>Channel</legend>
      <strong>Stable</strong>
      <Radio name="radio-grouped" label="Alpha" />
      <Radio name="radio-grouped" label="Bravo" defaultChecked autoFocus />
      <strong>Preview</strong>
      <Radio name="radio-grouped" label="Charlie" disabled />
    </fieldset>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultRadioState },
    { id: "grouped", Example: GroupedRadioState },
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
