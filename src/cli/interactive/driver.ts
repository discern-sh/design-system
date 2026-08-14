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

async function validationError<T>(
  options: InteractionOptions<T>,
  value: T,
): Promise<string | undefined> {
  if ((options.required ?? false) !== false && isEmpty(value)) {
    return typeof options.required === "string" && options.required !== ""
      ? options.required
      : "Required.";
  }
  return await options.validate?.(value);
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

  return await withRawTerminal(io, async () => {
    await machine.start?.();
    let lifecycle: InteractiveFrameLifecycle = { status: "active" };
    paint(lifecycle);
    while (true) {
      const key = await reader.readKey();
      if (key === null) {
        const reason = "Input ended.";
        paint({ status: "cancelled", reason });
        painter.finish();
        throw new InteractionCancelled(reason);
      }
      if (isNamedKey(key, "ctrl-c")) {
        const reason = "Cancelled.";
        paint({ status: "cancelled", reason });
        painter.finish();
        throw new InteractionCancelled(reason);
      }
      if (isNamedKey(key, "ctrl-u")) {
        if (runtime.canGoBack === true) {
          paint({ status: "cancelled", reason: "Back." });
          painter.finish();
          throw new InteractionBackNavigation();
        }
        lifecycle = {
          status: "validation-error",
          message: "There is no previous form step.",
        };
        paint(lifecycle);
        continue;
      }
      if (lifecycle.status === "validation-error") {
        lifecycle = { status: "active" };
      }
      const submitted = await machine.handle(key);
      if (submitted) {
        const value = machine.value();
        const error = await validationError(options, value);
        if (error === undefined) {
          paint({ status: "submitted" });
          painter.finish();
          return value;
        }
        lifecycle = { status: "validation-error", message: error };
      }
      paint(lifecycle);
    }
  });
}
