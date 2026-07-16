import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

export interface PullQuoteProps extends HTMLAttributes<HTMLElement> {
  readonly quote: ReactNode;
  readonly attribution?: ReactNode;
  readonly citation?: ReactNode;
  readonly citeUrl?: string;
  readonly align?: "inline" | "wide";
}

export const PullQuote: DiscernComponent<HTMLElement, PullQuoteProps> =
  forwardRef<HTMLElement, PullQuoteProps>(function PullQuote(
    {
      quote,
      attribution,
      citation,
      citeUrl,
      align = "wide",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <figure
        ref={ref}
        className={classNames(
          "discern-pull-quote",
          `discern-pull-quote--${align}`,
          className,
        )}
        {...props}
      >
        <span className="discern-pull-quote__mark" aria-hidden="true">“</span>
        <blockquote cite={citeUrl}>{quote}</blockquote>
        {attribution || citation
          ? (
            <figcaption>
              {attribution ? <strong>{attribution}</strong> : null}
              {citation ? <cite>{citation}</cite> : null}
            </figcaption>
          )
          : null}
      </figure>
    );
  });
