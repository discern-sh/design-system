/** Live public-adapter journey sharing the Catalogue's pure request fixtures. */
import { guidedSetupDefinition } from "../../catalogue/guided-flow.ts";
import {
  createSequentialForm,
  sequentialConfirmationStep,
  type SequentialFormOptions,
  sequentialSelectionStep,
  sequentialTextStep,
} from "../../src/cli/interactive/mod.ts";

/** Run the public requests whose semantic frames the Catalogue replay depicts. */
export function guidedSetupForm(options: Omit<SequentialFormOptions, "label">) {
  return createSequentialForm({
    ...options,
    label: guidedSetupDefinition.label,
  })
    .add(sequentialTextStep({
      id: "name",
      label: guidedSetupDefinition.name.label,
      request: guidedSetupDefinition.name,
      summarize: (value) => value,
    }))
    .add(sequentialSelectionStep({
      id: "delivery",
      label: guidedSetupDefinition.delivery.label,
      request: guidedSetupDefinition.delivery,
      summarize: (value) => value === "email" ? "Email" : "Local file",
    }))
    .add(sequentialTextStep({
      id: "address",
      label: guidedSetupDefinition.address.label,
      when: (values) => values.delivery === "email",
      request: guidedSetupDefinition.address,
      summarize: (value) => value,
    }))
    .add(sequentialConfirmationStep({
      id: "confirmed",
      label: guidedSetupDefinition.reviewLabel,
      request: guidedSetupDefinition.review,
      summarize: (value) => value ? "Confirmed" : "Pending",
    }));
}
