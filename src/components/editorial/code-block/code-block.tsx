import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { projectTerminalTextRuns } from "../../../cli/projection.ts";

/** Props for the {@linkcode CodeBlock} component. */
export interface CodeBlockProps
  extends Omit<HTMLAttributes<HTMLPreElement>, "children"> {
  /** Literal source text. No trimming or line transformation is applied. */
  readonly code: string;
  /** Optional source-language hint exposed as a namespaced data hook. */
  readonly language?: string;
  /** Optional parser information exposed as a namespaced data hook. */
  readonly info?: string;
}

/** Literal, non-line-numbered preformatted code without an editorial figure frame. */
export const CodeBlock: DiscernComponent<HTMLPreElement, CodeBlockProps> =
  forwardRef<HTMLPreElement, CodeBlockProps>(function CodeBlock(
    { code, language, info, className, ...props },
    ref,
  ) {
    const accessibleContext = [language?.trim(), info?.trim()]
      .filter(Boolean)
      .join(" · ");

    return (
      <pre
        ref={ref}
        className={classNames("discern-code-block", className)}
        role="group"
        aria-label={accessibleContext
          ? `Scrollable code block: ${accessibleContext}`
          : "Scrollable code block"}
        tabIndex={0}
        {...props}
      >
        <code
          data-discern-code-block-language={language}
          data-discern-code-block-info={info}
        >
          {projectTerminalTextRuns(code).map((run, index) =>
            run.columns === undefined
              ? run.text
              : (
                <span
                  data-discern-terminal-cell={run.columns}
                  style={{
                    display: "inline-block",
                    width: `${run.columns}ch`,
                    textAlign: "center",
                    verticalAlign: "baseline",
                  }}
                  key={index}
                >
                  {run.text}
                </span>
              )
          )}
        </code>
      </pre>
    );
  });
