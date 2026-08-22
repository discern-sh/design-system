import { forwardRef, useId } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

/** Grd. I — the survey: one exact equilateral ruling, tileable, with a travelling band. */

/**
 * The lattice is two SVG patterns rather than stacked CSS gradients: a
 * repeating gradient's phase is measured from the box, so three families
 * declared that way never share a vertex. In pattern space the ruling
 * registers exactly and still tiles seamlessly in both axes.
 *
 * The plate carries no viewBox, so one user unit is one pixel and the pitch
 * holds at any backdrop size.
 */
const SURVEY_LATTICE = Object.freeze({
  /** Triangle side, and the resulting row height. */
  side: 104,
  row: 90.07,
  /** Major rules are promoted every fourth line of the grain family. */
  majorEvery: 4,
});

/** The horizontal and descending families: the quiet two thirds of the ruling. */
const MINOR_PATH = "M 0 0 L 104 0 M 0 0 L 52 90.07 M 52 0 L 104 90.07";

/** The ascending family: the grain, drawn one step stronger. */
const GRAIN_PATH = "M 0 90.07 L 52 0 M 52 90.07 L 104 0";

/** Every fourth grain line, promoted. */
const MAJOR_PATH = "M 0 360.28 L 208 0 M 208 360.28 L 416 0";

/** Props for the {@linkcode SurveyBackdrop} component. */
export interface SurveyBackdropProps extends Omit<BackdropProps, "children"> {}

/** Tileable equilateral ruling crossed by one slow travelling band. */
export const SurveyBackdrop: DiscernComponent<
  HTMLDivElement,
  SurveyBackdropProps
> = forwardRef<HTMLDivElement, SurveyBackdropProps>(function SurveyBackdrop(
  { className, ...props },
  ref,
) {
  const generatedId = useId().replaceAll(":", "");
  const latticeId = `discern-survey-${generatedId}-lattice`;
  const majorId = `discern-survey-${generatedId}-major`;

  return (
    <Backdrop
      ref={ref}
      className={classNames("discern-survey-backdrop", className)}
      {...props}
    >
      <svg
        className="discern-backdrop__plate"
        focusable="false"
      >
        <defs>
          <pattern
            id={latticeId}
            width={SURVEY_LATTICE.side}
            height={SURVEY_LATTICE.row}
            patternUnits="userSpaceOnUse"
          >
            <path className="discern-survey-backdrop__minor" d={MINOR_PATH} />
            <path className="discern-survey-backdrop__grain" d={GRAIN_PATH} />
          </pattern>
          <pattern
            id={majorId}
            width={SURVEY_LATTICE.side * SURVEY_LATTICE.majorEvery}
            height={SURVEY_LATTICE.row * SURVEY_LATTICE.majorEvery}
            patternUnits="userSpaceOnUse"
          >
            <path className="discern-survey-backdrop__major" d={MAJOR_PATH} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${latticeId})`} />
        <rect width="100%" height="100%" fill={`url(#${majorId})`} />
      </svg>
      <div className="discern-survey-backdrop__wash" />
    </Backdrop>
  );
});
