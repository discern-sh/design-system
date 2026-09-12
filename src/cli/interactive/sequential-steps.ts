/** Typed request constructors for sequential forms. @module */
import { requestConfirmation, requestText } from "./basic-requests.ts";
import { requestSelection, requestSelections } from "./choice-requests.ts";
import type {
  SelectionRequestOptions,
  SelectionsRequestOptions,
} from "./choice-requests.ts";
import { isInteractionChoice } from "./choice-navigation.ts";
import { requestAutocomplete } from "./discovery-requests.ts";
import { requestTextarea } from "./textarea-request.ts";
import type {
  SequentialFormStep,
  SequentialFormValues,
} from "./sequential-form.ts";
import type { InteractionRuntime } from "./types.ts";

type RequestResult<Request extends (...args: never[]) => Promise<unknown>> =
  ReturnType<Request> extends Promise<infer Value> ? Value : never;

/**
 * A request's own options, fixed or rebuilt from current form answers.
 * Retained submitted values override initial options, including false, empty
 * text and empty selections. Ctrl+U discards the current unsubmitted edit.
 * Inapplicable steps lose their answers; re-enabled steps start from defaults.
 */
export type SequentialRequestStepOptions<Options, Value> =
  & Omit<SequentialFormStep<Value>, "run">
  & {
    readonly request:
      | Options
      | ((
        values: Readonly<SequentialFormValues>,
        previous: Value | undefined,
      ) => Options);
  };

function requestOptions<Options, Value>(
  source: SequentialRequestStepOptions<Options, Value>["request"],
  values: Readonly<SequentialFormValues>,
  previous: Value | undefined,
): Options {
  return typeof source === "function"
    ? (source as (
      values: Readonly<SequentialFormValues>,
      previous: Value | undefined,
    ) => Options)(values, previous)
    : source;
}

function valueStep<Value, Options extends { readonly initialValue?: Value }>(
  request: (options: Options, runtime: InteractionRuntime) => Promise<Value>,
  options: SequentialRequestStepOptions<Options, Value>,
): SequentialFormStep<Value> {
  const { request: source, ...step } = options;
  return {
    ...step,
    run: (values, previous, runtime) =>
      request({
        ...requestOptions(source, values, previous),
        ...(previous === undefined ? {} : { initialValue: previous }),
      }, runtime),
  };
}

/** Text request with automatic submitted-answer retention. */
export function sequentialTextStep(
  options: SequentialRequestStepOptions<
    Parameters<typeof requestText>[0],
    Awaited<ReturnType<typeof requestText>>
  >,
) {
  return valueStep(requestText, options);
}

/** Boolean request with automatic retention, including a false answer. */
export function sequentialConfirmationStep(
  options: SequentialRequestStepOptions<
    Parameters<typeof requestConfirmation>[0],
    Awaited<ReturnType<typeof requestConfirmation>>
  >,
) {
  return valueStep(requestConfirmation, options);
}

/** Multiline request with automatic submitted-answer retention. */
export function sequentialTextareaStep(
  options: SequentialRequestStepOptions<
    Parameters<typeof requestTextarea>[0],
    Awaited<ReturnType<typeof requestTextarea>>
  >,
) {
  return valueStep(requestTextarea, options);
}

/** Autocomplete request retaining submitted text, independently of suggestions. */
export function sequentialAutocompleteStep(
  options: SequentialRequestStepOptions<
    Parameters<typeof requestAutocomplete>[0],
    Awaited<ReturnType<typeof requestAutocomplete>>
  >,
) {
  return valueStep(requestAutocomplete, options);
}

/**
 * Single selection retaining the submitted choice's stable ID. Rebuilt choice
 * objects may change payloads; removed/disabled IDs fall back to the request's
 * first enabled choice. Configured initialId applies only without a prior answer.
 * Ambiguous equal values use their first enabled choice; use distinct values
 * or the closure form when result values cannot identify choices uniquely.
 */
export function sequentialSelectionStep<Value>(
  options: SequentialRequestStepOptions<
    SelectionRequestOptions<Value>,
    RequestResult<typeof requestSelection<Value>>
  >,
): SequentialFormStep<RequestResult<typeof requestSelection<Value>>> {
  const { request: source, ...step } = options;
  let retainedId: string | undefined;
  let retainedValue: Value | undefined;
  return {
    ...step,
    run: async (values, previous, runtime) => {
      const configured = requestOptions(source, values, previous);
      const enabled = configured.choices.filter(isInteractionChoice).filter((
        choice,
      ) => !choice.disabled);
      const { initialId, ...request } = configured;
      const remembered = Object.is(previous, retainedValue)
        ? retainedId
        : enabled.find((choice) => Object.is(choice.value, previous))?.id;
      const id = previous === undefined
        ? initialId
        : enabled.find((choice) => choice.id === remembered)?.id;
      const value = await requestSelection({
        ...request,
        ...(id === undefined ? {} : { initialId: id }),
      }, runtime);
      retainedId = enabled.find((choice) => Object.is(choice.value, value))?.id;
      retainedValue = value;
      return value;
    },
  };
}

/**
 * Multiple selection retaining stable IDs in current choice order. Removed and
 * disabled choices are dropped; an intentionally empty answer stays empty.
 */
export function sequentialSelectionsStep<Value>(
  options: SequentialRequestStepOptions<
    SelectionsRequestOptions<Value>,
    RequestResult<typeof requestSelections<Value>>
  >,
): SequentialFormStep<RequestResult<typeof requestSelections<Value>>> {
  const { request: source, ...step } = options;
  let retainedIds: readonly string[] = [];
  let retainedValue: readonly Value[] | undefined;
  return {
    ...step,
    run: async (values, previous, runtime) => {
      const configured = requestOptions(source, values, previous);
      const enabled = configured.choices.filter(isInteractionChoice).filter((
        choice,
      ) => !choice.disabled);
      const ids = previous === undefined
        ? configured.initialIds
        : enabled.filter((choice) =>
          previous === retainedValue
            ? retainedIds.includes(choice.id)
            : previous.some((value) => Object.is(value, choice.value))
        ).map((choice) => choice.id);
      const { initialIds: _initialIds, ...request } = configured;
      const value = await requestSelections({
        ...request,
        ...(ids === undefined ? {} : { initialIds: ids }),
      }, runtime);
      retainedIds = enabled.filter((choice) =>
        value.some((item) => Object.is(item, choice.value))
      ).map((choice) => choice.id);
      retainedValue = value;
      return value;
    },
  };
}
