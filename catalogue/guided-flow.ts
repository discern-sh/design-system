/** Pure guided-flow fixtures shared by the Catalogue and live playground. */
import {
  renderInputCli,
  renderProcessStepsCli,
  renderSelectCli,
  renderSwitchCli,
} from "../src/cli/mod.ts";
import type {
  ConfirmationRequestOptions,
  SelectionRequestOptions,
  TextRequestOptions,
} from "../src/cli/interactive/mod.ts";
import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import type {
  ConfirmFrameState,
  SelectFrameState,
  SequentialFormFrameState,
  TextInputFrameState,
} from "../src/cli/interactive-states.ts";
import { defaultTerminalFrameWidth } from "../src/cli/frame-measure.ts";
import { fitInteractionFrame } from "../src/cli/interactive/viewport-budget.ts";
import { interactiveChoiceOverflow } from "../src/cli/interactive-choice.ts";
import type { CatalogueTerminalPresentation } from "./terminal-theme.ts";

/** Request facts used unchanged by the public adapter's live journey. */
export const guidedSetupDefinition = {
  label: "Workspace setup",
  name: {
    label: "Workspace name",
    required: "Enter a workspace name.",
    transform: (value: string) => value.trim(),
  } satisfies TextRequestOptions,
  delivery: {
    label: "Delivery",
    choices: [{ id: "email", label: "Email", value: "email" }, {
      id: "local",
      label: "Local file",
      value: "local",
    }],
  } satisfies SelectionRequestOptions<string>,
  address: {
    label: "Email address",
    required: true,
    validate: (value: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
        ? undefined
        : "Enter an email address.",
  } satisfies TextRequestOptions,
  reviewLabel: "Review",
  review: {
    label: "Complete setup?",
    hint: "Ctrl+U reviews the previous answer. Escape cancels.",
    initialValue: true,
    validate: (value: boolean) =>
      value ? undefined : "Choose Yes to complete, or Escape to cancel.",
  } satisfies ConfirmationRequestOptions,
};

/** Reproducible actions; each input is delivered through the real key decoder. */
export const guidedSetupActions = [
  { label: "Validation: submit an empty name", input: "\r" },
  { label: "Correction: enter Maple", input: "Maple\r" },
  { label: "Choose Email delivery", input: "\r" },
  { label: "Enter team@example.test", input: "team@example.test\r" },
  { label: "Back: Ctrl+U returns to the retained address", input: "\x15" },
  { label: "Re-enter: submit the retained address unchanged", input: "\r" },
] as const;

/** One supplied semantic checkpoint verified at the adapter's next request read. */
export interface GuidedReplayFrame {
  readonly label: string;
  readonly output: string;
}

/**
 * Replay supplied semantic checkpoints through pure Component renderers. Tests
 * compare every frame with the real adapter driven by guidedSetupActions.
 */
export function replayGuidedSetup(
  capabilities: TerminalCapabilities,
  presentation: CatalogueTerminalPresentation,
  rows: number,
  outcome: "completion" | "cancellation",
) {
  const definition = guidedSetupDefinition;
  const text = (label: string, value: string, message?: string): string => {
    const state: TextInputFrameState = {
      kind: "text-input",
      label,
      value,
      cursor: value.length,
      lifecycle: message === undefined
        ? { status: "active" }
        : { status: "validation-error", message },
    };
    return fitInteractionFrame({
      viewportRows: rows,
      frame: () => state,
      render: (state) =>
        renderInputCli({ ...state, ...presentation }, capabilities),
    }).rendered;
  };
  const review: ConfirmFrameState = {
    kind: "confirm",
    label: definition.review.label,
    hint: definition.review.hint,
    value: true,
    yesLabel: "",
    noLabel: "",
    lifecycle: { status: "active" },
  };
  const choices = definition.delivery.choices.map(({ id, label }) => ({
    id,
    label,
  }));
  const selection = fitInteractionFrame({
    viewportRows: rows,
    frame: (viewport): SelectFrameState => {
      const visibleCount = viewport.controlRows(choices.length);
      return {
        kind: "select",
        label: definition.delivery.label,
        options: choices,
        highlightedIndex: 0,
        visibleStart: 0,
        visibleCount,
        selectedId: "email",
        ...interactiveChoiceOverflow(choices, 0, visibleCount),
        lifecycle: { status: "active" },
      };
    },
    render: (state) =>
      renderSelectCli({ ...state, ...presentation }, capabilities),
  }).rendered;
  const confirmation = fitInteractionFrame({
    viewportRows: rows,
    frame: () => review,
    render: (state) =>
      renderSwitchCli({ ...state, ...presentation }, capabilities),
  }).rendered;
  const cancelled = outcome === "cancellation";
  const final: SequentialFormFrameState = {
    kind: "sequential-form",
    label: definition.label,
    activePhase: cancelled ? 3 : 4,
    lifecycle: cancelled
      ? { status: "cancelled", reason: "Dismissed." }
      : { status: "submitted" },
    sections: [
      {
        id: "name",
        label: definition.name.label,
        status: "complete",
        summary: "Maple",
      },
      {
        id: "delivery",
        label: definition.delivery.label,
        status: "complete",
        summary: "Email",
      },
      {
        id: "address",
        label: definition.address.label,
        status: "complete",
        summary: "team@example.test",
      },
      cancelled
        ? {
          id: "confirmed",
          label: definition.reviewLabel,
          status: "cancelled",
        }
        : {
          id: "confirmed",
          label: definition.reviewLabel,
          status: "complete",
          summary: "Confirmed",
        },
    ],
  };
  const outputs = [
    text(definition.name.label, ""),
    text(definition.name.label, "", definition.name.required),
    selection,
    text(definition.address.label, ""),
    confirmation,
    text(definition.address.label, "team@example.test"),
    confirmation,
    renderProcessStepsCli({
      ...final,
      ...presentation,
      width: defaultTerminalFrameWidth(capabilities),
    }, capabilities),
  ];
  const labels = [
    "Entry: workspace name",
    ...guidedSetupActions.map(({ label }) => label),
    cancelled
      ? "Cancellation: Escape leaves setup unfinished"
      : "Completion: confirm setup",
  ];
  return {
    frames: outputs.map((output, index): GuidedReplayFrame => ({
      output,
      label: labels[index]!,
    })),
    values: cancelled ? undefined : {
      name: "Maple",
      delivery: "email",
      address: "team@example.test",
      confirmed: true,
    },
    cancelled,
  };
}
