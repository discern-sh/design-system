# Bounded terminal applications

Start with `runTerminalApplication` from `@discern-sh/design-system/cli/interactive` when a screen stays open while data changes. Use `requestSelection({ presentation: "menu" })` for a single action choice. See [the public consumer guide](../../README.md#terminal-applications), [the demonstration](../../scripts/playground/application.ts), and [ADR 0046](../_adr/0046-own-terminal-applications-through-bounded-regions.md) for the ownership decision.

The caller supplies a title, optional one-line tip, and one or two regions. Choice regions use stable IDs and the shared Select menu; reading regions render a `CliBlock`, including Markdown. The runtime owns terminal modes, input, region focus, viewport fitting, scrolling, painting, animation, cancellation, and cleanup. Effects and provider discovery never run inside the navigation transition. Activation handlers are synchronous and return an explicit foreground operation when necessary. Shortcuts can change views or exit; foreground work is activated with Enter on an available choice.

## Geometry and navigation

The minimum is 32 columns and 10 rows. Title, tip, and keyboard help occupy three rows; regions own the rest. A screen with two regions uses columns at 100 columns or more, stacked rows below that width when at least 32 rows are available, and otherwise only the focused region. Tab and Shift+Tab switch regions in every layout. Two regions of the same kind share space equally; mixed choice/reading regions keep the larger second pane. Pane minimums and proportional allocation live in [the renderer](../../src/cli/interactive/application-model.ts); the Markdown browser uses the same allocation authority while retaining its established geometry.

Choice focus follows a stable item ID on updates and reordering, including when that item becomes unavailable. Removing it selects the first remaining choice at or after its former raw position, falling back to the preceding final choice. Group headings never receive focus. Empty collections show “No items.” Arrow keys move a choice; paging follows the fitted window; Home/End reach the edges. Set `search: true` on a choice region to offer `/` search. Enter returns to navigation with the filter retained; Escape clears it. The shared grapheme editor owns typing ahead of caller shortcuts. Search state persists by region ID across updates and foreground work. Supply `view.help` from a product key map when adding shortcuts; the package replaces it with editing help during search.

Rows can carry a leading `indicator`, trailing `status`, and `description`; annotations use semantic inline content and optional ASCII fallback. Labels wrap up to two lines in application regions and then ellipsize; statuses reserve at most a third of the available row. Supporting detail is bounded and removed at minimum heights. The footer shows position in the collection.

Reading scroll is local to its region. Arrow keys, Page Up/Down, Home/End clamp to the current document extent. On resize, the numeric top-row offset is preserved where possible and clamped to the last full page; the Markdown browser's richer semantic-anchor and link navigation remain available separately. New content requires a new `CliBlock`. Reusing a block promises unchanged props. Both regions retain their positions while hidden and across caller view changes by region ID.

Below minimum size the session shows a resize notice and Escape exit. Growing restores the view. Missing TTY or ANSI cursor control refuses before changing modes. Ctrl+C, EOF, and AbortSignal raise `InteractionCancelled`; Escape normally returns the final state and can be handled by the caller as back navigation. Rendering, handler, provider, and foreground failures reject after cleanup. A foreground operation owns its own cancellation and child lifecycle while it borrows the normal screen. The raw-terminal lifecycle cancels outstanding native input before relinquishing ownership. Deno restores canonical input flags, cursor and alternate-screen state; it does not promise exact restoration of every host-specific `stty` bit.

## Painting and liveness

[ADR 0053](../_adr/0053-applications-paint-incrementally-and-animate.md) records the decision. [`TerminalScreenPainter`](../../src/cli/interactive/painter.ts) writes each paint as one write: DECSET 2026 begin (`CSI ? 2026 h`), an optional state report, the body, and the matching end. Terminals without synchronized output ignore the brackets. A keyframe body erases the display, homes the cursor, and writes every row joined by CR LF. A row body moves to each changed row (`CSI <row> ; 1 H`), erases it (`CSI 2 K`), and writes it. A keyframe follows the first paint in each raw-terminal bracket, a new geometry, a new composition, and the first changed paint at least `keyframeEveryMs` (30 s) after the previous keyframe. The application's composition is its layout, plus the shown region in the single-region layout; a layered runtime passes its topmost layer. A frame with unchanged rows and report writes nothing, so an idle screen never repaints. Every row the painter writes first passes the complete-frame checks: one row per viewport row, closed styling and hyperlinks, no control character that would move the cursor, and no cell beyond the width. A failed write forces the next paint to be a keyframe. `runtime.paint` accepts partial `TerminalPaintOptions` to turn off synchronization or row diffs. The Markdown browser uses the same painter without synchronization or diffs, so each changed frame still repaints whole until the browser moves onto the application runtime.

A row annotation with `animation: "spinner"` and a one-cell resting glyph, such as `TERMINAL_GLYPHS.running`, moves through the bound motif's spinner while it is visible. `terminalGlyphFrame` in [`glyph-motion.ts`](../../src/cli/glyph-motion.ts) resolves the cell for a phase. ASCII keeps the static fallback, and reduced motion keeps the resting form. The frame reports `animated` when a visible glyph moves. [`TerminalAnimationTicker`](../../src/cli/interactive/clock.ts) then schedules one repaint 250 ms (`TERMINAL_ANIMATION_INTERVAL_MS`) after that paint and advances one shared phase. A slow paint therefore delays the next frame instead of queueing ticks. The tick stops when no visible glyph moves, below the minimum size, during foreground work, and on exit; the phase resumes afterwards. `runtime.reducedMotion` never starts it. The caller freezes a glyph by omitting `animation`, for example while its observation is stale. `runtime.clock` (`TerminalClock`) supplies time for the tick and the keyframe interval; tests pass `ManualTerminalClock` and advance it without real delays.

When `TerminalCapabilities.applicationStateReports` is true, each paint opens with a private OSC 7719 sequence carrying flat JSON (`TerminalApplicationStateReport`): the focused region as `focusedControlId`, and, for a list, `listId` and `selectedItemId`. Layered runtimes add `topLayerId` and `zoomed`. Readers ignore fields they do not know. Detection enables reports only for `TERMINAL_APPLICATION_STATE_REPORTS=1`. Terminals ignore the sequence, but it adds bytes to every paint, so production sessions leave it off. A change in the report alone repaints the report without rows.

## Work and evidence

[The fitting authority](../../src/cli/interactive/viewport-budget.ts) skips only budgets certified equivalent by each variable region. It does not assume monotonically increasing height: wrapped labels, sticky groups, contextual detail and non-linear windows continue through real renderers. [The regression](../../tests/cli/fitting_work_test.ts) covers independent control ceilings and a future control without coupling to its name. The raw budget getter remains conservative for arbitrary machines. No fitting cache survives a frame, so width, content and presentation changes cannot leave stale fitting results.

Application navigation uses an index built when entries are adopted and renders only the visible collection slice. Provider updates coalesce before adoption and painting; every meaningful input remains ordered. Reading cache keys include capabilities and explicit presentation, excluding runtime I/O and trace logs. [Behavioral tests](../../tests/cli/application_test.ts) exercise the real runtime with FakeTerminalIO; [the POSIX canary](../../tests/cli/application_pty_test.ts) checks actual transport, kernel resize, canonical input, foreground return and restoration.

Run `deno task playground:application` for Studio, or `deno run --config deno.json -A scripts/application-capture.ts` to capture the required geometry and appearance matrix under `.scratch/application/`. Each capture also writes its state report beside the PNG, and Unicode runs add a later spinner phase. These paths are review artifacts, not published data. Open the emitted HTML in a browser and inspect its PNG; text or HTML-source inspection alone is insufficient. [The benchmark](../../scripts/benchmark-application.ts) records the baseline descent beside the shared fitter and measures application navigation, resize, update bursts, bytes per paint and per spinner frame, and painter cost; [responsiveness evidence](responsiveness.md) states the measured environment and targets. [The painter tests](../../tests/cli/screen_painter_test.ts), [the replay tests](../../tests/cli/screen_replay_test.ts) and [the liveness tests](../../tests/cli/application_liveness_test.ts) pin the paint grammar, keyframe triggers, tick lifecycle, and state reports.

## Capture a fixture

The optional testing entrypoint replays the package's paints through its screen model, [`replay-testing.ts`](../../src/cli/interactive/replay-testing.ts). Replay starts at the transcript's last keyframe, together with the synchronized-update and report prefix of its paint. It applies keyframes, row writes and reports, and stops at the first restoration boundary (`CSI ? 25 h` or `CSI ? 1049 l`). Earlier output, earlier sessions and foreground children never reach the frame. A synchronized update is a transaction, so one still in flight at the end leaves the previous settled frame. A keyframe accepts CR CR LF because a PTY may expand LF. Any other control, a row outside the viewport, an open style, or a settled frame that does not fill the viewport exactly throws. The replay is not a terminal emulator.

`captureTerminalFrame` returns the styled `frame`, plain `text`, `html`, `geometry`, and the `state` report when one was emitted. `paintedAfter` requires the settling paint to end after a transcript offset. A phase's own output usually holds only row writes, so a readiness condition replays the whole standard output: `ptySettledFrame(size, description, test)` does that and requires a paint after the phase began. For example, against a fixture whose view title is `Studio`:

```ts
import {
  captureTerminalFrame,
  ptySettledFrame,
  runPtyProcess,
} from "@discern-sh/design-system/cli/interactive/testing";

const size = { columns: 80, rows: 24 };
const ready = ptySettledFrame(
  size,
  "settled Studio frame",
  (capture) => capture.text.includes("Studio"),
);
const result = await runPtyProcess({
  command: Deno.execPath(),
  args: ["run", "--allow-env", "fixture.ts"],
  cwd: Deno.cwd(),
  env: { TERMINAL_APPLICATION_STATE_REPORTS: "1" },
  geometry: size,
  input: [{
    waitFor: ready,
    capture: { name: "overview", when: ready },
    steps: [{ bytes: "q" }],
  }],
});
const captured = captureTerminalFrame(result.keyframes.overview!, size);
console.log(captured.state?.selectedItemId);
await Deno.writeTextFile("overview.html", captured.html);
```

With state reports enabled, a condition can key on `capture.state` identities instead of prose. The caller grants command/file permissions and selects environment facts. `readinessTimeoutMs` bounds the complete input plan (readiness, captures, and scripted steps); `timeoutMs` starts after that plan completes. Each defaults independently to 15 seconds, and timeout diagnostics name the expired phase and its budget. Consumers with a shared infrastructure allowance pass it explicitly rather than inheriting the package default. `ptyOutputContains` is useful for positive child markers. macOS/BSD and Linux/util-linux use their respective `script` invocation; only macOS was exercised in this effort. Windows is unsupported. The example capture script additionally produces PNGs through the repository's managed browser launcher.

## Consumer migration

- Replace repeated request recreation with one `runTerminalApplication` call. Publish immutable view replacements through `context.update`; return subscription cleanup from `start`, and reserve `context.fail` for fatal provider errors; recoverable failures may publish a stale view. Do not perform filesystem/process discovery in `onKey` or `onAction`.
- Keep facts, availability, routing, consent and execution in the consumer. `onAction` receives the chosen region, stable item ID, and caller value. Return `{ kind: "foreground", run: operation }` to release ownership and resume afterwards. Return `{ kind: "exit" }` for normal exit.
- Replace padded labels and injected ANSI with `indicator` and `status`. Use semantic text that remains understandable with color off. `SelectCliProps.chrome: "none"` lets another bounded parent own its frame and footer. Existing one-shot requests retain their defaults and bytes when new fields are omitted; no public names are removed.
- Custom `TerminalIO` adapters with native pending reads implement `cancelRead`, and forwarding wrappers preserve it. The default Deno adapter pauses the lazy `node:process` stdin stream without closing stdin; its callers need no adjustment. Hosts without native pending reads, including `FakeTerminalIO`, may omit the hook.
- Correct discern's `SelectionRequestOptions.presentation` wrapper from `InteractionChoicePresentation` to `InteractionSelectionPresentation` to admit `menu`. Its product adapter and ID policy remain consumer-owned; this repository does not edit them.
- Readiness conditions that pass `output.phaseStdout` to `captureTerminalFrame` stop matching once a phase paints only row writes. Build them with `ptySettledFrame`, or replay `output.stdout` with `paintedAfter` set to the phase's start. Transcript assertions that find paints by a leading `CSI 2 J` look for the synchronized-update begin instead; `settledTerminalFrame` and `captureTerminalFrame` keep returning one exact settled frame. `TerminalApplicationObservation` reports `paint`, `rowsWritten`, `bytesWritten`, `frameBytes` (the size of the rendered rows) and `animated`.
- Adopt `runPtyProcess`, `ptyOutputContains`, `ptySettledFrame`, and `captureTerminalFrame` from `./cli/interactive/testing`. Production tracing imports `observeTerminalIO` and `TerminalIOObservation` from `./cli/interactive`; testing retains their re-exports, and the ordinary runtime graph contains neither capture nor PTY instruments. The driver borrows the generic script transport, readiness phases, input validation and descendant cleanup from discern. The package replay reads only the package's own paint grammar; it rejects unsupported cursor operations rather than emulating them. Caller commands, environment facts, compilation, product fixtures, filesystem storage and gate accounting remain in discern.
- Retire the corresponding generic `pty_process` transport, complete-frame branch of `terminal_command_capture`, and I/O tracing wrapper after consumer adoption. `measureText`, `padText`, `wrapStyledText` and `wrapStyledTextPreservingIndent` already cover the primitives needed here. Discern's arbitrary hanging-prefix/long-token overflow adapter, content-shaped aligned rows, and numeric mini-charts are not needed by these foundations and remain migration follow-ups; no duplicate wrapping engine was copied.
