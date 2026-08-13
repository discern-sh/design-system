import { assertEquals } from "@std/assert";
import type {
  PromptChoice,
  PromptChoiceEntry,
  PromptChoiceGroupHeading,
  SelectPromptOptions,
} from "../../src/cli/interactive/mod.ts";

type Assert<Condition extends true> = Condition;
type HeadingValueIsNever = Assert<
  [NonNullable<PromptChoiceGroupHeading["value"]>] extends [never] ? true
    : false
>;

const headingValueIsNever: HeadingValueIsNever = true;
const heading = {
  kind: "group-heading",
  id: "recommended",
  label: "Recommended",
} as const satisfies PromptChoiceGroupHeading;
const entries = [
  heading,
  { id: "one", label: "One", value: 1 },
] as const satisfies readonly PromptChoiceEntry<number>[];
const legacyChoices = [
  { id: "one", label: "One", value: 1 },
  { id: "two", label: "Two", value: 2 },
] as const satisfies readonly PromptChoice<number>[];
const groupedOptions = {
  label: "Grouped",
  choices: entries,
} satisfies SelectPromptOptions<number>;
const legacyOptions = {
  label: "Legacy",
  choices: legacyChoices,
} satisfies SelectPromptOptions<number>;

Deno.test("choice entry types need no generic sentinel and preserve legacy calls", () => {
  assertEquals(headingValueIsNever, true);
  assertEquals(groupedOptions.choices[0], heading);
  assertEquals(legacyOptions.choices, legacyChoices);
});
