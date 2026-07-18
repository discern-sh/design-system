import { forwardRef, useId } from "react";
import type { FieldsetHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Theme preference offered by the Theme switcher. */
export type ThemeSwitcherMode = "system" | "light" | "dark";

/** Props for the {@linkcode ThemeSwitcher} component. */
export interface ThemeSwitcherProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> {
  readonly mode?: ThemeSwitcherMode;
  readonly onModeChange: (mode: ThemeSwitcherMode) => void;
  readonly label?: ReactNode;
  readonly systemLabel?: ReactNode;
  readonly lightLabel?: ReactNode;
  readonly darkLabel?: ReactNode;
  readonly inputName?: string;
}

/** Controlled System, Light, and Dark theme preference group; the consumer applies the selected mode to its root. */
export const ThemeSwitcher: DiscernComponent<
  HTMLFieldSetElement,
  ThemeSwitcherProps
> = forwardRef<HTMLFieldSetElement, ThemeSwitcherProps>(
  function ThemeSwitcher(
    {
      mode = "system",
      onModeChange,
      label = "Colour theme",
      systemLabel = "System",
      lightLabel = "Light",
      darkLabel = "Dark",
      inputName,
      className,
      ...props
    },
    ref,
  ) {
    const generatedName = useId();
    const name = inputName ?? `discern-theme-${generatedName}`;
    const options: readonly {
      readonly mode: ThemeSwitcherMode;
      readonly label: ReactNode;
    }[] = [
      { mode: "system", label: systemLabel },
      { mode: "light", label: lightLabel },
      { mode: "dark", label: darkLabel },
    ];

    return (
      <fieldset
        ref={ref}
        className={classNames("discern-theme-switcher", className)}
        {...props}
        data-discern-mode={mode}
      >
        <legend className="discern-theme-switcher__legend">{label}</legend>
        {options.map((option) => (
          <label className="discern-theme-switcher__option" key={option.mode}>
            <input
              type="radio"
              name={name}
              value={option.mode}
              checked={mode === option.mode}
              onChange={() => onModeChange(option.mode)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    );
  },
);
