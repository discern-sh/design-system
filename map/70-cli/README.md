# CLI rendering

The React-free `./cli` export renders the discern design language as deterministic terminal strings. It combines explicit terminal capabilities, Token-derived colour and spacing, grapheme-aware text layout, package-owned triangle motifs, typed interactive frame states, and generated per-Component CLI enrollment.

## Boundary and data flow

[`src/cli/mod.ts`](../../src/cli/mod.ts) is the public entrypoint named by both package manifests. The graph imports [`tokens.ts`](../../src/tokens/tokens.ts), CLI foundation modules, the generated CLI registry and renderer barrel, and rendered Component CLI modules. It imports no `.tsx` module and never resolves React; the release suite checks that graph directly and also runs a publish-shaped neutral consumer.

Renderers receive a [`TerminalCapabilities`](../../src/cli/capabilities.ts) value containing colour depth (`none`, `ansi16`, `ansi256`, or `truecolor`), terminal columns, and Unicode support. [`detectTerminalCapabilities()`](../../src/cli/capabilities.ts) interprets caller-supplied `NO_COLOR`, `TERM`, `COLORTERM`, tty, locale, and width facts. It performs no process read itself. Component and motif renderers accept capabilities as an argument and perform no I/O or environment access.

## Token bridge and primitives

[`theme.ts`](../../src/cli/theme.ts) derives light and dark terminal themes directly from the authored `DesignToken` and `ThemeToken` arrays. It resolves Token references, converts authored OKLCH and hexadecimal colours to sRGB, composites the authored translucent overlay over the variant canvas, and computes nearest ANSI 256- and 16-colour fallbacks. Spacing Tokens map to character cells relative to `--discern-space-2`; weight Tokens determine bold roles, while muted, emphasis, and annotation roles use dim and italic terminal attributes. No terminal palette repeats an authored design colour.

[`ansi.ts`](../../src/cli/ansi.ts) composes styled spans and emits the selected ANSI form. [`text.ts`](../../src/cli/text.ts) segments graphemes for width, wrap, truncation, and padding, including wide CJK and emoji clusters. [`layout.ts`](../../src/cli/layout.ts) provides vertical joins, inline cluster wrapping, and column layout. [`box.ts`](../../src/cli/box.ts) draws width-bounded frames and substitutes `+`, `-`, and `|` when Unicode is unavailable.

[`triangles.ts`](../../src/cli/triangles.ts) owns the discern triangle glyphs and the preserved weave and spinner orders. Its pure renderers cover horizontal, vertical, thick, phased, and reversed patterns; spinner and determinate progress frames; labeled rules; semantic workflow steps; and an out-and-back activity beacon. Colours and gaps come from the terminal theme, measurement uses the shared text primitive, and ASCII orientations preserve phase meaning.

## Component CLI contract

[`ComponentMeta`](../../src/types/component-meta.ts) carries an optional `cli` stance. `{ stance: "rendered" }` requires `<slug>.cli.ts`; `{ stance: "exempt", reason }` requires a non-empty explanation; absence means pending. [`generate.ts`](../../scripts/generate.ts) checks the renderer relationship in both directions, writes [`cli-registry.ts`](../../src/generated/cli-registry.ts), and writes the public renderer aliases in [`cli-renderers.ts`](../../src/generated/cli-renderers.ts). The registry maps every slug to pending, exempt, or rendered and records a rendered module path.

The rendered module convention is visible in [`badge.cli.ts`](../../src/components/display/badge/badge.cli.ts): a default pure renderer, a `<Pascal>CliProps` type, and `cliExamples`. Badge's web and terminal renderers both import [`BadgeTone`](../../src/components/display/badge/badge.types.ts), so React does not own their shared vocabulary. Core, Display, and Layout follow the same framework-neutral vocabulary rule for their named variants, sizes, surfaces, spacing, and alignments. `deno task catalogue:cli <slug>` loads the generated module path and prints every named example state for one rendered Component.

Core's identity renderers use capability-aware glyph and triangle wordmarks; its action renderers preserve Button, Icon button, and Theme toggle vocabulary. Theme switcher is exempt because terminal palette choice is already a caller-owned renderer input, while presenting its three-way form would imply a driver and persistence policy. Display maps compact text treatments to ANSI roles, frames Card, Window, and Terminal with the box primitive, sizes Table columns inside the available width, and keeps Diffstat direction legible through literal `+` and `−` bars. Divider is the Component authority for selecting the triangle foundation's horizontal and vertical rules, ribbons, fields, weaves, phases, and labeled section rules. Layout's Container, Stack, Cluster, Grid, and Section renderers are thin wrappers over the foundation layout combinators; Section selects the authoritative triangle primitives when a rule or ribbon clarifies its boundary.

[`interactive-states.ts`](../../src/cli/interactive-states.ts) defines the visual inputs for text, masked, confirmation, selection, search, autocomplete, textarea, spinner, progress, and sequential-form frames. Active, validation-error, submitted, and cancelled lifecycles are data. Spinner phase, completed units, workflow status, and beacon phase remain semantic values. The package contains no raw-mode input driver.

## Verification and current state

[`tests/cli/`](../../tests/cli/) supplies reusable exact-frame helpers and covers every foundation module, capability degradation, all triangle phases and states, Token enrollment, the two-way Component contract, and every rendered Core, Display, and Layout Component at narrow, standard, and wide widths. The generated registry contains 109 Components: 22 are rendered, Theme switcher is exempt, and 86 are pending in the remaining Groups. `[standards.cli_pending]` in [`discern.toml`](../../discern.toml) holds that pending count at a falling ceiling of 86; the standard's measurement imports the same Component discovery authority as Codegen.

The architecture choices behind this boundary are recorded in [ADR-0002](../_adr/0002-react-free-cli-renderer-contract.md). Outstanding parity work lives in [`discern/TODO.md`](../../discern/TODO.md), not in this present-state map.
