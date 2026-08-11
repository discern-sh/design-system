/** Shared prompt event loop over typed frame-state machines. */

import type {
  InteractiveFrameLifecycle,
  InteractiveFrameState,
} from "../interactive-states.ts";
import { PromptCancelled } from "./errors.ts";
import { renderInteractiveFrame } from "./frame-renderers.ts";
import { DenoTerminalIO } from "./io.ts";
import { isNamedKey, type TerminalKey, TerminalKeyReader } from "./keys.ts";
import { withRawTerminal } from "./lifecycle.ts";
import { InlineFramePainter } from "./painter.ts";
import type { PromptOptions, PromptRuntime } from "./types.ts";

export interface PromptMachine<T, State extends InteractiveFrameState> {
  start?(): void | Promise<void>;
  handle(key: TerminalKey): boolean | Promise<boolean>;
  value(): T;
  frame(lifecycle: InteractiveFrameLifecycle): State;
}

export class PromptBackNavigation extends Error {
  override readonly name = "PromptBackNavigation";
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

async function validationError<T>(
  options: PromptOptions<T>,
  value: T,
): Promise<string | undefined> {
  if ((options.required ?? false) !== false && isEmpty(value)) {
    return typeof options.required === "string" && options.required !== ""
      ? options.required
      : "Required.";
  }
  return await options.validate?.(value);
}

export async function runPrompt<T, State extends InteractiveFrameState>(
  options: PromptOptions<T>,
  machine: PromptMachine<T, State>,
  runtime: PromptRuntime,
): Promise<T> {
  const io = runtime.io ?? new DenoTerminalIO();
  const painter = new InlineFramePainter(io);
  const reader = new TerminalKeyReader(io);
  const paint = (lifecycle: InteractiveFrameLifecycle): void => {
    painter.replace(renderInteractiveFrame(
      machine.frame(lifecycle),
      io.capabilities(),
      runtime.theme === undefined ? {} : { theme: runtime.theme },
    ));
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
        throw new PromptCancelled(reason);
      }
      if (isNamedKey(key, "ctrl-c")) {
        const reason = "Cancelled.";
        paint({ status: "cancelled", reason });
        painter.finish();
        throw new PromptCancelled(reason);
      }
      if (isNamedKey(key, "ctrl-u")) {
        if (runtime.canGoBack === true) {
          paint({ status: "cancelled", reason: "Back." });
          painter.finish();
          throw new PromptBackNavigation();
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
