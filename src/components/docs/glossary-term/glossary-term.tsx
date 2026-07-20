import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { HoverCard } from "../../feedback/hover-card/hover-card.tsx";
import type {
  HoverCardAlign,
  HoverCardPlacement,
  HoverCardWidth,
} from "../../feedback/hover-card/hover-card.tsx";

/** Props for the {@linkcode GlossaryTerm} component. */
export interface GlossaryTermProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly children: ReactNode;
  readonly definition: ReactNode;
  readonly cardLabel?: string;
  readonly placement?: HoverCardPlacement;
  readonly align?: HoverCardAlign;
  readonly width?: HoverCardWidth;
}

/** Inline definition term with a keyboard-reachable, dotted-underlined hover card. */
export const GlossaryTerm: DiscernComponent<HTMLElement, GlossaryTermProps> =
  forwardRef<HTMLElement, GlossaryTermProps>(function GlossaryTerm(
    {
      children,
      definition,
      cardLabel,
      placement = "top",
      align = "center",
      width = "md",
      className,
      ...props
    },
    ref,
  ) {
    const resolvedLabel = cardLabel ??
      (typeof children === "string"
        ? children + " definition"
        : "Glossary definition");
    return (
      <HoverCard
        ref={ref}
        className={classNames("discern-glossary-term", className)}
        label={resolvedLabel}
        placement={placement}
        align={align}
        width={width}
        trigger={
          <dfn
            className="discern-glossary-term__trigger discern-dotted-underline"
            tabIndex={0}
          >
            {children}
          </dfn>
        }
        {...props}
      >
        <span className="discern-glossary-term__card">
          <strong className="discern-glossary-term__term">{children}</strong>
          <span className="discern-glossary-term__definition">
            {definition}
          </span>
        </span>
      </HoverCard>
    );
  });
