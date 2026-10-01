# Terminal applications

Start with `runTerminalApplication` from `@discern-sh/design-system/cli/interactive` when a screen stays open while data changes. Use `requestSelection({ presentation: "menu" })` for a single action choice. See [the public consumer guide](../../README.md#terminal-applications), [the demonstration](../../scripts/playground/application.ts), and [ADR 0050](../_adr/0050-applications-compose-a-grouped-list-a-following-detail-and-modal-layers.md) for the ownership decision, which supersedes [ADR 0046](../_adr/0046-own-terminal-applications-through-bounded-regions.md).

The caller supplies an immutable `TerminalApplicationView` and replaces it to update the screen. The package owns everything that moves: selection by item identity, filtering, folds, zoom, scroll, column dropping, list width, density, the settle window, message timing, painting, the window title, terminal modes, and cleanup. The caller never computes selection, focus, or scroll; it reads the read-only `context.state` when building a view or saving preferences. The view vocabulary lives in [`view.ts`](../../src/cli/interactive/application/view.ts); the pure model in [`model.ts`](../../src/cli/interactive/application/model.ts); the frame in [`frame.ts`](../../src/cli/interactive/application/frame.ts); the effects in [`runtime.ts`](../../src/cli/interactive/application/runtime.ts).

## The view

A view has a header bar, one body, an optional message line, key hints, an optional plain-text `windowTitle`, and an `input` preference whose `mouse` field is reserved for mouse input.

- **Header bar.** `leading` runs sit at the left gutter; `chips`, `trailing` runs, and the liveness word sit on the right. Liveness names four states — idle, busy, retrying, stale — with caller words; busy shows a moving spinner only once it has lasted `busyAfterMs`, and stale shows an attention mark. When space runs out, gaps tighten, then chips drop from the end, then liveness, then the trailing runs, and finally the leading runs truncate. While a list filter applies, the left side becomes the filter field: the placeholder, the query with a cursor while it is being edited, and `N of M`.
- **Body.** `master-detail` is a grouped list with a `FollowingDetail`; `list` is a grouped list alone; `reading` is one scrolling `CliBlock` remembered by id; `empty` is a title, a short explanation, a selected primary hint whose action Enter runs, secondary hints, and an optional list below — Down moves from the primary into that list and Up returns.
- **Message line.** One row above the footer, only while a message is present; below 14 rows it replaces the footer. A message dismisses after `afterMs`, at the next key when `onKey` is set, or with Escape. Each dismissal is reported through `onDismiss`, the package hides the message at once, and a view that still declares a dismissed message is refused.
- **Key hints.** `footer` is a `KeyHints` value laid out by [`layoutKeyHintsCli`](../../src/cli/key-hints.ts) inside two-cell gutters. While the filter field owns input the package shows its own editing hints and keeps only non-printing right-cluster hints; while the detail is zoomed it adds Up/Down after the primary and Back on the right, unless the body supplies `zoomFooter`.

`validateTerminalApplicationView` returns every broken rule as data — duplicate ids, a detail that follows another list, cells for undeclared columns, glyphs wider than one cell, a dismissed message still declared — and the runtime refuses a view with any issue.

## Grouped lists

A `GroupedList` has a stable id, groups in display order, trailing `columns`, a `minTitle`, roomy and tight `spacing`, an optional `filter`, optional `density`, and a `settleMs`. Empty groups are hidden.

**Rows.** An item row is a selection bar, its one-cell marker glyph, its title with any faint `titleSuffix` kept through truncation, and its cells in declared columns. The selected row carries the accent bar, a bold title, and the selection fill across the list's width; on a selection, faint text rises to muted so it stays legible. At 16 colours or without colour no fill paints, and the bar (or `>` in ASCII) with the bold title carries selection. A receded selection uses the muted selection fill and a faint bar. A cell fits its column by dropping whole trailing runs, then truncating the first. Columns drop lowest `priority` first while the title would be narrower than `minTitle`; a column without a priority never drops. A list is roomy beside a wide detail or when it fills a terminal at least `spacing.tightBelowColumns` (56) wide, and tight otherwise.

**Groups.** A fixed group's header shows its bold title, its count, and its `aside`, and navigation skips it. A foldable group's header is selectable; folded, it becomes a fold row (`▸ Paused 3`). Enter folds or unfolds either. `initiallyFolded` applies the first time a group appears.

**Navigation.** Up and Down move between selectable rows without wrapping; Home and End reach the ends; Tab and Shift+Tab reach the first row of the next and previous group. With `viKeys`, j and k move too. The list scrolls only when the selection comes within one row of an edge, never centring it. A group whose header has scrolled away keeps it as a sticky first line, and `↑ N more` and `↓ N more` count hidden items. Unfolding a group scrolls its rows into view as far as the selection allows.

**Filter.** `/` turns the header into the filter field. Typing narrows the list by title and keywords (substring by default, in-order fuzzy when asked), while Up and Down keep moving through matches. Enter keeps the filter and returns keys to the list; Escape clears it. Groups never fold while a filter applies.

**Density.** When the list does not fit, blank separators go first; then, if `density` is declared, quiet groups fold into one summary row (`▸ Scheduled 1 · Idle 1 · Paused 3`) in `foldOrder`, by default bottom-up. `neverFold` groups and the group holding the selection never fold. Density is decided only on a resize or a membership change, and as if no message were shown, so neither a key nor a passing message refolds the list. Enter on a summary row unfolds every group in it; a caller selection with `reveal` unfolds only its own.

**Settle window.** Membership and order changes wait until no key has been pressed for `settleMs` (1500 ms); content updates at once. A caller selection of an item that is still settling applies the pending membership.

**Identity.** Selection is anchored to item id. When the selected item moves to another group, the selection follows it and keeps its screen line where possible. When it disappears, or joins a folded group, the selection moves to the next item that stays in its group, otherwise the first row of the next group, otherwise the previous row. `onSelectionMoved` reports either move as `regrouped` or `removed`. Group-level rows have selection identity too, so a fold row stays selected as it opens.

## Following detail

`FollowingDetail` names the list it follows and holds detail blocks by item id; an item without content shows the `pending` label. One block builder renders `heading` (the aside beside the title on wide screens and in zoom), `state` (glyph, bold toned label, muted qualifier), `text` (muted sentences), `facts` (a label column that grows to the longest label), `meter`, `marks`, `hints` (wide screens and zoom only), `block` (any Component `CliBlock`), `pending`, and `section`. Blocks are one blank line apart, except that text or a meter directly after a state belongs to it. Lines that fit keep their spacing; longer ones wrap with hanging indents.

The detail never takes focus. Page Up and Page Down scroll it a page and Shift+Up and Shift+Down a line; the package remembers scroll per item id. `↑ N more · PgUp` and `↓ N more · PgDn` name hidden non-blank lines, the upper one on the top padding row when there is one. Space zooms the detail to the whole body with a breadcrumb (`Group  ›  Item` and `i of n`, or the caller's `breadcrumb` runs); Up and Down then walk items only, and Space, Escape, or Left return.

Below `collapseBelowColumns` the detail becomes a strip above the footer: the item's `strip.title` runs with the Space key at the end, then whole `strip.facts` joined by a separator. Below `strip.shortBelowRows` it is one line of facts (or the title when no fact fits). Without surface fills a rule introduces it.

## Geometry

`SplitRules` (default `DEFAULT_SPLIT_RULES`) govern a master-detail body:

| Columns                              | Layout | List                                  | Detail                                               |
| ------------------------------------ | ------ | ------------------------------------- | ---------------------------------------------------- |
| at least `wideAtColumns` (100)       | split  | `clamp(needed, 36, cols − 48)`, roomy | the rest, padding 3 and 2                            |
| at least `collapseBelowColumns` (80) | split  | `clamp(needed, 36, cols − 39)`, tight | the rest, padding 2 and 1                            |
| below                                | strip  | full width                            | a strip of two lines, one below 14 rows; Space zooms |

`needed` is the width at which no column drops and the longest title, capped at `maxTitle` (32), fits whole; `share` sizing instead takes a fraction of the width. The width is decided with density, on resize and membership change only. From 20 rows a blank row separates the header and the body; below 14 rows the detail loses its top padding and a message replaces the footer.

The minimum is 32 × 10 (`TERMINAL_APPLICATION_MINIMUM`). Below it the screen shows "Too small" and the size it needs; navigation waits while bindings still run, and growing restores the screen with its state. The [geometry tests](../../tests/cli/application_geometry_test.ts) pin 120 × 30, 80 × 24, 60 × 20, 40 × 20, 80 × 13, and 32 × 10 in five colour postures: every frame fills its viewport exactly, the layout, flag, and age columns match the tier, and every visible row's label and age end on one column.

## Input and callbacks

The runtime decodes one input event at a time. For each it applies the package's transition, then calls `onSelectionMoved`, `onSelectionChange`, `onDismiss`, and `onAction` in that order. `context.update(view)` and `context.select(listId, itemId, { reveal })` inside a callback apply at once, so the next key already sees them; from elsewhere they wait in a coalescing mailbox and apply only between inputs. Callbacks that keep changing the selection fail instead of spinning. `start(context)` runs once after the first frame and returns subscription cleanup; the package delivers the initial selection change after it.

Reserved keys (`TERMINAL_APPLICATION_RESERVED_KEYS`) are Up, Down, Home, End, Page Up, Page Down, Shift+Up, Shift+Down, Tab, Shift+Tab, Enter, Space, Left, and `/`, plus j and k with `viKeys`. A `KeymapEntry` binds any other key to an action; bindings that collide with a reserved key or with each other, or name no decodable key, throw before the terminal changes. An `inFields` binding also fires while the filter field owns input; it must be a non-printing chord outside `EDITOR_RESERVED_CHORDS` and the editing keys. The package handles Escape first — clear the filter, leave zoom, dismiss the message — and an Escape binding receives it only when nothing is left to close. Escape never exits. Ctrl+C throws `InteractionCancelled` after restoration unless a binding claims it. Enter runs an item's `primary` action with source `enter`; bindings run with source `key`.

`onAction` returns nothing, `{ kind: "foreground", handoff?, run }`, or `{ kind: "exit", epilogue? }`. A foreground command releases the terminal, prints its handoff line on the normal screen, runs, and resumes the same state; keys read before the handoff wait for the return. An exit prints its epilogue after restoration. Any other return throws. Ctrl+C, EOF, and abort throw `InteractionCancelled`; rendering, callback, provider, and foreground failures reject after cleanup. Missing TTY or ANSI cursor control refuses before changing modes. The raw-terminal lifecycle cancels outstanding native input before relinquishing ownership; Deno restores canonical input flags, cursor, and alternate-screen state, not every host-specific `stty` bit.

## Painting and liveness

[ADR 0053](../_adr/0053-applications-paint-incrementally-and-animate.md) records the decision. [`TerminalScreenPainter`](../../src/cli/interactive/painter.ts) writes each paint as one write: DECSET 2026 begin (`CSI ? 2026 h`), an optional window title, an optional state report, the body, and the matching end. Terminals without synchronized output ignore the brackets. A keyframe body erases the display, homes the cursor, and writes every row joined by CR LF. A row body moves to each changed row (`CSI <row> ; 1 H`), erases it (`CSI 2 K`), and writes it. A keyframe follows the first paint in each raw-terminal bracket, a new geometry, a new composition, and the first changed paint at least `keyframeEveryMs` (30 s) after the previous keyframe. The application's composition is its layout: split, strip, zoom, list, reading, empty, or too small. A frame with unchanged rows, report, and title writes nothing, so an idle screen never repaints. Every row the painter writes first passes the complete-frame checks: one row per viewport row, closed styling and hyperlinks, no control character that would move the cursor, and no cell beyond the width. A failed write forces the next paint to be a keyframe. `runtime.paint` accepts partial `TerminalPaintOptions` to turn off synchronization or row diffs. The Markdown browser uses the same painter without synchronization or diffs until it moves onto this runtime.

The painter saves the window title on the terminal's title stack (`CSI 22 ; 0 t`) before setting the first one (`OSC 2`), restates it with every keyframe and whenever it changes, and restores it (`CSI 23 ; 0 t`) when a view drops it, before foreground work, on exit, and on signal restoration. Mouse reports follow the same rule: a paint whose `mouse` changes turns SGR button and wheel reports on (`CSI ? 1000 h`, `CSI ? 1006 h`) or off (`CSI ? 1006 l`, `CSI ? 1000 l`), every keyframe restates them while they are on, and `release` turns them off before the screen is handed back.

A marker or detail glyph with `animation: "spinner"` moves through the bound motif's spinner while it is visible, and so does the busy liveness glyph. `terminalGlyphFrame` in [`glyph-motion.ts`](../../src/cli/glyph-motion.ts) resolves the cell for a phase. ASCII keeps the static fallback, and reduced motion keeps the resting form. The frame reports `animated` when a visible glyph moves. [`TerminalAnimationTicker`](../../src/cli/interactive/clock.ts) then schedules one repaint 250 ms (`TERMINAL_ANIMATION_INTERVAL_MS`) after that paint and advances one shared phase. The tick stops when no visible glyph moves, below the minimum size, during foreground work, and on exit. `runtime.reducedMotion` never starts it. The caller freezes a glyph by omitting `animation`. `runtime.clock` (`TerminalClock`) supplies time for the tick, keyframe intervals, settle windows, message timeouts, and liveness delays; `terminalApplicationDeadline` names the next timed transition and the runtime keeps exactly one timer for it. Tests pass `ManualTerminalClock` and advance it without real delays.

When `TerminalCapabilities.applicationStateReports` is true, each paint opens with a private OSC 7719 sequence carrying flat JSON (`TerminalApplicationStateReport`): `focusedControlId` (the list id, `<list>:filter` while the filter field owns input, `primary` on an empty body's primary hint, or a reading id), `listId`, `selectedItemId`, and `zoomed`; layers add `topLayerId`. Readers ignore fields they do not know. Detection enables reports only for `TERMINAL_APPLICATION_STATE_REPORTS=1`.

## Work and evidence

The model rebuilds a list's display rows only when its membership, folds, density, or filter change, and caches them per list value; rendering touches only the visible slice, and the package caches Component blocks by block identity, width, capabilities, and presentation. [The model tests](../../tests/cli/application_model_test.ts) cover identity, regrouping and removal, the settle window, filtering while typing, folds and summary rows, zoom, detail and reading scroll, edge scrolling, timed messages, liveness, the empty body, and the view rules. [The runtime tests](../../tests/cli/application_test.ts) cover callback order, updates inside callbacks, keymap collisions, field bindings, Escape, Ctrl+C, foreground handoff and type-ahead, epilogues, faults, signals, transport failures, coalescing, the minimum size, and a 10,000-item list. [The painter tests](../../tests/cli/screen_painter_test.ts), [the replay tests](../../tests/cli/screen_replay_test.ts), [the painting tests](../../tests/cli/application_painting_test.ts), and [the liveness tests](../../tests/cli/application_liveness_test.ts) pin the paint grammar, keyframe triggers, the window title, the tick lifecycle, and state reports; [the POSIX canary](../../tests/cli/application_pty_test.ts) checks actual transport, kernel resize, canonical input, foreground return, and restoration.

Run `deno task playground:application` for the sample, or `deno run --config deno.json -A scripts/application-capture.ts` to capture the geometry and appearance matrix under `.scratch/application/`. Each capture also writes its state report beside the PNG. These paths are review artifacts, not published data; inspect the PNGs, not only the HTML. [The benchmark](../../scripts/benchmark-application.ts) measures navigation, resize, update bursts, bytes per paint and per spinner frame, and painter cost; [responsiveness evidence](responsiveness.md) states the measured environment and targets.

## Capture a fixture

The optional testing entrypoint replays the package's paints through its screen model, [`replay-testing.ts`](../../src/cli/interactive/replay-testing.ts). Replay starts at the transcript's last keyframe, together with the synchronized-update, title, and report prefix of its paint. It applies keyframes, row writes, titles, mouse modes, and reports, and stops at the first restoration boundary (`CSI ? 25 h` or `CSI ? 1049 l`); a title restoration, mouse reports turning off, and the cursor-position query (`CSI 6 n`) that fences their late input may precede it. Earlier output, earlier sessions, and foreground children never reach the frame. A synchronized update is a transaction, so one still in flight at the end leaves the previous settled frame. A keyframe accepts CR CR LF because a PTY may expand LF. Any other control, a row outside the viewport, an open style, or a settled frame that does not fill the viewport exactly throws. The replay is not a terminal emulator.

`captureTerminalFrame` returns the styled `frame`, plain `text`, `html`, `geometry`, the `state` report when one was emitted, the window `title` in force, and `mouse: true` while mouse reports were on. `paintedAfter` requires the settling paint to end after a transcript offset. A phase's own output usually holds only row writes, so a readiness condition replays the whole standard output: `ptySettledFrame(size, description, test)` does that and requires a paint after the phase began. For example, against a fixture whose header leads with `Studio`:

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

With state reports enabled, a condition can key on `capture.state` identities instead of prose. The caller grants command/file permissions and selects environment facts. `readinessTimeoutMs` bounds the complete input plan (readiness, captures, and scripted steps); `timeoutMs` starts after that plan completes. Each defaults independently to 15 seconds, and timeout diagnostics name the expired phase and its budget. `ptyOutputContains` is useful for positive child markers. macOS/BSD and Linux/util-linux use their respective `script` invocation; only macOS was exercised. Windows is unsupported.

## Consumer migration

- Replace `TerminalApplicationView`'s `title`, `regions`, `tip`, `help`, and `focusedRegionId` with `header`, one `body`, `message`, `footer`, and `windowTitle`. A `choices` region becomes a `GroupedList`: group headings become `ListGroup`s, `indicator` becomes the item `marker`, `status` becomes a cell in a declared column, and an unavailable choice keeps its row while its action explains itself. A reading region becomes a `ReadingBody`, or detail `block`s that follow a list.
- Replace `onKey` with `keymap` entries whose actions reach `onAction(action, context, source)`. `{ kind: "handled" }` no longer exists; return nothing. Escape no longer exits: bind a key that returns `{ kind: "exit" }`, or bind `escape` for back navigation when nothing else closes.
- Read `context.state.lists[listId].selectedId` instead of `positions[regionId].selectedId`; `focusedRegionId` becomes `focusedControlId`. `runTerminalApplication` resolves with that state.
- Use `onSelectionChange` to load detail for the selected item and `onSelectionMoved` to announce moves; never track selection yourself.
- Tests that drove `updateTerminalApplication(view)` and `transitionTerminalApplication(state, key, regionRows)` use `createTerminalApplicationModel(view)`, `updateTerminalApplication(model, view, now)`, and `transitionTerminalApplication(model, { kind: "key", key }, now)`, and render with `renderTerminalApplication(model, …)`, whose frame returns the fitted `model`.
- Custom `TerminalIO` adapters with native pending reads implement `cancelRead`, and forwarding wrappers preserve it. Readiness conditions build on `ptySettledFrame`; transcript assertions find paints by the synchronized-update begin, not a leading `CSI 2 J`.
- The Markdown browser is unchanged until it is rebuilt on this runtime; its allocator and chrome stay separate meanwhile.
