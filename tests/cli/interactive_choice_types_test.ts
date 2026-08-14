import { assertEquals } from "@std/assert";
import type {
  FleetCliProps,
  InteractiveChoiceEntryState,
} from "../../src/cli/mod.ts";
import type {
  PromptChoice,
  PromptChoiceEntry,
  PromptChoiceGroupHeading,
  SearchPromptOptions,
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
const searchableOptions = {
  label: "Search",
  initialId: "one",
  search: () => entries,
} satisfies SearchPromptOptions<number>;
const frameEntries = [
  { kind: "group-heading", id: "recommended", label: "Recommended" },
  { id: "one", label: "One" },
] as const satisfies readonly InteractiveChoiceEntryState[];
const fleetOptions = {
  rows: [{ persona: "Audit", branch: "agent/audit" }],
  identityMode: "lossless",
} as const satisfies FleetCliProps;

Deno.test("choice entry types need no generic sentinel and preserve legacy calls", () => {
  assertEquals(headingValueIsNever, true);
  assertEquals(groupedOptions.choices[0], heading);
  assertEquals(legacyOptions.choices, legacyChoices);
  assertEquals(searchableOptions.initialId, "one");
  assertEquals(frameEntries[0].kind, "group-heading");
  assertEquals(fleetOptions.identityMode, "lossless");
});
