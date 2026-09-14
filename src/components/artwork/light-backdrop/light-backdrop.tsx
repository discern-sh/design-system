import { forwardRef } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

/** Props for the {@linkcode LightBackdrop} component. */
export interface LightBackdropProps extends Omit<BackdropProps, "children"> {}

/** Quiet ambient illumination for a selected surface; motion="still" opts out locally. */
export const LightBackdrop: DiscernComponent<
  HTMLDivElement,
  LightBackdropProps
> = forwardRef<HTMLDivElement, LightBackdropProps>(function LightBackdrop(
  { motion = "ambient", className, ...props },
  ref,
) {
  return (
    <Backdrop
      ref={ref}
      motion={motion}
      className={classNames("discern-light-backdrop", className)}
      {...props}
    >
      <div className="discern-light-backdrop__light" />
    </Backdrop>
  );
});
