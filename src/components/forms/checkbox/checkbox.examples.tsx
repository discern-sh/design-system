import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Field, fieldDescriptionId } from "../field/field.tsx";
import meta, { componentExampleVocabulary } from "./checkbox.meta.ts";
import { Checkbox } from "./checkbox.tsx";

function DefaultCheckboxState() {
  return <Checkbox label="Include examples" description="Optional" />;
}

function ActiveCheckboxState() {
  return <Checkbox label="Include examples" autoFocus />;
}

function FilledCheckboxState() {
  return <Checkbox label="Include examples" defaultChecked />;
}

function ValidationErrorCheckboxState() {
  const error = "Select this option to continue";
  return (
    <Field controlId="checkbox-error" error={error}>
      <Checkbox
        id="checkbox-error"
        label="Include examples"
        aria-invalid="true"
        aria-describedby={fieldDescriptionId(
          "checkbox-error",
          undefined,
          error,
        )}
      />
    </Field>
  );
}

function DisabledCheckboxState() {
  return <Checkbox label="Include examples" disabled />;
}

function SubmittedCheckboxState() {
  return (
    <Checkbox
      label="Include examples"
      description="Submitted"
      defaultChecked
      disabled
    />
  );
}

function CancelledCheckboxState() {
  return (
    <Checkbox
      label="Include examples"
      description="Choice cancelled"
      disabled
    />
  );
}

function MultilineCheckboxState() {
  return (
    <Checkbox
      label="Keep a local copy of every generated report so reviews stay available offline"
      description="Copies stay on this device and are removed after thirty days of inactivity."
      defaultChecked
    />
  );
}

function GroupedCheckboxState() {
  return (
    <Field group controlId="checkbox-grouped" label="Notifications">
      <Field group controlId="checkbox-grouped-regular" label="Regular">
        <Checkbox label="Email updates" defaultChecked />
        <Checkbox label="Weekly summary" disabled />
      </Field>
      <Field group controlId="checkbox-grouped-optional" label="Optional">
        <Checkbox label="Announcements" />
      </Field>
    </Field>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultCheckboxState },
    { id: "grouped", Example: GroupedCheckboxState },
    { id: "multiline", Example: MultilineCheckboxState },
    { id: "active", Example: ActiveCheckboxState },
    { id: "filled", Example: FilledCheckboxState },
    { id: "validation-error", Example: ValidationErrorCheckboxState },
    { id: "disabled", Example: DisabledCheckboxState },
    { id: "submitted", Example: SubmittedCheckboxState },
    { id: "cancelled", Example: CancelledCheckboxState },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-checkbox",
    label: "Pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { selector: ".discern-choice__label" },
      },
      {
        checkpoint: {
          id: "checkbox-pressed",
          label: "Pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { selector: ".discern-choice__label" },
      },
    ],
  }] as const,
);

export default function CheckboxExamples() {
  return <DefaultCheckboxState />;
}
