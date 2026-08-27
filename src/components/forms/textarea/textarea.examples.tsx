import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./textarea.meta.ts";
import { Textarea } from "./textarea.tsx";

function DefaultTextareaState() {
  return <Textarea label="Release notes" placeholder="Describe the change" />;
}

function ActiveTextareaState() {
  return (
    <Textarea
      label="Release notes"
      placeholder="Describe the change"
      autoFocus
    />
  );
}

function FilledTextareaState() {
  return (
    <Textarea label="Release notes" defaultValue="Adds reusable examples." />
  );
}

function TallWindowTextareaState() {
  return (
    <Textarea
      label="Release notes"
      rows={6}
      defaultValue="One\nTwo\nThree\nFour\nFive\nSix\nSeven"
    />
  );
}

function ValidationErrorTextareaState() {
  return (
    <Textarea
      label="Release notes"
      defaultValue="Short"
      error="Add more detail"
    />
  );
}

function DisabledTextareaState() {
  return (
    <Textarea label="Release notes" defaultValue="Managed by policy" disabled />
  );
}

function SubmittedTextareaState() {
  return (
    <Textarea
      label="Release notes"
      defaultValue="Adds reusable examples."
      hint="Submitted"
      readOnly
    />
  );
}

function CancelledTextareaState() {
  return (
    <Textarea
      label="Release notes"
      placeholder="Describe the change"
      hint="Draft discarded"
      disabled
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultTextareaState },
    { id: "active", Example: ActiveTextareaState },
    { id: "filled", Example: FilledTextareaState },
    { id: "validation-error", Example: ValidationErrorTextareaState },
    { id: "disabled", Example: DisabledTextareaState },
    { id: "submitted", Example: SubmittedTextareaState },
    { id: "cancelled", Example: CancelledTextareaState },
    { id: "tall-window", Example: TallWindowTextareaState },
  ],
);

export default function TextareaExamples() {
  return <DefaultTextareaState />;
}
