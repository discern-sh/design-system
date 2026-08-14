# ADR 0014: Bracket SIGINT through an injectable source

**Status**: accepted

## Context

The interactive Adapter's lifecycle helpers restored raw mode and the cursor on every exception path, but the package used no signals at all. During a spinner or determinate progress run the terminal is not in raw mode, so Ctrl+C delivered SIGINT with default disposition: the process died before any `finally` ran, the painted frame was stranded, and the `\x1b[?25l` hide-cursor byte was never balanced — the person's shell came back with an invisible cursor. Requests were safe against Ctrl+C only because raw mode turns it into a key; an external `kill -INT` bypassed the restoration bracket the same way.

Signal handling in a library is delicate. A process-global listener held for the package's lifetime would change host-application semantics far beyond any one frame. Deno offers no way to enumerate existing listeners, so a library cannot detect a host's SIGINT handling; it can only avoid disturbing it. And the moment a listener exists, the process no longer dies on SIGINT by default — whoever installs one owes the interrupt semantics back.

## Decision

Signal use is bracketed, never ambient. Each lifecycle bracket — `withHiddenTerminalCursor`, `withRawTerminal`, and therefore every activity wrapper and request — installs one SIGINT listener at entry and removes it before returning, on every path. The package holds no listener while no bracket is live.

The default response repays the interrupt: the handler removes the package's own listener, runs the bracket owner's `onSignalRestore` share (stop the animation, end the live frame truthfully), restores raw mode and the cursor exactly once, and re-raises SIGINT through the source so the process still dies as an interrupt. Restoration is flag-guarded, so the handler and the normal `finally` path can never restore twice.

A caller-supplied `onInterrupt` replaces the re-raise entirely: the handler forwards the signal and touches nothing, the caller cancels its own operation, and the ordinary exception-safe restoration runs once when it settles. This is the required posture for hosts that manage SIGINT themselves — Deno's additive listener model means the package's listener never disturbs theirs, but a re-raise would deliver them a second signal, so an embedding host opts into `onInterrupt` and keeps interrupt policy to itself.

The delivery boundary is the injectable `TerminalSignalSource` (`listen`/`raise`), defaulting to a Deno-process source whose `raise` prefers true re-delivery via `Deno.kill` and falls back to `Deno.exit(130)` — the conventional interrupt status — where re-delivery is unavailable (platform or permission). The testing entrypoint publishes `FakeSignalSource`, so injected SIGINT is a deterministic test input, exactly as scripted keys are.

One live activity or request at a time remains the Adapter's existing contract (two live inline frames already corrupt each other); the signal bracket inherits that scope rather than adding cross-bracket coordination.

## Consequences

A person can interrupt any spinner, progress run, or request — by Ctrl+C or an external `kill -INT` — and get their cursor and a coherent scrollback every time, while the process still exits as an interrupted process unless the host chose otherwise. Interrupt paths are provable on the fake terminal with exact write sequences.

Installing a listener per bracket means a brief window where SIGINT is handled rather than default-fatal; the handler's restore-then-re-raise keeps the observable outcome equivalent. If a host also listens on the same signal without passing `onInterrupt`, the package's re-raise reaches that host listener a second time — documented, and avoided by the `onInterrupt` contract rather than by unreliable listener detection.

`raise` falling back to `Deno.exit(130)` loses the OS-level "killed by signal" status on platforms or permission sets where `Deno.kill` is unavailable, in exchange for never leaving the process alive against the person's stated wish.

## Alternatives considered

A process-global listener installed at import or first use would leak interrupt policy past the frames that justify it and break the release rule that importing the Adapter performs no effects. Restoring without re-raising would turn Ctrl+C into a silent no-op for plain CLI consumers — the process must die when nobody claims the signal. Trying to save and re-install the host's listeners is impossible in Deno (listeners cannot be enumerated) and unnecessary under its additive model. Making requests handle external SIGINT by polling a flag inside the key loop would leave the uninstrumented gap between paints and never cover the activity wrappers, which read no keys at all.
