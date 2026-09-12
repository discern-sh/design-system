import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { CopyButton } from "../../docs/copy-button/copy-button.tsx";
import { classNames } from "../../class-names.ts";

/** Visual treatments available to a Code listing. */
export type CodeListingVariant = "standard" | "showcase";

/** Props for the {@linkcode CodeListing} component. */
export interface CodeListingProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title?: ReactNode;
  readonly filename?: ReactNode;
  readonly language?: string;
  /** Exact source authority for display and copying. */
  readonly code: string;
  /** Wrap browser lines visually; false keeps horizontal scrolling (default). No CLI effect. */
  readonly wrap?: boolean;
  /** Show the selected-runtime CopyButton (default true); source remains selectable without scripts. */
  readonly copyable?: boolean;
  readonly highlightLines?: readonly number[];
  readonly caption?: ReactNode;
  /** Theme-responsive editorial frame or a stable dark campaign showcase. */
  readonly variant?: CodeListingVariant;
}

/** Captioned source listing with file and language context, stable line numbers, horizontal overflow, and optional highlighted lines. */
export const CodeListing: DiscernComponent<HTMLElement, CodeListingProps> =
  forwardRef<HTMLElement, CodeListingProps>(function CodeListing(
    {
      title,
      filename,
      language,
      code,
      wrap = false,
      copyable = true,
      highlightLines = [],
      caption,
      variant = "standard",
      className,
      ...props
    },
    ref,
  ) {
    const lines = code.split("\n");
    return (
      <figure
        ref={ref}
        className={classNames(
          "discern-code-listing",
          wrap && "discern-code-listing--wrap",
          variant === "showcase" && "discern-code-listing--showcase",
          className,
        )}
        {...props}
      >
        {title || filename || language || copyable
          ? (
            <header className="discern-code-listing__header">
              <span>
                <i aria-hidden="true" />
                <i aria-hidden="true" />
                <i aria-hidden="true" />
              </span>
              <strong>{filename ?? title}</strong>
              {language ? <small>{language}</small> : null}
              {copyable && <CopyButton value={code} />}
            </header>
          )
          : null}
        <pre
          className="discern-code-listing__body"
          data-language={language}
          role="group"
          aria-label={typeof filename === "string" || typeof title === "string"
            ? `${wrap ? "Wrapped" : "Scrollable"} code listing: ${
              typeof filename === "string" ? filename : title
            }`
            : `${wrap ? "Wrapped" : "Scrollable"} code listing`}
          tabIndex={0}
        >
          <code>
            {lines.map((line, index) => (
              <span
                className={classNames(
                  "discern-code-listing__line",
                  highlightLines.includes(index + 1) &&
                    "discern-code-listing__line--highlighted",
                )}
                data-line={index + 1}
                key={index}
              >
                {line}{index < lines.length - 1 ? "\n" : ""}
              </span>
            ))}
          </code>
        </pre>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  });
