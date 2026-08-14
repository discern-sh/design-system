/**
 * Injectable SIGINT delivery for interrupt-safe terminal brackets.
 *
 * @module
 */

/**
 * Injectable SIGINT subscription and re-delivery boundary. The package's
 * lifecycle brackets install a listener for the duration of one bracketed
 * operation and remove it afterwards; deterministic tests inject their own
 * source and deliver signals on demand.
 */
export interface TerminalSignalSource {
  /**
   * Deliver SIGINT notifications to `handler` until the returned idempotent
   * unsubscribe runs. Adding a listener never disturbs listeners installed
   * by the host application.
   */
  listen(handler: () => void): () => void;
  /**
   * Re-deliver SIGINT to the process under its default disposition, after
   * the bracket that received it has removed its own listener. On a real
   * process this normally terminates it as an interrupt.
   */
  raise(): void;
}

/** SIGINT posture shared by activity, request, and sensing brackets. */
export interface TerminalSignalOptions {
  /** SIGINT delivery boundary; defaults to the Deno process source. */
  readonly signals?: TerminalSignalSource;
  /**
   * Receive SIGINT instead of the default restore-and-re-raise path. The
   * caller owns cancellation: end the bracketed operation promptly, and the
   * bracket's ordinary exception-safe restoration then runs exactly once.
   * Hosts that manage SIGINT themselves should always provide this, so the
   * package never re-raises into their handling.
   */
  readonly onInterrupt?: () => void;
}

/**
 * Deno-process SIGINT source used whenever a caller injects nothing.
 * `raise` prefers true signal re-delivery so the process dies as an
 * interrupt; where re-delivery is unavailable it exits with the
 * conventional interrupt status 130.
 */
export const denoTerminalSignals: TerminalSignalSource = {
  listen(handler: () => void): () => void {
    Deno.addSignalListener("SIGINT", handler);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      Deno.removeSignalListener("SIGINT", handler);
    };
  },
  raise(): void {
    try {
      Deno.kill(Deno.pid, "SIGINT");
    } catch {
      Deno.exit(130);
    }
  },
};
