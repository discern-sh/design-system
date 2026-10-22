import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { classNames } from "../../class-names.ts";
import { FeedbackMark } from "../../feedback/feedback-marks.tsx";

/** Props for the {@linkcode Field} component. */
export interface FieldProps {
  /** The labelled control's id; in a group, the fieldset's own id. Message ids derive from it. */
  readonly controlId: string;
  readonly label?: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean | undefined;
  /**
   * Render a fieldset whose legend names a group of related controls, such as
   * Checkbox or Radio options. Its hint and error describe the whole group.
   * A group rendered inside another group becomes its subgroup.
   */
  readonly group?: boolean;
  /** Group only: disables every control the fieldset contains. */
  readonly disabled?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Compose the Field group classes for a Component that renders its own
 * fieldset and legend, so it carries the Field stylesheet with it.
 */
export function fieldGroupClassName(
  ...names: readonly (string | false | null | undefined)[]
): string {
  return classNames("discern-field", "discern-field--group", ...names);
}

/** Whether a Field renders inside a Field group, which makes a group a subgroup. */
const FieldGroupContext = createContext(false);

/** Shared label, hint, required, and error structure for single controls and choice groups. */
export function Field(
  {
    controlId,
    label,
    hint,
    error,
    required = false,
    group = false,
    disabled,
    children,
    className,
  }: FieldProps,
): ReactElement {
  const insideGroup = useContext(FieldGroupContext);
  const labelContent = (
    <>
      {label}
      {required
        ? (
          <span className="discern-field__required" aria-hidden="true">
            *
          </span>
        )
        : null}
    </>
  );
  const messages = (
    <>
      {error
        ? (
          <span
            className="discern-field__message discern-field__message--error"
            id={`${controlId}-error`}
          >
            <span className="discern-field__glyph" aria-hidden="true">
              <FeedbackMark name="danger" />
            </span>
            <span>
              <span className="discern-visually-hidden">Error:</span> {error}
            </span>
          </span>
        )
        : null}
      {hint
        ? (
          <span className="discern-field__message" id={`${controlId}-hint`}>
            {hint}
          </span>
        )
        : null}
    </>
  );
  const invalidClassName = Boolean(error) && "discern-field--invalid";
  if (group) {
    return (
      <fieldset
        id={controlId}
        className={fieldGroupClassName(
          insideGroup && "discern-field--subgroup",
          invalidClassName,
          className,
        )}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionId(controlId, hint, error)}
      >
        {label
          ? <legend className="discern-field__label">{labelContent}</legend>
          : null}
        <FieldGroupContext.Provider value>
          {children}
        </FieldGroupContext.Provider>
        {messages}
      </fieldset>
    );
  }
  return (
    <div className={classNames("discern-field", invalidClassName, className)}>
      {label
        ? (
          <label className="discern-field__label" htmlFor={controlId}>
            {labelContent}
          </label>
        )
        : null}
      {children}
      {messages}
    </div>
  );
}

/** Resolve the describedby value a Field-wrapped control should reference. */
export function fieldDescriptionId(
  controlId: string,
  hint: ReactNode,
  error: ReactNode,
): string | undefined {
  const ids = [
    error ? `${controlId}-error` : undefined,
    hint ? `${controlId}-hint` : undefined,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
