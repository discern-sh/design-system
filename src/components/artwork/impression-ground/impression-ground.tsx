import { forwardRef } from "react";
import type { ReactElement } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Ground } from "../ground/ground.tsx";
import type { GroundProps } from "../ground/ground.tsx";

/** Grd. V — the impression: the mark set as type on an offset lattice, inked where the reader is. */

/** The mark, as type. The one place in the series where the glyph is used. */
const DEFAULT_IMPRESSION_GLYPH = "◐";

/** The lattice: alternate rows shifted, alternate marks turned. */
const IMPRESSION_ROWS: readonly {
  readonly offset: boolean;
  readonly glyphs: readonly boolean[];
}[] = Object.freeze([{
  "offset": false,
  "glyphs": [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ],
}, {
  "offset": true,
  "glyphs": [
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ],
}, {
  "offset": false,
  "glyphs": [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ],
}, {
  "offset": true,
  "glyphs": [
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ],
}, {
  "offset": false,
  "glyphs": [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ],
}, {
  "offset": true,
  "glyphs": [
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ],
}, {
  "offset": false,
  "glyphs": [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ],
}, {
  "offset": true,
  "glyphs": [
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ],
}, {
  "offset": false,
  "glyphs": [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ],
}, {
  "offset": true,
  "glyphs": [
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ],
}, {
  "offset": false,
  "glyphs": [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ],
}]);

/** The sensor panels the opening follows. Their positions are CSS-owned. */
const SENSOR_COUNT = 12;

/** One field of marks, rendered twice: once as ink, once as the admitted accent. */
function ImpressionField(
  { glyph, variant }: {
    readonly glyph: string;
    readonly variant: "base" | "ink";
  },
): ReactElement {
  return (
    <div
      className={`discern-impression-ground__field discern-impression-ground__field--${variant}`}
    >
      {IMPRESSION_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={row.offset
            ? "discern-impression-ground__row discern-impression-ground__row--offset"
            : "discern-impression-ground__row"}
        >
          {row.glyphs.map((turned, glyphIndex) => (
            <span
              key={glyphIndex}
              className={turned
                ? "discern-impression-ground__glyph discern-impression-ground__glyph--turned"
                : "discern-impression-ground__glyph"}
            >
              {glyph}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The sensors precede the admitted field so a hover can reach it with the
 * sibling combinator: the ground stays scriptless, and a static render keeps
 * the opening at its authored rest position.
 */

/** Props for the {@linkcode ImpressionGround} component. */
export interface ImpressionGroundProps extends Omit<GroundProps, "children"> {
  /** Glyph repeated across the offset lattice. Defaults to the half-disc ◐. */
  readonly glyph?: string;
}

/** Offset glyph lattice whose soft accent aperture follows the reader. */
export const ImpressionGround: DiscernComponent<
  HTMLDivElement,
  ImpressionGroundProps
> = forwardRef<HTMLDivElement, ImpressionGroundProps>(function ImpressionGround(
  { className, glyph = DEFAULT_IMPRESSION_GLYPH, ...props },
  ref,
) {
  return (
    <Ground
      ref={ref}
      className={classNames("discern-impression-ground", className)}
      {...props}
    >
      <ImpressionField glyph={glyph} variant="base" />
      {Array.from(
        { length: SENSOR_COUNT },
        (_, index) => (
          <div key={index} className="discern-impression-ground__sensor" />
        ),
      )}
      <ImpressionField glyph={glyph} variant="ink" />
    </Ground>
  );
});
