import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One legend item entry rendered by the Data figure component. */
export interface DataFigureLegendItem {
  readonly label: ReactNode;
  readonly tone?: "accent" | "ink" | "success" | "warning";
}

/** Props for the {@linkcode DataFigure} component. */
export interface DataFigureProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly visual: ReactNode;
  readonly legend?: readonly DataFigureLegendItem[];
  readonly caption: ReactNode;
  readonly source?: ReactNode;
  readonly surface?: "canvas" | "sunken";
}

/** Framed figure for charts, diagrams, annotated images, and research evidence, with legend, caption, and source slots. */
export const DataFigure: DiscernComponent<HTMLElement, DataFigureProps> =
  forwardRef<HTMLElement, DataFigureProps>(function DataFigure(
    {
      eyebrow,
      title,
      visual,
      legend = [],
      caption,
      source,
      surface = "canvas",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <figure
        ref={ref}
        className={classNames(
          "discern-data-figure",
          `discern-data-figure--${surface}`,
          className,
        )}
        {...props}
      >
        <header>
          <div>
            {eyebrow ? <span>{eyebrow}</span> : null}
            <h3>{title}</h3>
          </div>
          {legend.length
            ? (
              <ul aria-label="Figure legend">
                {legend.map((item, index) => (
                  <li key={index}>
                    <i
                      className={`discern-data-figure__swatch--${
                        item.tone ?? "accent"
                      }`}
                      aria-hidden="true"
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            )
            : null}
        </header>
        <div className="discern-data-figure__visual">{visual}</div>
        <figcaption>
          <span>{caption}</span>
          {source ? <small>Source: {source}</small> : null}
        </figcaption>
      </figure>
    );
  });
