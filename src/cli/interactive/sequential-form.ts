/**
 * Sequential forms with conditional steps and Ctrl+U back-navigation.
 *
 * @module
 */

import type {
  InteractiveFrameLifecycle,
  SequentialFormFrameState,
  SequentialFormSectionState,
  SequentialStepStatus,
} from "../interactive-states.ts";
import renderProcessStepsCli from "../../components/marketing/process-steps/process-steps.cli.ts";
import { defaultTerminalFrameWidth } from "../frame-measure.ts";
import { InteractionCancelled } from "./errors.ts";
import { InteractionBackNavigation } from "./driver.ts";
import { DenoTerminalIO, type TerminalIO } from "./io.ts";
import { assertInteractiveTerminal } from "./lifecycle.ts";
import type { InteractionRuntime } from "./types.ts";
import type { TerminalThemeVariant } from "../theme.ts";

/** Named results collected by a sequential form. */
export type SequentialFormValues = Record<string, unknown>;

/** One conditional value-producing step in a sequential form. */
export interface SequentialFormStep {
  readonly id: string;
  readonly label: string;
  readonly run: (
    values: Readonly<SequentialFormValues>,
    previous: unknown,
    runtime: InteractionRuntime,
  ) => unknown | Promise<unknown>;
  readonly when?: (values: Readonly<SequentialFormValues>) => boolean;
  /** Optional non-sensitive summary shown after this step completes. */
  readonly summarize?: (value: unknown) => string;
}

/** Construction options for a sequential form. */
export interface SequentialFormOptions {
  readonly label: string;
  readonly hint?: string;
  readonly io?: TerminalIO;
  readonly theme?: TerminalThemeVariant;
}

function validLabel(value: string): boolean {
  return value !== "" && !/[\p{Cc}\p{Cf}]/u.test(value);
}

function hasValue(values: SequentialFormValues, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(values, id);
}

/** Builder and event coordinator for named sequential interaction steps. */
export class SequentialFormBuilder {
  readonly #steps: SequentialFormStep[] = [];
  readonly #ids = new Set<string>();
  readonly #io: TerminalIO;

  constructor(readonly options: SequentialFormOptions) {
    if (!validLabel(options.label)) {
      throw new TypeError(
        "sequential form label must be non-empty and control-free",
      );
    }
    this.#io = options.io ?? new DenoTerminalIO();
  }

  /** Append one uniquely named step in execution order. */
  add(step: SequentialFormStep): this {
    if (!validLabel(step.id)) {
      throw new TypeError(
        "sequential form step id must be non-empty and control-free",
      );
    }
    if (!validLabel(step.label)) {
      throw new TypeError(
        `sequential form step ${JSON.stringify(step.id)} has an invalid label`,
      );
    }
    if (this.#ids.has(step.id)) {
      throw new TypeError(
        `sequential form step id ${JSON.stringify(step.id)} is repeated`,
      );
    }
    this.#ids.add(step.id);
    this.#steps.push(step);
    return this;
  }

  /** Execute applicable steps, retaining prior answers when navigating back. */
  async submit(): Promise<SequentialFormValues> {
    if (this.#steps.length === 0) {
      throw new TypeError("sequential form requires at least one step");
    }
    assertInteractiveTerminal(this.#io);
    const values: SequentialFormValues = {};
    let index = 0;
    while (index < this.#steps.length) {
      const step = this.#steps[index];
      if (step === undefined) break;
      if (!this.#isApplicable(step, values)) {
        delete values[step.id];
        index += 1;
        continue;
      }

      this.#paint(this.#frame(index, values, { status: "active" }));
      const previousIndex = this.#previousApplicableIndex(index, values);
      const runtime: InteractionRuntime = {
        io: this.#io,
        canGoBack: previousIndex >= 0,
        ...(this.options.theme === undefined
          ? {}
          : { theme: this.options.theme }),
      };
      try {
        values[step.id] = await step.run(
          values,
          hasValue(values, step.id) ? values[step.id] : undefined,
          runtime,
        );
        index += 1;
      } catch (error) {
        if (error instanceof InteractionBackNavigation) {
          index = Math.max(0, previousIndex);
          continue;
        }
        if (error instanceof InteractionCancelled) {
          this.#paint(this.#frame(index, values, {
            status: "cancelled",
            reason: error.reason,
          }));
          throw error;
        }
        const message = error instanceof Error ? error.message : "Step failed.";
        this.#paint(this.#frame(index, values, {
          status: "validation-error",
          message,
        }));
        throw error;
      }
    }
    this.#removeInapplicableValues(values);
    this.#paint(this.#frame(this.#steps.length, values, {
      status: "submitted",
    }));
    return values;
  }

  #isApplicable(
    step: SequentialFormStep,
    values: Readonly<SequentialFormValues>,
  ): boolean {
    return step.when?.(values) ?? true;
  }

  #previousApplicableIndex(
    current: number,
    values: Readonly<SequentialFormValues>,
  ): number {
    for (let index = current - 1; index >= 0; index -= 1) {
      const step = this.#steps[index];
      if (step !== undefined && this.#isApplicable(step, values)) return index;
    }
    return -1;
  }

  #removeInapplicableValues(values: SequentialFormValues): void {
    for (const step of this.#steps) {
      if (!this.#isApplicable(step, values)) delete values[step.id];
    }
  }

  #sectionStatus(
    stepIndex: number,
    activeIndex: number,
    values: SequentialFormValues,
    lifecycle: InteractiveFrameLifecycle,
  ): SequentialStepStatus {
    if (stepIndex === activeIndex) {
      if (lifecycle.status === "cancelled") return "cancelled";
      if (lifecycle.status === "validation-error") return "error";
      return "active";
    }
    const step = this.#steps[stepIndex];
    return step !== undefined && hasValue(values, step.id)
      ? "complete"
      : "pending";
  }

  #frame(
    activeIndex: number,
    values: SequentialFormValues,
    lifecycle: InteractiveFrameLifecycle,
  ): SequentialFormFrameState {
    const sections: SequentialFormSectionState[] = [];
    for (const [stepIndex, step] of this.#steps.entries()) {
      if (!this.#isApplicable(step, values)) continue;
      const summary = hasValue(values, step.id) && step.summarize !== undefined
        ? step.summarize(values[step.id])
        : undefined;
      sections.push({
        id: step.id,
        label: step.label,
        status: this.#sectionStatus(
          stepIndex,
          activeIndex,
          values,
          lifecycle,
        ),
        ...(summary === undefined || summary === "" ? {} : { summary }),
      });
    }
    return {
      kind: "sequential-form",
      label: this.options.label,
      lifecycle,
      sections,
      activePhase: activeIndex,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }

  #paint(frame: SequentialFormFrameState): void {
    this.#io.write(`${
      renderProcessStepsCli({
        ...frame,
        ...(this.options.theme === undefined
          ? {}
          : { theme: this.options.theme }),
        width: defaultTerminalFrameWidth(this.#io.capabilities()),
      }, this.#io.capabilities())
    }\n`);
  }
}

/** Begin a named sequential form on one terminal. */
export function createSequentialForm(
  options: SequentialFormOptions,
): SequentialFormBuilder {
  return new SequentialFormBuilder(options);
}
