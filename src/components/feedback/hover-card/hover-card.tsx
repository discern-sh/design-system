import { cloneElement, forwardRef, useId } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

interface HoverCardTriggerProps {
  readonly "aria-details"?: string;
  readonly className?: string;
}

/** Placement edge for the {@linkcode HoverCard} panel. */
export type HoverCardPlacement = "top" | "bottom";

/** Inline alignment for the {@linkcode HoverCard} panel. */
export type HoverCardAlign = "start" | "center" | "end";

/** Preset content width for the {@linkcode HoverCard} panel. */
export type HoverCardWidth = "sm" | "md" | "lg";

/** Content-model layout for the {@linkcode HoverCard} wrapper and panel. */
export type HoverCardLayout = "inline" | "block";

/** Props for the {@linkcode HoverCard} component. */
export interface HoverCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly trigger: ReactElement<HoverCardTriggerProps>;
  readonly children: ReactNode;
  readonly label: string;
  readonly placement?: HoverCardPlacement;
  readonly align?: HoverCardAlign;
  readonly width?: HoverCardWidth;
  readonly layout?: HoverCardLayout;
}

/** Hover- and focus-revealed supplementary surface accepting arbitrary inline or block content. */
export const HoverCard: DiscernComponent<HTMLElement, HoverCardProps> =
  forwardRef<HTMLElement, HoverCardProps>(function HoverCard(
    {
      trigger: triggerElement,
      children,
      label,
      placement = "top",
      align = "center",
      width = "md",
      layout = "inline",
      className,
      ...props
    },
    forwardedRef,
  ) {
    const panelId = useId();
    const existingDetails = triggerElement.props["aria-details"];
    const details = [existingDetails, panelId].filter(Boolean).join(" ");
    const trigger = cloneElement(triggerElement, {
      "aria-details": details,
      className: classNames(
        triggerElement.props.className,
        "discern-hover-card__trigger",
      ),
    });
    const rootClassName = classNames(
      "discern-hover-card",
      "discern-hover-card--" + placement,
      "discern-hover-card--align-" + align,
      "discern-hover-card--width-" + width,
      "discern-hover-card--" + layout,
      className,
    );
    if (layout === "block") {
      return (
        <div
          ref={forwardedRef as Ref<HTMLDivElement>}
          className={rootClassName}
          {...props}
        >
          {trigger}
          <div
            id={panelId}
            role="group"
            aria-label={label}
            className="discern-hover-card__panel"
          >
            {children}
          </div>
        </div>
      );
    }
    return (
      <span
        ref={forwardedRef as Ref<HTMLSpanElement>}
        className={rootClassName}
        {...props}
      >
        {trigger}
        <span
          id={panelId}
          role="group"
          aria-label={label}
          className="discern-hover-card__panel"
        >
          {children}
        </span>
      </span>
    );
  });
