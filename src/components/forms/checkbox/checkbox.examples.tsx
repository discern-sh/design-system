import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
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
  return (
    <Checkbox
      label="Include examples"
      description="Choose before continuing."
      aria-invalid="true"
    />
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

function GroupedCheckboxState() {
  return (
    <fieldset className="discern-example-stack">
      <legend>Notifications</legend>
      <strong>Regular</strong>
      <Checkbox label="Email updates" defaultChecked />
      <Checkbox label="Weekly summary" disabled />
      <strong>Optional</strong>
      <Checkbox label="Announcements" />
    </fieldset>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultCheckboxState },
    { id: "grouped", Example: GroupedCheckboxState },
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
