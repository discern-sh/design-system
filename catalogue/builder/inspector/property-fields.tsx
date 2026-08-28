import { useEffect, useState } from "react";
import { Select } from "../../../src/components/forms/select/select.tsx";
import type { PropControl } from "../controls.ts";
import { AutoGrowTextarea, ShapedJsonEditor } from "../fields.tsx";
import type { BuilderNode, BuilderPropValue } from "../model.ts";
import { BUILDER_DOCUMENT_LIMITS, builderValueBytes } from "../policy.ts";
import type { BuilderFeedback } from "./feedback.ts";

const ADDITIONAL_PROPS_PLACEHOLDER = '{"aria-label": "…"}';
type ValidationFeedback = Extract<BuilderFeedback, { kind: "validation" }>;

export function InspectorControlField(
  { node, control, onChange }: Readonly<{
    node: BuilderNode;
    control: PropControl;
    onChange: (value: BuilderPropValue | undefined) => string | null;
  }>,
) {
  const value = node.props[control.name];
  const acceptedJsonSource = value !== undefined && value.kind === "json"
    ? value.source
    : "";
  const [jsonDraft, setJsonDraft] = useState(acceptedJsonSource);
  const [validation, setValidation] = useState<ValidationFeedback | null>(
    null,
  );
  useEffect(() => {
    setJsonDraft(acceptedJsonSource);
    setValidation(null);
  }, [node.id, control.name, acceptedJsonSource]);
  const inputId = `control-${node.id}-${control.name}`;
  const requirement = control.required
    ? null
    : <small className="discern-builder-control__optional">optional</small>;

  if (control.control === "toggle") {
    return (
      <label className="discern-builder-control discern-builder-control--row">
        <input
          type="checkbox"
          checked={value !== undefined && value.kind === "boolean" &&
            value.value}
          onChange={(event) =>
            onChange(
              event.currentTarget.checked
                ? { kind: "boolean", value: true }
                : control.required
                ? { kind: "boolean", value: false }
                : undefined,
            )}
        />
        <span>{control.label}</span>
        {requirement}
      </label>
    );
  }
  if (control.control === "select") {
    const currentIndex = value === undefined
      ? -1
      : control.options.findIndex((option) =>
        (value.kind === "string" && option === value.value) ||
        (value.kind === "number" && option === value.value)
      );
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>{control.label} {requirement}</span>
        <Select
          id={inputId}
          value={String(currentIndex)}
          onChange={(event) => {
            const option = control.options[Number(event.currentTarget.value)];
            onChange(
              option === undefined
                ? undefined
                : typeof option === "number"
                ? { kind: "number", value: option }
                : { kind: "string", value: option },
            );
          }}
          options={[
            ...(control.required ? [] : [{ value: "-1", label: "(not set)" }]),
            ...control.options.map((option, index) => ({
              value: String(index),
              label: String(option),
            })),
          ]}
        />
      </label>
    );
  }
  if (control.control === "number") {
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>{control.label} {requirement}</span>
        <input
          id={inputId}
          type="number"
          value={value !== undefined && value.kind === "number"
            ? String(value.value)
            : ""}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            onChange(
              raw === ""
                ? undefined
                : { kind: "number", value: event.currentTarget.valueAsNumber },
            );
          }}
        />
      </label>
    );
  }
  if (control.control === "json") {
    const commitJsonDraft = (next: string): void => {
      const error = onChange(
        next.trim() === "" ? undefined : { kind: "json", source: next },
      );
      if (builderValueBytes(next) <= BUILDER_DOCUMENT_LIMITS.jsonSourceBytes) {
        setJsonDraft(next);
      }
      setValidation(
        error === null ? null : {
          kind: "validation",
          field: control.name,
          tone: "error",
          message: error,
        },
      );
    };
    if (control.shape !== undefined) {
      return (
        <div className="discern-builder-control">
          <span>
            {control.label} {requirement}
            <code>{control.typeText}</code>
          </span>
          <ShapedJsonEditor
            shape={control.shape}
            source={jsonDraft}
            label={control.label}
            error={validation?.message ?? null}
            onSource={commitJsonDraft}
          />
        </div>
      );
    }
    const errorId = `${inputId}-error`;
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>
          {control.label} {requirement}
          <code>{control.typeText}</code>
        </span>
        <AutoGrowTextarea
          id={inputId}
          rows={3}
          spellCheck={false}
          value={jsonDraft}
          placeholder={control.typeText.includes("[]") ? "[]" : "{}"}
          aria-invalid={validation === null ? undefined : true}
          aria-describedby={validation === null ? undefined : errorId}
          onChange={(event) => commitJsonDraft(event.currentTarget.value)}
        />
        {validation === null ? null : (
          <small
            className="discern-builder-control__error"
            id={errorId}
            role="alert"
          >
            {validation.message}
          </small>
        )}
      </label>
    );
  }
  return (
    <label className="discern-builder-control" htmlFor={inputId}>
      <span>{control.label} {requirement}</span>
      <input
        id={inputId}
        type="text"
        value={value !== undefined && value.kind === "string"
          ? value.value
          : ""}
        placeholder={control.typeText === "string" ? "" : control.typeText}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          onChange(
            raw === "" && !control.required
              ? undefined
              : { kind: "string", value: raw },
          );
        }}
      />
    </label>
  );
}

/** Rejected additional-prop drafts remain outside the accepted document. */
export function AdditionalPropsField(
  { node, onChange }: Readonly<{
    node: BuilderNode;
    onChange: (source: string) => string | null;
  }>,
) {
  const acceptedSource = node.extra ?? "";
  const [draft, setDraft] = useState(acceptedSource);
  const [validation, setValidation] = useState<ValidationFeedback | null>(
    null,
  );
  const inputId = `control-${node.id}-additional-props`;
  const errorId = `${inputId}-error`;
  useEffect(() => {
    setDraft(acceptedSource);
    setValidation(null);
  }, [node.id, acceptedSource]);
  return (
    <label className="discern-builder-control" htmlFor={inputId}>
      <span>
        Additional props <code>JSON object</code>
      </span>
      <AutoGrowTextarea
        id={inputId}
        rows={2}
        spellCheck={false}
        value={draft}
        placeholder={ADDITIONAL_PROPS_PLACEHOLDER}
        aria-invalid={validation === null ? undefined : true}
        aria-describedby={validation === null ? undefined : errorId}
        onChange={(event) => {
          const source = event.currentTarget.value;
          const error = onChange(source);
          if (
            builderValueBytes(source) <= BUILDER_DOCUMENT_LIMITS.jsonSourceBytes
          ) setDraft(source);
          setValidation(
            error === null ? null : {
              kind: "validation",
              field: "additional props",
              tone: "error",
              message: error,
            },
          );
        }}
      />
      {validation === null ? null : (
        <small
          className="discern-builder-control__error"
          id={errorId}
          role="alert"
        >
          {validation.message}
        </small>
      )}
    </label>
  );
}
