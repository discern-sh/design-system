import type { ReactElement, ReactNode } from "react";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Field} component. */
export interface FieldProps {
  readonly controlId: string;
  readonly label?: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean | undefined;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Shared label, hint, required, and error structure for custom controls. */
export function Field(
  { controlId, label, hint, error, required = false, children, className }:
    FieldProps,
): ReactElement {
  return (
    <div
      className={classNames(
        "discern-field",
        Boolean(error) && "discern-field--invalid",
        className,
      )}
    >
      {label
        ? (
          <label className="discern-field__label" htmlFor={controlId}>
            {label}
            {required
              ? (
                <span className="discern-field__required" aria-hidden="true">
                  *
                </span>
              )
              : null}
          </label>
        )
        : null}
      {children}
      {error
        ? (
          <span
            className="discern-field__message discern-field__message--error"
            id={`${controlId}-error`}
          >
            <span className="discern-visually-hidden">Error:</span> {error}
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
