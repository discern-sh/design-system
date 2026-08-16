/** Shared interaction event loop over typed frame-state machines. */

import type {
  InteractiveFrameLifecycle,
  InteractiveFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { CliPresentationOptions } from "../contracts.ts";
import {
  InteractionCancelled,
  InteractionFrameCleanupError,
} from "./errors.ts";
import { DenoTerminalIO } from "./io.ts";
import { isNamedKey, type TerminalKey, TerminalKeyReader } from "./keys.ts";
import { assertInteractiveTerminal, withRawTerminal } from "./lifecycle.ts";
import {
  InlineFramePainter,
  type InlineFrameRefusalReason,
} from "./painter.ts";
import { signalPassthrough } from "./signals.ts";
import type {
  InteractionCompletionPolicy,
  InteractionOptions,
  InteractionRuntime,
} from "./types.ts";
import {
  fitInteractionFrame,
  type InteractionFrameViewport,
} from "./viewport-budget.ts";

/**
 * Live driver services offered to a machine whose state settles outside a
 * key: a provider resolution repaints the current lifecycle, and a provider
 * failure faults the interaction with full terminal restoration. Both are
 * ignored once the interaction has finished.
 */
export interface InteractionMachineContext {
  readonly repaint: () => void;
  readonly fail: (error: unknown) => void;
}

export interface InteractionMachine<T, State extends InteractiveFrameState> {
  /** Begin machine work; asynchronous work must not block the key loop. */
  start?(context: InteractionMachineContext): void | Promise<void>;
  /** Release timers and abort in-flight provider work at interaction end. */
  dispose?(): void;
  handle(key: TerminalKey): boolean | Promise<boolean>;
  value(): T;
  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: InteractionFrameViewport,
  ): State;
}

/** Component-backed renderer selected by one interaction entrypoint. */
export type InteractionFrameRenderer<State extends InteractiveFrameState> = (
  state: State,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
) => string;

export class InteractionBackNavigation extends Error {
  override readonly name = "InteractionBackNavigation";
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

function requiredMessage<T>(
  options: InteractionDriverOptions<T>,
  value: T,
): string | undefined {
  if ((options.required ?? false) !== false && isEmpty(value)) {
    return typeof options.required === "string" && options.required !== ""
      ? options.required
      : "Required.";
  }
  return undefined;
}

/**
 * Run the required check and validator without forcing asynchrony, so a
 * synchronous verdict can settle a frame before it paints while an
 * asynchronous verdict resolves later.
 */
function validationVerdict<T>(
  options: InteractionDriverOptions<T>,
  value: T,
): string | undefined | Promise<string | undefined> {
  return requiredMessage(options, value) ?? options.validate?.(value);
}

function interactionReservedRows(value: number | undefined): number {
  const reserved = value ?? 0;
  if (!Number.isSafeInteger(reserved) || reserved < 0) {
    throw new TypeError(
      `interaction reserved rows must be a non-negative safe integer; received ${reserved}`,
    );
  }
  return reserved;
}

function sameInteractionValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
    a.every((item, index) => Object.is(item, b[index]));
}

type InteractionDriverOptions<T> = Omit<InteractionOptions<T>, "label">;

function interactionCompletionPolicy(
  value: InteractionCompletionPolicy | undefined,
): InteractionCompletionPolicy {
  const policy = value ?? "retain-frame";
  if (policy !== "retain-frame" && policy !== "clear-frame") {
    throw new TypeError(
      `interaction completion policy must be "retain-frame" or "clear-frame"; received ${
        JSON.stringify(policy)
      }`,
    );
  }
  return policy;
}

