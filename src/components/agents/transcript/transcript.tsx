import { forwardRef } from "react";
import type { OlHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One turn rendered by the {@linkcode Transcript} component. */
export interface TranscriptTurn {
  readonly speaker: ReactNode;
  readonly body: ReactNode;
  readonly aside?: ReactNode;
}

/** Props for the {@linkcode Transcript} component. */
export interface TranscriptProps extends OlHTMLAttributes<HTMLOListElement> {
  readonly turns: readonly TranscriptTurn[];
}

/** Ordered conversation turns between named speakers, with bodies indented under the speaker text. */
export const Transcript: DiscernComponent<HTMLOListElement, TranscriptProps> =
  forwardRef<HTMLOListElement, TranscriptProps>(function Transcript(
    { turns, className, ...props },
    ref,
  ) {
    return (
      <ol
        ref={ref}
        className={classNames("discern-transcript", className)}
        {...props}
      >
        {turns.map((turn, index) => (
          <li className="discern-transcript__turn" key={index}>
            <div className="discern-transcript__speaker">
              {turn.speaker}
              {turn.aside !== undefined && turn.aside !== null
                ? (
                  <span className="discern-transcript__aside">
                    {turn.aside}
                  </span>
                )
                : null}
            </div>
            <div className="discern-transcript__body">{turn.body}</div>
          </li>
        ))}
      </ol>
    );
  });
