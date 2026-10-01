# Terminal responsiveness evidence

The target on the reference development host is p95 application navigation and resize rendering below 16 ms, and a coalesced 100-update adoption burst below 50 ms with 10,000 choices. A visible spinner should cost one row of output per frame, not a screen. These are review targets, not timing assertions in CI. Slow discovery belongs in a background provider; the keyboard loop never waits for filesystem scans or process enumeration. Provider work and physical display latency are outside these rendering measurements.

## Reproduce

Run `discern queue -- deno run --config deno.json -A scripts/benchmark-application.ts`. It prints JSON. The reference run on 30 September 2026 used macOS on aarch64, Deno 2.9.6 and V8 15.0.245.2-rusty. No preview server ran concurrently. Frames use the actual package renderer, painter and deterministic FakeTerminalIO; this measures JavaScript fitting, navigation, resizing, update adoption, painting and bytes written into the instrument, not monitor refresh or terminal GPU latency.

The fitting probe renders 20 described choices with a requested visible count of ten. Both algorithms run against the same renderer and data: the baseline offers every decreasing control budget, and the shared fitter skips only certified equivalent budgets. Each case runs 100 fits; the explicit navigation case changes the focused choice on each fit, while the static cases hold it fixed. The resize sweep alternates 40 × 13, 80 × 24 and 120 × 30. Changes to labels, groups and geometry remain covered by the existing viewport and menu suites.

| Fitting case             | Baseline calls/frame | Shared calls/frame |     Distinct layouts | Baseline p95 | Shared p95 |
| ------------------------ | -------------------: | -----------------: | -------------------: | -----------: | ---------: |
| Form, 80 × 26            |                   20 |                  4 |                    4 |     30.07 ms |    5.42 ms |
| Menu, 40 × 13            |                   12 |                  9 |                    9 |     19.74 ms |   14.33 ms |
| Menu, 80 × 24            |                    1 |                  1 |                    1 |      2.78 ms |    2.74 ms |
| Menu resize sweep        |                 4.74 |               3.72 |      10 across sweep |     19.67 ms |   14.28 ms |
| Form navigation, 80 × 26 |                   20 |                  4 | 80 across navigation |     31.07 ms |    5.59 ms |

The application probe uses 200 navigation steps, 60 resize steps over the five required review geometries, and a live session with 40 separately delivered keys. The update probe sends 100 view changes followed by 40 navigation keys, and verifies the final selected identity. Coalescing produces two observed frames, including the initial frame; it does not discard the navigation keys.

| Application measurement              | 20 choices | 10,000 choices |
| ------------------------------------ | ---------: | -------------: |
| Navigation p95                       |    1.58 ms |        2.06 ms |
| Resize p95                           |    2.00 ms |        2.78 ms |
| Live frame p95                       |    1.66 ms |        2.13 ms |
| 100 updates plus ordered input       |    2.14 ms |        9.50 ms |
| Maximum control renderer calls/frame |          1 |              1 |

## Painting

The painting probe runs the real application with 40 choices, three of them carrying an animated spinner, in the dark theme with an Accent. A manual clock advances 40 animation ticks, then 20 navigation keys arrive. Bytes are UTF-8 bytes written, including the synchronized-update brackets and cursor controls; a complete repaint is the size of the rendered rows alone. The list keeps its selection centred, so once it starts scrolling a single step rewrites nearly every row; at 120 × 30 the median step comes before scrolling starts.

| Geometry and colour | Keyframe | Spinner frame (3 rows) | Navigation step, median | Complete repaint |
| ------------------- | -------: | ---------------------: | ----------------------: | ---------------: |
| 80 × 24, no colour  |  2,433 B |                  330 B |        2,115 B, 20 rows |          2,385 B |
| 80 × 24, truecolor  |  4,479 B |                  657 B |        4,029 B, 20 rows |          4,431 B |
| 120 × 30, no colour |  4,321 B |                  450 B |           674 B, 3 rows |          4,267 B |
| 120 × 30, truecolor |  6,919 B |                  777 B |         1,024 B, 3 rows |          6,865 B |

Each visible spinner therefore costs one row per frame, 110 to 259 bytes, and three spinners write between a seventh and a tenth of a keyframe. Validation and diffing dominate the painter's own cost. Over 200 consecutive navigation frames at 80 × 24 in truecolor, a row-diff paint takes 0.21 ms at the median and 0.22 ms at p95; a keyframe-only painter takes 0.20 ms and 0.22 ms.

The [painter tests](../../tests/cli/screen_painter_test.ts) pin which rows each paint writes. The [liveness tests](../../tests/cli/application_liveness_test.ts) pin one row per spinner frame, the tick lifecycle, and the keyframe interval. The [fitting regression](../../tests/cli/fitting_work_test.ts) rejects redundant certified layouts deterministically. The [application guards](../../tests/cli/application_test.ts) cover large collections, identity preservation, coalesced writes and ordered keys. These algorithmic assertions protect CI from regressions without relying on host timing. Re-run the measurement for material rendering or painting changes; the numbers above describe this implementation and environment, not the cause of delays in the consumer's previous desk.
