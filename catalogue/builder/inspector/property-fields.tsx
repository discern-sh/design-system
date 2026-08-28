import { useEffect, useRef, useState } from "react";
import { Select } from "../../../src/components/forms/select/select.tsx";
import type { PropControl } from "../controls.ts";
import { effectiveControlValue, humanControlScalar } from "../controls.ts";
import { AutoGrowTextarea, ShapedJsonEditor } from "../fields.tsx";
import type { BuilderNode, BuilderPropValue } from "../model.ts";
import { BUILDER_DOCUMENT_LIMITS, builderValueBytes } from "../policy.ts";
import type { ProjectedBuilderIssue } from "./validation.ts";
import { projectJsonDraftIssue, projectPolicyIssue } from "./validation.ts";

const ADDITIONAL_PROPS_PLACEHOLDER = '{"aria-label": "…"}';
const JSON_DEBOUNCE_MS = 350;

interface JsonDraftController {
  readonly draft: string;
  readonly issue: ProjectedBuilderIssue | null;
  change(source: string): void;
  apply(): void;
}

function useJsonDraft(
  { acceptedSource, identity, humanPath, onChange, onRecovered }: Readonly<{
    acceptedSource: string;
    identity: string;
    humanPath: string;
    onChange: (source: string) => string | null;
    onRecovered?: (message: string) => void;
  }>,
): JsonDraftController {
  const [draft, setDraft] = useState(acceptedSource);
  const [issue, setIssue] = useState<ProjectedBuilderIssue | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const draftRef = useRef(acceptedSource);
  const issueRef = useRef<ProjectedBuilderIssue | null>(null);
  const recoveryPending = useRef(false);
  const onChangeRef = useRef(onChange);
  const onRecoveredRef = useRef(onRecovered);
  onChangeRef.current = onChange;
  onRecoveredRef.current = onRecovered;

  const clearTimer = (): void => {
    if (timer.current !== undefined) {
      globalThis.clearTimeout(timer.current);
      timer.current = undefined;
    }
  };
  const rememberIssue = (next: ProjectedBuilderIssue | null): void => {
    if (next !== null) recoveryPending.current = true;
    issueRef.current = next;
    setIssue(next);
  };
  const commit = (): void => {
    clearTimer();
    const source = draftRef.current;
    const bytes = builderValueBytes(source);
    if (bytes > BUILDER_DOCUMENT_LIMITS.jsonSourceBytes) {
      rememberIssue({
        message: `${humanPath} is too large. Keep it under ${
          String(Math.floor(BUILDER_DOCUMENT_LIMITS.jsonSourceBytes / 1024))
        } KB.`,
        technical: `${humanPath} contains ${
          String(bytes)
        } bytes; the accepted-document limit is ${
          String(BUILDER_DOCUMENT_LIMITS.jsonSourceBytes)
        } bytes.`,
      });
      return;
    }
    const syntax = projectJsonDraftIssue(source, humanPath);
    if (syntax !== null) {
      rememberIssue(syntax);
      return;
    }
    const technical = onChangeRef.current(source);
    if (technical !== null) {
      rememberIssue(projectPolicyIssue(technical, humanPath));
      return;
    }
    const recovered = recoveryPending.current;
    rememberIssue(null);
    if (recovered) {
      recoveryPending.current = false;
      onRecoveredRef.current?.(`${humanPath} is valid again.`);
    }
  };

  useEffect(() => {
    clearTimer();
    draftRef.current = acceptedSource;
    recoveryPending.current = false;
    setDraft(acceptedSource);
    rememberIssue(null);
    return clearTimer;
  }, [identity, acceptedSource]);

  return {
    draft,
    issue,
    change(source) {
      const bounded = source.slice(
        0,
        BUILDER_DOCUMENT_LIMITS.jsonSourceBytes + 1,
      );
      draftRef.current = bounded;
      setDraft(bounded);
      clearTimer();
      if (
        issueRef.current !== null &&
        builderValueBytes(bounded) <= BUILDER_DOCUMENT_LIMITS.jsonSourceBytes &&
        projectJsonDraftIssue(bounded, humanPath) === null
      ) rememberIssue(null);
      timer.current = globalThis.setTimeout(commit, JSON_DEBOUNCE_MS);
    },
    apply: commit,
  };
}

