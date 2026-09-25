import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";

/** Motion treatments available to decorative backdrops. */
export type BackdropMotion = "ambient" | "still";

/** Props for the {@linkcode Backdrop} component. */
export interface BackdropProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-hidden" | "children"> {
  /** Decorative composition rendered across the backdrop's complete plate. */
  readonly children: ReactNode;
  /** Relative visual presence; the authored range is 0.4 through 1.8. */
  readonly presence?: number;
  /** Allow authored ambient motion or deliberately hold the resolved still. */
  readonly motion?: BackdropMotion;
  /**
   * Speckle the plane with a fine grain in the ink colour. The grain is an
   * inline SVG noise image, so a Content-Security-Policy must admit
   * `img-src data:`. Defaults to false.
   */
  readonly grain?: boolean;
}

type BackdropStyle = CSSProperties & {
  readonly "--discern-backdrop-presence"?: number;
};

/** Decorative, theme-aware background plane shared by the Artwork backdrops. */
export const Backdrop: DiscernComponent<HTMLDivElement, BackdropProps> =
  forwardRef<
    HTMLDivElement,
    BackdropProps
  >(function Backdrop(
    {
      children,
      presence,
      motion = "ambient",
      grain = false,
      className,
      style,
      ...props
    },
    ref,
  ) {
    const backdropStyle: BackdropStyle | undefined = presence === undefined
      ? style
      : { ...style, "--discern-backdrop-presence": presence };

    return (
      <div
        ref={ref}
        className={classNames(
          "discern-backdrop",
          motion === "still" && "discern-backdrop--still",
          grain && "discern-backdrop--grain",
          className,
        )}
        style={backdropStyle}
        {...props}
        aria-hidden="true"
      >
        {children}
      </div>
    );
  });
