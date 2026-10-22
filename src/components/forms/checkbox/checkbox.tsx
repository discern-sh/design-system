import { forwardRef, useCallback, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Checkbox} component. */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  readonly label: ReactNode;
  readonly description?: ReactNode;
  /**
   * Show the mixed state of a parent whose options are partly selected. The
   * adapter sets the native `indeterminate` property after mount, so the
   * browser announces it as mixed; static HTML sets that property itself.
   */
  readonly indeterminate?: boolean;
}
/** Native checkbox with an associated visible label and optional description. */
export const Checkbox: DiscernComponent<HTMLInputElement, CheckboxProps> =
  forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
    {
      label,
      description,
      indeterminate = false,
      id,
      className,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const descriptionId = description ? `${controlId}-description` : undefined;
    const describedBy =
      [ariaDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined;
    const inputRef = useCallback((node: HTMLInputElement | null) => {
      if (node !== null) node.indeterminate = indeterminate;
      if (typeof ref === "function") ref(node);
      else if (ref !== null) ref.current = node;
    }, [indeterminate, ref]);
    return (
      <div className={classNames("discern-choice", className)}>
        <label className="discern-choice__label" htmlFor={controlId}>
          <input
            ref={inputRef}
            id={controlId}
            type="checkbox"
            aria-describedby={describedBy}
            {...props}
          />
          <span className="discern-choice__control" aria-hidden="true">
            <span />
          </span>
          <span>{label}</span>
        </label>
        {description
          ? (
            <span className="discern-choice__description" id={descriptionId}>
              {description}
            </span>
          )
          : null}
      </div>
    );
  });
