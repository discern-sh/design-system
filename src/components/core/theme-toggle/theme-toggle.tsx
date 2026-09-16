import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type {
  ThemeToggleTheme,
  ThemeToggleVariant,
} from "./theme-toggle.types.ts";

interface ThemeToggleCommonProps {
  readonly lightGlyph?: ReactNode;
  readonly darkGlyph?: ReactNode;
  readonly toLightLabel?: string;
  readonly toDarkLabel?: string;
  readonly variant?: ThemeToggleVariant;
  readonly className?: string;
}

type ThemeToggleNativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof ThemeToggleCommonProps | "children" | "aria-label" | "onClick"
>;

/** Controlled props options for the Theme toggle component. */
export type ControlledThemeToggleProps =
  & ThemeToggleCommonProps
  & ThemeToggleNativeProps
  & {
    /** Currently resolved light/dark theme; system resolution remains consumer-owned. */
    readonly theme: ThemeToggleTheme;
    /** Receives the destination theme; consumers decide whether to store or clear an override. */
    readonly onThemeChange: (theme: ThemeToggleTheme) => void;
  };

/** Static props options for the Theme toggle component. */
export type StaticThemeToggleProps =
  & ThemeToggleCommonProps
  & ThemeToggleNativeProps
  & {
    /**
     * Theme the rendered markup assumes, defaulting to `light`; the selected
     * behavior corrects it on load, so a build that cannot know the reader's
     * theme need not guess.
     */
    readonly theme?: ThemeToggleTheme;
    readonly onThemeChange?: never;
  };

/** Props options for the Theme toggle component. */
export type ThemeToggleProps =
  | ControlledThemeToggleProps
  | StaticThemeToggleProps;

/**
 * Light/dark comfort adjustment in one of two modes chosen by `onThemeChange`.
 * With it, controlled React owns resolution, persistence, and root application.
 * Without it, the markup carries the static contract the selected behavior
 * activates, so one activation is never handled twice: only the static mode
 * carries the opt-in attribute the behavior looks for.
 */
export const ThemeToggle: DiscernComponent<
  HTMLButtonElement,
  ThemeToggleProps
> = forwardRef<HTMLButtonElement, ThemeToggleProps>(function ThemeToggle(
  {
    theme = "light",
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
  const destination: ThemeToggleTheme = dark ? "light" : "dark";
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
      data-discern-to-light-label={toLightLabel}
      data-discern-to-dark-label={toDarkLabel}
      {...(onThemeChange === undefined
        ? { "data-discern-theme-toggle": "", ...{ inert: "" } }
        : { onClick: () => onThemeChange(destination) })}
      {...props}
    >
      {([["dark", darkGlyph], ["light", lightGlyph]] as const).map((
        [candidate, glyph],
      ) => (
        <span
          key={candidate}
          className="discern-theme-toggle__glyph"
          aria-hidden="true"
          data-discern-theme-destination={candidate}
          hidden={candidate !== destination}
        >
          {glyph}
        </span>
      ))}
    </button>
  );
});
