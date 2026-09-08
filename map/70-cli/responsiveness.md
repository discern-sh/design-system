# Terminal responsiveness evidence

The target on the reference development host is p95 application navigation and resize rendering below 16 ms, and a coalesced 100-update adoption burst below 50 ms with 10,000 choices. These are review targets, not timing assertions in CI. Slow discovery belongs in a background provider; the keyboard loop never waits for filesystem scans or process enumeration. Provider work and physical display latency are outside these rendering measurements.

## Reproduce

Run `discern queue -- deno run --config deno.json -A scripts/benchmark-application.ts`. It prints JSON. The reference run on 7 September 2026 used macOS on aarch64, Deno 2.9.6 and V8 15.0.245.2-rusty. No preview server ran concurrently. Frames use the actual package renderer and deterministic FakeTerminalIO; this measures JavaScript fitting, navigation, resizing, update adoption and writes into the instrument, not monitor refresh or terminal GPU latency.

The fitting probe renders 20 described choices with a requested visible count of ten. Both algorithms run against the same renderer and data: the baseline offers every decreasing control budget, and the shared fitter skips only certified equivalent budgets. Each case runs 100 fits; the explicit navigation case changes the focused choice on each fit, while the static cases hold it fixed. The resize sweep alternates 40 × 13, 80 × 24 and 120 × 30. Changes to labels, groups and geometry remain covered by the existing viewport and menu suites.

| Fitting case             | Baseline calls/frame | Shared calls/frame |     Distinct layouts | Baseline p95 | Shared p95 |
| ------------------------ | -------------------: | -----------------: | -------------------: | -----------: | ---------: |
| Form, 80 × 26            |                   20 |                  4 |                    4 |     42.46 ms |    7.19 ms |
| Menu, 40 × 13            |                   12 |                  9 |                    9 |     23.00 ms |   16.17 ms |
| Menu, 80 × 24            |                    1 |                  1 |                    1 |      3.23 ms |    3.12 ms |
| Menu resize sweep        |                 4.74 |               3.72 |      10 across sweep |     22.70 ms |   15.90 ms |
| Form navigation, 80 × 26 |                   20 |                  4 | 80 across navigation |     35.23 ms |    6.49 ms |

The application probe uses 200 navigation steps, 60 resize steps over the five required review geometries, and a live session with 40 separately delivered keys. The update probe sends 100 view changes followed by 40 navigation keys, and verifies the final selected identity. Coalescing produces two observed frames, including the initial frame; it does not discard the navigation keys.

| Application measurement              | 20 choices | 10,000 choices |
| ------------------------------------ | ---------: | -------------: |
| Navigation p95                       |    1.94 ms |        2.35 ms |
| Resize p95                           |    2.30 ms |        3.02 ms |
| Live frame p95                       |    2.09 ms |        2.43 ms |
| 100 updates plus ordered input       |    2.65 ms |       12.65 ms |
| Maximum control renderer calls/frame |          1 |              1 |

The [fitting regression](../../tests/cli/fitting_work_test.ts) rejects redundant certified layouts deterministically. The [application guards](../../tests/cli/application_test.ts) cover large collections, identity preservation, coalesced writes and ordered keys. These algorithmic assertions protect CI from regressions without relying on host timing. Re-run the measurement for material rendering changes; the numbers above describe this implementation and environment, not the cause of delays in the consumer's previous desk.
