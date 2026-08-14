import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Ground } from "../ground/ground.tsx";
import type { GroundProps } from "../ground/ground.tsx";

/** Grd. VI — the envelope: straight chords between two legs, and the curve none of them draws. */

/** One chord of a family, with its place in the travelling crest. */
interface EnvelopeChord {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly offset: number;
}

/** One angle, its two legs, and the chords stretched across it. */
interface EnvelopeFamily {
  readonly vertex: { readonly x: number; readonly y: number };
  readonly legs: readonly {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  }[];
  readonly chords: readonly EnvelopeChord[];
}

/**
 * Two families, authored in opposite corners. Chord i joins the point i/n
 * along one leg to the point (n−i)/n along the other, so the family is
 * tangent to a parabola that no line in the figure contains: the curve is
 * read, never drawn. Every element is a straight segment between two points
 * on a triangle's legs.
 */
const ENVELOPE_FAMILIES: readonly EnvelopeFamily[] = Object.freeze([{
  "legs": [{ "x1": 1740, "y1": 300, "x2": 300, "y2": 940 }, {
    "x1": 1740,
    "y1": 300,
    "x2": 700,
    "y2": -120,
  }],
  "vertex": { "x": 1740, "y": 300 },
  "chords": [
    { "x1": 1682.4, "y1": 325.6, "x2": 741.6, "y2": -103.2, "offset": 0 },
    { "x1": 1624.8, "y1": 351.2, "x2": 783.2, "y2": -86.4, "offset": -4 },
    { "x1": 1567.2, "y1": 376.8, "x2": 824.8, "y2": -69.6, "offset": -8 },
    { "x1": 1509.6, "y1": 402.4, "x2": 866.4, "y2": -52.8, "offset": -12 },
    { "x1": 1452, "y1": 428, "x2": 908, "y2": -36, "offset": -16 },
    { "x1": 1394.4, "y1": 453.6, "x2": 949.6, "y2": -19.2, "offset": -20 },
    { "x1": 1336.8, "y1": 479.2, "x2": 991.2, "y2": -2.4, "offset": -24 },
    { "x1": 1279.2, "y1": 504.8, "x2": 1032.8, "y2": 14.4, "offset": -28 },
    { "x1": 1221.6, "y1": 530.4, "x2": 1074.4, "y2": 31.2, "offset": -32 },
    { "x1": 1164, "y1": 556, "x2": 1116, "y2": 48, "offset": -36 },
    { "x1": 1106.4, "y1": 581.6, "x2": 1157.6, "y2": 64.8, "offset": -40 },
    { "x1": 1048.8, "y1": 607.2, "x2": 1199.2, "y2": 81.6, "offset": -44 },
    { "x1": 991.2, "y1": 632.8, "x2": 1240.8, "y2": 98.4, "offset": -48 },
    { "x1": 933.6, "y1": 658.4, "x2": 1282.4, "y2": 115.2, "offset": -52 },
    { "x1": 876, "y1": 684, "x2": 1324, "y2": 132, "offset": -56 },
    { "x1": 818.4, "y1": 709.6, "x2": 1365.6, "y2": 148.8, "offset": -60 },
    { "x1": 760.8, "y1": 735.2, "x2": 1407.2, "y2": 165.6, "offset": -64 },
    { "x1": 703.2, "y1": 760.8, "x2": 1448.8, "y2": 182.4, "offset": -68 },
    { "x1": 645.6, "y1": 786.4, "x2": 1490.4, "y2": 199.2, "offset": -72 },
    { "x1": 588, "y1": 812, "x2": 1532, "y2": 216, "offset": -76 },
    { "x1": 530.4, "y1": 837.6, "x2": 1573.6, "y2": 232.8, "offset": -80 },
    { "x1": 472.8, "y1": 863.2, "x2": 1615.2, "y2": 249.6, "offset": -84 },
    { "x1": 415.2, "y1": 888.8, "x2": 1656.8, "y2": 266.4, "offset": -88 },
    { "x1": 357.6, "y1": 914.4, "x2": 1698.4, "y2": 283.2, "offset": -92 },
  ],
}, {
  "legs": [{ "x1": -110, "y1": -70, "x2": 560, "y2": 70 }, {
    "x1": -110,
    "y1": -70,
    "x2": 70,
    "y2": 540,
  }],
  "vertex": { "x": -110, "y": -70 },
  "chords": [
    { "x1": -49.09, "y1": -57.27, "x2": 53.64, "y2": 484.55, "offset": 0 },
    { "x1": 11.82, "y1": -44.55, "x2": 37.27, "y2": 429.09, "offset": -9.6 },
    { "x1": 72.73, "y1": -31.82, "x2": 20.91, "y2": 373.64, "offset": -19.2 },
    { "x1": 133.64, "y1": -19.09, "x2": 4.55, "y2": 318.18, "offset": -28.8 },
    { "x1": 194.55, "y1": -6.36, "x2": -11.82, "y2": 262.73, "offset": -38.4 },
    { "x1": 255.45, "y1": 6.36, "x2": -28.18, "y2": 207.27, "offset": -48 },
    { "x1": 316.36, "y1": 19.09, "x2": -44.55, "y2": 151.82, "offset": -57.6 },
    { "x1": 377.27, "y1": 31.82, "x2": -60.91, "y2": 96.36, "offset": -67.2 },
    { "x1": 438.18, "y1": 44.55, "x2": -77.27, "y2": 40.91, "offset": -76.8 },
    { "x1": 499.09, "y1": 57.27, "x2": -93.64, "y2": -14.55, "offset": -86.4 },
  ],
}]);

/** Props for the {@linkcode EnvelopeGround} component. */
export type EnvelopeGroundProps = Omit<GroundProps, "children">;

/** Straight chord families that imply curves no element actually draws. */
export const EnvelopeGround: DiscernComponent<
  HTMLDivElement,
  EnvelopeGroundProps
> = forwardRef<HTMLDivElement, EnvelopeGroundProps>(function EnvelopeGround(
  { className, ...props },
  ref,
) {
  return (
    <Ground
      ref={ref}
      className={classNames("discern-envelope-ground", className)}
      {...props}
    >
      <svg
        className="discern-ground__plate discern-envelope-ground__plate"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {ENVELOPE_FAMILIES.map((family, familyIndex) => (
          <g key={familyIndex}>
            <g className="discern-envelope-ground__leg">
              {family.legs.map((leg, legIndex) => (
                <line
                  key={legIndex}
                  x1={leg.x1}
                  y1={leg.y1}
                  x2={leg.x2}
                  y2={leg.y2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g className="discern-envelope-ground__chords">
              {family.chords.map((chord, chordIndex) => (
                <line
                  key={chordIndex}
                  className="discern-envelope-ground__chord"
                  x1={chord.x1}
                  y1={chord.y1}
                  x2={chord.x2}
                  y2={chord.y2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g className="discern-envelope-ground__crest">
              {family.chords.map((chord, chordIndex) => (
                <line
                  key={chordIndex}
                  style={{
                    "--discern-envelope-ground-offset": `${chord.offset}s`,
                  } as CSSProperties}
                  x1={chord.x1}
                  y1={chord.y1}
                  x2={chord.x2}
                  y2={chord.y2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          </g>
        ))}
      </svg>
    </Ground>
  );
});
