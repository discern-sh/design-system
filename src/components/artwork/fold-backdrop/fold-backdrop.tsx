import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

/** Grd. III — the fold. One triangular tessellation, every facet authored at its own tint, gathered into fourteen diagonal bands that take light in turn. */

/** One authored facet: its outline, its fixed tint, and whether it inks. */
interface FoldFacet {
  readonly points: string;
  readonly tint: number;
  readonly accent: boolean;
}

/** One diagonal band of facets sharing a single animated group opacity. */
interface FoldBand {
  readonly offset: number;
  readonly facets: readonly FoldFacet[];
}

/** The fourteen bands, ordered across the plate from the light's approach. */
const FOLD_BANDS: readonly FoldBand[] = Object.freeze([{
  "offset": 0,
  "facets": [
    { "points": "0,182.49 280,182.49 140,-60", "tint": 0.1, "accent": false },
    { "points": "140,-60 420,-60 280,182.49", "tint": 0.481, "accent": false },
    {
      "points": "0,424.98 280,424.98 140,182.49",
      "tint": 0.93,
      "accent": false,
    },
  ],
}, {
  "offset": -7.71,
  "facets": [
    {
      "points": "280,182.49 560,182.49 420,-60",
      "tint": 0.265,
      "accent": false,
    },
    { "points": "420,-60 700,-60 560,182.49", "tint": 0.572, "accent": false },
    {
      "points": "140,182.49 420,182.49 280,424.98",
      "tint": 0.217,
      "accent": false,
    },
    {
      "points": "280,424.98 560,424.98 420,182.49",
      "tint": 0.766,
      "accent": false,
    },
    {
      "points": "0,667.47 280,667.47 140,424.98",
      "tint": 0.151,
      "accent": false,
    },
    {
      "points": "140,424.98 420,424.98 280,667.47",
      "tint": 0.591,
      "accent": false,
    },
  ],
}, {
  "offset": -15.43,
  "facets": [
    {
      "points": "560,182.49 840,182.49 700,-60",
      "tint": 0.124,
      "accent": false,
    },
    { "points": "700,-60 980,-60 840,182.49", "tint": 0.249, "accent": false },
    {
      "points": "420,182.49 700,182.49 560,424.98",
      "tint": 0.429,
      "accent": false,
    },
    {
      "points": "280,667.47 560,667.47 420,424.98",
      "tint": 0.608,
      "accent": false,
    },
    {
      "points": "0,909.96 280,909.96 140,667.47",
      "tint": 0.602,
      "accent": false,
    },
    {
      "points": "140,667.47 420,667.47 280,909.96",
      "tint": 0.597,
      "accent": false,
    },
    {
      "points": "0,1152.45 280,1152.45 140,909.96",
      "tint": 0.436,
      "accent": false,
    },
  ],
}, {
  "offset": -23.14,
  "facets": [{
    "points": "840,182.49 1120,182.49 980,-60",
    "tint": 0.342,
    "accent": false,
  }, {
    "points": "560,424.98 840,424.98 700,182.49",
    "tint": 0.167,
    "accent": false,
  }, {
    "points": "700,182.49 980,182.49 840,424.98",
    "tint": 0.174,
    "accent": false,
  }, {
    "points": "420,424.98 700,424.98 560,667.47",
    "tint": 0.558,
    "accent": false,
  }, {
    "points": "560,667.47 840,667.47 700,424.98",
    "tint": 0.428,
    "accent": false,
  }, {
    "points": "280,909.96 560,909.96 420,667.47",
    "tint": 0.509,
    "accent": false,
  }, {
    "points": "420,667.47 700,667.47 560,909.96",
    "tint": 0.285,
    "accent": false,
  }, {
    "points": "140,909.96 420,909.96 280,1152.45",
    "tint": 0.496,
    "accent": false,
  }, {
    "points": "0,1394.94 280,1394.94 140,1152.45",
    "tint": 0.508,
    "accent": false,
  }, {
    "points": "140,1152.45 420,1152.45 280,1394.94",
    "tint": 0.285,
    "accent": false,
  }],
}, {
  "offset": -30.86,
  "facets": [{
    "points": "980,-60 1260,-60 1120,182.49",
    "tint": 0.908,
    "accent": false,
  }, {
    "points": "840,424.98 1120,424.98 980,182.49",
    "tint": 0.478,
    "accent": false,
  }, {
    "points": "980,182.49 1260,182.49 1120,424.98",
    "tint": 0.671,
    "accent": false,
  }, {
    "points": "700,424.98 980,424.98 840,667.47",
    "tint": 0.365,
    "accent": false,
  }, {
    "points": "560,909.96 840,909.96 700,667.47",
    "tint": 0.402,
    "accent": false,
  }, {
    "points": "280,1152.45 560,1152.45 420,909.96",
    "tint": 0.345,
    "accent": false,
  }, {
    "points": "420,909.96 700,909.96 560,1152.45",
    "tint": 0.534,
    "accent": false,
  }, {
    "points": "280,1394.94 560,1394.94 420,1152.45",
    "tint": 0.841,
    "accent": false,
  }],
}, {
  "offset": -38.57,
  "facets": [{
    "points": "1120,182.49 1400,182.49 1260,-60",
    "tint": 0.29,
    "accent": false,
  }, {
    "points": "1260,-60 1540,-60 1400,182.49",
    "tint": 0.297,
    "accent": false,
  }, {
    "points": "1120,424.98 1400,424.98 1260,182.49",
    "tint": 0.843,
    "accent": false,
  }, {
    "points": "840,667.47 1120,667.47 980,424.98",
    "tint": 0.367,
    "accent": false,
  }, {
    "points": "980,424.98 1260,424.98 1120,667.47",
    "tint": 0.809,
    "accent": false,
  }, {
    "points": "700,667.47 980,667.47 840,909.96",
    "tint": 0.268,
    "accent": false,
  }, {
    "points": "840,909.96 1120,909.96 980,667.47",
    "tint": 0.913,
    "accent": false,
  }, {
    "points": "560,1152.45 840,1152.45 700,909.96",
    "tint": 0.947,
    "accent": false,
  }, {
    "points": "700,909.96 980,909.96 840,1152.45",
    "tint": 0.517,
    "accent": false,
  }, {
    "points": "420,1152.45 700,1152.45 560,1394.94",
    "tint": 0.152,
    "accent": false,
  }, {
    "points": "560,1394.94 840,1394.94 700,1152.45",
    "tint": 0.584,
    "accent": false,
  }],
}, {
  "offset": -46.29,
  "facets": [{
    "points": "1400,182.49 1680,182.49 1540,-60",
    "tint": 0.151,
    "accent": false,
  }, {
    "points": "1540,-60 1820,-60 1680,182.49",
    "tint": 0.998,
    "accent": false,
  }, {
    "points": "1260,182.49 1540,182.49 1400,424.98",
    "tint": 0.631,
    "accent": false,
  }, {
    "points": "1120,667.47 1400,667.47 1260,424.98",
    "tint": 0.585,
    "accent": false,
  }, {
    "points": "1260,424.98 1540,424.98 1400,667.47",
    "tint": 0.167,
    "accent": false,
  }, {
    "points": "980,667.47 1260,667.47 1120,909.96",
    "tint": 0.16,
    "accent": false,
  }, {
    "points": "840,1152.45 1120,1152.45 980,909.96",
    "tint": 0.656,
    "accent": false,
  }, {
    "points": "980,909.96 1260,909.96 1120,1152.45",
    "tint": 0.739,
    "accent": false,
  }, {
    "points": "700,1152.45 980,1152.45 840,1394.94",
    "tint": 0.897,
    "accent": false,
  }],
}, {
  "offset": -54,
  "facets": [{
    "points": "1680,182.49 1960,182.49 1820,-60",
    "tint": 0.977,
    "accent": false,
  }, {
    "points": "1400,424.98 1680,424.98 1540,182.49",
    "tint": 0.24,
    "accent": false,
  }, {
    "points": "1540,182.49 1820,182.49 1680,424.98",
    "tint": 0.563,
    "accent": false,
  }, {
    "points": "1400,667.47 1680,667.47 1540,424.98",
    "tint": 0.2,
    "accent": false,
  }, {
    "points": "1120,909.96 1400,909.96 1260,667.47",
    "tint": 0.131,
    "accent": false,
  }, {
    "points": "1260,667.47 1540,667.47 1400,909.96",
    "tint": 0.217,
    "accent": false,
  }, {
    "points": "1120,1152.45 1400,1152.45 1260,909.96",
    "tint": 0.196,
    "accent": false,
  }, {
    "points": "840,1394.94 1120,1394.94 980,1152.45",
    "tint": 0.916,
    "accent": false,
  }, {
    "points": "980,1152.45 1260,1152.45 1120,1394.94",
    "tint": 0.861,
    "accent": false,
  }],
}, {
  "offset": -61.71,
  "facets": [{
    "points": "1820,-60 2100,-60 1960,182.49",
    "tint": 0.592,
    "accent": false,
  }, {
    "points": "1960,182.49 2240,182.49 2100,-60",
    "tint": 0.21,
    "accent": false,
  }, {
    "points": "1680,424.98 1960,424.98 1820,182.49",
    "tint": 0.834,
    "accent": false,
  }, {
    "points": "1820,182.49 2100,182.49 1960,424.98",
    "tint": 0.207,
    "accent": false,
  }, {
    "points": "1540,424.98 1820,424.98 1680,667.47",
    "tint": 0.809,
    "accent": false,
  }, {
    "points": "1680,667.47 1960,667.47 1820,424.98",
    "tint": 0.132,
    "accent": true,
  }, {
    "points": "1400,909.96 1680,909.96 1540,667.47",
    "tint": 0.829,
    "accent": false,
  }, {
    "points": "1540,667.47 1820,667.47 1680,909.96",
    "tint": 0.128,
    "accent": false,
  }, {
    "points": "1260,909.96 1540,909.96 1400,1152.45",
    "tint": 0.586,
    "accent": false,
  }, {
    "points": "1120,1394.94 1400,1394.94 1260,1152.45",
    "tint": 0.34,
    "accent": false,
  }, {
    "points": "1260,1152.45 1540,1152.45 1400,1394.94",
    "tint": 0.83,
    "accent": false,
  }],
}, {
  "offset": -69.43,
  "facets": [{
    "points": "2100,-60 2380,-60 2240,182.49",
    "tint": 0.477,
    "accent": false,
  }, {
    "points": "1960,424.98 2240,424.98 2100,182.49",
    "tint": 0.197,
    "accent": false,
  }, {
    "points": "2100,182.49 2380,182.49 2240,424.98",
    "tint": 0.521,
    "accent": false,
  }, {
    "points": "1820,424.98 2100,424.98 1960,667.47",
    "tint": 0.33,
    "accent": false,
  }, {
    "points": "1680,909.96 1960,909.96 1820,667.47",
    "tint": 0.12,
    "accent": false,
  }, {
    "points": "1400,1152.45 1680,1152.45 1540,909.96",
    "tint": 0.279,
    "accent": false,
  }, {
    "points": "1540,909.96 1820,909.96 1680,1152.45",
    "tint": 0.295,
    "accent": false,
  }, {
    "points": "1400,1394.94 1680,1394.94 1540,1152.45",
    "tint": 0.269,
    "accent": false,
  }],
}, {
  "offset": -77.14,
  "facets": [{
    "points": "2240,182.49 2520,182.49 2380,-60",
    "tint": 0.401,
    "accent": false,
  }, {
    "points": "2380,-60 2660,-60 2520,182.49",
    "tint": 0.529,
    "accent": false,
  }, {
    "points": "2240,424.98 2520,424.98 2380,182.49",
    "tint": 0.976,
    "accent": false,
  }, {
    "points": "1960,667.47 2240,667.47 2100,424.98",
    "tint": 0.914,
    "accent": false,
  }, {
    "points": "2100,424.98 2380,424.98 2240,667.47",
    "tint": 0.272,
    "accent": false,
  }, {
    "points": "1820,667.47 2100,667.47 1960,909.96",
    "tint": 0.536,
    "accent": false,
  }, {
    "points": "1960,909.96 2240,909.96 2100,667.47",
    "tint": 0.587,
    "accent": false,
  }, {
    "points": "1680,1152.45 1960,1152.45 1820,909.96",
    "tint": 0.84,
    "accent": false,
  }, {
    "points": "1820,909.96 2100,909.96 1960,1152.45",
    "tint": 0.302,
    "accent": false,
  }, {
    "points": "1540,1152.45 1820,1152.45 1680,1394.94",
    "tint": 0.744,
    "accent": false,
  }],
}, {
  "offset": -84.86,
  "facets": [{
    "points": "2380,182.49 2660,182.49 2520,424.98",
    "tint": 0.513,
    "accent": false,
  }, {
    "points": "2240,667.47 2520,667.47 2380,424.98",
    "tint": 0.283,
    "accent": false,
  }, {
    "points": "2380,424.98 2660,424.98 2520,667.47",
    "tint": 0.203,
    "accent": false,
  }, {
    "points": "2100,667.47 2380,667.47 2240,909.96",
    "tint": 0.484,
    "accent": false,
  }, {
    "points": "1960,1152.45 2240,1152.45 2100,909.96",
    "tint": 0.812,
    "accent": false,
  }, {
    "points": "1680,1394.94 1960,1394.94 1820,1152.45",
    "tint": 0.177,
    "accent": false,
  }, {
    "points": "1820,1152.45 2100,1152.45 1960,1394.94",
    "tint": 0.34,
    "accent": false,
  }],
}, {
  "offset": -92.57,
  "facets": [{
    "points": "2240,909.96 2520,909.96 2380,667.47",
    "tint": 0.309,
    "accent": false,
  }, {
    "points": "2380,667.47 2660,667.47 2520,909.96",
    "tint": 0.284,
    "accent": false,
  }, {
    "points": "2100,909.96 2380,909.96 2240,1152.45",
    "tint": 0.41,
    "accent": false,
  }, {
    "points": "2240,1152.45 2520,1152.45 2380,909.96",
    "tint": 0.116,
    "accent": false,
  }, {
    "points": "1960,1394.94 2240,1394.94 2100,1152.45",
    "tint": 0.441,
    "accent": false,
  }, {
    "points": "2100,1152.45 2380,1152.45 2240,1394.94",
    "tint": 0.308,
    "accent": false,
  }],
}, {
  "offset": -100.29,
  "facets": [{
    "points": "2380,909.96 2660,909.96 2520,1152.45",
    "tint": 0.704,
    "accent": false,
  }, {
    "points": "2240,1394.94 2520,1394.94 2380,1152.45",
    "tint": 0.161,
    "accent": false,
  }, {
    "points": "2380,1152.45 2660,1152.45 2520,1394.94",
    "tint": 0.844,
    "accent": false,
  }],
}]);

