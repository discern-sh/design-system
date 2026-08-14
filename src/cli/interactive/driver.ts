/** Shared interaction event loop over typed frame-state machines. */

import type {
  InteractiveFrameLifecycle,
  InteractiveFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import { InteractionCancelled } from "./errors.ts";
import { DenoTerminalIO } from "./io.ts";
import { isNamedKey, type TerminalKey, TerminalKeyReader } from "./keys.ts";
import { withRawTerminal } from "./lifecycle.ts";
import { InlineFramePainter } from "./painter.ts";
import { signalPassthrough } from "./signals.ts";
import type { InteractionOptions, InteractionRuntime } from "./types.ts";
import {
  fitInteractionFrame,
  type InteractionFrameViewport,
} from "./viewport-budget.ts";

export interface InteractionMachine<T, State extends InteractiveFrameState> {
  start?(): void | Promise<void>;
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
  theme: TerminalThemeVariant | undefined,
) => string;

export class InteractionBackNavigation extends Error {
  override readonly name = "InteractionBackNavigation";
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

function requiredMessage<T>(
  options: InteractionOptions<T>,
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
  options: InteractionOptions<T>,
  value: T,
): string | undefined | Promise<string | undefined> {
  return requiredMessage(options, value) ?? options.validate?.(value);
}

function sameInteractionValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
    a.every((item, index) => Object.is(item, b[index]));
}

export async function runInteraction<T, State extends InteractiveFrameState>(
  options: InteractionOptions<T>,
  machine: InteractionMachine<T, State>,
  runtime: InteractionRuntime,
  renderFrame: InteractionFrameRenderer<State>,
): Promise<T> {
  const io = runtime.io ?? new DenoTerminalIO();
  const painter = new InlineFramePainter(io);
  const reader = new TerminalKeyReader(io);
  let staticMode = false;
  let finished = false;
  const paint = (lifecycle: InteractiveFrameLifecycle): void => {
    const capabilities = io.capabilities();
    const fitted = fitInteractionFrame({
      viewportRows: io.size().rows,
      frame: (viewport) => machine.frame(lifecycle, viewport),
      render: (state) => renderFrame(state, capabilities, runtime.theme),
    });
    const frame = fitted.rendered;
    if (staticMode) {
      io.write(`${frame}\n`);
      return;
    }
    const result = painter.replace(frame);
    if (result.status === "refused") {
      painter.finish();
      if (result.reason === "current-frame-exceeds-viewport") {
        const restarted = painter.replace(frame);
        if (restarted.status !== "refused") return;
      }
      io.write(`${frame}\n`);
      staticMode = true;
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
    await machine.start?.();
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

    paint(lifecycle);
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
          paint({ status: "submitted" });
          painter.finish();
          return value;
        }
        latched = true;
        lifecycle = { status: "validation-error", message: error };
      } else {
        revalidateOnEdit();
      }
      paint(lifecycle);
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