function ControlHeading(
  { control, value, inputId, onReset }: Readonly<{
    control: PropControl;
    value: BuilderPropValue | undefined;
    inputId: string;
    onReset: () => void;
  }>,
) {
  const effective = effectiveControlValue(control, value);
  return (
    <div className="discern-builder-control__heading">
      <div>
        <label htmlFor={inputId}>
          {control.label}
          {control.required
            ? (
              <small className="discern-builder-control__required">
                required
              </small>
            )
            : (
              <small className="discern-builder-control__optional">
                optional
              </small>
            )}
        </label>
        <small className="discern-builder-control__technical">
          <code>{control.name}</code> · <code>{control.typeText}</code>
        </small>
        {control.description === undefined
          ? null
          : (
            <small className="discern-builder-control__help">
              {control.description}
            </small>
          )}
      </div>
      {effective.resettable
        ? (
          <button
            type="button"
            className="discern-builder-control__reset"
            onClick={onReset}
          >
            Reset
          </button>
        )
        : null}
      <p className="discern-builder-control__effective">
        <strong>{effective.value}</strong> — {effective.provenance}
      </p>
    </div>
  );
}

function ValidationIssue(
  { id, issue }: Readonly<{ id: string; issue: ProjectedBuilderIssue | null }>,
) {
  return issue === null
    ? null
    : (
      <div className="discern-builder-control__issue">
        <p className="discern-builder-control__error" id={id} role="alert">
          {issue.message}
        </p>
        <details>
          <summary>Technical details</summary>
          <code>{issue.technical}</code>
        </details>
      </div>
    );
}