/** Props for the {@linkcode FoldBackdrop} component. */
export interface FoldBackdropProps extends Omit<BackdropProps, "children"> {}

/** Faceted triangular field whose diagonal bands take light in turn. */
export const FoldBackdrop: DiscernComponent<HTMLDivElement, FoldBackdropProps> =
  forwardRef<HTMLDivElement, FoldBackdropProps>(function FoldBackdrop(
    { className, ...props },
    ref,
  ) {
    return (
      <Backdrop
        ref={ref}
        className={classNames("discern-fold-backdrop", className)}
        {...props}
      >
        <svg
          className="discern-backdrop__plate"
          viewBox="0 0 2400 1240"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          {FOLD_BANDS.map((band, bandIndex) => (
            <g
              key={bandIndex}
              className="discern-fold-backdrop__band"
              style={{
                "--discern-fold-backdrop-offset": `${band.offset}s`,
              } as CSSProperties}
            >
              {band.facets.map((facet, facetIndex) => (
                <polygon
                  key={facetIndex}
                  className={facet.accent
                    ? "discern-fold-backdrop__facet discern-fold-backdrop__facet--accent"
                    : "discern-fold-backdrop__facet"}
                  style={{
                    "--discern-fold-backdrop-facet": facet.tint,
                  } as CSSProperties}
                  points={facet.points}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ))}
        </svg>
      </Backdrop>
    );
  });
