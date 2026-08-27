import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./field.meta.ts";
import { Field } from "./field.tsx";

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
        aria-describedby={error
          ? `${id}-error`
          : hint
          ? `${id}-hint`
          : undefined}
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
      error="Environment is unavailable"
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
  ],
);

export default function FieldExamples() {
  return <DefaultFieldState />;
}
