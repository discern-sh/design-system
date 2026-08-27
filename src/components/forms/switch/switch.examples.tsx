import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./switch.meta.ts";
import { Switch } from "./switch.tsx";

function DefaultSwitchState() {
  return <Switch label="Automatic updates" />;
}

function ActiveSwitchState() {
  return <Switch label="Automatic updates" autoFocus />;
}

function FilledSwitchState() {
  return <Switch label="Automatic updates" defaultChecked />;
}

function ValidationErrorSwitchState() {
  return (
    <Switch
      label="Automatic updates"
      description="Setting is locked"
      aria-invalid="true"
    />
  );
}

function DisabledSwitchState() {
  return <Switch label="Automatic updates" disabled />;
}

function SubmittedSwitchState() {
  return (
    <Switch
      label="Automatic updates"
      description="Submitted"
      defaultChecked
      disabled
    />
  );
}

function CancelledSwitchState() {
  return (
    <Switch
      label="Automatic updates"
      description="Change cancelled"
      disabled
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultSwitchState },
    { id: "active", Example: ActiveSwitchState },
    { id: "filled", Example: FilledSwitchState },
    { id: "validation-error", Example: ValidationErrorSwitchState },
    { id: "disabled", Example: DisabledSwitchState },
    { id: "submitted", Example: SubmittedSwitchState },
    { id: "cancelled", Example: CancelledSwitchState },
  ],
);

export default function SwitchExamples() {
  return <DefaultSwitchState />;
}
