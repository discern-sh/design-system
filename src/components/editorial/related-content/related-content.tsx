import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One item entry rendered by the Related content component. */
export interface RelatedContentItem {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly href: string;
  readonly meta?: ReactNode;
}

/** Props for the {@linkcode RelatedContent} component. */
export interface RelatedContentProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly items: readonly RelatedContentItem[];
  readonly surface?: "canvas" | "sunken";
}

/** Continuation band for related essays, guides, reports, or issues, with enough context to make each next-reading choice meaningful. */
export const RelatedContent: DiscernComponent<
  HTMLElement,
  RelatedContentProps
> = forwardRef<HTMLElement, RelatedContentProps>(function RelatedContent(
  { eyebrow, title, items, surface = "sunken", className, ...props },
  ref,
) {
  return (
    <section
      ref={ref}
      className={classNames(
        "discern-related-content",
        `discern-related-content--${surface}`,
        className,
      )}
      {...props}
    >
      <div className="discern-related-content__inner">
        <header>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h2>{title}</h2>
        </header>
        <div className="discern-related-content__grid">
          {items.map((item, index) => (
            <article key={index}>
              {item.eyebrow ? <span>{item.eyebrow}</span> : null}
              <h3>
                <a href={item.href}>{item.title}</a>
              </h3>
              {item.description
                ? (
                  <div className="discern-related-content__description">
                    {item.description}
                  </div>
                )
                : null}
              <footer>
                {item.meta ? <small>{item.meta}</small> : <span />}
                <span aria-hidden="true">Read →</span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
