import { forwardRef } from "react";
import type { OlHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { transcriptPositions } from "./transcript.types.ts";
import { classNames } from "../../class-names.ts";

/** One turn rendered by the {@linkcode Transcript} component. */
export interface TranscriptTurn {
  readonly speaker: ReactNode;
  readonly body: ReactNode;
  readonly aside?: ReactNode;
  /** Explicit label for consecutive routine turns; omit at decisions or boundaries. */
  readonly routineGroup?: string;
  /** Stable identity when a rich speaker slot participates in a routine group. */
  readonly speakerId?: string;
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
    const positions = transcriptPositions(turns);
    return (
      <ol
        ref={ref}
        className={classNames("discern-transcript", className)}
        {...props}
      >
        {turns.map((turn, index) => (
          <li
            className="discern-transcript__turn"
            data-discern-routine={positions[index]?.continued
              ? "continuation"
              : positions[index]
              ? "start"
              : undefined}
            key={index}
          >
            <div className="discern-transcript__speaker">
              <span
                className={positions[index]?.continued
                  ? "discern-visually-hidden"
                  : undefined}
              >
                {turn.speaker}
              </span>
              {positions[index] && !positions[index]!.continued && (
                <span className="discern-transcript__group">
                  {positions[index]!.label} · {positions[index]!.size} entries
                </span>
              )}
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
