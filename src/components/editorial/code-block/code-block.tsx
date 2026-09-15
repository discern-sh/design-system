import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { renderCodeRuns } from "../../code-runs.tsx";
import {
  type CodeDialect,
  projectCodeRuns,
  resolveCodeDialect,
} from "../../../internal/code-emphasis.ts";

export type { CodeDialect };

/** Props for the {@linkcode CodeBlock} component. */
export interface CodeBlockProps
  extends Omit<HTMLAttributes<HTMLPreElement>, "children"> {
  /** Literal source text. No trimming or line transformation is applied. */
  readonly code: string;
  /** Wrap browser lines visually; false keeps horizontal scrolling (default). Independent of CLI widthPolicy. */
  readonly wrap?: boolean;
  /** Optional source-language label, exposed as a namespaced data hook and used to select a dialect. */
  readonly language?: string;
  /** Delimiter family the browser emphasis scanner reads with; defaults to the family implied by `language`. Use `"plain"` to render without emphasis. No CLI effect. */
  readonly dialect?: CodeDialect;
  /** Optional parser information exposed as a namespaced data hook. */
  readonly info?: string;
}

/** Literal, non-line-numbered preformatted code without an editorial figure frame. */
export const CodeBlock: DiscernComponent<HTMLPreElement, CodeBlockProps> =
  forwardRef<HTMLPreElement, CodeBlockProps>(function CodeBlock(
    { code, wrap = false, language, dialect, info, className, ...props },
    ref,
  ) {
    const accessibleContext = [language?.trim(), info?.trim()]
      .filter(Boolean)
      .join(" · ");
    const resolvedDialect = dialect ?? resolveCodeDialect(language);

    return (
      <pre
        ref={ref}
        className={classNames(
          "discern-code-block",
          wrap && "discern-code-block--wrap",
          className,
        )}
        role="group"
        aria-label={accessibleContext
          ? `${
            wrap ? "Wrapped" : "Scrollable"
          } code block: ${accessibleContext}`
          : `${wrap ? "Wrapped" : "Scrollable"} code block`}
        tabIndex={0}
        {...props}
      >
        <code
          data-discern-code-block-language={language}
          data-discern-code-block-dialect={resolvedDialect}
          data-discern-code-block-info={info}
        >
          {renderCodeRuns(projectCodeRuns(code, resolvedDialect))}
        </code>
      </pre>
    );
  });
