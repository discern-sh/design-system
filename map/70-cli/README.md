# CLI rendering

The React-free CLI surface has two entrypoints. `./cli` renders the discern design language as deterministic terminal strings; the optional `./cli/interactive` Adapter owns terminal effects and turns raw input into those semantic frame states. Together they combine explicit terminal capabilities, Token-derived colour and spacing, grapheme-aware text layout and editing, package-owned triangle motifs, typed interaction state, and generated per-Component CLI enrollment.

## Boundary and data flow

[`src/cli/mod.ts`](../../src/cli/mod.ts) is the public entrypoint named by both package manifests. The graph imports [`tokens.ts`](../../src/tokens/tokens.ts), CLI foundation modules, the generated CLI registry and renderer barrel, and rendered Component CLI modules. It imports no `.tsx` module and never resolves React; the release suite checks that graph directly and also runs a publish-shaped neutral consumer.

[`src/cli/interactive/mod.ts`](../../src/cli/interactive/mod.ts) is a separate optional entrypoint in both manifests. Its graph imports the pure CLI foundation and Deno terminal APIs, but no Component module, TSX, or React. Importing it performs no terminal mutation; constructing `DenoTerminalIO` and running a prompt cross the effects boundary. Release tests inspect both CLI graphs and import the Adapter from a publish-shaped neutral consumer.

Renderers receive a [`TerminalCapabilities`](../../src/cli/capabilities.ts) value containing colour depth (`none`, `ansi16`, `ansi256`, or `truecolor`), terminal columns, and Unicode support. [`detectTerminalCapabilities()`](../../src/cli/capabilities.ts) interprets caller-supplied `NO_COLOR`, `TERM`, `COLORTERM`, tty, locale, and width facts. It performs no process read itself. Component and motif renderers accept capabilities as an argument and perform no I/O or environment access.

## Token bridge and primitives

[`theme.ts`](../../src/cli/theme.ts) derives light and dark terminal themes directly from the authored `DesignToken` and `ThemeToken` arrays. It resolves Token references, converts authored OKLCH and hexadecimal colours to sRGB, composites the authored translucent overlay over the variant canvas, and computes nearest ANSI 256- and 16-colour fallbacks. Spacing Tokens map to character cells relative to `--discern-space-2`; weight Tokens determine bold roles, while muted, emphasis, and annotation roles use dim and italic terminal attributes. No terminal palette repeats an authored design colour.

[`ansi.ts`](../../src/cli/ansi.ts) composes styled spans and emits the selected ANSI form. [`text.ts`](../../src/cli/text.ts) segments graphemes for width, wrap, truncation, and padding, including wide CJK and emoji clusters. [`layout.ts`](../../src/cli/layout.ts) provides vertical joins, inline cluster wrapping, and column layout. [`box.ts`](../../src/cli/box.ts) draws width-bounded frames and substitutes `+`, `-`, and `|` when Unicode is unavailable.

[`triangles.ts`](../../src/cli/triangles.ts) owns the discern triangle glyphs and the preserved weave and spinner orders. Its pure renderers cover horizontal, vertical, thick, phased, and reversed patterns; spinner and determinate progress frames; labeled rules; semantic workflow steps; and an out-and-back activity beacon. Colours and gaps come from the terminal theme, measurement uses the shared text primitive, and ASCII orientations preserve phase meaning.

## Component CLI contract

[`ComponentMeta`](../../src/types/component-meta.ts) carries an optional `cli` stance. `{ stance: "rendered" }` requires `<slug>.cli.ts`; `{ stance: "exempt", reason }` requires a non-empty explanation; absence means pending. [`generate.ts`](../../scripts/generate.ts) checks the renderer relationship in both directions, writes [`cli-registry.ts`](../../src/generated/cli-registry.ts), and writes the public renderer aliases in [`cli-renderers.ts`](../../src/generated/cli-renderers.ts). The registry maps every slug to pending, exempt, or rendered and records a rendered module path.

The rendered module convention is visible in [`badge.cli.ts`](../../src/components/display/badge/badge.cli.ts): a default pure renderer, a `<Pascal>CliProps` type, and `cliExamples`. Badge's web and terminal renderers both import [`BadgeTone`](../../src/components/display/badge/badge.types.ts), so React does not own their shared vocabulary. `deno task catalogue:cli badge` loads the generated module path and prints all named example states.

