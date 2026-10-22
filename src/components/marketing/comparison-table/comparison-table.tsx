import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { MarketingFrame } from "../frame.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";

/** One comparison row entry rendered by the Comparison table component. */
export interface ComparisonRow {
  readonly feature: ReactNode;
  readonly first: ReactNode;
  readonly second: ReactNode;
}

/** Props for the {@linkcode ComparisonTable} component. */
export interface ComparisonTableProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly featureLabel?: string;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly rows: readonly ComparisonRow[];
  /** Recommendation badge; text badges also name the highlighted cells when rows stack. */
  readonly secondBadge?: ReactNode;
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
}

/** Three-column capability comparison with an emphasized recommendation and card-like mobile rows. */
export const ComparisonTable: DiscernComponent<
  HTMLElement,
  ComparisonTableProps
> = forwardRef<HTMLElement, ComparisonTableProps>(function ComparisonTable(
  {
    eyebrow,
    title,
    description,
    featureLabel = "Capability",
    firstLabel,
    secondLabel,
    rows,
    secondBadge,
    frame = "standard",
    className,
    ...props
  },
  ref,
) {
  // Stacked rows hide the header, so the recommendation's words travel with
  // each highlighted cell's label instead of resting on its tint alone.
  const highlightLabel =
    typeof secondBadge === "string" || typeof secondBadge === "number"
      ? `${secondLabel} · ${secondBadge}`
      : secondLabel;
  return (
    <MarketingSection
      ref={ref}
      surface="sunken"
      frame={frame}
      className={classNames(
        "discern-comparison-table",
        frame === "wide" && "discern-comparison-table--frame-wide",
        className,
      )}
      {...props}
    >
      <div className="discern-comparison-table__inner">
        <MarketingIntro
          className="discern-comparison-table__header"
          eyebrow={eyebrow}
          title={title}
          description={description}
          align="center"
        />
        <div className="discern-comparison-table__frame">
          <table>
            <thead>
              <tr>
                <th scope="col">{featureLabel}</th>
                <th scope="col">{firstLabel}</th>
                <th
                  scope="col"
                  className="discern-comparison-table__highlight"
                >
                  <span>{secondLabel}</span>
                  {secondBadge
                    ? (
                      <span className="discern-comparison-table__badge">
                        {secondBadge}
                      </span>
                    )
                    : null}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <th scope="row">{row.feature}</th>
                  <td data-label={firstLabel}>{row.first}</td>
                  <td
                    data-label={highlightLabel}
                    className="discern-comparison-table__highlight"
                  >
                    {row.second}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MarketingSection>
  );
});
