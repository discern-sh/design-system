# 3A — Compose a live activity log frame

**Goal:** The package offers one truthful frame for "long-running work with streaming detail": pinned stable lines above a bounded, scrolling tail of streamed output, in-place partial-line updates, fixed height, and honest degradation — the shape the flagship consumer's gate has needed in writing since its ledger recorded it.

**Wave:** 3 — solo. Starts only after both wave-2 streams have landed.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/70-cli/README.md`, and ADRs 0004, 0007, 0009, 0011, plus the two ADRs wave 2B added (signal bracket; background sensing). If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-3a` and re-root into the returned worktree before reading code.

**Dependency guard:** verify on trunk that wave 2 landed — the signal-safe activity bracket and injectable signal source exist (2B), and the published testing entrypoint resolves (1D). If absent, stop and report the missing landing.

## Background

The flagship consumer's ledger records the need verbatim (read-only evidence, `/Users/jack/Sites/discern/project/TODO.md`): keep the live `done` progress table visible while `[gate].stream = true` emits each complete subprocess output line — accounting for partial lines, subprocess ANSI, resizing, and interrupts — without changing non-TTY/CI/`--plain`/JSON contracts. No compositor for "live frame plus streaming lines" exists in either repository today; the consumer's gate currently chooses between a live table *or* streamed lines.

The package already owns every ingredient: the refusal-typed painter, renderer-measured viewport fitting, the activity scheduler as the only time-advancing layer, and (after 2B) interrupt safety. What is missing is the frame itself and its producer API:

- a **stable region**: pinned lines (job results, warnings) that persist and grow bounded by the viewport;
- a **streaming tail**: the last N streamed lines, ANSI-aware and width-wrapped, scrolling within a fixed window;
- **partial-line truth**: an in-progress line (a compiler's progress, a token stream) replaces in place each tick until committed, then scrolls as a whole line;
- **fixed geometry**: the frame never jumps as lines arrive; height responds only to viewport changes through the established fitting contract;
- **honest completion**: on finish, either keep the stable summary or collapse to a single result line — the producer's declared choice;
- **truthful degradation**: on painter refusal or non-TTY, the same producer feed renders as append-only static output with nothing lost.

## Deliverables

Work in atomic commits, one logical step each.

1. **Design the shape, then record it.** Decide how the frame enters the system: a component-backed frame per ADR-0004 (full component anatomy, metadata stance, codegen enrolment — the path Receipt or Raw output took) composed by a new activity driver, or an extension of the activity layer rendering through an existing component. Justify against the single-presentation-authority rule and record the decision as an ADR before implementing. The temporary-dispatcher history in ADR-0004 is the cautionary tale: whatever you build must render through a real component renderer, not beside one.
2. **The producer API.** A typed handle the caller's work drives: append a committed line, update the in-progress partial line, pin a stable line (with tone), update the headline label, finish with the declared completion mode. The package renders; the caller owns its subprocesses and never hands the package a process. Streamed input is untrusted display text: apply the package's existing control-character policy, preserving meaning after ANSI stripping (use the wave-1B styled-text authorities for wrapping).
3. **Live behaviour.** Tick-driven repaints through the activity scheduler (injectable for tests); geometry through renderer-measured fitting against the live viewport; resize handling per the established stranded-frame contract; interrupt safety through the 2B signal bracket — a SIGINT mid-stream restores the cursor and leaves coherent scrollback plus the stable summary.
4. **Degraded behaviour.** Non-TTY or refused painting renders the same feed as truthful append-only output: committed lines once each, stable lines when pinned, no partial-line churn, identical facts. This mode is a contract, not a fallback afterthought — the consumer's CI and agent readers will live in it.
5. **Prove the class.** Fake-terminal journeys: streaming under slow and fast producers; partial-update-then-commit; stable-line pinning while the tail scrolls; viewport shrink and regrow mid-stream; SIGINT mid-stream; both completion modes; the full degradation matrix (non-TTY, `NO_COLOR`, ASCII, refused painter). Exact frames at every capability level. Playground journeys demonstrating a simulated multi-step run, live and degraded.
6. **Document.** `map/70-cli/README.md`; catalogue enrolment per the chosen shape; CHANGELOG under **Unreleased**; no version bumps.

## Constraints

- The activity layer remains the only time-advancing code; renderers stay pure and clock-free.
- One presentation authority: no second live-frame system, no bypass of the painter's refusal semantics, no cropping.
- Vocabulary per ADR-0011 — name the API in activity/interaction terms.
- Exact-frame updates are correct; substring loosening is not. Never hand-edit generated files. Iterate with `discern_prepare`; commit each logical step.

## Out of scope

- Gate adoption, subprocess management, or any Discern edit (the consumer programme's 3A adopts this).
- Alternate screen, mouse, or scrollback-erasing modes — scrollback preservation is package posture.
- Multiplexing several concurrent frames (one live frame per terminal at a time; document the boundary).

## Definition of done

- Measurable: the frame, producer API, live/degraded behaviours, interrupt safety, and completion modes all hold under the journeys and exact frames above; the shape ADR is recorded; catalogue and playground enrolment complete; `discern_done` passes on the clean committed HEAD.
- Semantic: a consumer running minutes-long work can show a person a calm, fixed frame where results accumulate and detail streams legibly — and the same producer code gives a piped or CI reader every fact in plain append-only lines.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/3a-live-activity-log.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop.
