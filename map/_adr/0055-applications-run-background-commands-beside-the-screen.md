# ADR 0055: Applications run background commands beside the screen

**Status**: accepted; amends [ADR-0050](0050-applications-compose-a-grouped-list-a-following-detail-and-modal-layers.md), whose closed command set this extends, and [ADR-0051](0051-layers-own-focus-and-make-the-safe-choice-one-key-away.md), whose progress sheet now has commands to show

## Context

[ADR-0050](0050-applications-compose-a-grouped-list-a-following-detail-and-modal-layers.md) left applications two commands: `foreground`, which hands the terminal to an operation and resumes afterwards, and `exit`. An operation that should run while the screen stays live — a long check whose steps a progress sheet shows, or several of them at once — had no package route. A caller could start a promise from `onAction` and feed `context.update` from it, but then nothing defined when its progress reached the screen, what happened to it during a foreground handoff, whether a terminal signal stopped it, or whether the session could end with it still running and still calling back. Each of those, left to callers, is a way to corrupt a screen or lose work.

Signals are the sharpest part. Inside the screen, raw mode turns Ctrl+C into a key, but a foreground child — an editor, a shell, an agent — owns the terminal while it runs, and a Ctrl+C there is a real SIGINT to the terminal's foreground process group. Whether that reaches work running beside the screen depends on process groups that only the caller, who spawns the processes, controls.

## Decision

**A background command runs beside the screen.** `onAction` may return `{ kind: "background", id, run(report, signal) }`. The command starts at once and never reads input. Several may run together; starting one whose id is still running fails the session, so an id names exactly one live operation. The command kinds are one set checked against the command union, so a new kind cannot be half-added.

**Progress arrives between inputs.** `report(steps)` sends an `ApplicationActivity` to `onReport`, delivered between inputs and coalesced to the newest report per command, so a chatty operation cannot flood the input loop. While a foreground operation owns the terminal — or another application nested in front of this one — reports wait, and the first frame afterwards already shows the newest. `onCommandSettled` reports `completed`, `aborted`, or `failed` with the error.

**Abort has three causes and no others.** A command's `signal` aborts through `context.abort(id)`; through an `exit`; or through the session ending for any reason — cancellation, failure, or a signal that ends it. Keys and terminal signals never abort a command on their own account: an unbound Ctrl+C in raw mode cancels the session, and it is the session's end that aborts the work; a bound Ctrl+C is the caller's, who may ask first, as a quit sheet does. A nested application's commands abort when it closes.

**The session settles with its work.** `runTerminalApplication` resolves or rejects only after every background command has settled, and nothing reaches the caller after the session ends: late reports and settlements are dropped.

**Signals stay with their owners.** While the screen is owned, SIGINT follows the lifecycle bracket's posture: by default it restores the terminal and re-raises, ending the process and its work with it; with `onInterrupt` the caller receives it and ends the session when it chooses. During a foreground operation the package installs no SIGINT handler at all — the terminal is already restored — so what the foreground child and the process do with a SIGINT is the caller's. The package spawns no processes and installs no SIGTERM or SIGHUP handler, so isolating a background command's child processes from the terminal's process group, and deciding what termination does to them, are the caller's.

## Consequences

Progress sheets can show real operations, several operations can run at once, and a foreground child can run while they do. A caller gets one place each for starting work, hearing its progress, hearing its end, and stopping it, and the package guarantees that none of them reaches the caller after the session has ended.

Coalescing means a caller never sees every report, only the newest per command between inputs; an operation that needs a log keeps it itself. The settle-before-resolve rule means a command that ignores its abort signal delays the session's end. And because the package owns no processes, a caller that runs child processes in the background must put them in their own process group, or a Ctrl+C typed into a foreground child also reaches them; the package cannot enforce that boundary for it.

## Alternatives considered

Letting callers start promises from `onAction` and update the view themselves needs no package change, but leaves report timing, handoff buffering, abort, and post-session callbacks undefined. Aborting background work on any SIGINT would make a Ctrl+C typed into an editor stop a long-running operation the person never meant to touch. Installing a SIGINT handler during foreground work would fight the foreground child for the terminal's signals. Delivering every report rather than the newest would let a fast operation starve input.
