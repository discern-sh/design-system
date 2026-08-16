import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

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
    return (
      <pre
        ref={ref}
        className={classNames("discern-code-block", className)}
        {...props}
      >
        <code
          data-discern-code-block-language={language}
          data-discern-code-block-info={info}
        >
          {code}
        </code>
      </pre>
    );
  });
