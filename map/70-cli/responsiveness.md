# Terminal responsiveness evidence

The target on the reference development host is p95 application navigation and resize rendering below 16 ms, and a coalesced 100-update adoption burst below 50 ms with 10,000 items. A visible spinner should cost one row of output per frame, not a screen. These are review targets, not timing assertions in CI. Slow discovery belongs in a background provider; the keyboard loop never waits for filesystem scans or process enumeration. Provider work and physical display latency are outside these rendering measurements.

## Reproduce

Run `discern queue -- deno run --config deno.json -A scripts/benchmark-application.ts`. It prints JSON. The reference run on 30 September 2026 used macOS on aarch64, Deno 2.9.6 and V8 15.0.245.2-rusty. No preview server ran concurrently. Frames use the actual package renderer, painter and deterministic FakeTerminalIO; this measures JavaScript fitting, navigation, resizing, update adoption, painting and bytes written into the instrument, not monitor refresh or terminal GPU latency.

The fitting probe renders 20 described choices with a requested visible count of ten. Both algorithms run against the same renderer and data: the baseline offers every decreasing control budget, and the shared fitter skips only certified equivalent budgets. Each case runs 100 fits; the explicit navigation case changes the focused choice on each fit, while the static cases hold it fixed. The resize sweep alternates 40 × 13, 80 × 24 and 120 × 30. Changes to labels, groups and geometry remain covered by the existing viewport and menu suites.

| Fitting case             | Baseline calls/frame | Shared calls/frame |     Distinct layouts | Baseline p95 | Shared p95 |
| ------------------------ | -------------------: | -----------------: | -------------------: | -----------: | ---------: |
| Form, 80 × 26            |                   20 |                  4 |                    4 |     30.83 ms |    5.44 ms |
| Menu, 40 × 13            |                   12 |                  9 |                    9 |     19.82 ms |   14.37 ms |
| Menu, 80 × 24            |                    1 |                  1 |                    1 |      3.08 ms |    3.16 ms |
| Menu resize sweep        |                 4.74 |               3.72 |      10 across sweep |     21.55 ms |   15.17 ms |
| Form navigation, 80 × 26 |                   20 |                  4 | 80 across navigation |     33.36 ms |    5.62 ms |

The application probe drives a one-group list through 200 navigation steps through the pure model and renderer, 60 resize steps over five review geometries, and a live session with 40 separately delivered keys. The update probe sends 100 view changes that share one list value, as a provider's header-only update would, followed by 40 navigation keys, and verifies the final selected identity and the last header. Coalescing produces three observed frames, including the initial frame; it does not discard the navigation keys. The session includes validating and adopting the 10,000-item view, which the package does once per adopted view.

| Application measurement                    | 20 items | 10,000 items |
| ------------------------------------------ | -------: | -----------: |
| Navigation p95                             |  1.38 ms |      1.77 ms |
| Resize p95                                 |  1.39 ms |      2.10 ms |
| Live frame p95                             |  1.32 ms |      1.29 ms |
| 100 updates plus ordered input             |  4.93 ms |      8.34 ms |
| Component block renders per frame, at most |        0 |            0 |

## Painting

The painting probe runs the real application with a 40-item list, three items carrying an animated spinner, in the dark theme with an Accent. A manual clock advances 40 animation ticks, then 20 navigation keys arrive. Bytes are UTF-8 bytes written, including the synchronized-update brackets and cursor controls; a complete repaint is the size of the rendered rows alone. The list scrolls only at its edge, so a step that moves the selection rewrites the two rows that change; a step that scrolls the list shifts every row and rewrites them all, which at 80 × 24 is the largest step (21 rows).

| Geometry and colour | Keyframe | Spinner frame (3 rows) | Navigation step, median | Navigation step, largest | Complete repaint |
| ------------------- | -------: | ---------------------: | ----------------------: | -----------------------: | ---------------: |
| 80 × 24, no colour  |  2,063 B |                  302 B |           212 B, 2 rows |         1,980 B, 21 rows |          2,017 B |
| 80 × 24, truecolor  |  3,647 B |                  662 B |           503 B, 2 rows |         3,530 B, 21 rows |          3,601 B |
| 120 × 30, no colour |  3,767 B |                  422 B |           292 B, 2 rows |            292 B, 2 rows |          3,715 B |
| 120 × 30, truecolor |  5,765 B |                  782 B |           583 B, 2 rows |            583 B, 2 rows |          5,713 B |

Each visible spinner therefore costs one row per frame, 100 to 260 bytes, and three spinners write between a fifth and a seventh of a keyframe. Validation and diffing dominate the painter's own cost. Over 200 consecutive navigation frames at 80 × 24 in truecolor, a row-diff paint takes 0.22 ms at the median and 0.27 ms at p95; a keyframe-only painter takes 0.22 ms and 0.28 ms.

The [painter tests](../../tests/cli/screen_painter_test.ts) pin which rows each paint writes. The [liveness tests](../../tests/cli/application_liveness_test.ts) pin one row per spinner frame, the tick lifecycle, and the keyframe interval. The [fitting regression](../../tests/cli/fitting_work_test.ts) rejects redundant certified layouts deterministically. The [application guards](../../tests/cli/application_test.ts) and [model tests](../../tests/cli/application_model_test.ts) cover large collections, identity preservation, edge scrolling, coalesced writes and ordered keys. These algorithmic assertions protect CI from regressions without relying on host timing. Re-run the measurement for material rendering or painting changes; the numbers above describe this implementation and environment, not the cause of delays in the consumer's previous desk.
