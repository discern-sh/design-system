# 1A — Make validation truthful and frames stable

**Goal:** A request whose value fails validation keeps saying so until the value actually passes, its frame never changes height when the message appears, requests accept a `transform` hook, and Escape/PageUp/PageDown do what a terminal user expects.

**Wave:** 1 — runs alongside 1B, 1C, and 1D, which own disjoint files. Lands first in the wave.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/70-cli/README.md`, and ADRs 0004, 0009, and 0011. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-1a` and re-root into the returned worktree before reading code.

Verify the anchors below against the live tree before editing; they were checked on trunk `c3ec5d6` and may have drifted.

## Background

Four verified facts motivate this brief:

1. **Validation clears while the value is still invalid.** `src/cli/interactive/driver.ts:123-125` resets `validation-error` → `active` unconditionally on any key — even a no-op arrow key — and the validator only runs again at the next submission attempt (`driver.ts:126-136`). After one failure, the error message vanishes on the next keypress and silence implies validity. The truthful behaviour: once a submission has failed, re-validate on every subsequent edit and keep the error lifecycle until the value passes, so the message tracks reality and clears the moment the problem is fixed.
2. **The frame grows a row on first failure.** `joinVertical` drops empty blocks (`src/cli/layout.ts:25`), and the form footer returns `""` for an active frame with no hint (`src/components/forms/form-frame.ts:64-79`). Measured through `renderInputCli`: active-no-hint is 4 rows, validation-error is 5. With a hint the height is already stable — the fix is to make the footer row unconditional (blank when there is nothing to say), so nothing below the frame ever shifts when a message appears.
3. **No canonicalisation hook.** No request option transforms a submitted value before validation (grep `transform` over `src/cli/interactive`: zero hits), so consumers trim and normalise by hand after the fact and validators see a different value than the caller receives.
4. **Escape and paging keys are decoded but dead.** `src/cli/interactive/keys.ts` decodes `escape`, `page-up`, and `page-down`, yet no machine binds them (grep `"escape"` over the machines: zero uses). Only Ctrl+C and EOF cancel. Users press Escape to back out of a menu; nothing happens.

## Deliverables

Work in atomic commits, one logical step each.

1. **Validation latch in the driver.** After the first failed submission of a request, run the validator on every subsequent value-changing key and keep `lifecycle: validation-error` (with the current message) until the validator passes; clear it the moment it does. Async validators must not race: discard a stale verdict when a newer edit has superseded it, and never let an in-flight validation block key handling. Submission while invalid re-presents the current message rather than silently ignoring Enter. Ctrl+U's "There is no previous form step." notice keeps its existing behaviour.
2. **Unconditional message row in form frames.** Every active form frame reserves the footer row: hint text when provided, the validation message when failing, a blank row otherwise. Active, validation-error, and hint variants of the same request render at identical heights. Update the exact-frame expectations to express the new geometry across widths, colour depths, and Unicode/ASCII.
3. **A `transform` option on request options.** An optional synchronous `transform` runs on the submitted value before validation; the transformed value is what the validator sees and what the request returns. Document the ordering. Add it to the shared option vocabulary so every current and future request kind enrols consistently; masked input applies it to the real value without ever exposing that value in a frame.
4. **Bind Escape and the paging keys.** Escape cancels a request exactly like Ctrl+C: cancelled frame, then `InteractionCancelled` with a distinct reason. Lone-Escape must be disambiguated from an escape sequence prefix in the key decoder — implement the conventional short-timeout (or equivalently robust) mechanism without breaking the decoder's incremental split-sequence guarantees, and record the trade-off in `map/70-cli/README.md`; write an ADR if the chosen mechanism constrains future key handling. PageUp/PageDown jump the visible window in choice machines; Home/End semantics are unchanged.
5. **Prove the class.** Fake-terminal journeys for: fail → arrow key → error persists → fix → error clears live; fail → Enter → message re-presented; async validator racing a fast typist; transform + validate ordering; Escape cancelling each request kind; Escape immediately followed by a CSI sequence split across reads; PageUp/PageDown across grouped, scrolled lists. Exact frames for the reserved footer row. Enrol new behaviour in the playground journeys (the coverage test in `tests/cli/playground_test.ts` will demand it).
6. **Document and record.** Update `map/70-cli/README.md` in present tense, and add CHANGELOG entries under an **Unreleased** heading. Do not bump package versions — the owner's release checkpoint assigns them.

## Constraints

- Request/interaction vocabulary only; the gate rejects the banned dialect (ADR-0011).
- Interactive frames keep rendering through the real Component renderers; renderer-measured fitting and painter refusal semantics (ADR-0009, ADR-0007) are untouched.
- Exact-frame expectation changes that express the new geometry are correct; substring-only assertions are not.
- Never hand-edit generated files; run Codegen via the gate's fix stage. Iterate with `discern_prepare`; commit each logical step.
- `CHANGELOG.md` is a shared seam with the sibling wave-1 streams: write your entries in your final commits, immediately after `discern_update`.

## Out of scope

- Discovery machines, debounce, pending states, or new request kinds (wave 2A).
- Activity, signals, or background sensing (wave 2B).
- Presenter, narration, styled wrapping, or the new published entrypoints (1B, 1C, 1D).
- Any edit to the Discern consumer repository.

## Definition of done

- Measurable: the latch, reserved footer row, `transform`, Escape-cancel, and paging bindings all hold under the new fake-terminal journeys and exact-frame tests; every `./cli/interactive` runtime export still maps to a playground journey or recorded exclusion; `discern_done` passes on the clean committed HEAD.
- Semantic: a person mistyping a value watches one honest message persist until their input is actually acceptable, nothing on screen jumps while they fix it, and backing out with Escape simply works.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/1a-request-correctness.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop. Other wave-1 streams are in flight — you own 1A only; do not launch, dispatch, or supervise the sibling briefs.
