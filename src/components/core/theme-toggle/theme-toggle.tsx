import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { IconButton } from "../icon-button/icon-button.tsx";
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

// One stroke weight for both destinations, sized by the Icon button glyph slot.
const strokeGlyph = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const sunGlyph = (
  <svg {...strokeGlyph}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.25M12 19.75V22M2 12h2.25M19.75 12H22M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59" />
  </svg>
);

const moonGlyph = (
  <svg {...strokeGlyph}>
    <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
  </svg>
);

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
    lightGlyph = sunGlyph,
    darkGlyph = moonGlyph,
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
  const outlined = variant === "outlined";
  return (
    <IconButton
      ref={ref}
      variant={outlined ? "outline" : "quiet"}
      size={outlined ? "md" : "sm"}
      label={dark ? toLightLabel : toDarkLabel}
      className={classNames(
        "discern-theme-toggle",
        "discern-theme-toggle--" + variant,
        className,
      )}
      data-discern-to-light-label={toLightLabel}
      data-discern-to-dark-label={toDarkLabel}
      {...(onThemeChange === undefined
        ? { "data-discern-theme-toggle": "", ...{ inert: "" } }
        : { onClick: () => onThemeChange(destination) })}
      {...props}
      icon={([["dark", darkGlyph], ["light", lightGlyph]] as const).map((
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
    />
  );
});
