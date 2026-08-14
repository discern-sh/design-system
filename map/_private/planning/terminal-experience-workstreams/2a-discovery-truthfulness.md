# 2A — Make discovery requests truthful under latency

**Goal:** A search or autocomplete backed by a slow provider always shows an honest frame — never a blank region, never a stale result set, never a frozen key loop — and the choice surface gains the two request kinds consumers already hand-roll: query-filtered multi-selection and a simple acknowledgement.

**Wave:** 2 — runs alongside 2B, which owns disjoint files (activity, lifecycle, sensing). Starts only after every wave-1 stream has landed. Lands first in the wave.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/70-cli/README.md`, and ADRs 0004, 0009, and 0011. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-2a` and re-root into the returned worktree before reading code.

**Dependency guard:** verify on trunk that wave 1 landed — the driver carries the validation latch and `transform` exists on the shared request options (1A), and `./cli/interactive/testing` resolves (1D). If either is absent, stop and report the missing landing rather than proceeding.

## Background

Verified on trunk `c3ec5d6` (re-verify; 1A will have moved the driver):

1. **Every keystroke awaits the provider inline.** `src/cli/interactive/discovery-requests.ts:131-133` calls `await this.#refresh()` inside `handle()`, and `#refresh` awaits `this.options.search(...)` directly (`:186`); the driver awaits `machine.handle(key)` before reading the next key. A slow provider freezes input.
2. **A slow first query is a blank screen.** The initial provider call runs inside `machine.start()` (`discovery-requests.ts:88-90`), which the driver awaits _before the first paint_ — nothing at all is on screen while it runs.
3. **No pending truth, no staleness defence.** `SearchFrameState` (`src/cli/interactive-states.ts:92-101`) has no pending member, and there is no debounce, no request ordering guard, and no `AbortSignal` anywhere in `src/cli` (grepped: zero hits). Out-of-order async resolutions can paint stale results as current.
4. **Two request kinds are missing with consumer evidence.** The flagship consumer hand-rolls "press Enter to continue" by reading stdin directly (`/Users/jack/Sites/discern/src/engine/desk/desk.ts:225-230` — read-only evidence), and its large list surfaces offer either static multi-selection or single-value search, never query-filtered multi-selection.

Discern's providers will be real I/O — map searches, fleet queries — not array filters. Latency is the normal case, not the edge.

## Deliverables

Work in atomic commits, one logical step each.

1. **Paint before the first provider call.** The driver paints the initial frame before any provider work; a search request with a slow provider shows its frame (with pending truth, deliverable 2) immediately.
2. **A pending state in discovery frames.** Add pending truth to the search and autocomplete frame states and render it through the real form renderers with a capability-degraded treatment (meaningful under `NO_COLOR` and ASCII; no clock-driven animation in pure renderers — pending is a fact, not a spinner). Frame heights stay stable when pending appears and resolves (the wave-1 reserved-row discipline applies).
3. **Keep the key loop live and the results honest.** Provider calls no longer block key handling: debounce rapid edits, tag each provider call monotonically, and discard any resolution superseded by a newer query. Offer providers an optional cancellation signal. The highlighted stable-ID restoration contract (`initialId`) and grouped-entry semantics are preserved across all of it.
4. **Query-filtered multi-selection.** A new request kind combining the multi-selection contract (stable IDs, group headings, disabled-but-visible entries, toggle-current-matches, validation) with a live query over the same provider vocabulary as search. Already-selected entries remain visible and deselectable when the query empties or excludes them — selection state never silently drops. Name it within the request vocabulary, mirroring the existing `requestSelections`/`requestSearch` naming logic.
5. **An acknowledgement request.** The smallest kind: a message, an Enter/Space acknowledgement, the shared lifecycle frames (active, submitted, cancelled), rendered through a real component renderer per ADR-0004. Cancellation follows the standard contract.
6. **Prove the class.** Using the published fake terminal (1D): slow-provider journeys (first paint precedes provider completion; pending shows and clears; typing during flight never freezes; a stale resolution never paints), out-of-order resolution tests, debounce timing via injectable scheduling (no real sleeps), full journeys for both new kinds including grouped lists, disabled entries, toggle-all, cancellation, and validation. Exact frames for pending and for both new kinds across widths, depths, and repertoires. Enrol every new export in the playground (the coverage test demands it) with journeys demonstrating slow providers.
7. **Document.** `map/70-cli/README.md` in present tense; CHANGELOG under **Unreleased**; no version bumps.

## Constraints

- Request/interaction vocabulary only (ADR-0011); frames render through real component renderers (ADR-0004); fitting and painting contracts untouched (ADR-0009, ADR-0007).
- Time-advancing behaviour needs injectable scheduling for determinism — mirror how `withSpinner` takes a scheduler; pure renderers still never read a clock.
- Exact-frame updates are correct; substring loosening is not. Never hand-edit generated files. Iterate with `discern_prepare`; commit each logical step.
- `CHANGELOG.md` and the interactive barrel are shared seams with 2B: edit them in your final commits, immediately after `discern_update`.

## Out of scope

- Activity, signals, background sensing (2B); the live activity log (3A).
- Numeric requests and sequential-form step constructors (recorded in `discern/TODO.md`; not this wave).
- Any edit to the Discern consumer repository.

## Definition of done

- Measurable: paint-first, pending truth, debounce-and-discard, query-filtered multi-selection, and acknowledgement all hold under fake-terminal journeys and exact frames; every new export is playground-enrolled; `discern_done` passes on the clean committed HEAD.
- Semantic: a person typing into a search backed by a two-second provider sees an immediate frame, an honest "searching" state, responsive keys, and only current results — and the two flows consumers previously hand-rolled are now one package call each.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/2a-discovery-truthfulness.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop. 2B is in flight — you own 2A only; do not launch, dispatch, or supervise it.
