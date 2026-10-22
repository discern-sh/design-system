import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type {
  MarketingSectionFrame,
  MarketingSectionSpacing,
  MarketingSectionSurface,
} from "./marketing-section.types.ts";

export type {
  MarketingSectionFrame,
  MarketingSectionSpacing,
  MarketingSectionSurface,
} from "./marketing-section.types.ts";
export type { MarketingFrame } from "../frame.ts";

/**
 * Compose the Marketing contrast scope with any further classes. The scope
 * remaps canvas, surface, ink, edge, and action roles together for a stable
 * light-on-dark chapter, so a block that paints its own dark panel composes it
 * here and carries this stylesheet with it.
 */
export function marketingContrastClassName(
  ...names: readonly (string | false | null | undefined)[]
): string {
  return classNames("discern-marketing-contrast", ...names);
}

/**
 * Compose the shared Marketing accent ground with any further classes. The
 * ground tempers the subtlest accent wash against the canvas, so a tinted
 * hero, band, or notice stays a quiet field beneath the surfaces raised on it
 * under every Accent and in both themes.
 */
export function marketingAccentClassName(
  ...names: readonly (string | false | null | undefined)[]
): string {
  return classNames("discern-marketing-accent", ...names);
}

/**
 * Compose the shared Marketing action row with any further classes. The row
 * keeps its actions on one line while they fit and gives every action the
 * full row once they wrap, so stacked actions share one width.
 */
export function marketingActionsClassName(
  ...names: readonly (string | false | null | undefined)[]
): string {
  return classNames("discern-marketing-actions", ...names);
}

/**
 * Compose the shared Marketing note with any further classes: the one
 * small-print treatment for reassurance and metadata beneath an action row.
 */
export function marketingNoteClassName(
  ...names: readonly (string | false | null | undefined)[]
): string {
  return classNames("discern-marketing-note", ...names);
}

/** Props for the {@linkcode MarketingSection} component. */
export interface MarketingSectionProps extends HTMLAttributes<HTMLElement> {
  /** Semantic surface or an explicit request to inherit the surrounding one. */
  readonly surface?: MarketingSectionSurface;
  /** Compact product rhythm, ordinary section rhythm, or spacious campaign rhythm. */
  readonly spacing?: MarketingSectionSpacing;
  /** Ordinary editorial measure or the wider campaign-page frame. */
  readonly frame?: MarketingSectionFrame;
  readonly children: ReactNode;
}

/** Opt-in campaign-page section with durable frame, rhythm, and contrast scopes. */
export const MarketingSection: DiscernComponent<
  HTMLElement,
  MarketingSectionProps
> = forwardRef<HTMLElement, MarketingSectionProps>(function MarketingSection(
  {
    surface = "canvas",
    spacing = "standard",
    frame = "standard",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={classNames(
        "discern-marketing-section",
        `discern-marketing-section--${surface}`,
        `discern-marketing-section--space-${spacing}`,
        `discern-marketing-section--frame-${frame}`,
        surface === "contrast" && marketingContrastClassName(),
        surface === "accent" && marketingAccentClassName(),
        className,
      )}
      {...props}
    >
      <div className="discern-marketing-section__inner">{children}</div>
    </section>
  );
});
