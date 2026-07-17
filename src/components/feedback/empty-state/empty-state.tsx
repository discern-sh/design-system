import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode EmptyState} component. */
export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly actions?: ReactNode;
}

/** Centred placeholder for a region with nothing to show yet, with optional icon and follow-up actions. */
export const EmptyState: DiscernComponent<HTMLDivElement, EmptyStateProps> =
  forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
    { title, description, icon, actions, className, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={classNames("discern-empty-state", className)}
        {...props}
      >
        {icon !== undefined && (
          <span className="discern-empty-state__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <p className="discern-empty-state__title">{title}</p>
        {description !== undefined && (
          <p className="discern-empty-state__description">{description}</p>
        )}
        {actions !== undefined && (
          <div className="discern-empty-state__actions">{actions}</div>
        )}
      </div>
    );
  });
