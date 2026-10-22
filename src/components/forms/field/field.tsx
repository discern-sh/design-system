import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { classNames } from "../../class-names.ts";
import { FeedbackMark } from "../../feedback/feedback-marks.tsx";

/** Props for the {@linkcode Field} component: one labelled control, or a named group of choices. */
export interface FieldProps {
  /** The labelled control's id; in a group, the fieldset's own id. Message ids derive from it. */
  readonly controlId: string;
  /** The visible label for the control `controlId` names, or the legend a group always needs. */
  readonly label?: ReactNode;
  /** Guidance that describes the control or group. */
  readonly hint?: ReactNode;
  /** A validation message, named first in the described-by relationship. */
  readonly error?: ReactNode;
  /** Mark the label with the required asterisk. */
  readonly required?: boolean | undefined;
  /**
   * Render a fieldset whose legend names a group of related controls, such
   * as Checkbox or Radio options. Its hint follows the legend, and its hint
   * and error describe the whole group. A group rendered inside another
   * group becomes its subgroup.
   */
  readonly group?: boolean;
  /** Disables every control a group contains; a single control carries its own `disabled`. */
  readonly disabled?: boolean;
  /** The control, or the group's options. */
  readonly children: ReactNode;
  /** Further classes for the Field root. */
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
  const errorMessage = error
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
    : null;
  const hintMessage = hint
    ? (
      <span className="discern-field__message" id={`${controlId}-hint`}>
        {hint}
      </span>
    )
    : null;
  const invalidClassName = Boolean(error) && "discern-field--invalid";
  if (group) {
    if (!label) {
      throw new TypeError(
        `Field group ${JSON.stringify(controlId)} needs a label for its legend`,
      );
    }
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
        <legend className="discern-field__label">{labelContent}</legend>
        {hintMessage}
        <FieldGroupContext.Provider value>
          {children}
        </FieldGroupContext.Provider>
        {errorMessage}
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
      {errorMessage}
      {hintMessage}
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
