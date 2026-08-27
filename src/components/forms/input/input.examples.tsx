import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./input.meta.ts";
import { Input } from "./input.tsx";

function DefaultInputState() {
  return <Input label="Project name" placeholder="my-project" />;
}

function ActiveInputState() {
  return <Input label="Project name" placeholder="my-project" autoFocus />;
}

function FilledInputState() {
  return <Input label="Project name" defaultValue="atlas" />;
}

function ValidationErrorInputState() {
  return (
    <Input
      label="Project name"
      defaultValue="a"
      error="Use at least three characters"
    />
  );
}

function DisabledInputState() {
  return <Input label="Project name" defaultValue="atlas" disabled />;
}

function SubmittedInputState() {
  return (
    <Input
      label="Project name"
      defaultValue="atlas"
      hint="Submitted"
      readOnly
    />
  );
}

function CancelledInputState() {
  return (
    <Input
      label="Project name"
      placeholder="my-project"
      hint="Input cancelled"
      disabled
    />
  );
}

function SearchingInputState() {
  return (
    <Input
      type="search"
      label="Country"
      defaultValue="can"
      hint="Searching…"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultInputState },
    { id: "active", Example: ActiveInputState },
    { id: "filled", Example: FilledInputState },
    { id: "validation-error", Example: ValidationErrorInputState },
    { id: "disabled", Example: DisabledInputState },
    { id: "submitted", Example: SubmittedInputState },
    { id: "cancelled", Example: CancelledInputState },
    { id: "searching", Example: SearchingInputState },
  ],
);

export default function InputExamples() {
  return <DefaultInputState />;
}
