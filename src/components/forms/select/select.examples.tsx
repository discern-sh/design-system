import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./select.meta.ts";
import { Select } from "./select.tsx";

const options = [
  { value: "alpha", label: "Alpha" },
  { value: "bravo", label: "Bravo" },
  { value: "charlie", label: "Charlie", disabled: true },
] as const;
const unselectedOptions = [
  { value: "", label: "Choose an environment", disabled: true },
  ...options,
] as const;

function DefaultSelectState() {
  return (
    <Select
      label="Environment"
      options={unselectedOptions}
      defaultValue=""
    />
  );
}

function ActiveSelectState() {
  return (
    <Select
      label="Environment"
      options={options}
      defaultValue="bravo"
      autoFocus
    />
  );
}

function FilledSelectState() {
  return <Select label="Environment" options={options} defaultValue="bravo" />;
}

function ValidationErrorSelectState() {
  return (
    <Select
      label="Environment"
      options={options}
      error="Choose an environment"
    />
  );
}

function DisabledSelectState() {
  return (
    <Select
      label="Environment"
      options={options}
      defaultValue="alpha"
      disabled
    />
  );
}

function SubmittedSelectState() {
  return (
    <Select
      label="Environment"
      options={options}
      defaultValue="bravo"
      hint="Submitted"
      disabled
    />
  );
}

function CancelledSelectState() {
  return (
    <Select
      label="Environment"
      options={unselectedOptions}
      defaultValue=""
      hint="Selection cancelled"
      disabled
    />
  );
}

function GroupedSelectState() {
  return (
    <Select label="Environment" defaultValue="bravo">
      <optgroup label="Recommended">
        <option value="alpha">Alpha</option>
        <option value="bravo">Bravo</option>
      </optgroup>
      <optgroup label="Other">
        <option value="charlie" disabled>Charlie</option>
      </optgroup>
    </Select>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultSelectState },
    { id: "grouped", Example: GroupedSelectState },
    { id: "active", Example: ActiveSelectState },
    { id: "filled", Example: FilledSelectState },
    { id: "validation-error", Example: ValidationErrorSelectState },
    { id: "disabled", Example: DisabledSelectState },
    { id: "submitted", Example: SubmittedSelectState },
    { id: "cancelled", Example: CancelledSelectState },
  ],
);

export default function SelectExamples() {
  return <DefaultSelectState />;
}
