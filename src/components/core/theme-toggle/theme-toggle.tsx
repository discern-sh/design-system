import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type {
  ThemeToggleTheme,
  ThemeToggleVariant,
} from "./theme-toggle.types.ts";

/** Props for the {@linkcode ThemeToggle} component. */
export interface ThemeToggleProps extends
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "aria-label" | "onClick"
  > {
  readonly theme: ThemeToggleTheme;
  readonly onThemeChange: (theme: ThemeToggleTheme) => void;
  readonly lightGlyph?: ReactNode;
  readonly darkGlyph?: ReactNode;
  readonly toLightLabel?: string;
  readonly toDarkLabel?: string;
  readonly variant?: ThemeToggleVariant;
}

/** Controlled light/dark theme switch: the consumer owns the theme state and applies it to its root. */
export const ThemeToggle: DiscernComponent<
  HTMLButtonElement,
  ThemeToggleProps
> = forwardRef<HTMLButtonElement, ThemeToggleProps>(function ThemeToggle(
  {
    theme,
    onThemeChange,
    lightGlyph = "☀",
    darkGlyph = "☾",
    toLightLabel = "Switch to the light theme",
    toDarkLabel = "Switch to the dark theme",
    variant = "outlined",
    className,
    ...props
  },
  ref,
) {
  const dark = theme === "dark";
  return (
    <button
      ref={ref}
      type="button"
      className={classNames(
        "discern-theme-toggle",
        "discern-theme-toggle--" + variant,
        className,
      )}
      aria-label={dark ? toLightLabel : toDarkLabel}
      onClick={() => onThemeChange(dark ? "light" : "dark")}
      {...props}
    >
      <span className="discern-theme-toggle__glyph" aria-hidden="true">
        {dark ? lightGlyph : darkGlyph}
      </span>
    </button>
  );
});
