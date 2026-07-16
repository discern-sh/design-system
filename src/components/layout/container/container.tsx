import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Container} component. */
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  readonly size?: "measure" | "sm" | "md" | "lg" | "full";
  readonly children: ReactNode;
}
/** Centred responsive content boundary with named readable widths. */
export const Container: DiscernComponent<HTMLDivElement, ContainerProps> =
  forwardRef<HTMLDivElement, ContainerProps>(
    function Container({ size = "lg", className, children, ...props }, ref) {
      return (
        <div
          ref={ref}
          className={classNames(
            "discern-container-box",
            `discern-container-box--${size}`,
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    },
  );