[`interactive-states.ts`](../../src/cli/interactive-states.ts) defines the visual inputs for text, masked, confirmation, selection, search, autocomplete, textarea, spinner, progress, and sequential-form frames. Active, validation-error, submitted, and cancelled lifecycles are data. Spinner phase, completed units, workflow status, and beacon phase remain semantic values.

## Interactive terminal Adapter

[`io.ts`](../../src/cli/interactive/io.ts) defines the injectable `TerminalIO` boundary and its Deno stdin/stdout implementation. Prompts refuse to start unless both handles are TTYs. [`lifecycle.ts`](../../src/cli/interactive/lifecycle.ts) brackets raw mode and cursor hiding as one exception-safe operation: success, validation failure, Ctrl+C, EOF, callback exceptions, and form back-navigation all attempt raw-mode and cursor restoration. [`painter.ts`](../../src/cli/interactive/painter.ts) replaces the current multiline frame in place without scrolling prior output.

[`keys.ts`](../../src/cli/interactive/keys.ts) incrementally decodes UTF-8, retains incomplete escape sequences between reads, normalises common CSI and SS3 variants, and keeps unknown control sequences non-printable. [`editor.ts`](../../src/cli/interactive/editor.ts) edits by grapheme rather than UTF-16 code unit and supports Arrow, Home/End, Delete, Backspace, Option+Backspace, and the common Ctrl+A/B/E/F/H/N/P bindings. Textarea movement remains line-oriented; Ctrl+D submits it.

The prompt modules are event loops over typed state machines. Text, masked, confirm, select, multiselect, search, autocomplete, and textarea machines return the corresponding Wave 1 frame shape. Choice IDs stay stable across values and disabled choices remain visible but unselectable. Search providers may be synchronous or asynchronous; autocomplete uses inline ghost text. [`sequential-form.ts`](../../src/cli/interactive/sequential-form.ts) reevaluates conditional steps, retains prior values, removes values for newly inapplicable steps, and treats Ctrl+U as navigation to the preceding applicable step.

[`activity.ts`](../../src/cli/interactive/activity.ts) is the only time-advancing layer. Its scheduler advances the canonical `DISCERN_TRIANGLE_SPINNER_ORDER`; its determinate controller carries completed and total units and emits submitted lifecycle only at truthful completion. Rendering still delegates spinner glyph selection and progress percentage/fill arithmetic to [`triangles.ts`](../../src/cli/triangles.ts).

[`frame-renderers.ts`](../../src/cli/interactive/frame-renderers.ts) is the single temporary Wave 3 seam: one pure function per frame-state type and one exhaustive dispatcher. It uses the foundation's Token theme, box, text measurement, and triangle primitives rather than owning another palette, width algorithm, border set, glyph cycle, or percentage calculation. The scheduled Component-renderer wiring replaces this module without changing input, editing, prompt, or terminal lifecycle code.

## Verification and current state

[`tests/cli/`](../../tests/cli/) supplies reusable exact-frame helpers and a queue-backed fake terminal. It covers every foundation module, capability degradation, all triangle phases and states, Token enrollment, the two-way Component contract, Badge at narrow and full widths, every interactive frame at narrow/standard/wide widths, split input decoding, Unicode editing, prompt values, masked-output secrecy, cancellation, EOF, validator failure, non-TTY refusal, the complete spinner cycle, zero/25/complete progress, and a conditional form run with back-navigation. The generated registry contains 109 Components: Badge is rendered and 108 are pending. `[standards.cli_pending]` in [`discern.toml`](../../discern.toml) holds that pending count at a falling ceiling of 108; the standard's measurement imports the same Component discovery authority as Codegen.

The pure rendering boundary is recorded in [ADR-0002](../_adr/0002-react-free-cli-renderer-contract.md); the experiment-adaptation and one-seam interaction design is recorded in [ADR-0003](../_adr/0003-adapt-terminal-interaction-behind-frame-states.md). Outstanding parity work lives in [`discern/TODO.md`](../../discern/TODO.md), not in this present-state map.
