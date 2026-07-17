import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Kbd} component. */
export interface KbdProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
}

/** Keycap-styled semantic kbd element for one key or chord segment. */
export const Kbd: DiscernComponent<HTMLElement, KbdProps> = forwardRef<
  HTMLElement,
  KbdProps
>(function Kbd({ className, children, ...props }, ref) {
  return (
    <kbd
      ref={ref}
      className={classNames("discern-kbd", className)}
      {...props}
    >
      {children}
    </kbd>
  );
});
