import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";

/** Motion treatments available to decorative grounds. */
export type GroundMotion = "ambient" | "still";

/** Props for the {@linkcode Ground} component. */
export interface GroundProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-hidden" | "children"> {
  /** Decorative composition rendered across the ground's complete plate. */
  readonly children: ReactNode;
  /** Relative visual presence; the authored range is 0.4 through 1.8. */
  readonly presence?: number;
  /** Allow authored ambient motion or deliberately hold the resolved still. */
  readonly motion?: GroundMotion;
}

type GroundStyle = CSSProperties & {
  readonly "--discern-ground-presence"?: number;
};

/** Decorative, theme-aware background plane shared by the Artwork grounds. */
export const Ground: DiscernComponent<HTMLDivElement, GroundProps> = forwardRef<
  HTMLDivElement,
  GroundProps
>(function Ground(
  {
    children,
    presence,
    motion = "ambient",
    className,
    style,
    ...props
  },
  ref,
) {
  const groundStyle: GroundStyle | undefined = presence === undefined
    ? style
    : { ...style, "--discern-ground-presence": presence };

  return (
    <div
      ref={ref}
      className={classNames(
        "discern-ground",
        motion === "still" && "discern-ground--still",
        className,
      )}
      style={groundStyle}
      {...props}
      aria-hidden="true"
    >
      {children}
    </div>
  );
});
