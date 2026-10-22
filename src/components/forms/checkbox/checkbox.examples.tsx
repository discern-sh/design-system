import { useState } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
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

const channels = ["Email", "Push", "Text message"] as const;

function MixedCheckboxState() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    new Set(["Email"]),
  );
  const every = selected.size === channels.length;
  return (
    <Field group controlId="checkbox-mixed" label="Channels">
      <Checkbox
        label="All channels"
        checked={every}
        indeterminate={selected.size > 0 && !every}
        onChange={() => setSelected(new Set(every ? [] : channels))}
      />
      {channels.map((channel) => (
        <Checkbox
          key={channel}
          label={channel}
          checked={selected.has(channel)}
          onChange={() => {
            const next = new Set(selected);
            if (!next.delete(channel)) next.add(channel);
            setSelected(next);
          }}
        />
      ))}
    </Field>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultCheckboxState },
    { id: "grouped", Example: GroupedCheckboxState },
    { id: "mixed", Example: MixedCheckboxState },
    { id: "multiline", Example: MultilineCheckboxState },
    { id: "active", Example: ActiveCheckboxState },
    { id: "filled", Example: FilledCheckboxState },
    { id: "validation-error", Example: ValidationErrorCheckboxState },
    { id: "disabled", Example: DisabledCheckboxState },
    { id: "submitted", Example: SubmittedCheckboxState },
    { id: "cancelled", Example: CancelledCheckboxState },
  ],
);

export const conformance: readonly ConformanceScenario[] = [{
  example: "mixed",
  name: "A mixed parent settles its options together",
  steps: [
    {
      expect: "visible",
      target: {
        selector: "input:indeterminate + .discern-choice__control",
      },
    },
    { action: "click", target: { role: "checkbox", name: "All channels" } },
    {
      expect: "visible",
      target: {
        selector:
          ".discern-choice:last-child input:checked + .discern-choice__control",
      },
    },
    {
      expect: "hidden",
      target: {
        selector: "input:indeterminate + .discern-choice__control",
      },
    },
  ],
}];

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
