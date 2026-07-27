import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { CopyButton } from "../../docs/copy-button/copy-button.tsx";
import {
  ExpectedResult,
  type ExpectedResultVariant,
} from "../expected-result/expected-result.tsx";

/** Props for the {@linkcode Command} component. */
export interface CommandProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly command: string;
  readonly workingDirectory?: string;
  readonly explanation?: ReactNode;
  readonly expectedResult?: ReactNode;
  readonly expectedResultLabel?: ReactNode;
  readonly expectedResultVariant?: ExpectedResultVariant;
  readonly failureNote?: ReactNode;
  readonly platform?: ReactNode;
  readonly copyLabel?: ReactNode;
  readonly copiedLabel?: ReactNode;
}

/** Executable command with run context, expected proof, cautions, and a clean-copy affordance. */
export const Command: DiscernComponent<HTMLElement, CommandProps> = forwardRef<
  HTMLElement,
  CommandProps
>(function Command(
  {
    command,
    workingDirectory,
    explanation,
    expectedResult,
    expectedResultLabel,
    expectedResultVariant,
    failureNote,
    platform,
    copyLabel = "Copy command",
    copiedLabel = "Command copied",
    className,
    ...props
  },
  ref,
) {
  return (
    <figure
      ref={ref}
      className={classNames("discern-command", className)}
      {...props}
    >
      {workingDirectory !== undefined || platform !== undefined
        ? (
          <div className="discern-command__context">
            {workingDirectory !== undefined
              ? (
                <span className="discern-command__context-item">
                  <span className="discern-command__context-label">
                    Run in
                  </span>
                  <code>{workingDirectory}</code>
                </span>
              )
              : null}
            {platform !== undefined
              ? (
                <span className="discern-command__context-item">
                  <span className="discern-command__context-label">
                    Platform
                  </span>
                  <span>{platform}</span>
                </span>
              )
              : null}
          </div>
        )
        : null}
      <div className="discern-command__execution">
        <pre className="discern-command__text" tabIndex={0}>
          <code>{command}</code>
        </pre>
        <CopyButton
          className="discern-command__copy"
          value={command}
          label={copyLabel}
          copiedLabel={copiedLabel}
        />
      </div>
      {explanation !== undefined || expectedResult !== undefined ||
          failureNote !== undefined
        ? (
          <figcaption className="discern-command__details">
            {explanation !== undefined
              ? (
                <div className="discern-command__explanation">
                  {explanation}
                </div>
              )
              : null}
            {expectedResult !== undefined
              ? (
                <ExpectedResult
                  {...(expectedResultLabel === undefined
                    ? {}
                    : { label: expectedResultLabel })}
                  {...(expectedResultVariant === undefined
                    ? {}
                    : { variant: expectedResultVariant })}
                >
                  {expectedResult}
                </ExpectedResult>
              )
              : null}
            {failureNote !== undefined
              ? (
                <div className="discern-command__failure-note">
                  <strong>If this fails</strong>
                  <span>{failureNote}</span>
                </div>
              )
              : null}
          </figcaption>
        )
        : null}
    </figure>
  );
});
