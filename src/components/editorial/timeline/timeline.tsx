import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One item entry rendered by the Timeline component. */
export interface TimelineItem {
  readonly date: ReactNode;
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly detail?: ReactNode;
  readonly status?: "complete" | "current" | "upcoming";
}

/** Props for the {@linkcode Timeline} component. */
export interface TimelineProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly items: readonly TimelineItem[];
}

/** Chronological narrative for histories, release stories, investigations, and staged programmes, with optional status and detail. */
export const Timeline: DiscernComponent<HTMLElement, TimelineProps> =
  forwardRef<HTMLElement, TimelineProps>(function Timeline(
    { eyebrow, title, description, items, className, ...props },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={classNames("discern-timeline", className)}
        {...props}
      >
        <header>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h2>{title}</h2>
          {description ? <div>{description}</div> : null}
        </header>
        <ol>
          {items.map((item, index) => (
            <li
              className={`discern-timeline__item--${item.status ?? "upcoming"}`}
              key={index}
            >
              <div className="discern-timeline__date">{item.date}</div>
              <span className="discern-timeline__marker" aria-hidden="true" />
              <div className="discern-timeline__content">
                <h3>{item.title}</h3>
                <div>{item.description}</div>
                {item.detail ? <small>{item.detail}</small> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  });
