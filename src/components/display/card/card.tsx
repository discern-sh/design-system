import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { CardPadding, CardTexture } from "./card.types.ts";

/** Props for the {@linkcode Card} component. */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly raised?: boolean;
  readonly texture?: CardTexture;
  readonly padding?: CardPadding;
  readonly children: ReactNode;
}

/** Composable surface with explicit elevation, texture, and padding choices. */
export const Card: DiscernComponent<HTMLDivElement, CardProps> = forwardRef<
  HTMLDivElement,
  CardProps
>(function Card(
  {
    raised = false,
    texture = "plain",
    padding = "md",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames(
        "discern-card",
        raised && "discern-card--raised",
        texture === "dots" && "discern-card--dots",
        `discern-card--pad-${padding}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
