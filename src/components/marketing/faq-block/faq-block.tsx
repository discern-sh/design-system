import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One faq item entry rendered by the FAQ block component. */
export interface FaqItem {
  readonly question: ReactNode;
  readonly answer: ReactNode;
}

/** Props for the {@linkcode FaqBlock} component. */
export interface FaqBlockProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly items: readonly FaqItem[];
  readonly aside?: ReactNode;
  readonly openFirst?: boolean;
}

/** Editorial frequently-asked-questions section using native disclosure controls and a sticky introduction. */
export const FaqBlock: DiscernComponent<HTMLElement, FaqBlockProps> =
  forwardRef<HTMLElement, FaqBlockProps>(function FaqBlock(
    {
      eyebrow,
      title,
      description,
      items,
      aside,
      openFirst = false,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={classNames("discern-faq-block", className)}
        {...props}
      >
        <div className="discern-faq-block__inner">
          <header className="discern-faq-block__header">
            {eyebrow
              ? <div className="discern-faq-block__eyebrow">{eyebrow}</div>
              : null}
            <h2>{title}</h2>
            {description
              ? (
                <div className="discern-faq-block__description">
                  {description}
                </div>
              )
              : null}
            {aside
              ? <div className="discern-faq-block__aside">{aside}</div>
              : null}
          </header>
          <div className="discern-faq-block__items">
            {items.map((item, index) => (
              <details key={index} open={openFirst && index === 0}>
                <summary>
                  <span>{item.question}</span>
                  <span
                    className="discern-faq-block__toggle"
                    aria-hidden="true"
                  />
                </summary>
                <div className="discern-faq-block__answer">{item.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  });
