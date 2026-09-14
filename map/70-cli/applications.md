# Bounded terminal applications

Start with `runTerminalApplication` from `@discern-sh/design-system/cli/interactive` when a screen stays open while data changes. Use `requestSelection({ presentation: "menu" })` for a single action choice. See [the public consumer guide](../../README.md#terminal-applications), [the demonstration](../../scripts/playground/application.ts), and [ADR 0046](../_adr/0046-own-terminal-applications-through-bounded-regions.md) for the ownership decision.

The caller supplies a title, optional one-line tip, and one or two regions. Choice regions use stable IDs and the shared Select menu; reading regions render a `CliBlock`, including Markdown. The runtime owns terminal modes, input, region focus, viewport fitting, scrolling, redraws, cancellation, and cleanup. Effects and provider discovery never run inside the navigation transition. Activation handlers are synchronous and return an explicit foreground operation when necessary. Shortcuts can change views or exit; foreground work is activated with Enter on an available choice.

## Geometry and navigation

The minimum is 32 columns and 10 rows. Title, tip, and keyboard help occupy three rows; regions own the rest. A screen with two regions uses columns at 100 columns or more, stacked rows below that width when at least 32 rows are available, and otherwise only the focused region. Tab and Shift+Tab switch regions in every layout. Pane minimums and proportional allocation live in [the renderer](../../src/cli/interactive/application-model.ts); the Markdown browser uses the same allocation authority while retaining its established geometry.

Choice focus follows a stable item ID on updates and reordering, including when that item becomes unavailable. Removing it selects the first remaining choice at or after its former raw position, falling back to the preceding final choice. Group headings never receive focus. Empty collections show “No items.” Arrow keys move a choice; paging follows the fitted window; Home/End reach the edges. Set `search: true` on a choice region to offer `/` search. Enter returns to navigation with the filter retained; Escape clears it. The shared grapheme editor owns typing ahead of caller shortcuts. Search state persists by region ID across updates and foreground work. Supply `view.help` from a product key map when adding shortcuts; the package replaces it with editing help during search.

Rows can carry a leading `indicator`, trailing `status`, and `description`; annotations use semantic inline content and optional ASCII fallback. Labels wrap up to two lines in application regions and then ellipsize; statuses reserve at most a third of the available row. Supporting detail is bounded and removed at minimum heights. The footer shows position in the collection.

Reading scroll is local to its region. Arrow keys, Page Up/Down, Home/End clamp to the current document extent. On resize, the numeric top-row offset is preserved where possible and clamped to the last full page; the Markdown browser's richer semantic-anchor and link navigation remain available separately. New content requires a new `CliBlock`. Reusing a block promises unchanged props. Both regions retain their positions while hidden and across caller view changes by region ID.

Below minimum size the session shows a resize notice and Escape exit. Growing restores the view. Missing TTY or ANSI cursor control refuses before changing modes. Ctrl+C, EOF, and AbortSignal raise `InteractionCancelled`; Escape normally returns the final state and can be handled by the caller as back navigation. Rendering, handler, provider, and foreground failures reject after cleanup. A foreground operation owns its own cancellation and child lifecycle while it borrows the normal screen. The raw-terminal lifecycle cancels outstanding native input before relinquishing ownership. Deno restores canonical input flags, cursor and alternate-screen state; it does not promise exact restoration of every host-specific `stty` bit.

## Work and evidence

[The fitting authority](../../src/cli/interactive/viewport-budget.ts) skips only budgets certified equivalent by each variable region. It does not assume monotonically increasing height: wrapped labels, sticky groups, contextual detail and non-linear windows continue through real renderers. [The regression](../../tests/cli/fitting_work_test.ts) covers independent control ceilings and a future control without coupling to its name. The raw budget getter remains conservative for arbitrary machines. No fitting cache survives a frame, so width, content and presentation changes cannot leave stale fitting results.

Application navigation uses an index built when entries are adopted and renders only the visible collection slice. Provider updates coalesce before adoption and painting; every meaningful input remains ordered. Reading cache keys include capabilities and explicit presentation, excluding runtime I/O and trace logs. [Behavioral tests](../../tests/cli/application_test.ts) exercise the real runtime with FakeTerminalIO; [the POSIX canary](../../tests/cli/application_pty_test.ts) checks actual transport, kernel resize, canonical input, foreground return and restoration.

Run `deno task playground:application` for Studio, or `deno run --config deno.json -A scripts/application-capture.ts` to capture the required geometry and appearance matrix under `.scratch/application/`. These paths are review artifacts, not published data. Open the emitted HTML in a browser and inspect its PNG; text or HTML-source inspection alone is insufficient. [The benchmark](../../scripts/benchmark-application.ts) records the baseline descent beside the shared fitter and measures application navigation, resize and update bursts; [responsiveness evidence](responsiveness.md) states the measured environment and targets.

## Capture a fixture

The optional testing entrypoint accepts a caller-owned command. Wait for a complete frame before sending input, then project the named intermediate state. For example, against a fixture whose view title is `Studio`:

```ts
import {
  captureTerminalFrame,
  runPtyProcess,
} from "@discern-sh/design-system/cli/interactive/testing";

const size = { columns: 80, rows: 24 };
const ready = {
  description: "complete Studio frame",
  test: (output: { phaseStdout: string }) => {
    try {
      return captureTerminalFrame(output.phaseStdout, size).frame.includes(
        "Studio",
      );
    } catch {
      return false;
    }
  },
};
const result = await runPtyProcess({
  command: Deno.execPath(),
  args: ["run", "--allow-env", "fixture.ts"],
  cwd: Deno.cwd(),
  geometry: size,
  input: [{
    waitFor: ready,
    capture: { name: "overview", when: ready },
    steps: [{ bytes: "q" }],
  }],
});
const captured = captureTerminalFrame(result.keyframes.overview!, size);
await Deno.writeTextFile("overview.html", captured.html);
```

The caller grants command/file permissions and selects environment facts. `readinessTimeoutMs` bounds the complete input plan (readiness, captures, and scripted steps); `timeoutMs` starts after that plan completes. Each defaults independently to 15 seconds, and timeout diagnostics name the expired phase and its budget. Consumers with a shared infrastructure allowance pass it explicitly rather than inheriting the package default. `ptyOutputContains` is useful for positive child markers; complete-frame readiness also verifies geometry. Empty `steps` permits observation-only phases. Extraction recognizes the complete painter's clear-and-home protocol, padded settled rows, SGR and OSC-8 styles through the package parser, and terminal restoration boundaries. It rejects arbitrary cursor moves, erase-line reconstruction and partial writes. macOS/BSD and Linux/util-linux use their respective `script` invocation; only macOS was exercised in this effort. Windows is unsupported. The example capture script additionally produces PNGs through the repository's managed browser launcher.

## Consumer migration

- Replace repeated request recreation with one `runTerminalApplication` call. Publish immutable view replacements through `context.update`; return subscription cleanup from `start`, and reserve `context.fail` for fatal provider errors; recoverable failures may publish a stale view. Do not perform filesystem/process discovery in `onKey` or `onAction`.
- Keep facts, availability, routing, consent and execution in the consumer. `onAction` receives the chosen region, stable item ID, and caller value. Return `{ kind: "foreground", run: operation }` to release ownership and resume afterwards. Return `{ kind: "exit" }` for normal exit.
- Replace padded labels and injected ANSI with `indicator` and `status`. Use semantic text that remains understandable with color off. `SelectCliProps.chrome: "none"` lets another bounded parent own its frame and footer. Existing one-shot requests retain their defaults and bytes when new fields are omitted; no public names are removed.
- Custom `TerminalIO` adapters with native pending reads implement `cancelRead`, and forwarding wrappers preserve it. The default Deno adapter pauses the lazy `node:process` stdin stream without closing stdin; its callers need no adjustment. Hosts without native pending reads, including `FakeTerminalIO`, may omit the hook.
- Correct discern's `SelectionRequestOptions.presentation` wrapper from `InteractionChoicePresentation` to `InteractionSelectionPresentation` to admit `menu`. Its product adapter and ID policy remain consumer-owned; this repository does not edit them.
- Adopt `runPtyProcess`, `ptyOutputContains`, and `captureTerminalFrame` from `./cli/interactive/testing`. Production tracing imports `observeTerminalIO` and `TerminalIOObservation` from `./cli/interactive`; testing retains their re-exports, and the ordinary runtime graph contains neither capture nor PTY instruments. The driver borrows the generic script transport, readiness phases, input validation and descendant cleanup from discern. The package extractor replaces complete-frame capture only; it rejects unsupported cursor operations rather than emulating them. Caller commands, environment facts, compilation, product fixtures, filesystem storage and gate accounting remain in discern.
- Retire the corresponding generic `pty_process` transport, complete-frame branch of `terminal_command_capture`, and I/O tracing wrapper after consumer adoption. `measureText`, `padText`, `wrapStyledText` and `wrapStyledTextPreservingIndent` already cover the primitives needed here. Discern's arbitrary hanging-prefix/long-token overflow adapter, content-shaped aligned rows, and numeric mini-charts are not needed by these foundations and remain migration follow-ups; no duplicate wrapping engine was copied.
