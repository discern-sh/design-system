import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import {
  createFeatureBentoLayout,
  type FeatureBentoSize,
} from "./feature-bento-layout.ts";

export type { FeatureBentoSize } from "./feature-bento-layout.ts";

type FeatureBentoGridStyle = CSSProperties & {
  readonly "--discern-feature-bento-rows": number;
  readonly "--discern-feature-bento-compact-rows": number;
};

type FeatureBentoItemStyle = CSSProperties & {
  readonly "--discern-feature-bento-column": number;
  readonly "--discern-feature-bento-row": number;
  readonly "--discern-feature-bento-column-span": number;
  readonly "--discern-feature-bento-row-span": number;
  readonly "--discern-feature-bento-compact-column": number;
  readonly "--discern-feature-bento-compact-row": number;
};

/** One item entry rendered by the Feature bento component. */
export interface FeatureBentoItem {
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly icon?: ReactNode;
  readonly visual?: ReactNode;
  /** Fixed matrix footprint: standard 1×1, wide 2×1, tall 1×2, or large 2×2. */
  readonly size?: FeatureBentoSize;
  readonly tone?: "plain" | "accent" | "sunken";
}

/** Props for the {@linkcode FeatureBento} component. */
export interface FeatureBentoProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly items: readonly FeatureBentoItem[];
}

/** Strict rectangular feature matrix with intentional size, surface, icon, and visual slots. */
export const FeatureBento: DiscernComponent<HTMLElement, FeatureBentoProps> =
  forwardRef<HTMLElement, FeatureBentoProps>(function FeatureBento(
    { eyebrow, title, description, items, className, ...props },
    ref,
  ) {
    const sizes = items.map((item) => item.size ?? "standard");
    const layout = createFeatureBentoLayout(sizes, 4);
    const compactLayout = createFeatureBentoLayout(sizes, 2);
    const gridStyle: FeatureBentoGridStyle = {
      "--discern-feature-bento-rows": layout.rows,
      "--discern-feature-bento-compact-rows": compactLayout.rows,
    };

    return (
      <section
        ref={ref}
        className={classNames("discern-feature-bento", className)}
        {...props}
      >
        <div className="discern-feature-bento__inner">
          <header className="discern-feature-bento__header">
            {eyebrow
              ? <div className="discern-feature-bento__eyebrow">{eyebrow}</div>
              : null}
            <h2>{title}</h2>
            {description
              ? (
                <div className="discern-feature-bento__description">
                  {description}
                </div>
              )
              : null}
          </header>
          <div className="discern-feature-bento__grid" style={gridStyle}>
            {items.map((item, index) => {
              const placement = layout.placements[index];
              const compactPlacement = compactLayout.placements[index];
              if (placement === undefined || compactPlacement === undefined) {
                throw new TypeError("Feature bento placement count drifted");
              }
              const itemStyle: FeatureBentoItemStyle = {
                "--discern-feature-bento-column": placement.column,
                "--discern-feature-bento-row": placement.row,
                "--discern-feature-bento-column-span": placement.columnSpan,
                "--discern-feature-bento-row-span": placement.rowSpan,
                "--discern-feature-bento-compact-column":
                  compactPlacement.column,
                "--discern-feature-bento-compact-row": compactPlacement.row,
              };
              return (
                <article
                  className={classNames(
                    "discern-feature-bento__item",
                    `discern-feature-bento__item--${item.size ?? "standard"}`,
                    `discern-feature-bento__item--${item.tone ?? "plain"}`,
                  )}
                  style={itemStyle}
                  key={index}
                >
                  <div className="discern-feature-bento__copy">
                    {item.icon
                      ? (
                        <span
                          className="discern-feature-bento__icon"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                      )
                      : null}
                    {item.eyebrow
                      ? (
                        <div className="discern-feature-bento__item-eyebrow">
                          {item.eyebrow}
                        </div>
                      )
                      : null}
                    <h3>{item.title}</h3>
                    <div>{item.description}</div>
                  </div>
                  {item.visual
                    ? (
                      <div className="discern-feature-bento__visual">
                        {item.visual}
                      </div>
                    )
                    : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  });
