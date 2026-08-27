import type {
  ComponentExampleDefinition,
  ComponentExampleIdFor,
} from "../types/component-examples.ts";
import { validateComponentExampleImplementations } from "../types/component-examples.ts";
import type { ComponentMeta } from "../types/component-meta.ts";
import type { CliExample } from "./contracts.ts";

/** Bind pure renderer inputs to one neutral Component example vocabulary. */
export function defineCliExamples<
  const Vocabulary extends readonly ComponentExampleDefinition[],
  const Implementations extends readonly CliExample<
    unknown,
    ComponentExampleIdFor<Vocabulary, "cli">
  >[],
>(
  meta: ComponentMeta,
  vocabulary: Vocabulary,
  implementations: Implementations,
): Implementations {
  validateComponentExampleImplementations(
    meta,
    vocabulary,
    "cli",
    implementations.map(({ name }) => name),
  );
  return implementations;
}