export async function runInteraction<T, State extends InteractiveFrameState>(
  options: InteractionDriverOptions<T>,
  machine: InteractionMachine<T, State>,
  runtime: InteractionRuntime,
  renderFrame: InteractionFrameRenderer<State>,
): Promise<T> {
  const completion = interactionCompletionPolicy(options.completion);
  const reservedRows = interactionReservedRows(options.reservedRows);
  const io = runtime.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  if (
    completion === "clear-frame" &&
    io.capabilities().ansiControl === false
  ) {
    throw new InteractionFrameCleanupError("ansi-control-unavailable");
  }
  const painter = new InlineFramePainter(io);
  const reader = new TerminalKeyReader(io);
  let staticMode = false;
  let staticRefusal: InlineFrameRefusalReason | undefined;
  let finished = false;
  let lastStaticFrame: string | undefined;
  const paint = (lifecycle: InteractiveFrameLifecycle): void => {
    const capabilities = io.capabilities();
    const fitted = fitInteractionFrame({
      viewportRows: io.size().rows - reservedRows,
      frame: (viewport) => machine.frame(lifecycle, viewport),
      render: (state) => renderFrame(state, capabilities, runtime),
    });
    const frame = fitted.rendered;
    if (staticMode) {
      if (frame === lastStaticFrame) return;
      lastStaticFrame = frame;
      io.write(`${frame}\n`);
      return;
    }
    const result = painter.replace(frame);
    if (result.status === "refused") {
      staticRefusal = result.reason;
      painter.finish();
      if (result.reason === "current-frame-exceeds-viewport") {
        const restarted = painter.replace(frame);
        if (restarted.status !== "refused") {
          staticRefusal = undefined;
          return;
        }
        staticRefusal = restarted.reason;
      }
      io.write(`${frame}\n`);
      staticMode = true;
      lastStaticFrame = frame;
    }
  };

  const clearCompletedFrame = (): void => {
    if (staticMode) {
      throw new InteractionFrameCleanupError(
        staticRefusal ?? "ansi-control-unavailable",
      );
    }
    const result = painter.replace("");
    if (result.status === "refused") {
      throw new InteractionFrameCleanupError(result.reason);
    }
  };

  // The submitted value: the machine's value after the caller's canonicalising
  // transform. Validation always judges — and the interaction always returns —
  // this value, while frames keep presenting the value as edited.
  const submittedValue = (): T => {
    const value = machine.value();
    return options.transform === undefined ? value : options.transform(value);
  };

  return await withRawTerminal(io, async () => {
    let lifecycle: InteractiveFrameLifecycle = { status: "active" };
    let noticeRestore: InteractiveFrameLifecycle | undefined;
    let latched = false;
    let lastValidated: { readonly value: T } | undefined;
    let generation = 0;
    const fault: { current: { readonly error: unknown } | null } = {
      current: null,
    };
    let signalFault: (error: unknown) => void = () => {};
    const interactionFault = new Promise<never>((_, reject) => {
      signalFault = reject;
    });
    // A fault can arrive while nothing is racing this promise yet; the
    // loop-top check still surfaces it, so mark the rejection observed.
    interactionFault.catch(() => {});

    const applyVerdict = (message: string | undefined): void => {
      lifecycle = message === undefined
        ? { status: "active" }
        : { status: "validation-error", message };
    };

    // After a submission has failed once, the validator tracks every value
    // change so the message clears the moment the value actually passes —
    // and returns the moment it stops passing. An asynchronous verdict never
    // blocks key handling; a verdict superseded by a newer edit is discarded.
    const revalidateOnEdit = (): void => {
      if (!latched) return;
      const value = submittedValue();
      if (
        lastValidated !== undefined &&
        sameInteractionValue(lastValidated.value, value)
      ) {
        return;
      }
      lastValidated = { value };
      const run = ++generation;
      const verdict = validationVerdict(options, value);
      if (verdict === undefined || typeof verdict === "string") {
        applyVerdict(verdict);
        return;
      }
      verdict.then((message) => {
        if (finished || run !== generation) return;
        applyVerdict(message);
        paint(lifecycle);
      }, (error) => {
        if (finished || run !== generation) return;
        fault.current = { error };
        signalFault(error);
      });
    };

    const context: InteractionMachineContext = {
      repaint: () => {
        if (finished) return;
        revalidateOnEdit();
        paint(lifecycle);
      },
      fail: (error) => {
        if (finished || fault.current !== null) return;
        fault.current = { error };
        signalFault(error);
      },
    };

    try {
      // The initial frame paints before any machine work, so a slow provider
      // never delays the first honest frame.
      paint(lifecycle);
      await machine.start?.(context);
      while (true) {
        if (fault.current !== null) throw fault.current.error;
        const key = await Promise.race([reader.readKey(), interactionFault]);
        if (key === null) {
          finished = true;
          const reason = "Input ended.";
          paint({ status: "cancelled", reason });
          painter.finish();
          throw new InteractionCancelled(reason);
        }
        if (isNamedKey(key, "ctrl-c")) {
          finished = true;
          const reason = "Cancelled.";
          paint({ status: "cancelled", reason });
          painter.finish();
          throw new InteractionCancelled(reason);
        }
        if (isNamedKey(key, "escape")) {
          finished = true;
          const reason = "Dismissed.";
          paint({ status: "cancelled", reason });
          painter.finish();
          throw new InteractionCancelled(reason);
        }
        if (isNamedKey(key, "ctrl-u")) {
          if (runtime.canGoBack === true) {
            finished = true;
            paint({ status: "cancelled", reason: "Back." });
            painter.finish();
            throw new InteractionBackNavigation();
          }
          if (noticeRestore === undefined) noticeRestore = lifecycle;
          lifecycle = {
            status: "validation-error",
            message: "There is no previous form step.",
          };
          paint(lifecycle);
          continue;
        }
        if (noticeRestore !== undefined) {
          lifecycle = noticeRestore;
          noticeRestore = undefined;
        }
        const submitted = await machine.handle(key);
        if (submitted) {
          const value = submittedValue();
          lastValidated = { value };
          generation += 1;
          const error = await validationVerdict(options, value);
          if (error === undefined) {
            finished = true;
            if (completion === "clear-frame") clearCompletedFrame();
            else {
              paint({ status: "submitted" });
              painter.finish();
            }
            return value;
          }
          latched = true;
          lifecycle = { status: "validation-error", message: error };
        } else {
          revalidateOnEdit();
        }
        paint(lifecycle);
      }
    } finally {
      finished = true;
      machine.dispose?.();
    }
  }, {
    ...signalPassthrough(runtime),
    // An externally delivered SIGINT ends the request exactly as Ctrl+C
    // presents it — a truthful cancelled frame, its live region closed —
    // before the bracket restores the terminal and the signal re-raises.
    onSignalRestore: () => {
      if (!finished) paint({ status: "cancelled", reason: "Cancelled." });
      painter.finish();
    },
  });
}
