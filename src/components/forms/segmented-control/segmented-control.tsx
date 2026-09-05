import { forwardRef } from "react";
import type { FieldsetHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Icon } from "../../core/icon/icon.tsx";
import { resolveSegmentedControlValue } from "./segmented-control.types.ts";
import type { SegmentedControlChoice } from "./segmented-control.types.ts";

export type { SegmentedControlChoice } from "./segmented-control.types.ts";

/** One labelled peer option; optional artwork supplements its visible label. */
export interface SegmentedControlItem extends SegmentedControlChoice {
  /** Decorative icon; its meaning must also appear in the label. */
  readonly icon?: ReactNode;
}

/** Props for the native single-selection {@linkcode SegmentedControl}. */
export interface SegmentedControlProps extends
  Omit<
    FieldsetHTMLAttributes<HTMLFieldSetElement>,
    "children" | "name" | "defaultValue" | "onChange"
  > {
  /** Visible group legend. */
  readonly label: string;
  /** Shared radio name and form submission key; unique within the form. */
  readonly name: string;
  readonly items: readonly SegmentedControlItem[];
  /** Controlled adapter selection. Static HTML remains natively selectable. */
  readonly value?: string;
  /** Initial native selection; otherwise the first enabled item is selected. */
  readonly defaultValue?: string;
  /** Consumer-owned React callback; no client runtime is required for native use. */
  readonly onValueChange?: (value: string) => void;
  readonly required?: boolean;
}

/** A labelled native radio group for choosing one of a few peer settings. */
export const SegmentedControl: DiscernComponent<
  HTMLFieldSetElement,
  SegmentedControlProps
> = forwardRef<HTMLFieldSetElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      label,
      name,
      items,
      value,
      defaultValue,
      onValueChange,
      required,
      disabled,
      form,
      className,
      ...props
    },
    ref,
  ) {
    if (!label.trim() || !name.trim()) {
      throw new TypeError("SegmentedControl needs a label and form name");
    }
    const selected = resolveSegmentedControlValue(items, value ?? defaultValue);
    return (
      <fieldset
        {...props}
        ref={ref}
        disabled={disabled}
        form={form}
        className={classNames("discern-segmented-control", className)}
      >
        <legend className="discern-segmented-control__legend">{label}</legend>
        <div className="discern-segmented-control__items">
          {items.map((item) => (
            <label
              key={item.value}
              className="discern-segmented-control__option"
            >
              <input
                className="discern-segmented-control__input"
                type="radio"
                name={name}
                value={item.value}
                form={form}
                disabled={disabled || item.disabled}
                required={required}
                {...(value === undefined
                  ? { defaultChecked: selected === item.value }
                  : { checked: selected === item.value })}
                onChange={(event) => {
                  if (event.currentTarget.checked) onValueChange?.(item.value);
                }}
              />
              <span className="discern-segmented-control__surface">
                {item.icon !== undefined && <Icon>{item.icon}</Icon>}
                <span>{item.label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  },
);