export function InspectorControlField(
  { node, control, humanPath, onChange, onReset, onRecovered }: Readonly<{
    node: BuilderNode;
    control: PropControl;
    humanPath?: string;
    onChange: (value: BuilderPropValue | undefined) => string | null;
    onReset?: () => void;
    onRecovered?: (message: string) => void;
  }>,
) {
  const value = node.props[control.name];
  const inputId = `control-${node.id}-${control.name}`;
  const resolvedPath = humanPath ?? control.label;
  const reset = onReset ?? (() => {
    onChange(undefined);
  });

  if (control.control === "toggle") {
    const checked = value?.kind === "boolean"
      ? value.value
      : typeof control.defaultValue === "boolean"
      ? control.defaultValue
      : false;
    return (
      <div className="discern-builder-control discern-builder-control--toggle">
        <ControlHeading
          control={control}
          value={value}
          inputId={inputId}
          onReset={reset}
        />
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange({ kind: "boolean", value: event.currentTarget.checked })}
        />
      </div>
    );
  }
  if (control.control === "select") {
    const currentIndex = value === undefined
      ? -1
      : control.options.findIndex((option) =>
        (value.kind === "string" && option === value.value) ||
        (value.kind === "number" && option === value.value)
      );
    const unset = effectiveControlValue(control, undefined);
    return (
      <div className="discern-builder-control">
        <ControlHeading
          control={control}
          value={value}
          inputId={inputId}
          onReset={reset}
        />
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
            ...(control.required ? [] : [{
              value: "-1",
              label: `${unset.value} — ${unset.provenance}`,
            }]),
            ...control.options.map((option, index) => ({
              value: String(index),
              label: humanControlScalar(option),
            })),
          ]}
        />
      </div>
    );
  }
  if (control.control === "number") {
    return (
      <div className="discern-builder-control">
        <ControlHeading
          control={control}
          value={value}
          inputId={inputId}
          onReset={reset}
        />
        <input
          id={inputId}
          type="number"
          value={value?.kind === "number" ? String(value.value) : ""}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            onChange(
              raw === ""
                ? undefined
                : { kind: "number", value: event.currentTarget.valueAsNumber },
            );
          }}
        />
      </div>
    );
  }
  if (control.control === "json") {
    const acceptedSource = value?.kind === "json" ? value.source : "";
    const draft = useJsonDraft({
      acceptedSource,
      identity: `${node.id}:${control.name}`,
      humanPath: resolvedPath,
      onChange: (source) =>
        onChange(
          source.trim() === "" ? undefined : { kind: "json", source },
        ),
      ...(onRecovered === undefined ? {} : { onRecovered }),
    });
    const errorId = `${inputId}-error`;
    return (
      <div className="discern-builder-control">
        <ControlHeading
          control={control}
          value={value}
          inputId={inputId}
          onReset={reset}
        />
        {control.shape === undefined
          ? (
            <>
              <AutoGrowTextarea
                id={inputId}
                rows={3}
                spellCheck={false}
                value={draft.draft}
                placeholder={control.typeText.includes("[]") ? "[]" : "{}"}
                aria-invalid={draft.issue === null ? undefined : true}
                aria-describedby={draft.issue === null ? undefined : errorId}
                onBlur={draft.apply}
                onChange={(event) => draft.change(event.currentTarget.value)}
              />
              <button
                type="button"
                className="discern-builder-json-apply"
                onClick={draft.apply}
              >
                Apply JSON
              </button>
            </>
          )
          : (
            <ShapedJsonEditor
              shape={control.shape}
              source={draft.draft}
              label={control.label}
              inputId={inputId}
              error={draft.issue?.message ?? null}
              onSource={draft.change}
              onApply={draft.apply}
            />
          )}
        <ValidationIssue id={errorId} issue={draft.issue} />
      </div>
    );
  }
  return (
    <div className="discern-builder-control">
      <ControlHeading
        control={control}
        value={value}
        inputId={inputId}
        onReset={reset}
      />
      <input
        id={inputId}
        type="text"
        value={value?.kind === "string" ? value.value : ""}
        placeholder={control.defaultValue === undefined
          ? (control.typeText === "string" ? "" : control.typeText)
          : String(control.defaultValue)}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          onChange(
            raw === "" && !control.required
              ? undefined
              : { kind: "string", value: raw },
          );
        }}
      />
    </div>
  );
}

/** Rejected additional-prop drafts remain outside the accepted document. */
export function AdditionalPropsField(
  { node, humanPath = "Additional props", onChange, onRecovered }: Readonly<{
    node: BuilderNode;
    humanPath?: string;
    onChange: (source: string) => string | null;
    onRecovered?: (message: string) => void;
  }>,
) {
  const acceptedSource = node.extra ?? "";
  const inputId = `control-${node.id}-additional-props`;
  const errorId = `${inputId}-error`;
  const draft = useJsonDraft({
    acceptedSource,
    identity: node.id,
    humanPath,
    onChange,
    ...(onRecovered === undefined ? {} : { onRecovered }),
  });
  return (
    <div className="discern-builder-control">
      <div className="discern-builder-control__heading">
        <div>
          <label htmlFor={inputId}>Additional props</label>
          <small className="discern-builder-control__technical">
            <code>aria-*</code>, <code>data-*</code>, <code>className</code>,
            {" "}
            <code>style</code>, or safe passthrough JSON
          </small>
        </div>
      </div>
      <AutoGrowTextarea
        id={inputId}
        rows={3}
        spellCheck={false}
        value={draft.draft}
        placeholder={ADDITIONAL_PROPS_PLACEHOLDER}
        aria-invalid={draft.issue === null ? undefined : true}
        aria-describedby={draft.issue === null ? undefined : errorId}
        onBlur={draft.apply}
        onChange={(event) => draft.change(event.currentTarget.value)}
      />
      <button
        type="button"
        className="discern-builder-json-apply"
        onClick={draft.apply}
      >
        Apply JSON
      </button>
      <ValidationIssue id={errorId} issue={draft.issue} />
    </div>
  );
}
