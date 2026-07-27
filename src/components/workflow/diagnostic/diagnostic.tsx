import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Command } from "../command/command.tsx";
import { PathReference } from "../path-reference/path-reference.tsx";
import { RawOutput } from "../raw-output/raw-output.tsx";

/** Severity states carried by a {@linkcode Diagnostic}. */
export type DiagnosticSeverity = "failure" | "attention";

/** Props for the {@linkcode Diagnostic} component. */
export interface DiagnosticProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  readonly title: ReactNode;
  readonly impact: ReactNode;
  readonly correction: ReactNode;
  readonly severity?: DiagnosticSeverity;
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
  readonly pathCopyable?: boolean;
  readonly evidence?: ReactNode;
  readonly reproductionCommand?: string;
  readonly retryCommand?: string;
  readonly workingDirectory?: string;
  readonly rawDetail?: ReactNode;
  readonly rawLabel?: ReactNode;
}

const severityLabels: Readonly<Record<DiagnosticSeverity, string>> = {
  failure: "Failure",
  attention: "Attention",
};

/** Structured failure account that locates, proves, reproduces, and corrects one problem. */
export const Diagnostic: DiscernComponent<HTMLElement, DiagnosticProps> =
  forwardRef<HTMLElement, DiagnosticProps>(function Diagnostic(
    {
      title,
      impact,
      correction,
      severity = "failure",
      path,
      line,
      column,
      pathCopyable = false,
      evidence,
      reproductionCommand,
      retryCommand,
      workingDirectory,
      rawDetail,
      rawLabel,
      className,
      role,
      ...props
    },
    ref,
  ) {
    const semanticRole = role ?? (severity === "failure" ? "alert" : "status");
    const hasCoordinates = line !== undefined || column !== undefined;
    return (
      <article
        ref={ref}
        role={semanticRole}
        className={classNames("discern-diagnostic", className)}
        {...props}
      >
        <header className="discern-diagnostic__header">
          <span
            className="discern-diagnostic__severity"
            data-discern-state={severity}
          >
            {severityLabels[severity]}
          </span>
          <strong className="discern-diagnostic__title">{title}</strong>
        </header>
        <div className="discern-diagnostic__impact">
          <span className="discern-diagnostic__label">Why it matters</span>
          <div>{impact}</div>
        </div>
        {path !== undefined
          ? (
            <div className="discern-diagnostic__location">
              <span className="discern-diagnostic__label">Location</span>
              <div className="discern-diagnostic__path">
                <PathReference path={path} copyable={pathCopyable} />
              </div>
              {hasCoordinates
                ? (
                  <span className="discern-diagnostic__coordinates">
                    {line !== undefined ? `Line ${line}` : null}
                    {line !== undefined && column !== undefined ? ", " : null}
                    {column !== undefined ? `column ${column}` : null}
                  </span>
                )
                : null}
            </div>
          )
          : null}
        {evidence !== undefined
          ? (
            <div className="discern-diagnostic__evidence">
              <span className="discern-diagnostic__label">Evidence</span>
              <pre>
                <code>{evidence}</code>
              </pre>
            </div>
          )
          : null}
        {reproductionCommand !== undefined || retryCommand !== undefined
          ? (
            <div className="discern-diagnostic__commands">
              {reproductionCommand !== undefined
                ? (
                  <section>
                    <span className="discern-diagnostic__label">Reproduce</span>
                    <Command
                      command={reproductionCommand}
                      {...(workingDirectory === undefined
                        ? {}
                        : { workingDirectory })}
                    />
                  </section>
                )
                : null}
              {retryCommand !== undefined
                ? (
                  <section>
                    <span className="discern-diagnostic__label">Retry</span>
                    <Command
                      command={retryCommand}
                      {...(workingDirectory === undefined
                        ? {}
                        : { workingDirectory })}
                    />
                  </section>
                )
                : null}
            </div>
          )
          : null}
        <div className="discern-diagnostic__correction">
          <strong>Suggested correction</strong>
          <div>{correction}</div>
        </div>
        {rawDetail !== undefined
          ? (
            <RawOutput
              {...(rawLabel === undefined ? {} : { label: rawLabel })}
            >
              {rawDetail}
            </RawOutput>
          )
          : null}
      </article>
    );
  });
